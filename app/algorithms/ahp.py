"""
ahp.py — Метод аналитической иерархии (AHP).
"""

import json
import datetime
from typing import List, Dict, Any, Optional


def run_ahp(payload):

    model = AHPModel()
    
    criteria = payload.get("criteria", [])
    alternatives = payload.get("alternatives", [])
    matrix = payload.get("matrix", [])
    alt_matrices = payload.get("alt_matrices", {})
    
    model.set_criteria(criteria)
    model.set_alternatives(alternatives)
    model.set_criteria_matrix(matrix)
    
    for crit_name, crit_matrix in alt_matrices.items():
        model.set_alternative_matrix(crit_name, crit_matrix)
         
    model.calculate()
    report = model.get_report()
    
    weights = [report["weights"]["criteria"][crit] for crit in criteria]
    ranking = report["final_results"]["ranking"]
    
    consistency = model._calculate_consistency()
    
    suggestions = []
    if not consistency["is_consistent"]:
        suggestions.append("Индекс согласованности превышает 0.1. Рекомендуется перепроверить матрицу сравнений.")
    
    return {
        "weights": weights,
        "ranking": ranking,
        "consistency": consistency,
        "suggestions": suggestions
    }


class AHPModel:
    MAX_ENTITIES = 20 

    def __init__(self):
        self.goal: str = ""
        self.criteria: List[str] = []
        self.alternatives: List[str] = []

        self.criteria_matrix: Optional[List[List[float]]] = None
        
        self.alternatives_matrices: Dict[str, List[List[float]]] = {}
        
        self.criteria_weights: Optional[List[float]] = None
        self.alternatives_weights: Dict[str, List[float]] = {}
        self.final_scores: Optional[List[float]] = None
        self.ranking: List[Dict[str, Any]] = []
        
        self._is_calculated = False

    def set_goal(self, goal: str):
        self.goal = goal
        self._is_calculated = False

    def set_criteria(self, criteria_names: List[str]):
        if len(criteria_names) > self.MAX_ENTITIES:
            raise ValueError(f"Количество критериев не должно превышать {self.MAX_ENTITIES}")
        if len(criteria_names) < 1:
            raise ValueError("Должен быть хотя бы один критерий")
        
        self.criteria = criteria_names
        n = len(criteria_names)
        self.criteria_matrix = [[1.0 for _ in range(n)] for _ in range(n)]
        self._is_calculated = False

    def set_alternatives(self, alternatives_names: List[str]):
        if len(alternatives_names) > self.MAX_ENTITIES:
            raise ValueError(f"Количество альтернатив не должно превышать {self.MAX_ENTITIES}")
        if len(alternatives_names) < 1:
            raise ValueError("Должна быть хотя бы одна альтернатива")
            
        self.alternatives = alternatives_names

        for crit in self.criteria:
            m = len(alternatives_names)
            self.alternatives_matrices[crit] = [[1.0 for _ in range(m)] for _ in range(m)]
        self._is_calculated = False

    def set_criteria_matrix(self, matrix_data: List[List[float]]):
        self._validate_matrix(matrix_data, len(self.criteria), "Критериев")
        self.criteria_matrix = matrix_data
        self._is_calculated = False

    def set_alternative_matrix(self, criterion_name: str, matrix_data: List[List[float]]):
        if criterion_name not in self.criteria:
            raise ValueError(f"Критерий '{criterion_name}' не найден")
            
        self._validate_matrix(matrix_data, len(self.alternatives), "Альтернатив")
        self.alternatives_matrices[criterion_name] = matrix_data
        self._is_calculated = False

    def _validate_matrix(self, matrix: List[List[float]], expected_size: int, matrix_type: str):
        if len(matrix) != expected_size or len(matrix[0]) != expected_size:
            raise ValueError(f"Размер матрицы {matrix_type} должен быть {expected_size}x{expected_size}")
        
        for i in range(expected_size):
            for j in range(expected_size):
                if matrix[i][j] <= 0:
                    raise ValueError(f"Элементы матрицы {matrix_type} должны быть положительными числами")
        
        for i in range(expected_size):
            for j in range(i + 1, expected_size):
                if abs(matrix[i][j] - 1.0 / matrix[j][i]) > 1e-5:
                    raise ValueError(f"Нарушено свойство взаимности матрицы {matrix_type} в ячейке [{i},{j}]")

    def _normalize_matrix(self, matrix: List[List[float]]) -> List[List[float]]:
        n = len(matrix)
        column_sums = [0.0 for _ in range(n)]
        
        for j in range(n):
            for i in range(n):
                column_sums[j] += matrix[i][j]
        
        normalized_matrix = [[0.0 for _ in range(n)] for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if column_sums[j] != 0:
                    normalized_matrix[i][j] = matrix[i][j] / column_sums[j]
                else:
                    normalized_matrix[i][j] = 0.0
        
        return normalized_matrix

    def _calculate_weights(self, normalized_matrix: List[List[float]]) -> List[float]:
        n = len(normalized_matrix)
        weights = [0.0 for _ in range(n)]
        
        for i in range(n):
            row_sum = 0.0
            for j in range(n):
                row_sum += normalized_matrix[i][j]
            weights[i] = row_sum / n
        
        return weights

    def calculate(self):
        if self.criteria_matrix is None or not self.alternatives_matrices:
            raise ValueError("Необходимо заполнить все матрицы сравнений перед расчетом")

        norm_criteria_matrix = self._normalize_matrix(self.criteria_matrix)
        self.criteria_weights = self._calculate_weights(norm_criteria_matrix)

        self.alternatives_weights = {}
        for crit in self.criteria:
            mat = self.alternatives_matrices[crit]
            norm_mat = self._normalize_matrix(mat)
            self.alternatives_weights[crit] = self._calculate_weights(norm_mat)

        alt_matrix_for_synthesis = [[0.0 for _ in range(len(self.criteria))] for _ in range(len(self.alternatives))]
        for i, crit in enumerate(self.criteria):
            for j in range(len(self.alternatives)):
                alt_matrix_for_synthesis[j][i] = self.alternatives_weights[crit][j]
        
        self.final_scores = [0.0 for _ in range(len(self.alternatives))]
        for i in range(len(self.alternatives)):
            for j in range(len(self.criteria)):
                self.final_scores[i] += alt_matrix_for_synthesis[i][j] * self.criteria_weights[j]

        sorted_indices = sorted(range(len(self.final_scores)), key=lambda k: self.final_scores[k], reverse=True)
        self.ranking = []
        for idx in sorted_indices:
            self.ranking.append({
                "alternative": self.alternatives[idx],
                "score": float(self.final_scores[idx]),
                "score_percent": float(self.final_scores[idx] * 100)
            })

        self._is_calculated = True

    def _calculate_consistency(self) -> Dict[str, Any]:
        if self.criteria_matrix is None or self.criteria_weights is None:
            return {"cr": 0.0, "is_consistent": True}
        
        n = len(self.criteria_matrix)
        if n <= 2:
            return {"cr": 0.0, "is_consistent": True}
        
        ri_values = {1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}
        
        aw = [0.0 for _ in range(n)]
        for i in range(n):
            for j in range(n):
                aw[i] += self.criteria_matrix[i][j] * self.criteria_weights[j]
        
        lambda_max = 0.0
        for i in range(n):
            if self.criteria_weights[i] > 0:
                lambda_max += aw[i] / self.criteria_weights[i]
        lambda_max /= n
        
        ci = (lambda_max - n) / (n - 1)
        ri = ri_values.get(n, 1.49)
        cr = ci / ri if ri > 0 else 0.0
        
        return {"cr": float(cr), "is_consistent": cr <= 0.1}

    def get_report(self) -> Dict[str, Any]:
        if not self._is_calculated:
            self.calculate()

        report = {
            "meta": {
                "generated_at": datetime.datetime.now().isoformat(),
                "method": "Analytic Hierarchy Process (Saaty)",
                "goal": self.goal
            },
            "structure": {
                "criteria": self.criteria,
                "alternatives": self.alternatives
            },
            "weights": {
                "criteria": {
                    name: float(weight) 
                    for name, weight in zip(self.criteria, self.criteria_weights)
                },
                "alternatives_by_criteria": {}
            },
            "final_results": {
                "scores": {
                    name: float(score) 
                    for name, score in zip(self.alternatives, self.final_scores)
                },
                "ranking": self.ranking,
                "best_alternative": self.ranking[0]["alternative"] if self.ranking else None
            },
            "intermediate_matrices": {
                "criteria_matrix": self.criteria_matrix,
                "alternatives_matrices": {
                    k: v for k, v in self.alternatives_matrices.items()
                }
            }
        }

        for crit in self.criteria:
            report["weights"]["alternatives_by_criteria"][crit] = {
                name: float(weight)
                for name, weight in zip(self.alternatives, self.alternatives_weights[crit])
            }
            
        return report

    def export_report_to_json(self, filename: str = "ahp_report.json"):
        report = self.get_report()
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=4)
        return filename


