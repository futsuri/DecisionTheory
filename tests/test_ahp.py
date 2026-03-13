# tests/test_ahp.py
import pytest, random, math, json
from app.algorithms.ahp import AHPModel, run_ahp


def pairwise_from_weights(weights):
    #Строит попарную матрицу a[i][j] = w_i / w_j из вектора весов.
    n = len(weights)
    mat = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            mat[i][j] = float(weights[i]) / float(weights[j])
    return mat


def test_consistent_3x3_run_ahp():
    # создаёт взаимнообратную матрицу и проверяет нормализованность весов
    criteria = ["c1", "c2", "c3"]
    alternatives = ["a1", "a2"]

    crit_w = [3.0, 2.0, 1.0]
    criteria_matrix = pairwise_from_weights(crit_w)

    alt_w_per_crit = {
        "c1": [0.6, 0.4],
        "c2": [0.2, 0.8],
        "c3": [0.5, 0.5],
    }
    alt_matrices = {k: pairwise_from_weights(v) for k, v in alt_w_per_crit.items()}

    payload = {
        "criteria": criteria,
        "alternatives": alternatives,
        "matrix": criteria_matrix,
        "alt_matrices": alt_matrices,
    }

    res = run_ahp(payload)

    assert "consistency" in res
    assert res["consistency"]["is_consistent"] is True
    assert pytest.approx(0.0, abs=1e-8) == res["consistency"]["cr"]

    total = sum(crit_w)
    expected_weights = [w / total for w in crit_w]
    assert len(res["weights"]) == 3
    for got, exp in zip(res["weights"], expected_weights):
        assert pytest.approx(exp, rel=1e-6) == got

    assert isinstance(res["ranking"], list)
    assert len(res["ranking"]) == 2

    final_scores = []
    for ai in range(len(alternatives)):
        score = 0.0
        for k_i, crit in enumerate(criteria):
            aw = alt_w_per_crit[crit][ai]
            score += aw * expected_weights[k_i]
        final_scores.append(score)
    # ожидаемый порядок
    expected_order = sorted(range(len(final_scores)), key=lambda i: final_scores[i], reverse=True)
    got_order = [next(i for i, it in enumerate(res["ranking"]) if it["alternative"] == alternatives[i_name]) for i_name in expected_order]
    got_names = [it["alternative"] for it in res["ranking"]]
    expected_names = [alternatives[i] for i in expected_order]
    assert got_names == expected_names


def test_inconsistent_criteria_matrix_triggers_suggestion():
    # создаёт явно циклически несогласованную матрицу
    # c1 >> c2, c2 >> c3, c3 >> c1 (циклическая несогласованность)
    criteria = ["c1", "c2", "c3"]
    alternatives = ["a1", "a2"]
    criteria_matrix = [
        [1.0, 9.0, 1.0 / 9.0],
        [1.0 / 9.0, 1.0, 9.0],
        [9.0, 1.0 / 9.0, 1.0],
    ]

    alt_matrices = {
        "c1": [[1, 2], [0.5, 1]],
        "c2": [[1, 3], [1/3, 1]],
        "c3": [[1, 1], [1, 1]], 
    }

    payload = {
        "criteria": criteria,
        "alternatives": alternatives,
        "matrix": criteria_matrix,
        "alt_matrices": alt_matrices,
    }

    res = run_ahp(payload)

    # ожидаем, что согласованность нарушена
    assert "consistency" in res
    assert res["consistency"]["is_consistent"] is False
    assert res["consistency"]["cr"] > 0.1

    # и run_ahp должен добавить предложение по фиксу
    assert isinstance(res.get("suggestions"), list)
    assert len(res["suggestions"]) >= 1


def test_set_criteria_matrix_non_reciprocal_raises():
    # тест валидации
    m = AHPModel()
    m.set_criteria(["x", "y"])
    bad_matrix = [
        [1.0, 2.0],
        [2.0, 1.0],
    ]
    with pytest.raises(ValueError):
        m.set_criteria_matrix(bad_matrix)


def test_set_alternative_matrix_size_mismatch_raises():
    # тест валидации   
    m = AHPModel()
    m.set_criteria(["c1"])
    m.set_alternatives(["a1", "a2", "a3"])
    bad_alt = [
        [1.0, 2.0],
        [0.5, 1.0],
    ]
    with pytest.raises(ValueError):
        m.set_alternative_matrix("c1", bad_alt)


def test_get_report_triggers_calculation_and_contains_expected_keys():
    m = AHPModel()
    m.set_goal("T")
    m.set_criteria(["c1", "c2"])
    m.set_alternatives(["a1", "a2"])

    m.set_criteria_matrix([[1.0, 2.0], [0.5, 1.0]])
    m.set_alternative_matrix("c1", [[1.0, 1.5], [2/3, 1.0]])
    m.set_alternative_matrix("c2", [[1.0, 0.5], [2.0, 1.0]])

    report = m.get_report()
    assert "weights" in report
    assert "final_results" in report
    assert "criteria" in report["structure"]
    assert "alternatives" in report["structure"]
    assert set(report["weights"]["criteria"].keys()) == set(["c1", "c2"])
    assert set(report["weights"]["alternatives_by_criteria"].keys()) == set(["c1", "c2"])
    assert set(report["final_results"]["scores"].keys()) == set(["a1", "a2"])

