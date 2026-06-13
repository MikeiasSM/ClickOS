"""Lançador de desenvolvimento e ponto de entrada do PyInstaller."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
if os.path.isdir(SRC) and SRC not in sys.path:
    sys.path.insert(0, SRC)

from clickos.main import run

if __name__ == "__main__":
    run()
