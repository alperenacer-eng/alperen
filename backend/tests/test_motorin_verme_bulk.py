"""
Backend tests for Motorin Verme bulk upload and uploads management.
Covers:
- POST /api/motorin-verme/bulk (creates records + upload metadata)
- GET /api/motorin-verme-uploads (list, filter by tesis_adi)
- GET /api/motorin-verme-uploads/{id}/records
- GET /api/motorin-verme-uploads/{id}/download
- DELETE /api/motorin-verme-uploads/{id} (cascade)
- PUT /api/motorin-verme/{id}
- DELETE /api/motorin-verme/{id}
"""
import os
import base64
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://photo-backup-app.preview.emergentagent.com").rstrip("/")
LOGIN = {"email": "alperenacer@acerler.com", "password": "1234"}
TESIS_NAME = "TEST_BIMS_POMPA_BULK"
TEST_PLAKA = "TEST34BULK99"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=LOGIN, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json()["access_token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def test_arac(session):
    """Ensure a vehicle exists for plaka matching."""
    # try create
    payload = {
        "plaka": TEST_PLAKA,
        "marka": "TESTMARKA",
        "model": "TESTMODEL",
        "arac_cinsi": "Kamyon",
    }
    r = session.post(f"{BASE_URL}/api/araclar", json=payload, timeout=15)
    arac_id = None
    if r.status_code in (200, 201):
        try:
            arac_id = r.json().get("id")
        except Exception:
            pass
    # fetch list to get id
    lst = session.get(f"{BASE_URL}/api/araclar", timeout=15).json()
    for a in lst:
        if (a.get("plaka") or "").upper().replace(" ", "") == TEST_PLAKA:
            arac_id = a.get("id")
            break
    yield {"id": arac_id, "plaka": TEST_PLAKA}
    # cleanup
    if arac_id:
        try:
            session.delete(f"{BASE_URL}/api/araclar/{arac_id}", timeout=15)
        except Exception:
            pass


@pytest.fixture(scope="module")
def test_tesis(session):
    """Ensure a tesis exists (best-effort)."""
    try:
        session.post(f"{BASE_URL}/api/tesisler", json={"tesis_adi": TESIS_NAME, "adres": "", "aktif": True}, timeout=15)
    except Exception:
        pass
    yield TESIS_NAME


def _sample_records():
    return [
        {
            "tarih": "2026-01-10",
            "bosaltim_tesisi": "",
            "arac_plaka": TEST_PLAKA,
            "miktar_litre": 100.0,
            "kilometre": 12345.0,
            "sofor_adi": "Test Sofor",
            "notlar": "Test note 1",
        },
        {
            "tarih": "2026-01-11",
            "bosaltim_tesisi": "",
            "arac_plaka": TEST_PLAKA,
            "miktar_litre": 200.5,
            "kilometre": 12500.0,
            "sofor_adi": "Test Sofor 2",
            "notlar": "Test note 2",
        },
    ]


class TestMotorinVermeBulk:
    def test_bulk_create_with_upload(self, session, test_arac, test_tesis):
        # Encode a fake file body
        fake_file_b64 = base64.b64encode(b"fake-xlsx-content").decode()
        payload = {
            "records": _sample_records(),
            "dosya_adi": f"TEST_upload_{uuid.uuid4().hex[:6]}.xlsx",
            "file_data": fake_file_b64,
            "tesis_adi": test_tesis,
        }
        r = session.post(f"{BASE_URL}/api/motorin-verme/bulk", json=payload, timeout=30)
        assert r.status_code == 200, f"bulk failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["created_count"] == 2, f"created_count != 2: {data}"
        assert data["upload_id"], "upload_id missing"
        assert isinstance(data["created_ids"], list) and len(data["created_ids"]) == 2

        # stash on class for next tests
        TestMotorinVermeBulk.upload_id = data["upload_id"]
        TestMotorinVermeBulk.created_ids = data["created_ids"]
        TestMotorinVermeBulk.dosya_adi = payload["dosya_adi"]
        TestMotorinVermeBulk.file_data = fake_file_b64
        TestMotorinVermeBulk.arac_id = test_arac["id"]

    def test_list_uploads_filtered(self, session, test_tesis):
        r = session.get(f"{BASE_URL}/api/motorin-verme-uploads", params={"tesis_adi": test_tesis}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        ids = [it["id"] for it in items]
        assert TestMotorinVermeBulk.upload_id in ids, f"upload not in tesis filter result: {items}"
        # tesis_adi all match
        for it in items:
            assert it["tesis_adi"] == test_tesis

    def test_get_upload_records(self, session, test_arac):
        r = session.get(f"{BASE_URL}/api/motorin-verme-uploads/{TestMotorinVermeBulk.upload_id}/records", timeout=15)
        assert r.status_code == 200
        recs = r.json()
        assert len(recs) == 2, f"records len: {len(recs)}"
        # arac_id should be linked to created arac
        for rec in recs:
            assert (rec.get("arac_plaka") or "").upper().replace(" ", "") == TEST_PLAKA
            if TestMotorinVermeBulk.arac_id:
                assert rec.get("arac_id") == TestMotorinVermeBulk.arac_id, f"arac_id mismatch: got {rec.get('arac_id')}, expected {TestMotorinVermeBulk.arac_id}"
            assert rec.get("upload_id") == TestMotorinVermeBulk.upload_id

    def test_download_upload(self, session):
        r = session.get(f"{BASE_URL}/api/motorin-verme-uploads/{TestMotorinVermeBulk.upload_id}/download", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["dosya_adi"] == TestMotorinVermeBulk.dosya_adi
        assert data["file_data"] == TestMotorinVermeBulk.file_data

    def test_update_single_record(self, session, test_arac):
        rec_id = TestMotorinVermeBulk.created_ids[0]
        update_payload = {
            "tarih": "2026-01-10",
            "bosaltim_tesisi": TESIS_NAME,
            "arac_id": test_arac["id"] or "",
            "arac_plaka": TEST_PLAKA,
            "arac_bilgi": "TESTMARKA TESTMODEL - Kamyon",
            "miktar_litre": 150.0,
            "kilometre": 12999.0,
            "sofor_id": "",
            "sofor_adi": "Updated Sofor",
            "personel_id": "",
            "personel_adi": "",
            "notlar": "Updated note",
        }
        r = session.put(f"{BASE_URL}/api/motorin-verme/{rec_id}", json=update_payload, timeout=15)
        assert r.status_code == 200, f"update failed {r.status_code} {r.text}"
        body = r.json()
        assert float(body.get("miktar_litre")) == 150.0
        assert body.get("sofor_adi") == "Updated Sofor"

        # GET to verify persistence
        g = session.get(f"{BASE_URL}/api/motorin-verme/{rec_id}", timeout=15)
        assert g.status_code == 200
        gb = g.json()
        assert float(gb["miktar_litre"]) == 150.0
        assert gb["sofor_adi"] == "Updated Sofor"

    def test_delete_single_record(self, session):
        rec_id = TestMotorinVermeBulk.created_ids[1]
        d = session.delete(f"{BASE_URL}/api/motorin-verme/{rec_id}", timeout=15)
        assert d.status_code == 200
        g = session.get(f"{BASE_URL}/api/motorin-verme/{rec_id}", timeout=15)
        assert g.status_code == 404

    def test_delete_upload_cascades_records(self, session):
        # Confirm 1 record still exists pre-delete
        r = session.get(f"{BASE_URL}/api/motorin-verme-uploads/{TestMotorinVermeBulk.upload_id}/records", timeout=15)
        assert r.status_code == 200
        pre = r.json()
        assert len(pre) >= 1
        # delete cascade
        d = session.delete(f"{BASE_URL}/api/motorin-verme-uploads/{TestMotorinVermeBulk.upload_id}", params={"delete_records": "true"}, timeout=15)
        assert d.status_code == 200
        # records gone
        r2 = session.get(f"{BASE_URL}/api/motorin-verme-uploads/{TestMotorinVermeBulk.upload_id}/records", timeout=15)
        assert r2.status_code == 200
        assert r2.json() == []
        # download 404
        dl = session.get(f"{BASE_URL}/api/motorin-verme-uploads/{TestMotorinVermeBulk.upload_id}/download", timeout=15)
        assert dl.status_code == 404
        # the remaining created_ids[0] also gone (was attached to upload_id)
        g = session.get(f"{BASE_URL}/api/motorin-verme/{TestMotorinVermeBulk.created_ids[0]}", timeout=15)
        assert g.status_code == 404
