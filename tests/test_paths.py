from clickos import paths


def test_data_dir_under_appdata(tmp_path, monkeypatch):
    monkeypatch.setenv("APPDATA", str(tmp_path))
    d = paths.data_dir()
    assert d.exists()
    assert d.name == "ClickOS"


def test_db_path_inside_data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("APPDATA", str(tmp_path))
    assert paths.db_path().parent == paths.data_dir()
    assert paths.db_path().name == "clickos.db"


def test_asset_resolves_logo():
    p = paths.asset("assets", "logo.png")
    assert p.exists()
