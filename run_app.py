import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
import torch
import sys
from streamlit.web import cli

if __name__ == '__main__':
    sys.argv = ["streamlit", "run", "app.py"]
    sys.exit(cli.main())
