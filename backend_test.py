#!/usr/bin/env python3
"""
Backend API Testing Script for Çıkan Paket Adedi Bug Fix
Tests /api/uretim/foto-analiz endpoint to verify cikan_paket_adeti field is properly populated
"""

import requests
import json
import sys
import os
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://photo-backup-app.preview.emergentagent.com/api"

# Test credentials
LOGIN_EMAIL = "alperenacer@acerler.com"
LOGIN_PASSWORD = "1234"

# Test image URL
TEST_IMAGE_URL = "https://customer-assets-m6fa6gv7.emergentagent.net/job_photo-backup-app/artifacts/8tsa68ua_WhatsApp%20Image%202026-07-23%20at%2013.54.48.webp"

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
    print("TEST 1: LOGIN")
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

def download_test_image():
    """Download test image to /tmp"""
    print("\n" + "="*80)
    print("TEST 2: DOWNLOAD TEST IMAGE")
    print("="*80)
    
    try:
        print(f"Downloading from: {TEST_IMAGE_URL}")
        response = requests.get(TEST_IMAGE_URL, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            file_path = "/tmp/uretim_test.webp"
            with open(file_path, "wb") as f:
                f.write(response.content)
            file_size = len(response.content)
            log_test("Download test image", True, f"Downloaded {file_size} bytes to {file_path}")
            return file_path
        else:
            log_test("Download test image", False, f"Status {response.status_code}")
            return None
    except Exception as e:
        log_test("Download test image", False, f"Exception: {str(e)}")
        return None

def test_foto_analiz(image_path):
    """Test /api/uretim/foto-analiz endpoint"""
    print("\n" + "="*80)
    print("TEST 3: POST /api/uretim/foto-analiz")
    print("="*80)
    
    url = f"{BACKEND_URL}/uretim/foto-analiz"
    
    try:
        with open(image_path, "rb") as f:
            files = {"file": ("uretim_test.webp", f, "image/webp")}
            print(f"POST {url}")
            print(f"File: {image_path}")
            print(f"Timeout: 120 seconds (AI processing)")
            
            response = requests.post(url, files=files, headers=get_headers(), timeout=120)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"\nResponse structure:")
                print(f"  - photo_url: {data.get('photo_url', 'N/A')}")
                print(f"  - extracted: {type(data.get('extracted', {}))}")
                print(f"  - context_stats: {data.get('context_stats', {})}")
                
                log_test("POST /api/uretim/foto-analiz", True, f"Status 200, response received")
                return data
            else:
                log_test("POST /api/uretim/foto-analiz", False, f"Status {response.status_code}: {response.text[:500]}")
                return None
    except Exception as e:
        log_test("POST /api/uretim/foto-analiz", False, f"Exception: {str(e)}")
        return None

def validate_response(data):
    """Validate the response structure and content"""
    print("\n" + "="*80)
    print("TEST 4: VALIDATE RESPONSE STRUCTURE")
    print("="*80)
    
    if not data:
        log_test("Response validation", False, "No data to validate")
        return False
    
    extracted = data.get("extracted", {})
    if not extracted:
        log_test("Response validation", False, "No 'extracted' field in response")
        return False
    
    # Check cikan_paketler exists and is a list
    cikan_paketler = extracted.get("cikan_paketler")
    if not isinstance(cikan_paketler, list):
        log_test("Response validation", False, f"cikan_paketler is not a list: {type(cikan_paketler)}")
        return False
    
    if len(cikan_paketler) == 0:
        log_test("Response validation", False, "cikan_paketler is empty (expected 2 items)")
        return False
    
    print(f"\n✅ cikan_paketler is a non-empty list with {len(cikan_paketler)} items")
    log_test("Response validation - cikan_paketler is list", True, f"{len(cikan_paketler)} items")
    
    return True

