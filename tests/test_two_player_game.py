from app.algorithms.two_player_game import run_algorithm


def test_two_player_game_saddle_point():
    payload = {
        "player1_name": "P1",
        "player2_name": "P2",
        "player1_strategies": ["A1", "A2"],
        "player2_strategies": ["B1", "B2"],
        "payoff_matrix": [[2, 1], [3, 0]],
        "is_zero_sum": True,
    }
    result = run_algorithm(payload)
    assert result["status"] == "success"
    assert result["result"]["saddle_point"]["exists"] is True
    assert result["result"]["value"] == 1.0


def test_two_player_game_mixed():
    payload = {
        "player1_name": "P1",
        "player2_name": "P2",
        "player1_strategies": ["A1", "A2"],
        "player2_strategies": ["B1", "B2"],
        "payoff_matrix": [[1, -1], [-1, 1]],
        "is_zero_sum": True,
    }
    result = run_algorithm(payload)
    assert result["status"] == "success"
    assert result["result"]["saddle_point"]["exists"] is False
    mixed = result["result"]["mixed_strategies"]
    assert mixed is not None
    assert len(mixed["player1"]["probabilities"]) == 2
    assert len(mixed["player2"]["probabilities"]) == 2
