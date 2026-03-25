from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.voice_service import generate_speech, get_greeting_audio

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    language: str = "en"


@router.get("/voice/greeting")
async def greeting(language: str = "en"):
    try:
        audio = await get_greeting_audio(language)
        return Response(
            content=audio,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "no-cache",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Voice generation failed: {str(e)}") from e


@router.post("/voice/speak")
async def text_to_speech(request: TTSRequest):
    try:
        audio = await generate_speech(request.text, request.language)
        return Response(
            content=audio,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "no-cache",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Voice generation failed: {str(e)}") from e
