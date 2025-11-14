"""
Modal serverless function for Whisper transcription
This file defines the Modal app and function for processing audio
"""
import modal

# Create Modal app
app = modal.App("voicedform-whisper")

# Create Modal image with Whisper dependencies
whisper_image = modal.Image.debian_slim().pip_install(
    "openai-whisper",
    "torch",
    "torchaudio",
    "ffmpeg-python"
).apt_install("ffmpeg")


@app.function(
    image=whisper_image,
    gpu="T4",  # Use T4 GPU for faster transcription
    timeout=300,  # 5 minute timeout
)
def transcribe_audio(audio_bytes: bytes, language: str = "en") -> dict:
    """
    Transcribe audio using Whisper model

    Args:
        audio_bytes: Raw audio file bytes
        language: Language code (default: "en")

    Returns:
        dict with transcription, confidence, and segments
    """
    import whisper
    import tempfile
    import os

    # Load Whisper model (medium for balance of speed/accuracy)
    model = whisper.load_model("medium")

    # Save audio bytes to temporary file
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
        temp_audio.write(audio_bytes)
        temp_audio_path = temp_audio.name

    try:
        # Transcribe
        result = model.transcribe(
            temp_audio_path,
            language=language,
            fp16=True,  # Use FP16 for faster processing on GPU
            verbose=False
        )

        # Calculate average confidence from segments
        segments = result.get("segments", [])
        if segments:
            avg_confidence = sum(
                seg.get("no_speech_prob", 0) for seg in segments
            ) / len(segments)
            confidence = int((1 - avg_confidence) * 100)
        else:
            confidence = 0

        return {
            "transcription": result["text"].strip(),
            "confidence": confidence,
            "language": result.get("language", language),
            "segments": [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"].strip()
                }
                for seg in segments
            ]
        }
    finally:
        # Clean up temporary file
        if os.path.exists(temp_audio_path):
            os.unlink(temp_audio_path)


# Local function to call Modal serverless function
def transcribe_audio_modal(audio_bytes: bytes, language: str = "en") -> dict:
    """
    Call Modal function to transcribe audio
    This is a wrapper for local code to call the Modal serverless function
    """
    # Use Modal's remote function call
    f = modal.Function.lookup("voicedform-whisper", "transcribe_audio")
    return f.remote(audio_bytes, language)
