# tests/test_multi_criteria.py
import math
import json
import pytest
from app.algorithms.multi_criteria import MultiCriteriaModel, run_multi_criteria



def test_set_criteria_exceed_max_raises():
    # проверка ограничения критериев
    m = MultiCriteriaModel()
    criteria = [{"name": f"c{i}", "func_type": "linear", "direction": "max", "params": {"coeffs": [0]}} for i in range(4)]
    with pytest.raises(ValueError):
        m.set_criteria(criteria)


def test_set_variable_bounds_exceed_max_raises():
    # проверка ограничения размерности (количества переменных)
    m = MultiCriteriaModel()
    bounds = [(0, 1) for _ in range(6)]
    with pytest.raises(ValueError):
        m.set_variable_bounds(bounds)


def test_set_main_criterion_by_name_invalid_raises():
    # поиск главного критерия по имени
    m = MultiCriteriaModel()
    m.set_criteria([{"name": "a", "func_type": "linear", "params": {"coeffs": [0]}}])
    with pytest.raises(ValueError):
        m.set_main_criterion_by_name("not_found")


def test_logarithmic_requires_positive_x_raises():
    # проверка математического ограничения логарифма
    m = MultiCriteriaModel()
    m.set_criteria([{"name": "logc", "func_type": "logarithmic", "direction": "max", "params": {"coeffs": [0, 1]}}])
    m.set_variable_bounds([( -1, 1 )])
    with pytest.raises(ValueError):
        m._evaluate_function(m.criteria[0], [0])


def test_linear_maximization_simple():
    # базовая оптимизация
    payload = {
        "criteria": [
            {"name": "Profit", "func_type": "linear", "direction": "max",
             "params": {"coeffs": [0, 50]}}
        ],
        "variable_bounds": [(0, 10)],
        "main_criterion": "Profit",
    }

    res = run_multi_criteria(payload)

    assert res["is_feasible"] is True

    sol = res["ranking"][0]["solution"]
    assert sol[0] == pytest.approx(10.0, rel=1e-3)

    assert res["ranking"][0]["objective_value"] == pytest.approx(500.0, rel=1e-3)


def test_quadratic_minimization():
    # проверка работы квадратичной функции
    coeffs = [13.0, -4.0, -6.0, 1.0, 0.0, 1.0]
    payload = {
        "criteria": [
            {"name": "quad", "func_type": "quadratic", "direction": "min", "params": {"coeffs": coeffs}}
        ],
        "variable_bounds": [(-10, 10), (-10, 10)],
        "main_criterion": "quad",
    }
    res = run_multi_criteria(payload)
    assert res["is_feasible"] is True
    sol = res["ranking"][0]["solution"]
    assert pytest.approx(2.0, rel=1e-2) == sol[0]
    assert pytest.approx(3.0, rel=1e-2) == sol[1]


def test_exponential_maximization_single_var():
    # проверка экспоненциальной функции
    payload = {
        "criteria": [
            {"name": "exp", "func_type": "exponential", "direction": "max", "params": {"coeffs": [0, 1]}}
        ],
        "variable_bounds": [(0, 1)],
        "main_criterion": "exp",
    }
    res = run_multi_criteria(payload)
    assert res["is_feasible"] is True
    sol = res["ranking"][0]["solution"]
    assert pytest.approx(1.0, rel=1e-3) == sol[0]
    assert pytest.approx(math.exp(1.0), rel=1e-3) == res["ranking"][0]["objective_value"]

def test_logarithmic_case():
    # проверка логарифмической функции
    payload = {
        "criteria": [
            {"name": "Логарифм", "func_type": "logarithmic", "direction": "max",
             "params": {"coeffs": [0, 1, 1]}},    # ln(x1) + ln(x2)
            {"name": "Ограничитель", "func_type": "linear", "direction": "min",
             "params": {"coeffs": [0, 1, 1]}}
        ],
        "constraints": {"Ограничитель": {"max": 8}},  # x1+x2 <= 8
        "main_criterion": "Логарифм",
        "variable_bounds": [(0.1, 10), (0.1, 10)]   # нижняя граница >0 для логарифма
    }
    result = run_multi_criteria(payload)
    assert result["is_feasible"] is True
    sol = result["ranking"][0]["solution"]
    assert sol[0] > 0 and sol[1] > 0


def test_constraints_thresholds_limit_solution():
    # проверка ограничения по критериям
    payload = {
        "criteria": [
            {"name": "Profit", "func_type": "linear", "direction": "max", "params": {"coeffs": [0, 10]}},
            {"name": "Cost", "func_type": "linear", "direction": "min", "params": {"coeffs": [0, 10]}},
        ],
        "constraints": {"Cost": {"max": 50}},
        "main_criterion": "Profit",
        "variable_bounds": [(0, 10)],
    }
    res = run_multi_criteria(payload)
    assert res["is_feasible"] is True
    sol = res["ranking"][0]["solution"]
    assert pytest.approx(5.0, rel=1e-3) == sol[0]
    assert pytest.approx(50.0, rel=1e-3) == res["ranking"][0]["objective_value"]


def test_infeasible_due_to_tight_threshold():
    # невыполнимая задача
    payload = {
        "criteria": [
            {"name": "Main", "func_type": "linear", "direction": "max", "params": {"coeffs": [0, 1]}},
            {"name": "Cost", "func_type": "linear", "direction": "min", "params": {"coeffs": [0, 1]}},
        ],
        "constraints": {"Cost": {"max": 0}},
        "main_criterion": "Main",
        "variable_bounds": [(1, 2)],
    }
    res = run_multi_criteria(payload)
    assert res["is_feasible"] is False
    assert res["ranking"] == []


