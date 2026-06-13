#!/usr/bin/env python3
"""
Backend API Testing Script for Motorin Kaynaklar Endpoints
Tests newly added Boşaltım Tesisleri and Akaryakıt Markaları endpoints
"""

import requests
import json
import sys

# Backend URL from frontend/.env
BACKEND_URL = "https://github-getir.preview.emergentagent.com/api"

# Test credentials
LOGIN_EMAIL = "alperenacer@acerler.com"
LOGIN_PASSWORD = "1234"

# Global token storage
auth_token = None

def print_test(test_name, passed, details=""):
    """Print test result with formatting"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"   Details: {details}")

def login():
    """Login and get JWT token"""
    global auth_token
    print("\n" + "="*80)
    print("TEST 1: Login Authentication")
    print("="*80)
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            auth_token = data.get("access_token")
            print_test("POST /api/auth/login", True, f"Logged in as {LOGIN_EMAIL}")
            return True
        else:
            print_test("POST /api/auth/login", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("POST /api/auth/login", False, f"Exception: {str(e)}")
        return False

def get_headers():
    """Get authorization headers"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

def test_bosaltim_tesisleri():
    """Test Boşaltım Tesisleri CRUD operations"""
    print("\n" + "="*80)
    print("TEST 2-7: Boşaltım Tesisleri API Endpoints")
    print("="*80)
    
    created_id = None
    
    # TEST 2: Create Boşaltım Tesisi
    print("\nTEST 2: Create Boşaltım Tesisi")
    try:
        payload = {
            "name": "Test Tesis 1",
            "adres": "İstanbul",
            "notlar": "Test"
        }
        response = requests.post(
            f"{BACKEND_URL}/bosaltim-tesisleri",
            json=payload,
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            created_id = data.get("id")
            if created_id and data.get("name") == "Test Tesis 1":
                print_test("POST /api/bosaltim-tesisleri", True, f"Created tesis with ID: {created_id}")
            else:
                print_test("POST /api/bosaltim-tesisleri", False, f"Missing fields in response: {data}")
                return False
        else:
            print_test("POST /api/bosaltim-tesisleri", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("POST /api/bosaltim-tesisleri", False, f"Exception: {str(e)}")
        return False
    
    # TEST 3: List Boşaltım Tesisleri
    print("\nTEST 3: List Boşaltım Tesisleri")
    try:
        response = requests.get(
            f"{BACKEND_URL}/bosaltim-tesisleri",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                found = any(item.get("id") == created_id for item in data)
                if found:
                    print_test("GET /api/bosaltim-tesisleri", True, f"Retrieved {len(data)} tesis records, found created record")
                else:
                    print_test("GET /api/bosaltim-tesisleri", False, f"Created record not found in list")
                    return False
            else:
                print_test("GET /api/bosaltim-tesisleri", False, f"Expected list with records, got: {data}")
                return False
        else:
            print_test("GET /api/bosaltim-tesisleri", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("GET /api/bosaltim-tesisleri", False, f"Exception: {str(e)}")
        return False
    
    # TEST 4: Update Boşaltım Tesisi
    print("\nTEST 4: Update Boşaltım Tesisi")
    try:
        payload = {
            "name": "Test Tesis 1 Updated",
            "adres": "Ankara",
            "notlar": "Updated notes"
        }
        response = requests.put(
            f"{BACKEND_URL}/bosaltim-tesisleri/{created_id}",
            json=payload,
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("name") == "Test Tesis 1 Updated" and data.get("adres") == "Ankara":
                print_test("PUT /api/bosaltim-tesisleri/{id}", True, f"Updated tesis successfully")
            else:
                print_test("PUT /api/bosaltim-tesisleri/{id}", False, f"Update not reflected: {data}")
                return False
        else:
            print_test("PUT /api/bosaltim-tesisleri/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("PUT /api/bosaltim-tesisleri/{id}", False, f"Exception: {str(e)}")
        return False
    
    # TEST 5: Verify update in list
    print("\nTEST 5: Verify update in list")
    try:
        response = requests.get(
            f"{BACKEND_URL}/bosaltim-tesisleri",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            updated_record = next((item for item in data if item.get("id") == created_id), None)
            if updated_record and updated_record.get("name") == "Test Tesis 1 Updated":
                print_test("GET /api/bosaltim-tesisleri (verify update)", True, f"Update verified in list")
            else:
                print_test("GET /api/bosaltim-tesisleri (verify update)", False, f"Updated record not found or incorrect")
                return False
        else:
            print_test("GET /api/bosaltim-tesisleri (verify update)", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("GET /api/bosaltim-tesisleri (verify update)", False, f"Exception: {str(e)}")
        return False
    
    # TEST 6: Delete Boşaltım Tesisi
    print("\nTEST 6: Delete Boşaltım Tesisi")
    try:
        response = requests.delete(
            f"{BACKEND_URL}/bosaltim-tesisleri/{created_id}",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                print_test("DELETE /api/bosaltim-tesisleri/{id}", True, f"Deleted tesis successfully")
            else:
                print_test("DELETE /api/bosaltim-tesisleri/{id}", False, f"Unexpected response: {data}")
                return False
        else:
            print_test("DELETE /api/bosaltim-tesisleri/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("DELETE /api/bosaltim-tesisleri/{id}", False, f"Exception: {str(e)}")
        return False
    
    # TEST 7: Verify deletion
    print("\nTEST 7: Verify deletion")
    try:
        response = requests.get(
            f"{BACKEND_URL}/bosaltim-tesisleri",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            found = any(item.get("id") == created_id for item in data)
            if not found:
                print_test("GET /api/bosaltim-tesisleri (verify deletion)", True, f"Record successfully deleted from list")
            else:
                print_test("GET /api/bosaltim-tesisleri (verify deletion)", False, f"Deleted record still in list")
                return False
        else:
            print_test("GET /api/bosaltim-tesisleri (verify deletion)", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("GET /api/bosaltim-tesisleri (verify deletion)", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_akaryakit_markalari():
    """Test Akaryakıt Markaları CRUD operations"""
    print("\n" + "="*80)
    print("TEST 8-13: Akaryakıt Markaları API Endpoints")
    print("="*80)
    
    created_id = None
    
    # TEST 8: Create Akaryakıt Markası
    print("\nTEST 8: Create Akaryakıt Markası")
    try:
        payload = {
            "name": "Shell",
            "notlar": "Premium"
        }
        response = requests.post(
            f"{BACKEND_URL}/akaryakit-markalari",
            json=payload,
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            created_id = data.get("id")
            if created_id and data.get("name") == "Shell":
                print_test("POST /api/akaryakit-markalari", True, f"Created marka with ID: {created_id}")
            else:
                print_test("POST /api/akaryakit-markalari", False, f"Missing fields in response: {data}")
                return False
        else:
            print_test("POST /api/akaryakit-markalari", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("POST /api/akaryakit-markalari", False, f"Exception: {str(e)}")
        return False
    
    # TEST 9: List Akaryakıt Markaları
    print("\nTEST 9: List Akaryakıt Markaları")
    try:
        response = requests.get(
            f"{BACKEND_URL}/akaryakit-markalari",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                found = any(item.get("id") == created_id for item in data)
                if found:
                    print_test("GET /api/akaryakit-markalari", True, f"Retrieved {len(data)} marka records, found created record")
                else:
                    print_test("GET /api/akaryakit-markalari", False, f"Created record not found in list")
                    return False
            else:
                print_test("GET /api/akaryakit-markalari", False, f"Expected list with records, got: {data}")
                return False
        else:
            print_test("GET /api/akaryakit-markalari", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("GET /api/akaryakit-markalari", False, f"Exception: {str(e)}")
        return False
    
    # TEST 10: Update Akaryakıt Markası
    print("\nTEST 10: Update Akaryakıt Markası")
    try:
        payload = {
            "name": "Shell V-Power",
            "notlar": "Premium Plus"
        }
        response = requests.put(
            f"{BACKEND_URL}/akaryakit-markalari/{created_id}",
            json=payload,
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("name") == "Shell V-Power" and data.get("notlar") == "Premium Plus":
                print_test("PUT /api/akaryakit-markalari/{id}", True, f"Updated marka successfully")
            else:
                print_test("PUT /api/akaryakit-markalari/{id}", False, f"Update not reflected: {data}")
                return False
        else:
            print_test("PUT /api/akaryakit-markalari/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("PUT /api/akaryakit-markalari/{id}", False, f"Exception: {str(e)}")
        return False
    
    # TEST 11: Verify update in list
    print("\nTEST 11: Verify update in list")
    try:
        response = requests.get(
            f"{BACKEND_URL}/akaryakit-markalari",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            updated_record = next((item for item in data if item.get("id") == created_id), None)
            if updated_record and updated_record.get("name") == "Shell V-Power":
                print_test("GET /api/akaryakit-markalari (verify update)", True, f"Update verified in list")
            else:
                print_test("GET /api/akaryakit-markalari (verify update)", False, f"Updated record not found or incorrect")
                return False
        else:
            print_test("GET /api/akaryakit-markalari (verify update)", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("GET /api/akaryakit-markalari (verify update)", False, f"Exception: {str(e)}")
        return False
    
    # TEST 12: Delete Akaryakıt Markası
    print("\nTEST 12: Delete Akaryakıt Markası")
    try:
        response = requests.delete(
            f"{BACKEND_URL}/akaryakit-markalari/{created_id}",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                print_test("DELETE /api/akaryakit-markalari/{id}", True, f"Deleted marka successfully")
            else:
                print_test("DELETE /api/akaryakit-markalari/{id}", False, f"Unexpected response: {data}")
                return False
        else:
            print_test("DELETE /api/akaryakit-markalari/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("DELETE /api/akaryakit-markalari/{id}", False, f"Exception: {str(e)}")
        return False
    
    # TEST 13: Verify deletion
    print("\nTEST 13: Verify deletion")
    try:
        response = requests.get(
            f"{BACKEND_URL}/akaryakit-markalari",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            found = any(item.get("id") == created_id for item in data)
            if not found:
                print_test("GET /api/akaryakit-markalari (verify deletion)", True, f"Record successfully deleted from list")
            else:
                print_test("GET /api/akaryakit-markalari (verify deletion)", False, f"Deleted record still in list")
                return False
        else:
            print_test("GET /api/akaryakit-markalari (verify deletion)", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("GET /api/akaryakit-markalari (verify deletion)", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_motorin_tedarikciler_regression():
    """Test Motorin Tedarikçiler (regression check)"""
    print("\n" + "="*80)
    print("TEST 14: Motorin Tedarikçiler (Regression Check)")
    print("="*80)
    
    print("\nTEST 14: List Motorin Tedarikçiler")
    try:
        response = requests.get(
            f"{BACKEND_URL}/motorin-tedarikciler",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test("GET /api/motorin-tedarikciler", True, f"Retrieved {len(data)} tedarikçi records (regression check passed)")
            else:
                print_test("GET /api/motorin-tedarikciler", False, f"Expected list, got: {type(data)}")
                return False
        else:
            print_test("GET /api/motorin-tedarikciler", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("GET /api/motorin-tedarikciler", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_auth_without_token():
    """Test authentication requirement"""
    print("\n" + "="*80)
    print("TEST 15-16: Authentication Requirement")
    print("="*80)
    
    # TEST 15: Boşaltım Tesisleri without token
    print("\nTEST 15: Boşaltım Tesisleri without token")
    try:
        response = requests.get(
            f"{BACKEND_URL}/bosaltim-tesisleri",
            timeout=10
        )
        
        if response.status_code in [401, 403]:
            print_test("GET /api/bosaltim-tesisleri (no token)", True, f"Correctly returned {response.status_code} for unauthorized access")
        else:
            print_test("GET /api/bosaltim-tesisleri (no token)", False, f"Expected 401/403, got {response.status_code}")
            return False
    except Exception as e:
        print_test("GET /api/bosaltim-tesisleri (no token)", False, f"Exception: {str(e)}")
        return False
    
    # TEST 16: Akaryakıt Markaları without token
    print("\nTEST 16: Akaryakıt Markaları without token")
    try:
        response = requests.get(
            f"{BACKEND_URL}/akaryakit-markalari",
            timeout=10
        )
        
        if response.status_code in [401, 403]:
            print_test("GET /api/akaryakit-markalari (no token)", True, f"Correctly returned {response.status_code} for unauthorized access")
        else:
            print_test("GET /api/akaryakit-markalari (no token)", False, f"Expected 401/403, got {response.status_code}")
            return False
    except Exception as e:
        print_test("GET /api/akaryakit-markalari (no token)", False, f"Exception: {str(e)}")
        return False
    
    return True

def main():
    """Main test execution"""
    print("\n" + "="*80)
    print("MOTORIN KAYNAKLAR API ENDPOINT TESTING")
    print("Testing newly added Boşaltım Tesisleri and Akaryakıt Markaları endpoints")
    print("="*80)
    
    # Login
    if not login():
        print("\n❌ LOGIN FAILED - Cannot proceed with tests")
        sys.exit(1)
    
    # Test Boşaltım Tesisleri
    bosaltim_result = test_bosaltim_tesisleri()
    
    # Test Akaryakıt Markaları
    akaryakit_result = test_akaryakit_markalari()
    
    # Test Motorin Tedarikçiler (regression)
    tedarikci_result = test_motorin_tedarikciler_regression()
    
    # Test authentication
    auth_result = test_auth_without_token()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    all_passed = bosaltim_result and akaryakit_result and tedarikci_result and auth_result
    
    print(f"\nBoşaltım Tesisleri API: {'✅ PASSED' if bosaltim_result else '❌ FAILED'}")
    print(f"Akaryakıt Markaları API: {'✅ PASSED' if akaryakit_result else '❌ FAILED'}")
    print(f"Motorin Tedarikçiler (Regression): {'✅ PASSED' if tedarikci_result else '❌ FAILED'}")
    print(f"Authentication Requirement: {'✅ PASSED' if auth_result else '❌ FAILED'}")
    
    if all_passed:
        print("\n✅ ALL TESTS PASSED (16/16)")
        print("\nMotorin Kaynaklar endpoints are working correctly:")
        print("  - Boşaltım Tesisleri: POST, GET, PUT, DELETE ✅")
        print("  - Akaryakıt Markaları: POST, GET, PUT, DELETE ✅")
        print("  - Motorin Tedarikçiler: GET (regression check) ✅")
        print("  - Authentication: All endpoints require JWT token ✅")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
