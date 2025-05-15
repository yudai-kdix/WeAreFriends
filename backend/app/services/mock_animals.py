import random

MOCK_ANIMALS = [
    "cat", "dog", "elephant", "bear", "zebra",
    "giraffe", "bird", "penguin", "horse", "sheep", "cow"
]


def select_random_animal() -> str:
    """
    ランダムに動物を選択して返す
    """
    return random.choice(MOCK_ANIMALS)