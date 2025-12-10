# check.py
import sys, importlib

print("Python executable:", sys.executable)
print("Python version:", sys.version.replace("\n", " "))

for pkg in ("ultralytics", "torch", "cv2"):
    try:
        m = importlib.import_module(pkg)
        print(f"{pkg} OK, version:", getattr(m, "__version__", "no-version"))
    except Exception as e:
        print(f"{pkg} IMPORT ERROR:", repr(e))