def test_max_entities_20x20_consistent():
    # проверка расчёта в матрице на 20 критериев и 20 альтернатив (гарантированно согласованная)
    from app.algorithms.ahp import run_ahp
    def pairwise_from_weights(weights):
        n = len(weights)
        return [[float(weights[i]) / float(weights[j]) for j in range(n)] for i in range(n)]

    n = 20
    criteria = [f"c{i}" for i in range(n)]
    alternatives = [f"a{i}" for i in range(n)]

    crit_w = [i + 1.0 for i in range(n)]
    criteria_matrix = pairwise_from_weights(crit_w)

    alt_matrices = {}
    for crit in criteria:
        alt_w = [((i % 5) + 1.0) for i in range(n)]
        alt_matrices[crit] = pairwise_from_weights(alt_w)

    payload = {"criteria": criteria, "alternatives": alternatives, "matrix": criteria_matrix, "alt_matrices": alt_matrices}
    res = run_ahp(payload)

    assert res["consistency"]["is_consistent"] is True
    assert res["consistency"]["cr"] == pytest.approx(0.0, abs=1e-12)
    assert len(res["weights"]) == n
    assert len(res["ranking"]) == n

def test_exceed_max_entities_raises():
    from app.algorithms.ahp import AHPModel
    m = AHPModel()
    criteria = [f"c{i}" for i in range(21)]
    with pytest.raises(ValueError):
        m.set_criteria(criteria)

def test_missing_alt_matrices_uses_defaults():
    # проверка на автозаполненные единицами матрицы при отсутствии некоторых матриц альтернатив
    from app.algorithms.ahp import run_ahp
    criteria = ["c1", "c2", "c3"]
    alternatives = ["a1", "a2", "a3"]
    crit_w = [3.0, 2.0, 1.0]
    def pairwise_from_weights(weights):
        n = len(weights)
        return [[float(weights[i]) / float(weights[j]) for j in range(n)] for i in range(n)]
    criteria_matrix = pairwise_from_weights(crit_w)
    alt_matrices = {
        "c1": pairwise_from_weights([0.6, 0.3, 0.1])
    }
    payload = {"criteria": criteria, "alternatives": alternatives, "matrix": criteria_matrix, "alt_matrices": alt_matrices}
    res = run_ahp(payload)
    assert "ranking" in res and len(res["ranking"]) == 3

def test_random_consistent_matrices_stability():
    # генерация несколько случайных согласованных матриц
    from app.algorithms.ahp import run_ahp
    def pairwise_from_weights(weights):
        n = len(weights)
        return [[float(weights[i]) / float(weights[j]) for j in range(n)] for i in range(n)]
    for n in (3, 5, 7):
        criteria = [f"c{i}" for i in range(n)]
        alternatives = [f"a{i}" for i in range(n)]
        crit_w = [random.uniform(0.1, 10.0) for _ in range(n)]
        criteria_matrix = pairwise_from_weights(crit_w)
        alt_matrices = {c: pairwise_from_weights([random.uniform(0.1, 5.0) for _ in range(n)]) for c in criteria}
        payload = {"criteria": criteria, "alternatives": alternatives, "matrix": criteria_matrix, "alt_matrices": alt_matrices}
        res = run_ahp(payload)
        assert math.isfinite(res["consistency"]["cr"])
        assert res["consistency"]["cr"] <= 1.0

'''------------------------------------'''

def test_ahp_simple_linear():
    payload = {
        "criteria": ["Цена", "Качество"],
        "alternatives": ["A", "B"],
        "matrix": [
            [1,   3],
            [1/3, 1]
        ],
        "alt_matrices": {
            "Цена": [
                [1,   2],
                [1/2, 1]
            ],
            "Качество": [
                [1,   1/2],
                [2,   1]
            ]
        }
    }
    result = run_ahp(payload)
    weights = result["weights"]
    ranking = result["ranking"]
    assert abs(sum(weights) - 1.0) < 1e-6
    assert len(ranking) == 2
    assert ranking[0]["score"] >= ranking[1]["score"]

def test_ahp_discrete_apartment_selection():
    payload = {
        "criteria": ["Цена", "Площадь", "Этаж", "Ремонт"],
        "alternatives": ["Кв. 1", "Кв. 2", "Кв. 3"],
        "matrix": [ 
            [1,    3,    5,    2],   # Цена
            [1/3,  1,    3,    1/2], # Площадь
            [1/5,  1/3,  1,    1/4], # Этаж
            [1/2,  2,    4,    1]    # Ремонт
        ],
        "alt_matrices": {
            "Цена": [ 
                [1,      2,      1/3],  # Кв. 1 vs Кв. 2 vs Кв. 3
                [1/2,    1,      1/4],
                [3,      4,      1]
            ],
            "Площадь": [
                [1,      1/2,    2],
                [2,      1,      3],
                [1/2,    1/3,    1]
            ],
            "Этаж": [
                [1,      3,      2],
                [1/3,    1,      1/2],
                [1/2,    2,      1]
            ],
            "Ремонт": [
                [1,      1/3,    1/2],
                [3,      1,      2],
                [2,      1/2,    1]
            ]
        }
    }
    
    result = run_ahp(payload)
    
    assert len(result["ranking"]) == 3
    assert all("alternative" in item and "score" in item for item in result["ranking"])
    
    total_score = sum(item["score"] for item in result["ranking"])
    assert abs(total_score - 1.0) < 1e-6
    
    print("\n=== Дискретный выбор квартиры ===")
    for item in result["ranking"]:
        print(f"{item['alternative']}: {item['score']:.3f} ({item['score_percent']:.1f}%)")
    print(f"Лучшая: {result['ranking'][0]['alternative']}")