def validate_cikan_paket_structure(data):
    """Validate each cikan_paket item has all required fields"""
    print("\n" + "="*80)
    print("TEST 5: VALIDATE CIKAN_PAKET STRUCTURE (PRIMARY BUG FIX)")
    print("="*80)
    
    extracted = data.get("extracted", {})
    cikan_paketler = extracted.get("cikan_paketler", [])
    
    required_keys = ["urun_cinsi", "cikan_paket_adeti", "boy", "paket_adeti"]
    all_valid = True
    
    print(f"\nValidating {len(cikan_paketler)} cikan_paket items...")
    print(f"Required keys: {required_keys}")
    print("\n" + "-"*80)
    
    for idx, item in enumerate(cikan_paketler, 1):
        print(f"\nItem {idx}:")
        print(f"  Raw data: {json.dumps(item, ensure_ascii=False, indent=2)}")
        
        # Check all required keys exist
        missing_keys = [key for key in required_keys if key not in item]
        if missing_keys:
            print(f"  ❌ MISSING KEYS: {missing_keys}")
            log_test(f"Item {idx} - Required keys present", False, f"Missing: {missing_keys}")
            all_valid = False
            continue
        else:
            print(f"  ✅ All required keys present")
            log_test(f"Item {idx} - Required keys present", True, "All 4 keys found")
        
        # Validate urun_cinsi (string)
        urun_cinsi = item.get("urun_cinsi")
        if isinstance(urun_cinsi, str) and urun_cinsi.strip():
            print(f"  ✅ urun_cinsi: '{urun_cinsi}' (valid string)")
            log_test(f"Item {idx} - urun_cinsi valid", True, f"'{urun_cinsi}'")
        else:
            print(f"  ❌ urun_cinsi: {urun_cinsi} (invalid or empty)")
            log_test(f"Item {idx} - urun_cinsi valid", False, f"Invalid: {urun_cinsi}")
            all_valid = False
        
        # CRITICAL: Validate cikan_paket_adeti (positive integer) - THIS IS THE BUG FIX
        cikan_paket_adeti = item.get("cikan_paket_adeti")
        if cikan_paket_adeti is None:
            print(f"  ❌ cikan_paket_adeti: NULL (CRITICAL BUG - field is missing/null)")
            log_test(f"Item {idx} - cikan_paket_adeti valid", False, "NULL value (CRITICAL BUG)")
            all_valid = False
        elif isinstance(cikan_paket_adeti, (int, float)) and cikan_paket_adeti > 0:
            print(f"  ✅ cikan_paket_adeti: {cikan_paket_adeti} (valid positive number)")
            log_test(f"Item {idx} - cikan_paket_adeti valid", True, f"{cikan_paket_adeti}")
        else:
            print(f"  ❌ cikan_paket_adeti: {cikan_paket_adeti} (invalid - not a positive number)")
            log_test(f"Item {idx} - cikan_paket_adeti valid", False, f"Invalid: {cikan_paket_adeti}")
            all_valid = False
        
        # Validate boy (string: "7_boy" or "5_boy")
        boy = item.get("boy")
        if boy in ["7_boy", "5_boy"]:
            print(f"  ✅ boy: '{boy}' (valid)")
            log_test(f"Item {idx} - boy valid", True, f"'{boy}'")
        else:
            print(f"  ⚠️  boy: '{boy}' (expected '7_boy' or '5_boy')")
            log_test(f"Item {idx} - boy valid", False, f"Unexpected: '{boy}'")
            all_valid = False
        
        # Validate paket_adeti (positive integer)
        paket_adeti = item.get("paket_adeti")
        if isinstance(paket_adeti, (int, float)) and paket_adeti > 0:
            print(f"  ✅ paket_adeti: {paket_adeti} (valid positive number)")
            log_test(f"Item {idx} - paket_adeti valid", True, f"{paket_adeti}")
        else:
            print(f"  ❌ paket_adeti: {paket_adeti} (invalid - not a positive number)")
            log_test(f"Item {idx} - paket_adeti valid", False, f"Invalid: {paket_adeti}")
            all_valid = False
        
        # Check _matched_product
        matched_product = item.get("_matched_product")
        if matched_product and isinstance(matched_product, dict):
            prod_id = matched_product.get("id")
            prod_name = matched_product.get("name")
            if prod_id and prod_name:
                print(f"  ✅ _matched_product: id='{prod_id}', name='{prod_name}'")
                log_test(f"Item {idx} - _matched_product present", True, f"'{prod_name}'")
            else:
                print(f"  ⚠️  _matched_product: missing id or name")
                log_test(f"Item {idx} - _matched_product present", False, "Missing id or name")
        else:
            print(f"  ⚠️  _matched_product: not present or invalid")
            log_test(f"Item {idx} - _matched_product present", False, "Not present")
    
    print("\n" + "-"*80)
    
    if all_valid:
        print("\n✅ ALL CIKAN_PAKET ITEMS HAVE VALID STRUCTURE")
        log_test("All cikan_paket items valid", True, "All items have proper structure")
        return True
    else:
        print("\n❌ SOME CIKAN_PAKET ITEMS HAVE INVALID STRUCTURE")
        log_test("All cikan_paket items valid", False, "Some items have issues")
        return False

