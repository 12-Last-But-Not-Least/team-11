import pytest

from plotting import imports


@pytest.fixture(autouse=True)
def isolated_import_storage(monkeypatch):
    """Give every test a fresh temporary registry."""
    monkeypatch.setattr(imports, "IMPORTS", {})
