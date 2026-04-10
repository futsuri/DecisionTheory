# Algorithms: Added Modules

## two_player_game
- Entry point: `run_algorithm(input_data: dict) -> dict`
- Computes saddle point or mixed strategies for a zero-sum matrix game.
- Performs strict dominance reduction when possible.

## decision_under_uncertainty
- Entry point: `run_algorithm(input_data: dict) -> dict`
- Computes risk matrix and criteria: Wald, Savage, Hurwicz, Laplace, Bayes.
- Builds a comparison table and recommended strategies.

## Quick local demo
Run the tiny demo script from the repository root:

```cmd
python tools\demo_new_algorithms.py
```