def validate_expected_values(data):
    """Validate expected specific values (best-case, AI may slightly differ)"""
    print("\n" + "="*80)
    print("TEST 6: VALIDATE EXPECTED VALUES (BEST-CASE)")
    print("="*80)
    
    extracted = data.get("extracted", {})
    cikan_paketler = extracted.get("cikan_paketler", [])
    
    print(f"\nExpected values (AI may slightly differ):")
    print(f"  Row 1: cikan_paket_adeti=88, boy='7_boy', paket_adeti=120, product name contains 'AC BL 19' (not 'AC BL 19 SW')")
    print(f"  Row 2: cikan_paket_adeti=32, boy='7_boy', paket_adeti=120, product name='AC BL 19 SW'")
    
    if len(cikan_paketler) >= 2:
        print(f"\nActual values:")
        for idx, item in enumerate(cikan_paketler[:2], 1):
            matched_prod = item.get("_matched_product", {})
            prod_name = matched_prod.get("name", "N/A")
            print(f"  Row {idx}: cikan_paket_adeti={item.get('cikan_paket_adeti')}, boy='{item.get('boy')}', paket_adeti={item.get('paket_adeti')}, product='{prod_name}'")
        
        # Check Row 1
        row1 = cikan_paketler[0]
        row1_valid = True
        if row1.get("cikan_paket_adeti") == 88:
            print(f"  ✅ Row 1 cikan_paket_adeti: 88 (exact match)")
        else:
            print(f"  ⚠️  Row 1 cikan_paket_adeti: {row1.get('cikan_paket_adeti')} (expected 88, AI may differ)")
            row1_valid = False
        
        if row1.get("boy") == "7_boy":
            print(f"  ✅ Row 1 boy: '7_boy' (exact match)")
        else:
            print(f"  ⚠️  Row 1 boy: '{row1.get('boy')}' (expected '7_boy')")
            row1_valid = False
        
        if row1.get("paket_adeti") == 120:
            print(f"  ✅ Row 1 paket_adeti: 120 (exact match)")
        else:
            print(f"  ⚠️  Row 1 paket_adeti: {row1.get('paket_adeti')} (expected 120, AI may differ)")
            row1_valid = False
        
        row1_prod = row1.get("_matched_product", {}).get("name", "")
        if "AC BL 19" in row1_prod and "SW" not in row1_prod:
            print(f"  ✅ Row 1 product: '{row1_prod}' (contains 'AC BL 19', not 'AC BL 19 SW')")
        else:
            print(f"  ⚠️  Row 1 product: '{row1_prod}' (expected to contain 'AC BL 19' without 'SW')")
            row1_valid = False
        
        log_test("Row 1 expected values", row1_valid, f"cikan_paket_adeti={row1.get('cikan_paket_adeti')}, boy='{row1.get('boy')}', paket_adeti={row1.get('paket_adeti')}, product='{row1_prod}'")
        
        # Check Row 2
        row2 = cikan_paketler[1]
        row2_valid = True
        if row2.get("cikan_paket_adeti") == 32:
            print(f"  ✅ Row 2 cikan_paket_adeti: 32 (exact match)")
        else:
            print(f"  ⚠️  Row 2 cikan_paket_adeti: {row2.get('cikan_paket_adeti')} (expected 32, AI may differ)")
            row2_valid = False
        
        if row2.get("boy") == "7_boy":
            print(f"  ✅ Row 2 boy: '7_boy' (exact match)")
        else:
            print(f"  ⚠️  Row 2 boy: '{row2.get('boy')}' (expected '7_boy')")
            row2_valid = False
        
        if row2.get("paket_adeti") == 120:
            print(f"  ✅ Row 2 paket_adeti: 120 (exact match)")
        else:
            print(f"  ⚠️  Row 2 paket_adeti: {row2.get('paket_adeti')} (expected 120, AI may differ)")
            row2_valid = False
        
        row2_prod = row2.get("_matched_product", {}).get("name", "")
        if row2_prod == "AC BL 19 SW":
            print(f"  ✅ Row 2 product: '{row2_prod}' (exact match)")
        else:
            print(f"  ⚠️  Row 2 product: '{row2_prod}' (expected 'AC BL 19 SW', AI may differ)")
            row2_valid = False
        
        log_test("Row 2 expected values", row2_valid, f"cikan_paket_adeti={row2.get('cikan_paket_adeti')}, boy='{row2.get('boy')}', paket_adeti={row2.get('paket_adeti')}, product='{row2_prod}'")
        
        return row1_valid and row2_valid
    else:
        print(f"\n⚠️  Only {len(cikan_paketler)} items found (expected 2)")
        log_test("Expected values validation", False, f"Only {len(cikan_paketler)} items (expected 2)")
        return False

