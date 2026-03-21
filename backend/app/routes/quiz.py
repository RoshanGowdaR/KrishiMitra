from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.quiz_service import get_leaderboard, get_quiz_by_id, get_quizzes, submit_quiz

router = APIRouter(tags=["Quiz"])


class QuizQuestionResponse(BaseModel):
    id: str
    question: str
    options: list[str]
    correct_answer: str
    explanation: str


class QuizResponse(BaseModel):
    id: str
    title: str
    category: Literal[
        "crop_management",
        "soil_health",
        "pest_control",
        "irrigation",
        "government_schemes",
        "market_knowledge",
    ]
    difficulty: Literal["beginner", "intermediate", "advanced"]
    language: str
    questions: list[QuizQuestionResponse]


class QuizListResponse(BaseModel):
    quizzes: list[QuizResponse]


class QuizAnswerRequestItem(BaseModel):
    question_id: str
    answer: str


class QuizSubmitRequest(BaseModel):
    answers: list[QuizAnswerRequestItem] = Field(default_factory=list)


class QuizQuestionResultResponse(BaseModel):
    question_id: str
    submitted_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str


class QuizSubmitResponse(BaseModel):
    quiz_id: str
    score_percentage: float
    correct_answers: int
    total_questions: int
    results: list[QuizQuestionResultResponse]


class LeaderboardItemResponse(BaseModel):
    attempt_id: str
    quiz_id: str
    score_percentage: float
    correct_answers: int
    total_questions: int
    submitted_at: str


class LeaderboardResponse(BaseModel):
    leaderboard: list[LeaderboardItemResponse]


@router.get("/quiz", response_model=QuizListResponse)
async def read_quizzes(
    language: str = Query(default="en", min_length=2, max_length=5),
    category: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
) -> QuizListResponse:
    quizzes = await get_quizzes(language=language, category=category, difficulty=difficulty)
    return QuizListResponse(quizzes=[QuizResponse(**quiz) for quiz in quizzes])


@router.get("/quiz/leaderboard", response_model=LeaderboardResponse)
async def read_quiz_leaderboard() -> LeaderboardResponse:
    leaderboard = await get_leaderboard()
    return LeaderboardResponse(
        leaderboard=[LeaderboardItemResponse(**item) for item in leaderboard]
    )


@router.get("/quiz/{quiz_id}", response_model=QuizResponse)
async def read_quiz_by_id(
    quiz_id: str,
    language: str = Query(default="en", min_length=2, max_length=5),
) -> QuizResponse:
    quiz = await get_quiz_by_id(quiz_id=quiz_id, language=language)
    return QuizResponse(**quiz)


@router.post("/quiz/{quiz_id}/submit", response_model=QuizSubmitResponse)
async def submit_quiz_answers(
    quiz_id: str,
    payload: QuizSubmitRequest,
) -> QuizSubmitResponse:
    result = await submit_quiz(quiz_id=quiz_id, answers=[item.model_dump() for item in payload.answers])
    return QuizSubmitResponse(**result)
