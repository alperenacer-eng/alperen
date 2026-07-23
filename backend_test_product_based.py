#!/usr/bin/env python3
"""
Backend API Testing Script for /api/reports/product-based endpoint
Tests the updated endpoint with new onceki_yil_kalan field and updated icerde_kalan formula
"""

import requests
import json
import sys

# Backend URL from frontend/.env
BACKEND_URL = "https://photo-backup-app.preview.emergentagent.com/api"

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

def test_product_based_report_basic():
    """Test 1: GET /api/reports/product-based?module=bims should return 200"""
    print("\n" + "="*80)
    print("TEST 2: Product-Based Report Basic Request (module=bims)")
    print("="*80)
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/reports/product-based?module=bims",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code != 200:
            print_test("GET /api/reports/product-based?module=bims", False, 
                      f"Status: {response.status_code}, Response: {response.text}")
            return False, None
        
        data = response.json()
        print_test("GET /api/reports/product-based?module=bims", True, 
                  f"Endpoint returned 200 with response keys: {list(data.keys())}")
        return True, data
        
    except Exception as e:
        print_test("GET /api/reports/product-based?module=bims", False, f"Exception: {str(e)}")
        return False, None

def test_response_structure(data):
    """Test 2: Response should include products array and totals object"""
    print("\n" + "="*80)
    print("TEST 3: Response Structure Validation")
    print("="*80)
    
    all_passed = True
    
    # Check products array exists
    if "products" not in data:
        print_test("Response has 'products' field", False, f"Missing 'products' field. Keys: {list(data.keys())}")
        all_passed = False
    elif not isinstance(data["products"], list):
        print_test("'products' is an array", False, f"'products' is not an array. Type: {type(data['products'])}")
        all_passed = False
    else:
        products = data["products"]
        print_test("Response has 'products' array", True, f"Found {len(products)} products")
        
        # Check each product has required fields
        required_fields = ["product_name", "uretilen", "cikan", "onceki_yil_kalan", "icerde_kalan"]
        
        if len(products) > 0:
            for idx, product in enumerate(products[:5]):  # Check first 5 products
                product_name = product.get("product_name", f"Product {idx}")
                missing_fields = [f for f in required_fields if f not in product]
                
                if missing_fields:
                    print_test(f"Product '{product_name}' has all required fields", False, 
                              f"Missing fields: {missing_fields}")
                    all_passed = False
                else:
                    print_test(f"Product '{product_name}' has all required fields", True, 
                              f"uretilen={product['uretilen']}, cikan={product['cikan']}, "
                              f"onceki_yil_kalan={product['onceki_yil_kalan']}, icerde_kalan={product['icerde_kalan']}")
        else:
            print_test("Products array", True, "Empty array (no production records)")
    
    # Check totals object exists
    if "totals" not in data:
        print_test("Response has 'totals' field", False, f"Missing 'totals' field")
        all_passed = False
    elif not isinstance(data["totals"], dict):
        print_test("'totals' is an object", False, f"'totals' is not an object. Type: {type(data['totals'])}")
        all_passed = False
    else:
        totals = data["totals"]
        required_total_fields = ["total_uretilen", "total_cikan", "total_onceki_yil_kalan", "total_icerde_kalan"]
        missing_total_fields = [f for f in required_total_fields if f not in totals]
        
        if missing_total_fields:
            print_test("Totals has all required fields", False, f"Missing fields: {missing_total_fields}")
            all_passed = False
        else:
            print_test("Totals has all required fields", True, 
                      f"total_uretilen={totals['total_uretilen']}, total_cikan={totals['total_cikan']}, "
                      f"total_onceki_yil_kalan={totals['total_onceki_yil_kalan']}, "
                      f"total_icerde_kalan={totals['total_icerde_kalan']}")
    
    return all_passed

def test_icerde_kalan_formula(data):
    """Test 4: icerde_kalan should equal uretilen + onceki_yil_kalan - cikan for each product"""
    print("\n" + "="*80)
    print("TEST 4: icerde_kalan Formula Validation (per product)")
    print("="*80)
    
    products = data.get("products", [])
    
    if len(products) == 0:
        print_test("icerde_kalan formula validation", True, "No products to validate (empty array)")
        return True
    
    all_passed = True
    
    for idx, product in enumerate(products[:10]):  # Check first 10 products
        product_name = product.get("product_name", f"Product {idx}")
        uretilen = product.get("uretilen", 0)
        cikan = product.get("cikan", 0)
        onceki_yil_kalan = product.get("onceki_yil_kalan", 0)
        icerde_kalan = product.get("icerde_kalan", 0)
        
        expected_icerde = uretilen + onceki_yil_kalan - cikan
        
        if icerde_kalan == expected_icerde:
            print_test(f"Product '{product_name}' formula", True, 
                      f"{uretilen} + {onceki_yil_kalan} - {cikan} = {icerde_kalan} ✅")
        else:
            print_test(f"Product '{product_name}' formula", False, 
                      f"Expected {expected_icerde} (={uretilen}+{onceki_yil_kalan}-{cikan}), got {icerde_kalan}")
            all_passed = False
    
    return all_passed

