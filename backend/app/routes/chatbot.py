from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.chatbot_service import (
    SUPPORTED_LANGUAGES,
    get_chat_response,
    text_to_speech_info,
    translate_text,
)

router = APIRouter(tags=["Chatbot"])


class ChatHistoryItem(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatMessageRequest(BaseModel):
    message: str
    conversation_history: list[ChatHistoryItem] = Field(default_factory=list)
    language: str = Field(default="en", min_length=2, max_length=5)


class ChatMessageResponse(BaseModel):
    response_text: str
    conversation_history: list[ChatHistoryItem]
    language: str


class TranslateRequest(BaseModel):
    text: str
    target_language: str = Field(..., min_length=2, max_length=5)


class TranslateResponse(BaseModel):
    translated_text: str
    target_language: str


class LanguageItem(BaseModel):
    code: str
    name: str
    language_code: str
    voice_name: str


class LanguagesResponse(BaseModel):
    languages: list[LanguageItem]


class TTSInfoRequest(BaseModel):
    text: str
    language: str = Field(default="en", min_length=2, max_length=5)


class TTSInfoResponse(BaseModel):
    text: str
    language_code: str
    voice_name: str


@router.post("/chatbot/message", response_model=ChatMessageResponse)
async def chat_message(payload: ChatMessageRequest) -> ChatMessageResponse:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    history = [item.model_dump() for item in payload.conversation_history]
    result = await get_chat_response(
        message=payload.message,
        conversation_history=history,
        language=payload.language,
    )
    return ChatMessageResponse(**result)


@router.post("/chatbot/translate", response_model=TranslateResponse)
async def chat_translate(payload: TranslateRequest) -> TranslateResponse:
    translated_text = await translate_text(payload.text, payload.target_language)
    return TranslateResponse(
        translated_text=translated_text,
        target_language=payload.target_language,
    )


@router.get("/chatbot/languages", response_model=LanguagesResponse)
async def chat_languages() -> LanguagesResponse:
    return LanguagesResponse(languages=[LanguageItem(**item) for item in SUPPORTED_LANGUAGES])


@router.post("/chatbot/tts-info", response_model=TTSInfoResponse)
async def chat_tts_info(payload: TTSInfoRequest) -> TTSInfoResponse:
    result = await text_to_speech_info(payload.text, payload.language)
    return TTSInfoResponse(**result)
