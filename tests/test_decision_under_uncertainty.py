from app.algorithms.decision_under_uncertainty import run_algorithm


def test_decision_under_uncertainty_basic():
    payload = {
        "decision_maker": "Farmer",
        "strategies": ["Wheat", "Corn", "Sunflower"],
        "states_of_nature": ["Good", "Drought", "Rain"],
        "payoff_matrix": [[18, -3, 4], [22, 2, -5], [14, 8, 6]],
        "lambda": 0.5,
        "probabilities": [0.4, 0.3, 0.3],
        "optimization": "max",
    }
    result = run_algorithm(payload)
    assert result["status"] == "success"
    assert "risk_matrix" in result["result"]
    assert "criteria" in result["result"]
    assert "comparison_table" in result["result"]
    assert result["result"]["probabilities"] == [0.4, 0.3, 0.3]
    assert result["result"]["recommendation"]["best_strategy"]
    assert result["result"]["hurwicz_interpretation"]["pessimism_weight"] == 0.5


def test_decision_under_uncertainty_no_probabilities():
    payload = {
        "decision_maker": "Farmer",
        "strategies": ["Wheat", "Corn"],
        "states_of_nature": ["Good", "Bad"],
        "payoff_matrix": [[5, -1], [2, 3]],
        "lambda": 0.3,
        "optimization": "max",
    }
    result = run_algorithm(payload)
    assert result["status"] == "success"
    assert result["result"]["criteria"]["bayes"]["scores"] is None
    assert "bayes" not in result["result"]["recommendation"]["criteria_considered"]
