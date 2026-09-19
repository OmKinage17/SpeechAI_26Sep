import subprocess
import sys

# Set stdout encoding to utf-8 if possible
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

def run_script(name):
    print("=" * 60)
    print(f"RUNNING TEST SUITE: {name}")
    print("=" * 60)
    res = subprocess.run([sys.executable, name], capture_output=True, text=True, encoding='utf-8')
    print(res.stdout)
    if res.stderr:
        print("Error details:")
        print(res.stderr)
    return res.returncode

def main():
    test_files = [
        "test_streak_logic.py",
        "test_fluency_analytics.py",
        "test_auth_flow.py",
        "test_grok_generation.py",
        "test_pronunciation_alignment.py",
        "test_speech_pathology_analysis.py"
    ]
    
    failed = False
    for tf in test_files:
        code = run_script(tf)
        if code != 0:
            print(f"[FAIL] TEST SUITE {tf} FAILED!")
            failed = True
        else:
            print(f"[SUCCESS] TEST SUITE {tf} PASSED SUCCESSFULLY!")
        print("\n")
        
    if failed:
        print("=" * 60)
        print("[FAIL] SOME TEST SUITES FAILED. PLEASE RESOLVE.")
        print("=" * 60)
        sys.exit(1)
    else:
        print("=" * 60)
        print("[SUCCESS] ALL SPEECH_AI TEST SUITES PASSED METICULOUSLY!")
        print("=" * 60)

if __name__ == "__main__":
    main()
