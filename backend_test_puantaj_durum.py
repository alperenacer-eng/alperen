#!/usr/bin/env python3
"""
Backend API Testing Script for Puantaj Durum Field
Tests the new 'durum' field in puantaj API with multiple status values
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Backend URL from frontend/.env
BASE_URL = "https://alperen-dev.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
TEST_EMAIL = "alperenacer@acerler.com"
TEST_PASSWORD = "1234"

# Global variables
token = None
created_puantaj_ids = []
test_personel_ids = []
created_test_personel = False  # Track if we created test personel
test_tarih = None

def print_test(test_num, description):
    """Print test header"""
    print(f"\n{'='*80}")
    print(f"TEST {test_num}: {description}")
    print(f"{'='*80}")

def print_result(success, message):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    return success

def test_1_login():
    """Test 1: Login with credentials"""
    global token
    print_test(1, "POST /api/auth/login - Login Authentication")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=10
        )
        
        if response.status_code != 200:
            return print_result(False, f"Login failed with status {response.status_code}: {response.text}")
        
        data = response.json()
        if "access_token" not in data:
            return print_result(False, "No access_token in response")
        
        token = data["access_token"]
        print(f"Login successful. Token: {token[:20]}...")
        return print_result(True, f"Login successful with credentials {TEST_EMAIL}/{TEST_PASSWORD}")
        
    except Exception as e:
        return print_result(False, f"Exception during login: {str(e)}")

def test_2_get_personel_ids():
    """Test 2: Get existing personel IDs for testing"""
    global test_personel_ids, created_test_personel
    print_test(2, "GET /api/personeller - Get/Create personel IDs for testing")
    
    if not token:
        return print_result(False, "No token available (login failed)")
    
    try:
        response = requests.get(
            f"{BASE_URL}/personeller",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return print_result(False, f"Get personel failed with status {response.status_code}: {response.text}")
        
        data = response.json()
        
        if not isinstance(data, list):
            return print_result(False, f"Expected list response, got {type(data)}")
        
        # If we have enough personel, use existing ones
        if len(data) >= 4:
            test_personel_ids = [
                {"id": data[0]["id"], "adi": data[0].get("ad_soyad", "Personel 1")},
                {"id": data[1]["id"], "adi": data[1].get("ad_soyad", "Personel 2")},
                {"id": data[2]["id"], "adi": data[2].get("ad_soyad", "Personel 3")},
                {"id": data[3]["id"], "adi": data[3].get("ad_soyad", "Personel 4")}
            ]
            print(f"Found {len(data)} personel records")
            created_test_personel = False
        else:
            # Create test personel records
            print(f"Found only {len(data)} personel records, creating test personel...")
            created_personel = []
            
            test_names = [
                ("Test", "Personel1"),
                ("Test", "Personel2"),
                ("Test", "Personel3"),
                ("Test", "Personel4")
            ]
            
            for i, (ad, soyad) in enumerate(test_names):
                payload = {
                    "ad": ad,
                    "soyad": soyad,
                    "tc_kimlik": f"1111111111{i}",
                    "telefon": f"0532 111 222{i}",
                    "departman": "Test",
                    "pozisyon": "Test",
                    "maas": 20000,
                    "aktif": True
                }
                
                resp = requests.post(
                    f"{BASE_URL}/personeller",
                    json=payload,
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                
                if resp.status_code == 200:
                    personel_data = resp.json()
                    created_personel.append({
                        "id": personel_data["id"],
                        "adi": personel_data.get("ad_soyad", f"{ad} {soyad}")
                    })
                    print(f"  Created: {personel_data.get('ad_soyad')}")
            
            if len(created_personel) < 4:
                return print_result(False, f"Failed to create enough personel records, only created {len(created_personel)}")
            
            test_personel_ids = created_personel
            created_test_personel = True
        
        print(f"Using personel IDs for testing:")
        for p in test_personel_ids:
            print(f"  - {p['id']}: {p['adi']}")
        
        return print_result(True, f"Retrieved/Created {len(test_personel_ids)} personel IDs for testing")
        
    except Exception as e:
        return print_result(False, f"Exception during get personel: {str(e)}")

def test_3_bulk_create_with_different_durum():
    """Test 3: POST /api/puantaj/toplu - Bulk create with DIFFERENT durum values"""
    global created_puantaj_ids, test_tarih
    print_test(3, "POST /api/puantaj/toplu - Bulk create with MULTIPLE durum values")
    
    if not token:
        return print_result(False, "No token available (login failed)")
    
    if len(test_personel_ids) < 4:
        return print_result(False, "Not enough personel IDs for testing")
    
    try:
        # Use tomorrow's date for testing
        test_tarih = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        payload = {
            "tarih": test_tarih,
            "kayitlar": [
                {
                    "personel_id": test_personel_ids[0]["id"],
                    "personel_adi": test_personel_ids[0]["adi"],
                    "durum": "izinli",
                    "giris_saati": "",
                    "cikis_saati": "",
                    "notlar": "İzinli - giriş/çıkış yok"
                },
                {
                    "personel_id": test_personel_ids[1]["id"],
                    "personel_adi": test_personel_ids[1]["adi"],
                    "durum": "hafta_tatili",
                    "giris_saati": "",
                    "cikis_saati": "",
                    "notlar": "Hafta tatili"
                },
                {
                    "personel_id": test_personel_ids[2]["id"],
                    "personel_adi": test_personel_ids[2]["adi"],
                    "durum": "izinsiz_gelmedi",
                    "giris_saati": "",
                    "cikis_saati": "",
                    "notlar": "İzinsiz gelmedi"
                },
                {
                    "personel_id": test_personel_ids[3]["id"],
                    "personel_adi": test_personel_ids[3]["adi"],
                    "durum": "geldi",
                    "giris_saati": "08:00",
                    "cikis_saati": "17:00",
                    "mesai_suresi": 9.0,
                    "fazla_mesai": 1.0,
                    "notlar": "Normal mesai"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/puantaj/toplu",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return print_result(False, f"Bulk create failed with status {response.status_code}: {response.text}")
        
        data = response.json()
        
        if "results" not in data:
            return print_result(False, "No 'results' field in response")
        
        results = data["results"]
        
        if len(results) != 4:
            return print_result(False, f"Expected 4 results, got {len(results)}")
        
        # Store created IDs
        for result in results:
            if "id" in result:
                created_puantaj_ids.append(result["id"])
        
        print(f"Created {len(results)} puantaj records for date {test_tarih}")
        print(f"Response: {data.get('message')}")
        for i, result in enumerate(results):
            print(f"  Record {i+1}: ID={result.get('id')}, personel_id={result.get('personel_id')}, created={result.get('created', False)}")
        
        return print_result(True, f"Bulk created 4 puantaj records with different durum values (izinli, hafta_tatili, izinsiz_gelmedi, geldi)")
        
    except Exception as e:
        return print_result(False, f"Exception during bulk create: {str(e)}")

def test_4_get_puantaj_verify_durum():
    """Test 4: GET /api/puantaj - Verify all records include 'durum' field"""
    print_test(4, "GET /api/puantaj - Verify all records include 'durum' field with correct values")
    
    if not token:
        return print_result(False, "No token available (login failed)")
    
    if not test_tarih:
        return print_result(False, "No test date available")
    
    try:
        response = requests.get(
            f"{BASE_URL}/puantaj?tarih_baslangic={test_tarih}&tarih_bitis={test_tarih}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return print_result(False, f"Get puantaj failed with status {response.status_code}: {response.text}")
        
        data = response.json()
        
        if not isinstance(data, list):
            return print_result(False, f"Expected list response, got {type(data)}")
        
        # Filter records for our test date
        test_records = [r for r in data if r.get("tarih") == test_tarih]
        
        if len(test_records) < 4:
            return print_result(False, f"Expected at least 4 records for date {test_tarih}, found {len(test_records)}")
        
        # Verify each record has 'durum' field
        missing_durum = []
        durum_values = {}
        
        for record in test_records:
            if "durum" not in record:
                missing_durum.append(record.get("id", "unknown"))
            else:
                personel_id = record.get("personel_id")
                durum_values[personel_id] = record.get("durum")
        
        if missing_durum:
            return print_result(False, f"Records missing 'durum' field: {missing_durum}")
        
        # Verify expected durum values
        expected_durum = {
            test_personel_ids[0]["id"]: "izinli",
            test_personel_ids[1]["id"]: "hafta_tatili",
            test_personel_ids[2]["id"]: "izinsiz_gelmedi",
            test_personel_ids[3]["id"]: "geldi"
        }
        
        mismatches = []
        for personel_id, expected in expected_durum.items():
            actual = durum_values.get(personel_id)
            if actual != expected:
                mismatches.append(f"personel_id={personel_id}: expected '{expected}', got '{actual}'")
        
        if mismatches:
            return print_result(False, f"Durum value mismatches: {', '.join(mismatches)}")
        
        print(f"Found {len(test_records)} puantaj records for date {test_tarih}")
        print(f"All records have 'durum' field with correct values:")
        for personel_id, durum in durum_values.items():
            personel_name = next((p["adi"] for p in test_personel_ids if p["id"] == personel_id), "Unknown")
            print(f"  - {personel_name}: durum='{durum}'")
        
        return print_result(True, "All puantaj records include 'durum' field with correct values")
        
    except Exception as e:
        return print_result(False, f"Exception during get puantaj: {str(e)}")

def test_5_update_durum():
    """Test 5: PUT /api/puantaj/{id} - Update durum from 'geldi' to 'raporlu'"""
    print_test(5, "PUT /api/puantaj/{id} - Update durum from 'geldi' to 'raporlu'")
    
    if not token:
        return print_result(False, "No token available (login failed)")
    
    if len(created_puantaj_ids) < 4:
        return print_result(False, "Not enough created puantaj records")
    
    try:
        # Update the 4th record (which has durum='geldi') to 'raporlu'
        puantaj_id = created_puantaj_ids[3]
        
        payload = {
            "personel_id": test_personel_ids[3]["id"],
            "personel_adi": test_personel_ids[3]["adi"],
            "tarih": test_tarih,
            "durum": "raporlu",
            "giris_saati": "",
            "cikis_saati": "",
            "mesai_suresi": 0,
            "fazla_mesai": 0,
            "notlar": "Raporlu - durum güncellendi"
        }
        
        response = requests.put(
            f"{BASE_URL}/puantaj/{puantaj_id}",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return print_result(False, f"Update failed with status {response.status_code}: {response.text}")
        
        data = response.json()
        
        if data.get("durum") != "raporlu":
            return print_result(False, f"Expected durum='raporlu', got '{data.get('durum')}'")
        
        print(f"Updated puantaj record ID: {puantaj_id}")
        print(f"  durum: {data.get('durum')} (updated from 'geldi' to 'raporlu')")
        print(f"  notlar: {data.get('notlar')}")
        
        # Verify with GET
        response = requests.get(
            f"{BASE_URL}/puantaj?tarih_baslangic={test_tarih}&tarih_bitis={test_tarih}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            records = response.json()
            updated_record = next((r for r in records if r.get("id") == puantaj_id), None)
            if updated_record and updated_record.get("durum") == "raporlu":
                print(f"  Verified: GET /api/puantaj confirms durum='raporlu'")
        
        return print_result(True, "Successfully updated durum from 'geldi' to 'raporlu'")
        
    except Exception as e:
        return print_result(False, f"Exception during update durum: {str(e)}")

def test_6_bulk_update_same_personel_tarih():
    """Test 6: POST /api/puantaj/toplu - Update existing record (same personel_id + tarih)"""
    print_test(6, "POST /api/puantaj/toplu - Update existing record with different durum (bayram_tatili)")
    
    if not token:
        return print_result(False, "No token available (login failed)")
    
    if len(test_personel_ids) < 1:
        return print_result(False, "No personel IDs available")
    
    try:
        # Use same personel_id and tarih as first record, but different durum
        payload = {
            "tarih": test_tarih,
            "kayitlar": [
                {
                    "personel_id": test_personel_ids[0]["id"],
                    "personel_adi": test_personel_ids[0]["adi"],
                    "durum": "bayram_tatili",
                    "giris_saati": "",
                    "cikis_saati": "",
                    "notlar": "Bayram tatili - durum güncellendi"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/puantaj/toplu",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return print_result(False, f"Bulk update failed with status {response.status_code}: {response.text}")
        
        data = response.json()
        
        if "results" not in data:
            return print_result(False, "No 'results' field in response")
        
        results = data["results"]
        
        if len(results) != 1:
            return print_result(False, f"Expected 1 result, got {len(results)}")
        
        result = results[0]
        
        # CRITICAL: Verify it's an UPDATE, not a CREATE
        if result.get("updated") != True:
            return print_result(False, f"Expected 'updated'=True (should update existing record), got {result}")
        
        if result.get("created") == True:
            return print_result(False, "CRITICAL: Created duplicate record instead of updating existing one")
        
        print(f"Response: {data.get('message')}")
        print(f"Result: ID={result.get('id')}, personel_id={result.get('personel_id')}, updated={result.get('updated', False)}")
        
        # Verify with GET
        response = requests.get(
            f"{BASE_URL}/puantaj?tarih_baslangic={test_tarih}&tarih_bitis={test_tarih}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            records = response.json()
            personel_records = [r for r in records if r.get("personel_id") == test_personel_ids[0]["id"] and r.get("tarih") == test_tarih]
            
            if len(personel_records) > 1:
                return print_result(False, f"CRITICAL: Found {len(personel_records)} records for same personel+tarih (should be 1, no duplicates)")
            
            if len(personel_records) == 1:
                if personel_records[0].get("durum") != "bayram_tatili":
                    return print_result(False, f"Expected durum='bayram_tatili', got '{personel_records[0].get('durum')}'")
                print(f"  Verified: Only 1 record exists for personel+tarih, durum='bayram_tatili'")
        
        return print_result(True, "Successfully UPDATED existing record (no duplicate created), durum changed to 'bayram_tatili'")
        
    except Exception as e:
        return print_result(False, f"Exception during bulk update: {str(e)}")

def test_7_backward_compatibility():
    """Test 7: POST /api/puantaj - Backward compatibility without 'durum' field"""
    global created_puantaj_ids
    print_test(7, "POST /api/puantaj - Backward compatibility: no 'durum' field (default 'geldi')")
    
    if not token:
        return print_result(False, "No token available (login failed)")
    
    if len(test_personel_ids) < 1:
        return print_result(False, "No personel IDs available")
    
    try:
        # Use a different date for this test
        test_date_2 = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        # Create puantaj WITHOUT 'durum' field
        payload = {
            "personel_id": test_personel_ids[0]["id"],
            "personel_adi": test_personel_ids[0]["adi"],
            "tarih": test_date_2,
            "giris_saati": "09:00",
            "cikis_saati": "18:00",
            "mesai_suresi": 9.0,
            "fazla_mesai": 1.0,
            "notlar": "Backward compatibility test - no durum field"
        }
        
        response = requests.post(
            f"{BASE_URL}/puantaj",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return print_result(False, f"Create failed with status {response.status_code}: {response.text}")
        
        data = response.json()
        
        if "id" not in data:
            return print_result(False, "No 'id' field in response")
        
        created_puantaj_ids.append(data["id"])
        
        # CRITICAL: Verify default durum is 'geldi'
        if data.get("durum") != "geldi":
            return print_result(False, f"CRITICAL: Expected default durum='geldi', got '{data.get('durum')}'")
        
        print(f"Created puantaj record ID: {data['id']}")
        print(f"  durum: {data.get('durum')} (default value, not provided in request)")
        print(f"  tarih: {data.get('tarih')}")
        
        return print_result(True, "Backward compatibility working: no 'durum' field defaults to 'geldi'")
        
    except Exception as e:
        return print_result(False, f"Exception during backward compatibility test: {str(e)}")

def test_8_verify_new_durum_values():
    """Test 8: Verify all new durum values are supported"""
    print_test(8, "POST /api/puantaj/toplu - Verify new durum values (resmi_tatil, gelmedi)")
    
    if not token:
        return print_result(False, "No token available (login failed)")
    
    if len(test_personel_ids) < 2:
        return print_result(False, "Not enough personel IDs for testing")
    
    try:
        # Use a different date for this test
        test_date_3 = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        payload = {
            "tarih": test_date_3,
            "kayitlar": [
                {
                    "personel_id": test_personel_ids[0]["id"],
                    "personel_adi": test_personel_ids[0]["adi"],
                    "durum": "resmi_tatil",
                    "giris_saati": "",
                    "cikis_saati": "",
                    "notlar": "Resmi tatil"
                },
                {
                    "personel_id": test_personel_ids[1]["id"],
                    "personel_adi": test_personel_ids[1]["adi"],
                    "durum": "gelmedi",
                    "giris_saati": "",
                    "cikis_saati": "",
                    "notlar": "Gelmedi"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/puantaj/toplu",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return print_result(False, f"Bulk create failed with status {response.status_code}: {response.text}")
        
        data = response.json()
        
        if "results" not in data:
            return print_result(False, "No 'results' field in response")
        
        results = data["results"]
        
        if len(results) != 2:
            return print_result(False, f"Expected 2 results, got {len(results)}")
        
        # Store created IDs
        for result in results:
            if "id" in result:
                created_puantaj_ids.append(result["id"])
        
        # Verify with GET
        response = requests.get(
            f"{BASE_URL}/puantaj?tarih_baslangic={test_date_3}&tarih_bitis={test_date_3}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return print_result(False, f"Get puantaj failed with status {response.status_code}")
        
        records = response.json()
        test_records = [r for r in records if r.get("tarih") == test_date_3]
        
        durum_values = {r.get("personel_id"): r.get("durum") for r in test_records}
        
        if durum_values.get(test_personel_ids[0]["id"]) != "resmi_tatil":
            return print_result(False, f"Expected durum='resmi_tatil', got '{durum_values.get(test_personel_ids[0]['id'])}'")
        
        if durum_values.get(test_personel_ids[1]["id"]) != "gelmedi":
            return print_result(False, f"Expected durum='gelmedi', got '{durum_values.get(test_personel_ids[1]['id'])}'")
        
        print(f"Created 2 puantaj records for date {test_date_3}")
        print(f"  Record 1: durum='resmi_tatil' ✓")
        print(f"  Record 2: durum='gelmedi' ✓")
        
        return print_result(True, "New durum values (resmi_tatil, gelmedi) are supported and working correctly")
        
    except Exception as e:
        return print_result(False, f"Exception during new durum values test: {str(e)}")

def test_9_delete_cleanup():
    """Test 9: DELETE /api/puantaj/{id} - Delete test records"""
    print_test(9, "DELETE /api/puantaj/{id} and /api/personeller/{id} - Cleanup test records")
    
    if not token:
        return print_result(False, "No token available (login failed)")
    
    try:
        # Delete puantaj records
        deleted_puantaj = 0
        if created_puantaj_ids:
            for puantaj_id in created_puantaj_ids:
                response = requests.delete(
                    f"{BASE_URL}/puantaj/{puantaj_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    deleted_puantaj += 1
                    print(f"  Deleted puantaj ID: {puantaj_id}")
                else:
                    print(f"  Failed to delete puantaj ID: {puantaj_id} (status {response.status_code})")
        
        # Delete test personel if we created them
        deleted_personel = 0
        if created_test_personel and test_personel_ids:
            print(f"  Deleting {len(test_personel_ids)} test personel records...")
            for personel in test_personel_ids:
                response = requests.delete(
                    f"{BASE_URL}/personeller/{personel['id']}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    deleted_personel += 1
                    print(f"  Deleted personel ID: {personel['id']} ({personel['adi']})")
                else:
                    print(f"  Failed to delete personel ID: {personel['id']} (status {response.status_code})")
        
        success_msg = f"Successfully deleted {deleted_puantaj} puantaj records"
        if created_test_personel:
            success_msg += f" and {deleted_personel} test personel records"
        
        return print_result(True, success_msg)
        
    except Exception as e:
        return print_result(False, f"Exception during delete: {str(e)}")

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("PUANTAJ DURUM FIELD TESTING")
    print("Backend URL:", BASE_URL)
    print("Test Credentials:", TEST_EMAIL)
    print("="*80)
    
    results = []
    
    # Run tests in sequence
    results.append(("Test 1: Login", test_1_login()))
    results.append(("Test 2: Get personel IDs", test_2_get_personel_ids()))
    results.append(("Test 3: Bulk create with different durum", test_3_bulk_create_with_different_durum()))
    results.append(("Test 4: GET puantaj verify durum", test_4_get_puantaj_verify_durum()))
    results.append(("Test 5: Update durum", test_5_update_durum()))
    results.append(("Test 6: Bulk update same personel+tarih", test_6_bulk_update_same_personel_tarih()))
    results.append(("Test 7: Backward compatibility", test_7_backward_compatibility()))
    results.append(("Test 8: Verify new durum values", test_8_verify_new_durum_values()))
    results.append(("Test 9: Delete cleanup", test_9_delete_cleanup()))
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
