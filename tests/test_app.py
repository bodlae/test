import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

from testapp import add, __version__


def test_add():
    assert add(2, 3) == 5


def test_version():
    assert __version__ == "0.1.0"
