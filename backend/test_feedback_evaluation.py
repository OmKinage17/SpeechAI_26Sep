import os
import sys

# Import functions directly from main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import evaluate_condition

def test_evaluation():
    print("Testing custom rules parser `evaluate_condition`...")

    # Case A: Single condition trigger
    cond_a = "filler_score < 6.0"
    ctx_a = {"filler_score": 4.5, "wpm": 130.0}
    res_a = evaluate_condition(cond_a, ctx_a)
    print(f"Case A: condition '{cond_a}' with context {ctx_a} -> Got: {res_a}")
    assert res_a is True, "Should evaluate to True since 4.5 < 6.0"

    # Case B: Single condition not triggered
    cond_b = "filler_score < 6.0"
    ctx_b = {"filler_score": 7.0}
    res_b = evaluate_condition(cond_b, ctx_b)
    print(f"Case B: condition '{cond_b}' with context {ctx_b} -> Got: {res_b}")
    assert res_b is False, "Should evaluate to False since 7.0 is not < 6.0"

    # Case C: Compound condition (Advanced Impromptu check)
    cond_c = "filler_score >= 6.0 and stammer_score >= 6.0 and pause_score >= 6.0 and clarity_score >= 6.0 and wpm >= 120.0 and wpm <= 150.0"
    
    # Context C1: Perfect fluency
    ctx_c1 = {
        "filler_score": 10.0,
        "stammer_score": 10.0,
        "pause_score": 10.0,
        "clarity_score": 10.0,
        "wpm": 130.0
    }
    res_c1 = evaluate_condition(cond_c, ctx_c1)
    print(f"Case C1 (Perfect context): Got: {res_c1}")
    assert res_c1 is True, "Should trigger since all sub-conditions are met"

    # Context C2: Failed one metric (clarity < 6)
    ctx_c2 = {
        "filler_score": 10.0,
        "stammer_score": 10.0,
        "pause_score": 10.0,
        "clarity_score": 5.5,
        "wpm": 130.0
    }
    res_c2 = evaluate_condition(cond_c, ctx_c2)
    print(f"Case C2 (Clarity < 6): Got: {res_c2}")
    assert res_c2 is False, "Should not trigger since clarity_score (5.5) is < 6.0"

    print("Custom rules evaluation tests completed successfully!")

if __name__ == "__main__":
    test_evaluation()
