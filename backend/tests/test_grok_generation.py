import os
import sys
from fastapi.testclient import TestClient

# Add backend dir to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import app

client = TestClient(app)

def test_grok_generation_endpoint():
    print("Testing /practice/generate endpoint...")
    
    # 1. Test standard paragraph request
    response = client.get("/practice/generate?topic=Cooking&length=paragraph")
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "source" in data
    print(f"Generated text: '{data['text']}' (Source: {data['source']})")

    # 2. Test single sentence request
    response = client.get("/practice/generate?topic=AI&length=sentence")
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    print(f"Generated sentence: '{data['text']}'")

    # 3. Test articulation exercise triggers
    response = client.get("/practice/generate?topic=General&length=sentence&exercise_id=articulation_drill")
    assert response.status_code == 200
    data = response.json()
    # Check if the articulation phrase is present in fallback source
    if data["source"] == "local_fallback":
        assert "seashells" in data["text"]
        print("Successfully validated articulation drill fallback text insertion.")

    print("[SUCCESS] All Grok generation endpoint tests passed successfully!")

if __name__ == "__main__":
    test_grok_generation_endpoint()
