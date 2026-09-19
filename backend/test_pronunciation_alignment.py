import os
import sys

# Add backend dir to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import align_words

def test_pronunciation_alignment():
    print("Testing pronunciation word alignment logic...")

    # Case 1: Exact Match
    target1 = ["the", "quick", "brown", "fox"]
    spoken1 = ["the", "quick", "brown", "fox"]
    mismatches1 = align_words(target1, spoken1)
    assert len(mismatches1) == 0, f"Expected 0 mismatches, got {mismatches1}"
    print("Exact match test passed!")

    # Case 2: Omitted first word (index shifts should NOT flag other correct words!)
    target2 = ["the", "quick", "brown", "fox"]
    spoken2 = ["quick", "brown", "fox"]
    mismatches2 = align_words(target2, spoken2)
    assert len(mismatches2) == 1, f"Expected 1 mismatch, got {mismatches2}"
    assert mismatches2[0]["expected"] == "the"
    assert mismatches2[0]["spoken"] == ""
    assert mismatches2[0]["index"] == 0
    print("Omitted first word test passed successfully!")

    # Case 3: Substitution in the middle
    target3 = ["the", "quick", "brown", "fox"]
    spoken3 = ["the", "slow", "brown", "fox"]
    mismatches3 = align_words(target3, spoken3)
    assert len(mismatches3) == 1, f"Expected 1 mismatch, got {mismatches3}"
    assert mismatches3[0]["expected"] == "quick"
    assert mismatches3[0]["spoken"] == "slow"
    assert mismatches3[0]["index"] == 1
    print("Middle word substitution test passed!")

    # Case 4: Extra inserted word (should not mismatch target words)
    target4 = ["the", "quick", "fox"]
    spoken4 = ["the", "quick", "brown", "fox"]
    mismatches4 = align_words(target4, spoken4)
    assert len(mismatches4) == 0, f"Expected 0 mismatches, got {mismatches4}"
    print("Insertion test passed!")

    print("[SUCCESS] All Pronunciation Alignment tests passed meticulously!")

if __name__ == "__main__":
    test_pronunciation_alignment()
