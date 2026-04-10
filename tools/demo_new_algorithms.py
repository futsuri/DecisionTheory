from app.algorithms.two_player_game import run_algorithm as run_two_player_game
from app.algorithms.decision_under_uncertainty import run_algorithm as run_uncertainty


def main():
    two_player_payload = {
        "player1_name": "Defender",
        "player2_name": "Attacker",
        "player1_strategies": ["A1", "A2", "A3"],
        "player2_strategies": ["B1", "B2"],
        "payoff_matrix": [[10, 5], [7, 8], [4, 6]],
        "is_zero_sum": True,
    }

    uncertainty_payload = {
        "decision_maker": "Farmer",
        "strategies": ["Wheat", "Corn", "Sunflower"],
        "states_of_nature": ["Good", "Drought", "Rain"],
        "payoff_matrix": [[18, -3, 4], [22, 2, -5], [14, 8, 6]],
        "lambda": 0.5,
        "probabilities": [0.4, 0.3, 0.3],
        "optimization": "max",
    }

    print("Two-player game:")
    print(run_two_player_game(two_player_payload))

    print("\nDecision under uncertainty:")
    print(run_uncertainty(uncertainty_payload))


if __name__ == "__main__":
    main()
