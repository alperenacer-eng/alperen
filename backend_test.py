#!/usr/bin/env python3
"""
Backend Regression Test: paket_adetleri fields in GET /api/products
Test Date: 2026-06-02
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://photo-backup-app.preview.emergentagent.com/api"
LOGIN_EMAIL = "alperenacer@acerler.com"
LOGIN_PASSWORD = "1234"

# Test counters
tests_passed = 0
tests_failed = 0

def log_test(test_name, passed, details=""):
    """Log test result"""
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✅ PASS: {test_name}")
        if details:
            print(f"   {details}")
    else:
        tests_failed += 1
        print(f"❌ FAIL: {test_name}")
        if details:
            print(f"   {details}")

def login():
    """Login and get access token"""
    print("\n" + "="*80)
    print("TEST 1: POST /api/auth/login - Login Authentication")
    print("="*80)
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                log_test("Login authentication", True, f"Successfully logged in as {LOGIN_EMAIL}")
                return data["access_token"]
            else:
                log_test("Login authentication", False, "No access_token in response")
                return None
        else:
            log_test("Login authentication", False, f"Status code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Login authentication", False, f"Exception: {str(e)}")
        return None

def test_products_paket_adetleri(token):
    """Test GET /api/products for paket_adetleri fields"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/products?_ts=1234 - Products List with paket_adetleri")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/products?_ts=1234",
            headers=headers,
            timeout=30
        )
        
        if response.status_code != 200:
            log_test("GET /api/products", False, f"Status code: {response.status_code}, Response: {response.text}")
            return False
        
        log_test("GET /api/products", True, f"Status code: 200")
        
        products = response.json()
        print(f"   Total products returned: {len(products)}")
        
        # Find product 1: AC BL 19 (id="1768375567133897")
        print("\n" + "-"*80)
        print("TEST 3: Verify Product 1 - AC BL 19 (id='1768375567133897')")
        print("-"*80)
        
        product1 = None
        for p in products:
            if p.get("id") == "1768375567133897":
                product1 = p
                break
        
        if not product1:
            log_test("Find product AC BL 19", False, "Product with id='1768375567133897' not found")
            return False
        
        log_test("Find product AC BL 19", True, f"Product name: {product1.get('name', 'N/A')}")
        
        # Check paket_adetleri_7_boy
        print("\n   Checking paket_adetleri_7_boy field...")
        paket_7_boy = product1.get("paket_adetleri_7_boy")
        
        if paket_7_boy is None:
            log_test("Product 1: paket_adetleri_7_boy exists", False, "Field is missing")
        elif not isinstance(paket_7_boy, dict):
            log_test("Product 1: paket_adetleri_7_boy is dict", False, f"Type is {type(paket_7_boy)}, expected dict")
        else:
            log_test("Product 1: paket_adetleri_7_boy is dict", True, f"Value: {paket_7_boy}")
            
            # Check specific key
            if "1768375527278062" in paket_7_boy:
                value = paket_7_boy["1768375527278062"]
                if value == 120:
                    log_test("Product 1: paket_adetleri_7_boy['1768375527278062'] = 120", True, f"Correct value: {value}")
                else:
                    log_test("Product 1: paket_adetleri_7_boy['1768375527278062'] = 120", False, f"Expected 120, got {value}")
            else:
                log_test("Product 1: paket_adetleri_7_boy has key '1768375527278062'", False, f"Key not found. Available keys: {list(paket_7_boy.keys())}")
        
        # Check paket_adetleri_5_boy
        print("\n   Checking paket_adetleri_5_boy field...")
        paket_5_boy = product1.get("paket_adetleri_5_boy")
        
        if paket_5_boy is None:
            log_test("Product 1: paket_adetleri_5_boy exists", False, "Field is missing")
        elif not isinstance(paket_5_boy, dict):
            log_test("Product 1: paket_adetleri_5_boy is dict", False, f"Type is {type(paket_5_boy)}, expected dict")
        else:
            log_test("Product 1: paket_adetleri_5_boy is dict", True, f"Value: {paket_5_boy}")
            
            # Check specific key
            if "1768375527278062" in paket_5_boy:
                value = paket_5_boy["1768375527278062"]
                if value == 84:
                    log_test("Product 1: paket_adetleri_5_boy['1768375527278062'] = 84", True, f"Correct value: {value}")
                else:
                    log_test("Product 1: paket_adetleri_5_boy['1768375527278062'] = 84", False, f"Expected 84, got {value}")
            else:
                log_test("Product 1: paket_adetleri_5_boy has key '1768375527278062'", False, f"Key not found. Available keys: {list(paket_5_boy.keys())}")
        
        # Find product 2: AC BL 19 SW (id="1768387988804789")
        print("\n" + "-"*80)
        print("TEST 4: Verify Product 2 - AC BL 19 SW (id='1768387988804789')")
        print("-"*80)
        
        product2 = None
        for p in products:
            if p.get("id") == "1768387988804789":
                product2 = p
                break
        
        if not product2:
            log_test("Find product AC BL 19 SW", False, "Product with id='1768387988804789' not found")
            return False
        
        log_test("Find product AC BL 19 SW", True, f"Product name: {product2.get('name', 'N/A')}")
        
        # Check paket_adetleri_7_boy
        print("\n   Checking paket_adetleri_7_boy field...")
        paket_7_boy = product2.get("paket_adetleri_7_boy")
        
        if paket_7_boy is None:
            log_test("Product 2: paket_adetleri_7_boy exists", False, "Field is missing")
        elif not isinstance(paket_7_boy, dict):
            log_test("Product 2: paket_adetleri_7_boy is dict", False, f"Type is {type(paket_7_boy)}, expected dict")
        else:
            log_test("Product 2: paket_adetleri_7_boy is dict", True, f"Value: {paket_7_boy}")
            
            # Check specific key
            if "1768375527278062" in paket_7_boy:
                value = paket_7_boy["1768375527278062"]
                if value == 120:
                    log_test("Product 2: paket_adetleri_7_boy['1768375527278062'] = 120", True, f"Correct value: {value}")
                else:
                    log_test("Product 2: paket_adetleri_7_boy['1768375527278062'] = 120", False, f"Expected 120, got {value}")
            else:
                log_test("Product 2: paket_adetleri_7_boy has key '1768375527278062'", False, f"Key not found. Available keys: {list(paket_7_boy.keys())}")
        
        # Check paket_adetleri_5_boy
        print("\n   Checking paket_adetleri_5_boy field...")
        paket_5_boy = product2.get("paket_adetleri_5_boy")
        
        if paket_5_boy is None:
            log_test("Product 2: paket_adetleri_5_boy exists", False, "Field is missing")
        elif not isinstance(paket_5_boy, dict):
            log_test("Product 2: paket_adetleri_5_boy is dict", False, f"Type is {type(paket_5_boy)}, expected dict")
        else:
            log_test("Product 2: paket_adetleri_5_boy is dict", True, f"Value: {paket_5_boy}")
            
            # Check specific key
            if "1768375527278062" in paket_5_boy:
                value = paket_5_boy["1768375527278062"]
                if value == 84:
                    log_test("Product 2: paket_adetleri_5_boy['1768375527278062'] = 84", True, f"Correct value: {value}")
                else:
                    log_test("Product 2: paket_adetleri_5_boy['1768375527278062'] = 84", False, f"Expected 84, got {value}")
            else:
                log_test("Product 2: paket_adetleri_5_boy has key '1768375527278062'", False, f"Key not found. Available keys: {list(paket_5_boy.keys())}")
        
        return True
        
    except Exception as e:
        log_test("GET /api/products", False, f"Exception: {str(e)}")
        return False

