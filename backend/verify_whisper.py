import os
import wave
import struct
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_silent_wav(path: str, duration: float = 1.0, sample_rate: int = 16000):
    """
    Generates a silent mono 16-bit PCM WAV file.
    """
    logger.info(f"Generating silent WAV at: {path}")
    with wave.open(path, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit PCM (2 bytes per sample)
        wav_file.setframerate(sample_rate)
        num_samples = int(duration * sample_rate)
        # Pack zero samples as short integers (2 bytes each)
        data = struct.pack(f'<{num_samples}h', *([0] * num_samples))
        wav_file.writeframes(data)
    logger.info("WAV generation complete.")

def main():
    temp_wav = "temp_test_silence.wav"
    try:
        # Generate test audio
        generate_silent_wav(temp_wav)

        logger.info("Importing static_ffmpeg...")
        import static_ffmpeg
        static_ffmpeg.add_paths()
        logger.info("static_ffmpeg paths added.")

        logger.info("Importing whisper...")
        import whisper

        logger.info("Loading Whisper 'base' model (this will download the model if not present)...")
        model = whisper.load_model("base")
        logger.info("Model loaded successfully.")

        logger.info("Transcribing silent test WAV...")
        result = model.transcribe(temp_wav)
        logger.info("Transcription call finished.")
        logger.info(f"Transcription result: '{result.get('text', '')}'")

        print("SUCCESS: Whisper and static-ffmpeg are fully functional!")
    except Exception as e:
        logger.error(f"Verification failed: {e}", exc_info=True)
        print("FAILURE: Verification encountered errors.")
    finally:
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
                logger.info(f"Cleaned up temporary file: {temp_wav}")
            except Exception as e:
                logger.warning(f"Failed to clean up {temp_wav}: {e}")

if __name__ == "__main__":
    main()
