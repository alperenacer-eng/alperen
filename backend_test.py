#!/usr/bin/env python3
"""
Backend API Testing Script for Puantaj Mükerrer Kayıt Engelleme Bug Fix
Tests duplicate prevention in POST /api/puantaj and POST /api/puantaj/toplu endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://tender-wing-9.preview.emergentagent.com/api"

# Test credentials
LOGIN_EMAIL = "alperenacer@acerler.com"
LOGIN_PASSWORD = "1234"

# Global token storage
TOKEN = None

# Test results tracking
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status} - {test_name}"
    if details:
        result += f"\n    Details: {details}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "details": details})

def login():
    """Login and get JWT token"""
    global TOKEN
    print("\n" + "="*80)
    print("TEST SCENARIO 1: LOGIN")
    print("="*80)
    
    url = f"{BACKEND_URL}/auth/login"
    payload = {"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}
    
    try:
        response = requests.post(url, json=payload)
        print(f"POST {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            TOKEN = data.get("access_token")
            if TOKEN:
                log_test("Login successful", True, f"Token received: {TOKEN[:20]}...")
                return True
            else:
                log_test("Login failed", False, "No access_token in response")
                return False
        else:
            log_test("Login failed", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Login failed", False, f"Exception: {str(e)}")
        return False

def get_headers():
    """Get authorization headers"""
    return {"Authorization": f"Bearer {TOKEN}"}

def get_active_personel():
    """Get an active personel for testing"""
    print("\n" + "="*80)
    print("TEST SCENARIO 2: GET ACTIVE PERSONEL")
    print("="*80)
    
    url = f"{BACKEND_URL}/personeller"
    
    try:
        response = requests.get(url, headers=get_headers())
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            personeller = response.json()
            if personeller and len(personeller) > 0:
                # Find an active personel
                for p in personeller:
                    if p.get('durum') == 'aktif':
                        personel_id = p.get('id')
                        personel_adi = p.get('ad_soyad', '')
                        log_test("Get active personel", True, f"Found: {personel_adi} (ID: {personel_id})")
                        return personel_id, personel_adi
                
                # If no active, use first one
                personel_id = personeller[0].get('id')
                personel_adi = personeller[0].get('ad_soyad', '')
                log_test("Get active personel", True, f"Using first personel: {personel_adi} (ID: {personel_id})")
                return personel_id, personel_adi
            else:
                log_test("Get active personel", False, "No personel found in database")
                return None, None
        else:
            log_test("Get active personel", False, f"Status {response.status_code}: {response.text}")
            return None, None
    except Exception as e:
        log_test("Get active personel", False, f"Exception: {str(e)}")
        return None, None

def test_toplu_first_insert(personel_id, personel_adi, test_date):
    """Test 1: First bulk insert with overwrite=false (should create)"""
    print("\n" + "="*80)
    print("TEST SCENARIO 3: TOPLU İLK EKLEME (overwrite=false)")
    print("="*80)
    
    url = f"{BACKEND_URL}/puantaj/toplu"
    payload = {
        "tarih": test_date,
        "overwrite": False,
        "kayitlar": [
            {
                "personel_id": personel_id,
                "personel_adi": personel_adi,
                "durum": "geldi",
                "giris_saati": "08:00",
                "cikis_saati": "17:00",
                "mesai_suresi": 0,
                "fazla_mesai": 0,
                "notlar": ""
            }
        ]
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers())
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            data = response.json()
            created_count = data.get('created_count', 0)
            skipped_count = data.get('skipped_count', 0)
            updated_count = data.get('updated_count', 0)
            
            if created_count == 1 and skipped_count == 0 and updated_count == 0:
                results = data.get('results', [])
                if results and results[0].get('created') == True:
                    log_test("Toplu first insert (overwrite=false)", True, 
                            f"created_count=1, skipped_count=0, updated_count=0, results[0].created=true")
                    return True
                else:
                    log_test("Toplu first insert (overwrite=false)", False, 
                            f"results[0].created is not true")
                    return False
            else:
                log_test("Toplu first insert (overwrite=false)", False, 
                        f"Expected created_count=1, skipped_count=0, updated_count=0, got created={created_count}, skipped={skipped_count}, updated={updated_count}")
                return False
        else:
            log_test("Toplu first insert (overwrite=false)", False, 
                    f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Toplu first insert (overwrite=false)", False, f"Exception: {str(e)}")
        return False

def test_toplu_duplicate_skip(personel_id, personel_adi, test_date):
    """Test 2: Duplicate bulk insert with overwrite=false (should skip)"""
    print("\n" + "="*80)
    print("TEST SCENARIO 4: TOPLU DUPLICATE (overwrite=false) - SHOULD SKIP")
    print("="*80)
    
    url = f"{BACKEND_URL}/puantaj/toplu"
    payload = {
        "tarih": test_date,
        "overwrite": False,
        "kayitlar": [
            {
                "personel_id": personel_id,
                "personel_adi": personel_adi,
                "durum": "geldi",
                "giris_saati": "08:00",
                "cikis_saati": "17:00",
                "mesai_suresi": 0,
                "fazla_mesai": 0,
                "notlar": ""
            }
        ]
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers())
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            data = response.json()
            created_count = data.get('created_count', 0)
            skipped_count = data.get('skipped_count', 0)
            updated_count = data.get('updated_count', 0)
            skipped = data.get('skipped', [])
            
            if created_count == 0 and skipped_count == 1 and updated_count == 0:
                if skipped and len(skipped) == 1:
                    skipped_item = skipped[0]
                    if (skipped_item.get('personel_id') == personel_id and 
                        skipped_item.get('tarih') == test_date and 
                        skipped_item.get('reason') == 'duplicate'):
                        log_test("Toplu duplicate skip (overwrite=false)", True, 
                                f"created_count=0, skipped_count=1, updated_count=0, skipped[0].reason='duplicate'")
                        
                        # Verify database still has only 1 record with original giris_saati
                        return verify_single_record(personel_id, test_date, "08:00")
                    else:
                        log_test("Toplu duplicate skip (overwrite=false)", False, 
                                f"skipped[0] missing required fields or wrong values")
                        return False
                else:
                    log_test("Toplu duplicate skip (overwrite=false)", False, 
                            f"skipped list is empty or has wrong length")
                    return False
            else:
                log_test("Toplu duplicate skip (overwrite=false)", False, 
                        f"Expected created_count=0, skipped_count=1, updated_count=0, got created={created_count}, skipped={skipped_count}, updated={updated_count}")
                return False
        else:
            log_test("Toplu duplicate skip (overwrite=false)", False, 
                    f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Toplu duplicate skip (overwrite=false)", False, f"Exception: {str(e)}")
        return False

def verify_single_record(personel_id, test_date, expected_giris_saati):
    """Verify database has only 1 record with expected giris_saati"""
    print(f"\n  → Verifying database has only 1 record with giris_saati='{expected_giris_saati}'")
    
    url = f"{BACKEND_URL}/puantaj"
    params = {
        "personel_id": personel_id,
        "tarih_baslangic": test_date,
        "tarih_bitis": test_date
    }
    
    try:
        response = requests.get(url, params=params, headers=get_headers())
        print(f"  GET {url}?personel_id={personel_id}&tarih_baslangic={test_date}&tarih_bitis={test_date}")
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            records = response.json()
            print(f"  Found {len(records)} record(s)")
            
            if len(records) == 1:
                giris_saati = records[0].get('giris_saati')
                print(f"  Record giris_saati: {giris_saati}")
                
                if giris_saati == expected_giris_saati:
                    print(f"  ✅ Database verification passed: 1 record with giris_saati='{expected_giris_saati}'")
                    return True
                else:
                    print(f"  ❌ Database verification failed: giris_saati is '{giris_saati}', expected '{expected_giris_saati}'")
                    log_test("Database verification", False, 
                            f"giris_saati is '{giris_saati}', expected '{expected_giris_saati}'")
                    return False
            else:
                print(f"  ❌ Database verification failed: found {len(records)} records, expected 1")
                log_test("Database verification", False, 
                        f"found {len(records)} records, expected 1")
                return False
        else:
            print(f"  ❌ Database verification failed: Status {response.status_code}")
            log_test("Database verification", False, f"Status {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ Database verification failed: {str(e)}")
        log_test("Database verification", False, f"Exception: {str(e)}")
        return False

def test_toplu_overwrite(personel_id, personel_adi, test_date):
    """Test 3: Duplicate bulk insert with overwrite=true (should update)"""
    print("\n" + "="*80)
    print("TEST SCENARIO 5: TOPLU OVERWRITE (overwrite=true) - SHOULD UPDATE")
    print("="*80)
    
    url = f"{BACKEND_URL}/puantaj/toplu"
    payload = {
        "tarih": test_date,
        "overwrite": True,
        "kayitlar": [
            {
                "personel_id": personel_id,
                "personel_adi": personel_adi,
                "durum": "geldi",
                "giris_saati": "09:00",  # Changed from 08:00
                "cikis_saati": "18:00",  # Changed from 17:00
                "mesai_suresi": 0,
                "fazla_mesai": 0,
                "notlar": "guncelendi"
            }
        ]
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers())
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            data = response.json()
            created_count = data.get('created_count', 0)
            skipped_count = data.get('skipped_count', 0)
            updated_count = data.get('updated_count', 0)
            
            if created_count == 0 and updated_count == 1 and skipped_count == 0:
                log_test("Toplu overwrite (overwrite=true)", True, 
                        f"created_count=0, updated_count=1, skipped_count=0")
                
                # Verify database record was updated with new giris_saati
                return verify_single_record(personel_id, test_date, "09:00")
            else:
                log_test("Toplu overwrite (overwrite=true)", False, 
                        f"Expected created_count=0, updated_count=1, skipped_count=0, got created={created_count}, updated={updated_count}, skipped={skipped_count}")
                return False
        else:
            log_test("Toplu overwrite (overwrite=true)", False, 
                    f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Toplu overwrite (overwrite=true)", False, f"Exception: {str(e)}")
        return False

def test_single_post_duplicate(personel_id, personel_adi, test_date):
    """Test 4: Single POST duplicate (should return 409 Conflict)"""
    print("\n" + "="*80)
    print("TEST SCENARIO 6: SINGLE POST DUPLICATE - SHOULD RETURN 409 CONFLICT")
    print("="*80)
    
    url = f"{BACKEND_URL}/puantaj"
    payload = {
        "personel_id": personel_id,
        "personel_adi": personel_adi,
        "tarih": test_date,
        "durum": "geldi",
        "giris_saati": "10:00",
        "cikis_saati": "19:00",
        "mesai_suresi": 0,
        "fazla_mesai": 0,
        "notlar": ""
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers())
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 409:
            detail = response.json().get('detail', '')
            if "zaten bir puantaj kaydı" in detail.lower():
                log_test("Single POST duplicate (409 Conflict)", True, 
                        f"Status 409, detail message contains 'zaten bir puantaj kaydı'")
                return True
            else:
                log_test("Single POST duplicate (409 Conflict)", False, 
                        f"Status 409 but detail message doesn't contain expected text: {detail}")
                return False
        else:
            log_test("Single POST duplicate (409 Conflict)", False, 
                    f"Expected status 409, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Single POST duplicate (409 Conflict)", False, f"Exception: {str(e)}")
        return False

def test_single_post_new_date(personel_id, personel_adi, test_date2):
    """Test 5: Single POST with new date (should create)"""
    print("\n" + "="*80)
    print("TEST SCENARIO 7: SINGLE POST YENİ TARİH - SHOULD CREATE")
    print("="*80)
    
    url = f"{BACKEND_URL}/puantaj"
    payload = {
        "personel_id": personel_id,
        "personel_adi": personel_adi,
        "tarih": test_date2,
        "durum": "geldi",
        "giris_saati": "08:00",
        "cikis_saati": "17:00",
        "mesai_suresi": 0,
        "fazla_mesai": 0,
        "notlar": ""
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers())
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            data = response.json()
            if (data.get('id') and 
                data.get('personel_id') == personel_id and 
                data.get('tarih') == test_date2):
                log_test("Single POST new date", True, 
                        f"Status 200, record created with id={data.get('id')}, tarih={test_date2}")
                return data.get('id')
            else:
                log_test("Single POST new date", False, 
                        f"Status 200 but response missing required fields")
                return None
        else:
            log_test("Single POST new date", False, 
                    f"Expected status 200, got {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_test("Single POST new date", False, f"Exception: {str(e)}")
        return None

def test_single_post_duplicate_new_date(personel_id, personel_adi, test_date2):
    """Test 6: Single POST duplicate on new date (should return 409)"""
    print("\n" + "="*80)
    print("TEST SCENARIO 8: SINGLE POST DUPLICATE (yeni tarih) - SHOULD RETURN 409")
    print("="*80)
    
    url = f"{BACKEND_URL}/puantaj"
    payload = {
        "personel_id": personel_id,
        "personel_adi": personel_adi,
        "tarih": test_date2,
        "durum": "geldi",
        "giris_saati": "08:00",
        "cikis_saati": "17:00",
        "mesai_suresi": 0,
        "fazla_mesai": 0,
        "notlar": ""
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers())
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 409:
            log_test("Single POST duplicate on new date (409 Conflict)", True, 
                    f"Status 409 as expected")
            return True
        else:
            log_test("Single POST duplicate on new date (409 Conflict)", False, 
                    f"Expected status 409, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Single POST duplicate on new date (409 Conflict)", False, f"Exception: {str(e)}")
        return False

def test_regression_different_personel(test_date):
    """Test 7: Regression - different personel, same date (should create)"""
    print("\n" + "="*80)
    print("TEST SCENARIO 9: REGRESYON - FARKLI PERSONEL, AYNI TARİH")
    print("="*80)
    
    # Get another active personel
    url = f"{BACKEND_URL}/personeller"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            personeller = response.json()
            if len(personeller) >= 2:
                # Find a different personel
                second_personel = None
                for p in personeller[1:]:  # Skip first one
                    if p.get('durum') == 'aktif':
                        second_personel = p
                        break
                
                if not second_personel and len(personeller) > 1:
                    second_personel = personeller[1]
                
                if second_personel:
                    personel_id2 = second_personel.get('id')
                    personel_adi2 = second_personel.get('ad_soyad', '')
                    print(f"Using second personel: {personel_adi2} (ID: {personel_id2})")
                    
                    # Try to create puantaj for this personel on same date
                    url2 = f"{BACKEND_URL}/puantaj/toplu"
                    payload = {
                        "tarih": test_date,
                        "overwrite": False,
                        "kayitlar": [
                            {
                                "personel_id": personel_id2,
                                "personel_adi": personel_adi2,
                                "durum": "geldi",
                                "giris_saati": "08:00",
                                "cikis_saati": "17:00",
                                "mesai_suresi": 0,
                                "fazla_mesai": 0,
                                "notlar": ""
                            }
                        ]
                    }
                    
                    response2 = requests.post(url2, json=payload, headers=get_headers())
                    print(f"POST {url2}")
                    print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
                    print(f"Status: {response2.status_code}")
                    print(f"Response: {json.dumps(response2.json(), indent=2, ensure_ascii=False)}")
                    
                    if response2.status_code == 200:
                        data = response2.json()
                        created_count = data.get('created_count', 0)
                        
                        if created_count == 1:
                            log_test("Regression - different personel, same date", True, 
                                    f"created_count=1 (different personel can have record on same date)")
                            return personel_id2
                        else:
                            log_test("Regression - different personel, same date", False, 
                                    f"Expected created_count=1, got {created_count}")
                            return None
                    else:
                        log_test("Regression - different personel, same date", False, 
                                f"Status {response2.status_code}: {response2.text}")
                        return None
                else:
                    log_test("Regression - different personel, same date", False, 
                            "Could not find second personel")
                    return None
            else:
                log_test("Regression - different personel, same date", False, 
                        "Not enough personel in database (need at least 2)")
                return None
        else:
            log_test("Regression - different personel, same date", False, 
                    f"Failed to get personeller: Status {response.status_code}")
            return None
    except Exception as e:
        log_test("Regression - different personel, same date", False, f"Exception: {str(e)}")
        return None

def cleanup_test_records(personel_id, test_date, test_date2, personel_id2=None):
    """Test 8: Cleanup - delete test records"""
    print("\n" + "="*80)
    print("TEST SCENARIO 10: TEMİZLİK - DELETE TEST RECORDS")
    print("="*80)
    
    deleted_count = 0
    
    # Get all test records
    dates_to_clean = [test_date, test_date2]
    personel_ids_to_clean = [personel_id]
    if personel_id2:
        personel_ids_to_clean.append(personel_id2)
    
    for pid in personel_ids_to_clean:
        for date in dates_to_clean:
            url = f"{BACKEND_URL}/puantaj"
            params = {
                "personel_id": pid,
                "tarih_baslangic": date,
                "tarih_bitis": date
            }
            
            try:
                response = requests.get(url, params=params, headers=get_headers())
                if response.status_code == 200:
                    records = response.json()
                    print(f"\nFound {len(records)} record(s) for personel_id={pid}, tarih={date}")
                    
                    for record in records:
                        record_id = record.get('id')
                        delete_url = f"{BACKEND_URL}/puantaj/{record_id}"
                        
                        delete_response = requests.delete(delete_url, headers=get_headers())
                        print(f"DELETE {delete_url}")
                        print(f"Status: {delete_response.status_code}")
                        
                        if delete_response.status_code == 200:
                            deleted_count += 1
                            print(f"✅ Deleted record {record_id}")
                        else:
                            print(f"❌ Failed to delete record {record_id}: {delete_response.text}")
            except Exception as e:
                print(f"❌ Error cleaning up records: {str(e)}")
    
    if deleted_count > 0:
        log_test("Cleanup test records", True, f"Deleted {deleted_count} test record(s)")
        return True
    else:
        log_test("Cleanup test records", True, "No records to delete (already cleaned)")
        return True

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for t in test_results if t['passed'])
    failed_tests = total_tests - passed_tests
    
    print(f"\nTotal Tests: {total_tests}")
    print(f"Passed: {passed_tests} ✅")
    print(f"Failed: {failed_tests} ❌")
    print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
    
    if failed_tests > 0:
        print("\n" + "="*80)
        print("FAILED TESTS:")
        print("="*80)
        for t in test_results:
            if not t['passed']:
                print(f"❌ {t['test']}")
                if t['details']:
                    print(f"   {t['details']}")
    
    print("\n" + "="*80)
    
    return failed_tests == 0

def main():
    """Main test execution"""
    print("\n" + "="*80)
    print("PUANTAJ MÜKERRER KAYIT ENGELLEME BUG FIX TESTING")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Login: {LOGIN_EMAIL} / {LOGIN_PASSWORD}")
    print("="*80)
    
    # Test dates (future dates to avoid conflicts)
    test_date = "2027-03-15"
    test_date2 = "2027-03-16"
    
    # Step 1: Login
    if not login():
        print("\n❌ Login failed. Cannot proceed with tests.")
        sys.exit(1)
    
    # Step 2: Get active personel
    personel_id, personel_adi = get_active_personel()
    if not personel_id:
        print("\n❌ Could not get active personel. Cannot proceed with tests.")
        sys.exit(1)
    
    # Step 3: Test toplu first insert (overwrite=false)
    if not test_toplu_first_insert(personel_id, personel_adi, test_date):
        print("\n⚠️ First insert failed. Continuing with other tests...")
    
    # Step 4: Test toplu duplicate skip (overwrite=false)
    if not test_toplu_duplicate_skip(personel_id, personel_adi, test_date):
        print("\n⚠️ Duplicate skip test failed. Continuing with other tests...")
    
    # Step 5: Test toplu overwrite (overwrite=true)
    if not test_toplu_overwrite(personel_id, personel_adi, test_date):
        print("\n⚠️ Overwrite test failed. Continuing with other tests...")
    
    # Step 6: Test single POST duplicate (should return 409)
    if not test_single_post_duplicate(personel_id, personel_adi, test_date):
        print("\n⚠️ Single POST duplicate test failed. Continuing with other tests...")
    
    # Step 7: Test single POST with new date
    record_id2 = test_single_post_new_date(personel_id, personel_adi, test_date2)
    if not record_id2:
        print("\n⚠️ Single POST new date test failed. Continuing with other tests...")
    
    # Step 8: Test single POST duplicate on new date
    if not test_single_post_duplicate_new_date(personel_id, personel_adi, test_date2):
        print("\n⚠️ Single POST duplicate on new date test failed. Continuing with other tests...")
    
    # Step 9: Regression test - different personel, same date
    personel_id2 = test_regression_different_personel(test_date)
    
    # Step 10: Cleanup
    cleanup_test_records(personel_id, test_date, test_date2, personel_id2)
    
    # Print summary
    all_passed = print_summary()
    
    if all_passed:
        print("\n✅ ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()