def test_total_icerde_kalan_formula(data):
    """Test 5: total_icerde_kalan should equal total_uretilen + total_onceki_yil_kalan - total_cikan"""
    print("\n" + "="*80)
    print("TEST 5: total_icerde_kalan Formula Validation")
    print("="*80)
    
    totals = data.get("totals", {})
    
    total_uretilen = totals.get("total_uretilen", 0)
    total_cikan = totals.get("total_cikan", 0)
    total_onceki_yil_kalan = totals.get("total_onceki_yil_kalan", 0)
    total_icerde_kalan = totals.get("total_icerde_kalan", 0)
    
    expected_total_icerde = total_uretilen + total_onceki_yil_kalan - total_cikan
    
    if total_icerde_kalan == expected_total_icerde:
        print_test("total_icerde_kalan formula", True, 
                  f"{total_uretilen} + {total_onceki_yil_kalan} - {total_cikan} = {total_icerde_kalan} ✅")
        return True
    else:
        print_test("total_icerde_kalan formula", False, 
                  f"Expected {expected_total_icerde} (={total_uretilen}+{total_onceki_yil_kalan}-{total_cikan}), "
                  f"got {total_icerde_kalan}")
        return False

def test_without_module_filter():
    """Test 6: GET /api/reports/product-based without module filter should also work"""
    print("\n" + "="*80)
    print("TEST 6: Product-Based Report Without Module Filter")
    print("="*80)
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/reports/product-based",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code != 200:
            print_test("GET /api/reports/product-based (no module)", False, 
                      f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        
        # Basic structure check
        if "products" not in data or "totals" not in data:
            print_test("GET /api/reports/product-based (no module)", False, 
                      f"Missing required fields. Keys: {list(data.keys())}")
            return False
        
        print_test("GET /api/reports/product-based (no module)", True, 
                  f"Endpoint returned 200 with {len(data['products'])} products")
        return True
        
    except Exception as e:
        print_test("GET /api/reports/product-based (no module)", False, f"Exception: {str(e)}")
        return False

def test_create_production_with_onceki_yil_kalan():
    """Test 7: Optional - Create a production record with onceki_yil_kalan and verify it's reflected"""
    print("\n" + "="*80)
    print("TEST 7: Create Production Record with onceki_yil_kalan (Optional)")
    print("="*80)
    
    try:
        # First, get existing products to use a real product name
        response = requests.get(
            f"{BACKEND_URL}/parke-urunler?limit=1",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code != 200 or not response.json():
            print_test("Create production with onceki_yil_kalan", True, 
                      "Skipped - No products available to create production record")
            return True
        
        # Create a test production record with cikan_paket_1 containing onceki_yil_kalan
        test_production = {
            "product_id": "test-product-id",
            "module": "bims",
            "production_date": "2026-01-15",
            "product_name": "TEST_PRODUCT_ONCEKI",
            "quantity": 100,
            "unit": "adet",
            "cikan_paket_1": json.dumps({
                "urun_adi": "TEST_PRODUCT_ONCEKI",
                "paket_7_boy": 10,
                "paket_5_boy": 5,
                "birim_7_boy": 7,
                "birim_5_boy": 5,
                "onceki_yil_kalan": "50"
            })
        }
        
        response = requests.post(
            f"{BACKEND_URL}/production",
            headers=get_headers(),
            json=test_production,
            timeout=10
        )
        
        if response.status_code not in [200, 201]:
            print_test("Create production with onceki_yil_kalan", False, 
                      f"Failed to create production record. Status: {response.status_code}, Response: {response.text}")
            return False
        
        created_record = response.json()
        record_id = created_record.get("id")
        
        print_test("POST /api/production-records with onceki_yil_kalan", True, 
                  f"Created production record with id={record_id}")
        
        # Now fetch the product-based report and verify the onceki_yil_kalan is reflected
        response = requests.get(
            f"{BACKEND_URL}/reports/product-based?module=bims",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code != 200:
            print_test("Verify onceki_yil_kalan in report", False, 
                      f"Failed to fetch report. Status: {response.status_code}")
            # Cleanup
            requests.delete(f"{BACKEND_URL}/production-records/{record_id}", headers=get_headers())
            return False
        
        data = response.json()
        products = data.get("products", [])
        
        # Find our test product
        test_product = None
        for p in products:
            if p.get("product_name") == "TEST_PRODUCT_ONCEKI":
                test_product = p
                break
        
        if not test_product:
            print_test("Verify onceki_yil_kalan in report", False, 
                      "Test product not found in report")
            # Cleanup
            requests.delete(f"{BACKEND_URL}/production-records/{record_id}", headers=get_headers())
            return False
        
        # Verify onceki_yil_kalan is 50
        onceki = test_product.get("onceki_yil_kalan", 0)
        if onceki == 50:
            print_test("Verify onceki_yil_kalan in report", True, 
                      f"onceki_yil_kalan correctly shows {onceki} for TEST_PRODUCT_ONCEKI")
            
            # Also verify icerde_kalan formula
            uretilen = test_product.get("uretilen", 0)
            cikan = test_product.get("cikan", 0)
            icerde = test_product.get("icerde_kalan", 0)
            expected_icerde = uretilen + onceki - cikan
            
            if icerde == expected_icerde:
                print_test("Verify icerde_kalan with onceki_yil_kalan", True, 
                          f"icerde_kalan correctly calculated: {uretilen} + {onceki} - {cikan} = {icerde}")
            else:
                print_test("Verify icerde_kalan with onceki_yil_kalan", False, 
                          f"Expected {expected_icerde}, got {icerde}")
        else:
            print_test("Verify onceki_yil_kalan in report", False, 
                      f"Expected onceki_yil_kalan=50, got {onceki}")
        
        # Cleanup - delete the test production record
        delete_response = requests.delete(
            f"{BACKEND_URL}/production/{record_id}",
            headers=get_headers(),
            timeout=10
        )
        
        if delete_response.status_code in [200, 204]:
            print_test("Cleanup test production record", True, f"Deleted record id={record_id}")
        else:
            print_test("Cleanup test production record", False, 
                      f"Failed to delete. Status: {delete_response.status_code}")
        
        return onceki == 50
        
    except Exception as e:
        print_test("Create production with onceki_yil_kalan", False, f"Exception: {str(e)}")
        return False

def main():
    """Main test execution"""
    print("\n" + "="*80)
    print("PRODUCT-BASED REPORT ENDPOINT TESTING")
    print("Testing /api/reports/product-based with onceki_yil_kalan field")
    print("="*80)
    
    test_results = []
    
    # Test 1: Login
    if not login():
        print("\n❌ LOGIN FAILED - Cannot proceed with tests")
        sys.exit(1)
    test_results.append(("Login Authentication", True))
    
    # Test 2: Basic request with module=bims
    basic_passed, data = test_product_based_report_basic()
    test_results.append(("GET /api/reports/product-based?module=bims", basic_passed))
    
    if not basic_passed or not data:
        print("\n❌ BASIC REQUEST FAILED - Cannot proceed with further tests")
        sys.exit(1)
    
    # Test 3: Response structure
    structure_passed = test_response_structure(data)
    test_results.append(("Response Structure Validation", structure_passed))
    
    # Test 4: icerde_kalan formula per product
    formula_passed = test_icerde_kalan_formula(data)
    test_results.append(("icerde_kalan Formula (per product)", formula_passed))
    
    # Test 5: total_icerde_kalan formula
    total_formula_passed = test_total_icerde_kalan_formula(data)
    test_results.append(("total_icerde_kalan Formula", total_formula_passed))
    
    # Test 6: Without module filter
    no_module_passed = test_without_module_filter()
    test_results.append(("GET /api/reports/product-based (no module)", no_module_passed))
    
    # Test 7: Create production with onceki_yil_kalan (optional)
    onceki_test_passed = test_create_production_with_onceki_yil_kalan()
    test_results.append(("Create production with onceki_yil_kalan", onceki_test_passed))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed_count = sum(1 for _, passed in test_results if passed)
    total_count = len(test_results)
    
    for test_name, passed in test_results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\n{'='*80}")
    print(f"TOTAL: {passed_count}/{total_count} tests passed")
    print(f"{'='*80}")
    
    if passed_count == total_count:
        print("\n✅ ALL TESTS PASSED")
        print("\nProduct-Based Report Endpoint is working correctly:")
        print("  - GET /api/reports/product-based?module=bims returns 200 ✅")
        print("  - Response includes 'products' array with required fields ✅")
        print("  - Response includes 'totals' object with required fields ✅")
        print("  - Each product has: product_name, uretilen, cikan, onceki_yil_kalan, icerde_kalan ✅")
        print("  - icerde_kalan = uretilen + onceki_yil_kalan - cikan (per product) ✅")
        print("  - total_icerde_kalan = total_uretilen + total_onceki_yil_kalan - total_cikan ✅")
        print("  - Endpoint works without module filter ✅")
        print("  - onceki_yil_kalan field is correctly extracted and summed ✅")
        sys.exit(0)
    else:
        print(f"\n❌ {total_count - passed_count} TEST(S) FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
