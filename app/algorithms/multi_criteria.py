import json
import datetime
import math
from typing import List, Dict, Any, Optional
from scipy.optimize import minimize, differential_evolution
import numpy as np


def run_multi_criteria(payload):
    model = MultiCriteriaModel()
    
    criteria = payload.get("criteria", [])
    constraints = payload.get("constraints", {})
    main_criterion_name = payload.get("main_criterion")
    variable_bounds = payload.get("variable_bounds")
    
    if not variable_bounds:
        raise ValueError("Поле обязательно. "
                        "Укажите границы переменных [(lb, ub), ...]")
    
    if len(variable_bounds) > 5:
        raise ValueError("Размерность не должна превышать 5")
    
    model.set_criteria(criteria)
    model.set_variable_bounds(variable_bounds)
    
    if main_criterion_name:
        model.set_main_criterion_by_name(main_criterion_name)

    thresholds = {}
    for i, crit in enumerate(criteria):
        name = crit.get("name")
        if name in constraints:
            crit_constraints = constraints[name]
            if crit.get("direction") == "min":
                thresholds[i] = crit_constraints.get("max")
            else:
                thresholds[i] = crit_constraints.get("min")
    
    model.set_thresholds(thresholds)
    
    model.optimize()
    report = model.get_report()
    
    optimum = report["results"]["all_criteria"]
    
    ranking = []
    if report["results"]["is_feasible"]:
        ranking.append({
            "solution": report["results"]["solution"],
            "objective_value": report["results"]["objective_value"],
            "all_criteria": optimum
        })
    
    return {
        "optimum": optimum,
        "ranking": ranking,
        "method_used": "main_criterion",
        "is_feasible": report["results"]["is_feasible"]
    }

