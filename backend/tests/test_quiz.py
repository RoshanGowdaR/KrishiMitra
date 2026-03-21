import asyncio

from fastapi.testclient import TestClient

from app.main import app
from app.services.quiz_service import get_quiz_by_id, reset_quiz_state

client = TestClient(app)


def _build_correct_answers(quiz_id: str, language: str = "en") -> list[dict[str, str]]:
    quiz = asyncio.run(get_quiz_by_id(quiz_id=quiz_id, language=language))
    return [
        {"question_id": question["id"], "answer": question["correct_answer"]}
        for question in quiz["questions"]
    ]


def _build_wrong_answers(quiz_id: str, language: str = "en") -> list[dict[str, str]]:
    quiz = asyncio.run(get_quiz_by_id(quiz_id=quiz_id, language=language))
    wrong_answers: list[dict[str, str]] = []
    for question in quiz["questions"]:
        options = question["options"]
        correct_answer = question["correct_answer"]
        fallback = next(option for option in options if option != correct_answer)
        wrong_answers.append({"question_id": question["id"], "answer": fallback})
    return wrong_answers


def test_get_all_quizzes_returns_list_with_correct_fields() -> None:
    response = client.get("/api/v1/quiz?language=en")

    assert response.status_code == 200
    quizzes = response.json()["quizzes"]
    assert len(quizzes) >= 3

    first = quizzes[0]
    required_fields = {"id", "title", "category", "difficulty", "language", "questions"}
    assert required_fields.issubset(first.keys())


def test_get_quiz_by_valid_id_returns_200() -> None:
    response = client.get("/api/v1/quiz/quiz-crop-basics-en?language=en")

    assert response.status_code == 200
    assert response.json()["id"] == "quiz-crop-basics-en"


def test_get_quiz_by_invalid_id_returns_404() -> None:
    response = client.get("/api/v1/quiz/invalid-quiz-id?language=en")

    assert response.status_code == 404
    assert response.json()["detail"] == "Quiz not found"


def test_submit_correct_answers_returns_100_percent_score() -> None:
    asyncio.run(reset_quiz_state())
    answers = _build_correct_answers("quiz-crop-basics-en", language="en")

    response = client.post("/api/v1/quiz/quiz-crop-basics-en/submit", json={"answers": answers})

    assert response.status_code == 200
    body = response.json()
    assert body["score_percentage"] == 100.0
    assert body["correct_answers"] == 5


def test_submit_wrong_answers_returns_0_percent_score() -> None:
    asyncio.run(reset_quiz_state())
    answers = _build_wrong_answers("quiz-crop-basics-en", language="en")

    response = client.post("/api/v1/quiz/quiz-crop-basics-en/submit", json={"answers": answers})

    assert response.status_code == 200
    body = response.json()
    assert body["score_percentage"] == 0.0
    assert body["correct_answers"] == 0


def test_leaderboard_returns_list() -> None:
    asyncio.run(reset_quiz_state())
    answers = _build_correct_answers("quiz-crop-basics-en", language="en")
    client.post("/api/v1/quiz/quiz-crop-basics-en/submit", json={"answers": answers})

    response = client.get("/api/v1/quiz/leaderboard")

    assert response.status_code == 200
    leaderboard = response.json()["leaderboard"]
    assert isinstance(leaderboard, list)
    assert len(leaderboard) >= 1