def test_foto_analiz_quick(token):
    """Quick test of POST /api/uretim/foto-analiz endpoint"""
    print("\n" + "="*80)
    print("TEST 5: POST /api/uretim/foto-analiz - Quick Photo Analysis Test")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a minimal test image (1x1 pixel PNG)
    import base64
    # Minimal 1x1 transparent PNG
    minimal_png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )
    
    try:
        files = {"file": ("test.png", minimal_png, "image/png")}
        
        print("   Sending minimal test image to foto-analiz endpoint...")
        response = requests.post(
            f"{BASE_URL}/uretim/foto-analiz",
            headers=headers,
            files=files,
            timeout=120  # Allow up to 120 seconds for AI processing
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if extracted field exists
            if "extracted" in data:
                extracted = data["extracted"]
                
                # Check if cikan_paketler exists and is an array
                if "cikan_paketler" in extracted:
                    cikan_paketler = extracted["cikan_paketler"]
                    
                    if isinstance(cikan_paketler, list):
                        log_test("POST /api/uretim/foto-analiz", True, 
                                f"Status 200, extracted.cikan_paketler is array with {len(cikan_paketler)} items")
                    else:
                        log_test("POST /api/uretim/foto-analiz", False, 
                                f"extracted.cikan_paketler is not an array, type: {type(cikan_paketler)}")
                else:
                    log_test("POST /api/uretim/foto-analiz", False, 
                            "extracted.cikan_paketler field missing in response")
            else:
                log_test("POST /api/uretim/foto-analiz", False, 
                        "extracted field missing in response")
        else:
            log_test("POST /api/uretim/foto-analiz", False, 
                    f"Status code: {response.status_code}, Response: {response.text[:500]}")
            
    except requests.exceptions.Timeout:
        log_test("POST /api/uretim/foto-analiz", False, "Request timeout (>120s)")
    except Exception as e:
        log_test("POST /api/uretim/foto-analiz", False, f"Exception: {str(e)}")

def main():
    """Main test execution"""
    print("\n" + "="*80)
    print("BACKEND REGRESSION TEST: paket_adetleri fields in GET /api/products")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Login: {LOGIN_EMAIL}")
    print("="*80)
    
    # Step 1: Login
    token = login()
    if not token:
        print("\n❌ CRITICAL: Login failed. Cannot proceed with tests.")
        sys.exit(1)
    
    # Step 2: Test products paket_adetleri fields
    test_products_paket_adetleri(token)
    
    # Step 3: Quick test foto-analiz endpoint
    test_foto_analiz_quick(token)
    
    # Final summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ Tests Passed: {tests_passed}")
    print(f"❌ Tests Failed: {tests_failed}")
    print(f"📊 Total Tests: {tests_passed + tests_failed}")
    
    if tests_failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {tests_failed} TEST(S) FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