def run_demo_apartment_selection():
    print("Выбор квартиры")
    
    model = AHPModel()
    model.set_goal("Квартира для временного проживания сотрудников")

    criteria_names = ["цена", "размер", "комнаты", "близость", "категория"] 
    model.set_criteria(criteria_names)
    
    alternatives_names = ["Квартира 1", "Квартира 2", "Квартира 3"]
    model.set_alternatives(alternatives_names)
    
    criteria_matrix = [
        [1,   3,   1,   0.5, 5],
        [1/3, 1,   0.25, 1/7, 2],
        [1,   4,   1,   1,   6],
        [2,   7,   1,   1,   8],
        [1/5, 0.5, 1/6, 1/8, 1]
    ]
    model.set_criteria_matrix(criteria_matrix)
    
    model.set_alternative_matrix("цена", [
        [1, 4, 0.5],
        [0.25, 1, 0.2],
        [2, 5, 1]
    ])
    
    model.set_alternative_matrix("размер", [
        [1, 0.5, 3],
        [2, 1, 4],
        [1/3, 0.25, 1]
    ])
    
    model.set_alternative_matrix("комнаты", [
        [1, 1, 2],
        [1, 1, 3],
        [0.5, 1/3, 1]
    ])
    
    model.set_alternative_matrix("близость", [
        [1, 1/3, 4],
        [3, 1, 5],
        [0.25, 0.2, 1]
    ])
    
    model.set_alternative_matrix("категория", [
        [1, 2, 0.2],
        [0.5, 1, 1/6],
        [5, 6, 1]
    ])

    model.calculate()
    report = model.get_report()
    
    print("\nВеса критериев:")
    for crit, weight in report['weights']['criteria'].items():
        print(f"  {crit}: {weight:.3f} ({weight*100:.1f}%)")
        
    print("\nИтоговые веса альтернатив:")
    for item in report['final_results']['ranking']:
        print(f"  {item['alternative']}: {item['score']:.3f} ({item['score_percent']:.1f}%)")
        
    print(f"\nРекомендация: {report['final_results']['best_alternative']}")
    
    filename = model.export_report_to_json("apartment_report.json")

    return model


if __name__ == "__main__":
    base_model = run_demo_apartment_selection()