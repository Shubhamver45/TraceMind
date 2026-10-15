#!/usr/bin/env python3
"""
run.py
======
Single entrypoint to launch Incident Brain.

Usage:
    python run.py

Starts the Flask backend on http://localhost:5001 with:
- Multi-agent on-call pipeline (Triage -> Investigator -> Communicator)
- Connected FalkorDB graph / high-speed in-memory fallback
- Plain HTML/JS light-theme UI serving directly at /
"""

import os
import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.main import app

if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5001))
    print("=" * 60)
    print("  Incident Brain — On-Call Graph Agent Powered by FalkorDB")
    print(f"  Server starting at: http://localhost:{port}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=port, debug=False)
