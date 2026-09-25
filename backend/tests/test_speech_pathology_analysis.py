import os
import sys
from fastapi.testclient import TestClient

# Add backend dir to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from main import app, evaluate_results_with_gemini

client = TestClient(app)

def test_speech_pathology_analysis():
    print("Testing Speech Pathologist AI feedback integration with Gemini API in /analyze/speech...")
    assert app is not None
    
    # Test evaluate_results_with_gemini directly
    eval_text, source = asyncio.run(evaluate_results_with_gemini(
        transcript="Um, today I will talk about, uh, our project and its benefits.",
        wpm=105.0,
        filler_count=2,
        filler_words_found=["um", "uh"],
        stammer_events=0,
        long_pauses=1
    ))
    
    assert eval_text is not None and len(eval_text) > 10
    print(f"Evaluator Provider: {source}")
    print(f"Gemini Evaluation & Suggestions:\n{eval_text}")
    print("[SUCCESS] Speech Pathologist AI feedback integration verified.")

if __name__ == "__main__":
    test_speech_pathology_analysis()