def validate_regression(data):
    """Validate regression - matched fields still work"""
    print("\n" + "="*80)
    print("TEST 7: VALIDATE REGRESSION (MATCHED FIELDS)")
    print("="*80)
    
    extracted = data.get("extracted", {})
    
    all_valid = True
    
    # Check _matched_operator
    matched_operator = extracted.get("_matched_operator")
    if matched_operator and isinstance(matched_operator, dict):
        op_name = matched_operator.get("name")
        if op_name == "İZZET AKAL":
            print(f"  ✅ _matched_operator.name: '{op_name}' (exact match)")
            log_test("Regression - _matched_operator", True, f"'{op_name}'")
        else:
            print(f"  ⚠️  _matched_operator.name: '{op_name}' (expected 'İZZET AKAL', AI may differ)")
            log_test("Regression - _matched_operator", False, f"'{op_name}' (expected 'İZZET AKAL')")
            all_valid = False
    else:
        print(f"  ❌ _matched_operator: not present or invalid")
        log_test("Regression - _matched_operator", False, "Not present")
        all_valid = False
    
    # Check _matched_department
    matched_department = extracted.get("_matched_department")
    if matched_department and isinstance(matched_department, dict):
        dep_name = matched_department.get("name")
        if dep_name == "2.İŞLETME":
            print(f"  ✅ _matched_department.name: '{dep_name}' (exact match)")
            log_test("Regression - _matched_department", True, f"'{dep_name}'")
        else:
            print(f"  ⚠️  _matched_department.name: '{dep_name}' (expected '2.İŞLETME', AI may differ)")
            log_test("Regression - _matched_department", False, f"'{dep_name}' (expected '2.İŞLETME')")
            all_valid = False
    else:
        print(f"  ❌ _matched_department: not present or invalid")
        log_test("Regression - _matched_department", False, "Not present")
        all_valid = False
    
    # Check _matched_product
    matched_product = extracted.get("_matched_product")
    if matched_product and isinstance(matched_product, dict):
        prod_name = matched_product.get("name")
        if prod_name == "AC BL 19 SW":
            print(f"  ✅ _matched_product.name: '{prod_name}' (exact match)")
            log_test("Regression - _matched_product", True, f"'{prod_name}'")
        else:
            print(f"  ⚠️  _matched_product.name: '{prod_name}' (expected 'AC BL 19 SW', AI may differ)")
            log_test("Regression - _matched_product", False, f"'{prod_name}' (expected 'AC BL 19 SW')")
            all_valid = False
    else:
        print(f"  ❌ _matched_product: not present or invalid")
        log_test("Regression - _matched_product", False, "Not present")
        all_valid = False
    
    # Check _matched_mold
    matched_mold = extracted.get("_matched_mold")
    if matched_mold and isinstance(matched_mold, dict):
        kalip_no = matched_mold.get("kalip_no")
        if kalip_no:
            print(f"  ✅ _matched_mold.kalip_no: '{kalip_no}' (present)")
            log_test("Regression - _matched_mold", True, f"kalip_no='{kalip_no}'")
        else:
            print(f"  ⚠️  _matched_mold: missing kalip_no")
            log_test("Regression - _matched_mold", False, "Missing kalip_no")
            all_valid = False
    else:
        print(f"  ❌ _matched_mold: not present or invalid")
        log_test("Regression - _matched_mold", False, "Not present")
        all_valid = False
    
    if all_valid:
        print(f"\n✅ ALL REGRESSION CHECKS PASSED")
        log_test("All regression checks", True, "All matched fields working")
    else:
        print(f"\n⚠️  SOME REGRESSION CHECKS FAILED (AI may differ)")
        log_test("All regression checks", False, "Some matched fields differ from expected")
    
    return all_valid

