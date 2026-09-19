import os
import sys

# Import functions directly from main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import detect_fillers, detect_stammering

def test_filler_detection():
    print("Testing filler word detection...")
    
    # Test case 1: standard multi-word and single-word fillers
    text_1 = "I think um you know basically like so"
    count_1, found_1 = detect_fillers(text_1)
    print(f"Test 1 - Text: '{text_1}'")
    print(f"         Got: count={count_1}, found={found_1}")
    # expected: "you know" (1) + "um" (1) + "basically" (1) + "like" (1) + "so" (1) = 5
    assert count_1 == 5, f"Expected 5 fillers, got {count_1}"
    assert "you know" in found_1
    assert "um" in found_1

    # Test case 2: double phrase fillers
    text_2 = "You know, actually, it is like you know, hard."
    count_2, found_2 = detect_fillers(text_2)
    print(f"Test 2 - Text: '{text_2}'")
    print(f"         Got: count={count_2}, found={found_2}")
    # expected: "you know" (2) + "actually" (1) + "like" (1) = 4
    assert count_2 == 4, f"Expected 4 fillers, got {count_2}"

    print("Filler detection tests passed!")

def test_stammer_detection():
    print("\nTesting stammering repetition detection...")
    
    # Test case 1: consecutive word repetitions
    text_1 = "The the dog jumps over over the wall."
    events_1 = detect_stammering(text_1)
    print(f"Test 1 - Text: '{text_1}'")
    print(f"         Got: {events_1} events")
    # expected: "the the" (1) + "over over" (1) = 2
    assert events_1 == 2, f"Expected 2 stammers, got {events_1}"

    # Test case 2: syllable prefix repetitions
    text_2 = "W-w-what c-c-cat I-I-I wanted."
    events_2 = detect_stammering(text_2)
    print(f"Test 2 - Text: '{text_2}'")
    print(f"         Got: {events_2} events")
    # expected: "w-w-what" (1) + "c-c-cat" (1) + "I-I-I" (1) = 3
    assert events_2 == 3, f"Expected 3 stammers, got {events_2}"

    print("Stammer detection tests passed!")

if __name__ == "__main__":
    test_filler_detection()
    test_stammer_detection()
    print("\nALL DISFLUENCY ANALYTICS TESTS PASSED SUCCESSFULLY!")
