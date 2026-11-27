"""Tarmoqsiz unit testlar: python -m pytest tools/joyshunos  (numpy + xarray kerak)."""

import numpy as np
import pytest
import xarray as xr

import landsat_yoz_harorat as L


def test_yillarni_ochish():
    assert L.yillarni_ochish("2025") == [2025]
    assert L.yillarni_ochish("2016-2013") == [2013, 2014, 2015, 2016]
    assert L.yillarni_ochish("2020, 2015,2020,") == [2015, 2020]
    with pytest.raises(ValueError):
        L.yillarni_ochish("2012-2014")


def test_dn_dan_selsiy_niqob_va_oraliq():
    # 45 °C ga mos DN: (45 + 273.15 - 149) / 0.00341802
    dn45 = round((45 + L.KELVIN - L.ST_OFFSET) / L.ST_SCALE)
    st = xr.DataArray(np.array([dn45, dn45, 0, 1], dtype="uint16"), dims="x")
    qa = xr.DataArray(np.array([0, 1 << 3, 0, 0], dtype="uint16"), dims="x")  # 2-chisi bulut
    c = L.dn_dan_selsiy(st, qa).values
    assert c[0] == pytest.approx(45, abs=0.01)
    assert np.isnan(c[1])  # bulut niqobi
    assert np.isnan(c[2])  # DN 0 = fill
    assert np.isnan(c[3])  # 149 K − 273 → MIN_C dan past


def test_yoz_medianasi_va_soni():
    v = np.array([[40.0, np.nan], [42.0, np.nan], [44.0, 30.0]], dtype="float32")
    c = xr.DataArray(v, dims=("time", "x"))
    m, n = L.yoz_medianasi(c)
    assert m.values.tolist() == [42.0, 30.0]
    assert n.values.tolist() == [3, 1]


def test_statistika():
    assert L.statistika(xr.DataArray(np.full(3, np.nan))) == {"piksellar": 0}
    s = L.statistika(xr.DataArray(np.arange(101, dtype="float32")))
    assert (s["piksellar"], s["min"], s["median"], s["max"]) == (101, 0.0, 50.0, 100.0)


def test_web_kodlash_heat_ts_bilan_bir_xil():
    # heat.ts o'qiydi: °C = u16 / 100 − 50, 0 = yo'q
    for t in (-10.0, 0.0, 42.48, 79.99):
        q = int(np.clip(np.round((t + 50) * 100), 1, 65535))
        assert q / 100 - 50 == pytest.approx(t, abs=0.005)