def print_full_cikan_paketler(data):
    """Print full cikan_paketler array for reporting"""
    print("\n" + "="*80)
    print("FULL CIKAN_PAKETLER ARRAY (FOR REPORTING)")
    print("="*80)
    
    extracted = data.get("extracted", {})
    cikan_paketler = extracted.get("cikan_paketler", [])
    
    print(f"\nFull cikan_paketler array ({len(cikan_paketler)} items):")
    print(json.dumps(cikan_paketler, ensure_ascii=False, indent=2))

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
    
    # Critical bug fix check
    critical_tests = [t for t in test_results if "cikan_paket_adeti" in t['test']]
    critical_passed = sum(1 for t in critical_tests if t['passed'])
    critical_total = len(critical_tests)
    
    print(f"\n🔥 CRITICAL BUG FIX (cikan_paket_adeti):")
    print(f"   Tests: {critical_passed}/{critical_total} passed")
    
    if critical_passed == critical_total:
        print(f"   ✅ BUG FIX VALIDATED: All cikan_paket_adeti fields are properly populated")
    else:
        print(f"   ❌ BUG FIX FAILED: Some cikan_paket_adeti fields are missing/null/invalid")
    
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
    print("ÇIKAN PAKET ADETİ BUG FIX TESTING")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Login: {LOGIN_EMAIL} / {LOGIN_PASSWORD}")
    print(f"Test Image: {TEST_IMAGE_URL}")
    print("="*80)
    
    # Step 1: Login
    if not login():
        print("\n❌ Login failed. Cannot proceed with tests.")
        sys.exit(1)
    
    # Step 2: Download test image
    image_path = download_test_image()
    if not image_path:
        print("\n❌ Failed to download test image. Cannot proceed with tests.")
        sys.exit(1)
    
    # Step 3: Test foto-analiz endpoint
    response_data = test_foto_analiz(image_path)
    if not response_data:
        print("\n❌ Failed to get response from foto-analiz endpoint. Cannot proceed with validation.")
        sys.exit(1)
    
    # Step 4: Validate response structure
    if not validate_response(response_data):
        print("\n❌ Response structure validation failed. Cannot proceed with detailed validation.")
        sys.exit(1)
    
    # Step 5: Validate cikan_paket structure (PRIMARY BUG FIX)
    structure_valid = validate_cikan_paket_structure(response_data)
    
    # Step 6: Validate expected values (best-case)
    expected_valid = validate_expected_values(response_data)
    
    # Step 7: Validate regression (matched fields)
    regression_valid = validate_regression(response_data)
    
    # Print full cikan_paketler array
    print_full_cikan_paketler(response_data)
    
    # Print summary
    all_passed = print_summary()
    
    if all_passed:
        print("\n✅ ALL TESTS PASSED!")
        print("\n🎉 BUG FIX VALIDATED: cikan_paket_adeti field is properly populated in all items")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED!")
        
        # Check if critical bug fix passed
        critical_tests = [t for t in test_results if "cikan_paket_adeti" in t['test']]
        critical_passed = all(t['passed'] for t in critical_tests)
        
        if critical_passed:
            print("\n✅ CRITICAL BUG FIX PASSED: cikan_paket_adeti fields are valid")
            print("⚠️  Some non-critical tests failed (AI may differ from expected values)")
        else:
            print("\n❌ CRITICAL BUG FIX FAILED: cikan_paket_adeti fields have issues")
        
        sys.exit(1)

if __name__ == "__main__":
    main()