def test_export_report_to_json_creates_file(tmp_path):
    # проверка экспорта отчёта в json
    m = MultiCriteriaModel()
    m.set_criteria([{"name": "P", "func_type": "linear", "direction": "max", "params": {"coeffs": [0, 1]}}])
    m.set_variable_bounds([(0, 1)])
    filename = tmp_path / "mc_report.json"
    returned = m.export_report_to_json(str(filename))
    assert returned == str(filename)
    with open(str(filename), "r", encoding="utf-8") as f:
        doc = json.load(f)
    assert "results" in doc


def test_check_bounds_valid():
    # подача точки внутри области
    m = MultiCriteriaModel()
    m.set_variable_bounds([(0, 10), (0, 5)])
    assert m._check_bounds([5, 3]) is True


def test_check_bounds_invalid():
    # подача точки вне области
    m = MultiCriteriaModel()
    m.set_variable_bounds([(0, 10)])
    assert m._check_bounds([11]) is False


def test_check_thresholds_max_pass():
    m = MultiCriteriaModel()
    m.set_criteria([
        {"name": "main", "func_type": "linear", "direction": "max", "params": {"coeffs": [0, 1]}},
        {"name": "sec", "func_type": "linear", "direction": "max", "params": {"coeffs": [0, 1]}}
    ])
    m.set_variable_bounds([(0, 10)])
    m.set_thresholds({1: 5})
    assert m._check_thresholds([6]) is True


def test_check_thresholds_max_fail():
    m = MultiCriteriaModel()
    m.set_criteria([
        {"name": "main", "func_type": "linear", "direction": "max", "params": {"coeffs": [0, 1]}},
        {"name": "sec", "func_type": "linear", "direction": "max", "params": {"coeffs": [0, 1]}}
    ])
    m.set_variable_bounds([(0, 10)])
    m.set_thresholds({1: 5})
    assert m._check_thresholds([4]) is False


def test_objective_function_max_sign():
    # проверка поведения для задачи максимизации
    m = MultiCriteriaModel()
    m.set_criteria([
        {"name": "profit", "func_type": "linear", "direction": "max", "params": {"coeffs": [0, 10]}}
    ])
    m.set_variable_bounds([(0, 10)])
    val = m._objective_function([5])
    assert val == -50


def test_objective_function_min_sign():
    # проверка поведения дял задачи минимизации
    m = MultiCriteriaModel()
    m.set_criteria([
        {"name": "cost", "func_type": "linear", "direction": "min", "params": {"coeffs": [0, 10]}}
    ])
    m.set_variable_bounds([(0, 10)])
    val = m._objective_function([5])
    assert val == 50


def test_invalid_function_type():
    # проверка некорректного типа функции
    m = MultiCriteriaModel()
    func = {"name": "bad", "func_type": "unknown", "params": {"coeffs": [0]}}
    with pytest.raises(ValueError):
        m._evaluate_function(func, [1])


def test_multiple_variables_linear():
    # проверка оптимизации задачи с несколькими переменными
    payload = {
        "criteria": [
            {"name": "profit", "func_type": "linear", "direction": "max",
             "params": {"coeffs": [0, 5, 10, 3]}}
        ],
        "variable_bounds": [(0, 10), (0, 10), (0, 10)],
        "main_criterion": "profit"
    }

    res = run_multi_criteria(payload)

    assert res["is_feasible"] is True
    sol = res["ranking"][0]["solution"]
    assert pytest.approx(10, rel=1e-2) == sol[0]
    assert pytest.approx(10, rel=1e-2) == sol[1]
    assert pytest.approx(10, rel=1e-2) == sol[2]


def test_run_multi_criteria_missing_bounds():
    # проверка обработки входных данных функции run_multi_criteria
    payload = {
        "criteria": [
            {"name": "profit", "func_type": "linear", "direction": "max",
             "params": {"coeffs": [0, 1]}}
        ]
    }

    with pytest.raises(ValueError):
        run_multi_criteria(payload)


def test_run_multi_criteria_no_criteria():
    # проверка при пустом списке критериев
    payload = {
        "criteria": [],
        "variable_bounds": [(0, 10)]
    }

    with pytest.raises(ValueError):
        run_multi_criteria(payload)


def test_three_criteria_optimization():
    # проверка работы алгоритма при нескольких критериях и пороговых ограничений
    payload = {
        "criteria": [
            {"name": "profit", "func_type": "linear", "direction": "max",
             "params": {"coeffs": [0, 20, 10]}},

            {"name": "pollution", "func_type": "linear", "direction": "min",
             "params": {"coeffs": [0, 1, 2]}},

            {"name": "energy", "func_type": "linear", "direction": "min",
             "params": {"coeffs": [0, 2, 1]}}
        ],

        "constraints": {
            "pollution": {"max": 30},
            "energy": {"max": 30}
        },

        "main_criterion": "profit",
        "variable_bounds": [(0, 10), (0, 10)]
    }

    res = run_multi_criteria(payload)

    assert res["is_feasible"] is True
    assert len(res["ranking"]) == 1


def test_differential_evolution_method():
    # проверка альтернативного метода оптимизации
    m = MultiCriteriaModel()

    m.set_criteria([
        {"name": "profit", "func_type": "linear", "direction": "max",
         "params": {"coeffs": [0, 5]}}
    ])

    m.set_variable_bounds([(0, 10)])

    m.optimize(method="differential_evolution")

    assert m.is_feasible is True
    assert pytest.approx(10, rel=1e-2) == m.solution[0]

'''-----------------------------------'''