class MultiCriteriaModel:
    MAX_CRITERIA = 3
    MAX_DIMENSION = 5

    def __init__(self):
        self.criteria: List[Dict[str, Any]] = []
        self.variable_bounds: List[tuple] = []
        self.main_criterion_idx: int = 0
        self.threshold_values: Dict[int, float] = {}
        
        self.solution: Optional[List[float]] = None
        self.objective_value: Optional[float] = None
        self.all_criteria_values: Dict[str, float] = {}
        self.is_feasible: bool = False
        
        self._is_optimized = False

    def set_criteria(self, criteria: List[Dict[str, Any]]):
        if len(criteria) > self.MAX_CRITERIA:
            raise ValueError(f"Количество критериев не должно превышать {self.MAX_CRITERIA}")
        if len(criteria) < 1:
            raise ValueError("Должен быть хотя бы один критерий")
        
        self.criteria = criteria
        self._is_optimized = False

    def set_variable_bounds(self, bounds: List[tuple]):
        if len(bounds) > self.MAX_DIMENSION:
            raise ValueError(f"Размерность не должна превышать {self.MAX_DIMENSION}")
        if len(bounds) < 1:
            raise ValueError("Должна быть хотя бы одна переменная")
        
        self.variable_bounds = bounds
        self._is_optimized = False

    def set_main_criterion_by_name(self, name: str):
        for i, crit in enumerate(self.criteria):
            if crit.get("name") == name:
                self.main_criterion_idx = i
                self._is_optimized = False
                return
        raise ValueError(f"Критерий '{name}' не найден")

    def set_thresholds(self, thresholds: Dict[int, float]):
        self.threshold_values = thresholds
        self._is_optimized = False

    def _evaluate_function(self, func_def: Dict[str, Any], x: List[float]) -> float:
        func_type = func_def.get("func_type", "linear")
        params = func_def.get("params", {})
        coeffs = params.get("coeffs", [])
        
        if func_type == "linear":
            # f(x) = a1*x1 + a2*x2 + ...
            result = 0.0
            for i, xi in enumerate(x):
                if i < len(coeffs):
                    result += coeffs[i] * xi
            return result
        
        elif func_type == "quadratic":
            # f(x) = a1*x1^2 + a2*x2^2 + ...
            result = 0.0
            for i, xi in enumerate(x):
                if i < len(coeffs):
                    result += coeffs[i] * (xi ** 2)
            return result
        
        elif func_type == "exponential":
            # f(x) = a1*exp(x1) + a2*exp(x2) + ...
            result = 0.0
            for i, xi in enumerate(x):
                if i < len(coeffs):
                    result += coeffs[i] * math.exp(xi)
            return result
        
        elif func_type == "logarithmic":
            # f(x) = a1*ln(x1) + a2*ln(x2) + ...
            result = 0.0
            for i, xi in enumerate(x):
                if i < len(coeffs):
                    if xi <= 0:
                        raise ValueError(f"Логарифмическая функция требует x[{i}] > 0")
                    result += coeffs[i] * math.log(xi)
            return result
        
        else:
            raise ValueError(f"Неподдерживаемый тип функции: {func_type}")

    def _check_thresholds(self, x: List[float]) -> bool:
        for idx, threshold in self.threshold_values.items():
            if idx == self.main_criterion_idx:
                continue
            if idx >= len(self.criteria):
                continue
            if threshold is None:  
                continue
            
            func_def = self.criteria[idx]
            direction = func_def.get("direction", "max")
            val = self._evaluate_function(func_def, x)
            
            if direction == "max":
                if val < threshold - 1e-6:
                    return False
            else:
                if val > threshold + 1e-6:
                    return False
        
        return True

    def _check_bounds(self, x: List[float]) -> bool:
        for i, xi in enumerate(x):
            if i >= len(self.variable_bounds):
                continue
            lb, ub = self.variable_bounds[i]
            if xi < lb - 1e-6 or xi > ub + 1e-6:
                return False
        return True

    def _is_feasible(self, x: List[float]) -> bool:
        if not self._check_bounds(x):
            return False
        if not self._check_thresholds(x):
            return False
        return True

    def _objective_function(self, x):
        main_func = self.criteria[self.main_criterion_idx]
        main_direction = main_func.get("direction", "max")
        
        val = self._evaluate_function(main_func, x)
        
        # scipy минимизирует, поэтому для max меняем знак
        return -val if main_direction == "max" else val
    
    def _build_scipy_constraints(self):
        scipy_constraints = []
        
        # Пороги для неглавных критериев
        for idx, threshold in self.threshold_values.items():
            if idx == self.main_criterion_idx:
                continue
            if idx >= len(self.criteria):
                continue
            if threshold is None:
                continue
            
            func_def = self.criteria[idx]
            direction = func_def.get("direction", "max")
            
            if direction == "max":
                scipy_constraints.append({
                    'type': 'ineq',
                    'fun': lambda x, idx=idx, th=threshold: 
                        self._evaluate_function(self.criteria[idx], x) - th
                })
            else:
                scipy_constraints.append({
                    'type': 'ineq',
                    'fun': lambda x, idx=idx, th=threshold: 
                        th - self._evaluate_function(self.criteria[idx], x)
                })
        
        return scipy_constraints
    
    def optimize(self, method='SLSQP'):
        if not self.criteria or not self.variable_bounds:
            raise ValueError("Необходимо установить критерии и границы")
        
        n_vars = len(self.variable_bounds)
        
        # Начальная точка (середина области)
        x0 = [(lb + ub) / 2 for lb, ub in self.variable_bounds]
        
        # Границы переменных в формате scipy
        bounds = [(lb, ub) for lb, ub in self.variable_bounds]
        
        # Ограничения
        constraints = self._build_scipy_constraints()
        
        try:
            if method == 'differential_evolution':
                # Глобальная оптимизация
                result = differential_evolution(
                    func=self._objective_function,
                    bounds=bounds,
                    constraints=constraints,
                    seed=42,
                    maxiter=1000,
                    tol=1e-6
                )
            else:
                # Локальная оптимизация 
                result = minimize(
                    fun=self._objective_function,
                    x0=x0,
                    method=method,
                    bounds=bounds,
                    constraints=constraints,
                    options={'maxiter': 1000, 'ftol': 1e-6}
                )
            
            self.solution = result.x.tolist()
            self.objective_value = -result.fun if self.criteria[self.main_criterion_idx].get("direction") == "max" else result.fun
            self.is_feasible = result.success
            
        except Exception as e:
            print(f"ERROR: scipy.optimize failed: {e}")
            self.solution = None
            self.objective_value = None
            self.is_feasible = False
        
        # Вычисление всех критериев в точке решения
        self.all_criteria_values = {}
        if self.solution:
            for func_def in self.criteria:
                name = func_def.get("name", f"Критерий")
                val = self._evaluate_function(func_def, self.solution)
                self.all_criteria_values[name] = float(val)
        
        self._is_optimized = True
    def get_report(self) -> Dict[str, Any]:
        if not self._is_optimized:
            self.optimize()
        
        return {
            "meta": {
                "generated_at": datetime.datetime.now().isoformat(),
                "method": "Method of Main Criterion"
            },
            "results": {
                "solution": self.solution,
                "objective_value": self.objective_value,
                "all_criteria": self.all_criteria_values,
                "is_feasible": self.is_feasible
            }
        }

    def export_report_to_json(self, filename: str = "multi_criteria_report.json"):
        report = self.get_report()
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=4)
        return filename

def run_demo():
    payload = {
    "criteria": [
        {
            "name": "Прибыль",
            "func_type": "linear",
            "direction": "max",
            "params": {"coeffs": [50, 40]}  # 50*x1 + 40*x2
        },
        {
            "name": "Экология",
            "func_type": "linear",
            "direction": "min",
            "params": {"coeffs": [2, 3]}  # 2*x1 + 3*x2
        }
    ],
    "constraints": {
        "Экология": {"max": 100}
    },
    "main_criterion": "Прибыль",
    "variable_bounds": [(0, 100), (0, 100)]
}
    
    result = run_multi_criteria(payload)

    print(f"  Метод: {result['method_used']}")
    print(f"  Оптимальные значения: {result['optimum']}")
    
    if result['ranking']:
        print(f"  Решение: x = {result['ranking'][0]['solution']}")
        print(f"  Целевая функция: {result['ranking'][0]['objective_value']:.2f}")
    
    return result


if __name__ == "__main__":
    run_demo()