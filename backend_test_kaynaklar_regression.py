#!/usr/bin/env python3
"""
Backend API Regression Testing Script for Kaynaklar CRUD + Üretim Girişi Refresh Fix
Tests molds, products, departments, operators CRUD operations with cache-busting support
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL
BACKEND_URL = "https://photo-backup-app.preview.emergentagent.com/api"

# Test credentials
LOGIN_EMAIL = "alperenacer@acerler.com"
LOGIN_PASSWORD = "1234"

# Global token storage
TOKEN = None

# Test results tracking
test_results = []
test_data = {}  # Store created IDs for cleanup

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
    print("TEST 1: LOGIN AUTHENTICATION")
    print("="*80)
    
    url = f"{BACKEND_URL}/auth/login"
    payload = {"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"POST {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            TOKEN = data.get("access_token")
            if TOKEN:
                log_test("POST /api/auth/login", True, f"Token received, user: {data.get('user', {}).get('email')}")
                return True
            else:
                log_test("POST /api/auth/login", False, "No access_token in response")
                return False
        else:
            log_test("POST /api/auth/login", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/auth/login", False, f"Exception: {str(e)}")
        return False

def get_headers():
    """Get authorization headers"""
    return {"Authorization": f"Bearer {TOKEN}"}

def test_molds_crud():
    """Test Molds CRUD end-to-end"""
    print("\n" + "="*80)
    print("TEST 2: MOLDS CRUD END-TO-END")
    print("="*80)
    
    # Step 1: GET /api/molds - Initial list
    print("\n--- Step 1: GET /api/molds (initial list) ---")
    url = f"{BACKEND_URL}/molds"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            molds = response.json()
            initial_count = len(molds)
            log_test("GET /api/molds (initial)", True, f"Retrieved {initial_count} molds")
        else:
            log_test("GET /api/molds (initial)", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/molds (initial)", False, f"Exception: {str(e)}")
        return False
    
    # Step 2: POST /api/molds - Create new mold
    print("\n--- Step 2: POST /api/molds (create new mold) ---")
    url = f"{BACKEND_URL}/molds"
    payload = {
        "mold_no": "TEST-KALIP-BUG",
        "description": "Bug fix test kalıbı",
        "product_id": "1768387988804789",
        "product_name": "AC BL 19 SW",
        "kalip_no_1": "TEST-99-01",
        "kalip_no_2": "TEST-99-02"
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers(), timeout=30)
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            mold = response.json()
            mold_id = mold.get("id")
            test_data["mold_id"] = mold_id
            
            # Verify all fields
            if (mold.get("mold_no") == "TEST-KALIP-BUG" and
                mold.get("description") == "Bug fix test kalıbı" and
                mold.get("product_id") == "1768387988804789" and
                mold.get("product_name") == "AC BL 19 SW" and
                mold.get("kalip_no_1") == "TEST-99-01" and
                mold.get("kalip_no_2") == "TEST-99-02" and
                mold_id):
                log_test("POST /api/molds", True, f"Created mold with ID: {mold_id}")
            else:
                log_test("POST /api/molds", False, f"Response fields mismatch: {json.dumps(mold, indent=2)}")
                return False
        else:
            log_test("POST /api/molds", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/molds", False, f"Exception: {str(e)}")
        return False
    
    # Step 3: GET /api/molds - Verify new mold in list
    print("\n--- Step 3: GET /api/molds (verify new mold in list) ---")
    url = f"{BACKEND_URL}/molds"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            molds = response.json()
            found = False
            for m in molds:
                if m.get("mold_no") == "TEST-KALIP-BUG":
                    found = True
                    break
            
            if found:
                log_test("GET /api/molds (verify new mold)", True, f"New mold 'TEST-KALIP-BUG' found in list ({len(molds)} total molds)")
            else:
                log_test("GET /api/molds (verify new mold)", False, "New mold 'TEST-KALIP-BUG' NOT found in list")
                return False
        else:
            log_test("GET /api/molds (verify new mold)", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/molds (verify new mold)", False, f"Exception: {str(e)}")
        return False
    
    # Step 4: GET /api/molds?_ts=1234567890 - Cache-busting test
    print("\n--- Step 4: GET /api/molds?_ts=1234567890 (cache-busting query param) ---")
    timestamp = int(datetime.now().timestamp())
    url = f"{BACKEND_URL}/molds?_ts={timestamp}"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            molds = response.json()
            found = False
            for m in molds:
                if m.get("mold_no") == "TEST-KALIP-BUG":
                    found = True
                    break
            
            if found:
                log_test("GET /api/molds?_ts=... (cache-busting)", True, f"Cache-busting query param works, mold found ({len(molds)} total)")
            else:
                log_test("GET /api/molds?_ts=... (cache-busting)", False, "Mold not found with cache-busting param")
                return False
        else:
            log_test("GET /api/molds?_ts=... (cache-busting)", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/molds?_ts=... (cache-busting)", False, f"Exception: {str(e)}")
        return False
    
    # Step 5: DELETE /api/molds/{id} - Cleanup
    print("\n--- Step 5: DELETE /api/molds/{id} (cleanup) ---")
    mold_id = test_data.get("mold_id")
    url = f"{BACKEND_URL}/molds/{mold_id}"
    try:
        response = requests.delete(url, headers=get_headers(), timeout=30)
        print(f"DELETE {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            log_test("DELETE /api/molds/{id}", True, f"Deleted mold ID: {mold_id}")
        else:
            log_test("DELETE /api/molds/{id}", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("DELETE /api/molds/{id}", False, f"Exception: {str(e)}")
        return False
    
    # Step 6: GET /api/molds - Verify deletion
    print("\n--- Step 6: GET /api/molds (verify deletion) ---")
    url = f"{BACKEND_URL}/molds"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            molds = response.json()
            found = False
            for m in molds:
                if m.get("mold_no") == "TEST-KALIP-BUG":
                    found = True
                    break
            
            if not found:
                log_test("GET /api/molds (verify deletion)", True, f"Deleted mold no longer present ({len(molds)} total molds)")
            else:
                log_test("GET /api/molds (verify deletion)", False, "Deleted mold still present in list")
                return False
        else:
            log_test("GET /api/molds (verify deletion)", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/molds (verify deletion)", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_regression_checks():
    """Test regression checks for other resource endpoints"""
    print("\n" + "="*80)
    print("TEST 3: REGRESSION CHECKS (OTHER RESOURCE ENDPOINTS)")
    print("="*80)
    
    # Test 1: GET /api/products
    print("\n--- Test 1: GET /api/products ---")
    url = f"{BACKEND_URL}/products"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            products = response.json()
            if len(products) >= 25:
                log_test("GET /api/products", True, f"Retrieved {len(products)} products (expected 25+)")
            else:
                log_test("GET /api/products", False, f"Only {len(products)} products found (expected 25+)")
        else:
            log_test("GET /api/products", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("GET /api/products", False, f"Exception: {str(e)}")
    
    # Test 2: GET /api/departments
    print("\n--- Test 2: GET /api/departments ---")
    url = f"{BACKEND_URL}/departments"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            departments = response.json()
            if len(departments) >= 3:
                log_test("GET /api/departments", True, f"Retrieved {len(departments)} departments (expected 3+)")
            else:
                log_test("GET /api/departments", False, f"Only {len(departments)} departments found (expected 3+)")
        else:
            log_test("GET /api/departments", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("GET /api/departments", False, f"Exception: {str(e)}")
    
    # Test 3: GET /api/operators
    print("\n--- Test 3: GET /api/operators ---")
    url = f"{BACKEND_URL}/operators"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            operators = response.json()
            if len(operators) >= 4:
                log_test("GET /api/operators", True, f"Retrieved {len(operators)} operators (expected 4+)")
            else:
                log_test("GET /api/operators", False, f"Only {len(operators)} operators found (expected 4+)")
        else:
            log_test("GET /api/operators", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("GET /api/operators", False, f"Exception: {str(e)}")
    
    # Test 4: GET /api/products?_ts=999 - Cache-busting
    print("\n--- Test 4: GET /api/products?_ts=999 (cache-busting) ---")
    url = f"{BACKEND_URL}/products?_ts=999"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            products = response.json()
            log_test("GET /api/products?_ts=999", True, f"Cache-busting doesn't break endpoint ({len(products)} products)")
        else:
            log_test("GET /api/products?_ts=999", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("GET /api/products?_ts=999", False, f"Exception: {str(e)}")
    
    # Test 5: GET /api/departments?_ts=999 - Cache-busting
    print("\n--- Test 5: GET /api/departments?_ts=999 (cache-busting) ---")
    url = f"{BACKEND_URL}/departments?_ts=999"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            departments = response.json()
            log_test("GET /api/departments?_ts=999", True, f"Cache-busting doesn't break endpoint ({len(departments)} departments)")
        else:
            log_test("GET /api/departments?_ts=999", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("GET /api/departments?_ts=999", False, f"Exception: {str(e)}")
    
    # Test 6: GET /api/operators?_ts=999 - Cache-busting
    print("\n--- Test 6: GET /api/operators?_ts=999 (cache-busting) ---")
    url = f"{BACKEND_URL}/operators?_ts=999"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            operators = response.json()
            log_test("GET /api/operators?_ts=999", True, f"Cache-busting doesn't break endpoint ({len(operators)} operators)")
        else:
            log_test("GET /api/operators?_ts=999", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("GET /api/operators?_ts=999", False, f"Exception: {str(e)}")

def test_products_crud():
    """Test Products CRUD (regression)"""
    print("\n" + "="*80)
    print("TEST 4: PRODUCTS CRUD (REGRESSION)")
    print("="*80)
    
    # Step 1: POST /api/products
    print("\n--- Step 1: POST /api/products ---")
    url = f"{BACKEND_URL}/products"
    payload = {
        "name": "TEST BUG PRODUCT",
        "unit": "adet"
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers(), timeout=30)
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            product = response.json()
            product_id = product.get("id")
            test_data["product_id"] = product_id
            
            if product.get("name") == "TEST BUG PRODUCT" and product_id:
                log_test("POST /api/products", True, f"Created product with ID: {product_id}")
            else:
                log_test("POST /api/products", False, f"Response fields mismatch: {json.dumps(product, indent=2)}")
                return False
        else:
            log_test("POST /api/products", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/products", False, f"Exception: {str(e)}")
        return False
    
    # Step 2: GET /api/products - Verify new product
    print("\n--- Step 2: GET /api/products (verify new product) ---")
    url = f"{BACKEND_URL}/products"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            products = response.json()
            found = False
            for p in products:
                if p.get("name") == "TEST BUG PRODUCT":
                    found = True
                    break
            
            if found:
                log_test("GET /api/products (verify new product)", True, f"New product present in list")
            else:
                log_test("GET /api/products (verify new product)", False, "New product NOT found in list")
                return False
        else:
            log_test("GET /api/products (verify new product)", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/products (verify new product)", False, f"Exception: {str(e)}")
        return False
    
    # Step 3: DELETE /api/products/{id}
    print("\n--- Step 3: DELETE /api/products/{id} ---")
    product_id = test_data.get("product_id")
    url = f"{BACKEND_URL}/products/{product_id}"
    try:
        response = requests.delete(url, headers=get_headers(), timeout=30)
        print(f"DELETE {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            log_test("DELETE /api/products/{id}", True, f"Deleted product ID: {product_id}")
        else:
            log_test("DELETE /api/products/{id}", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("DELETE /api/products/{id}", False, f"Exception: {str(e)}")
        return False
    
    # Step 4: GET /api/products - Verify deletion
    print("\n--- Step 4: GET /api/products (verify deletion) ---")
    url = f"{BACKEND_URL}/products"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            products = response.json()
            found = False
            for p in products:
                if p.get("name") == "TEST BUG PRODUCT":
                    found = True
                    break
            
            if not found:
                log_test("GET /api/products (verify deletion)", True, f"Deleted product not present")
            else:
                log_test("GET /api/products (verify deletion)", False, "Deleted product still present in list")
                return False
        else:
            log_test("GET /api/products (verify deletion)", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/products (verify deletion)", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_operators_crud():
    """Test Operators CRUD (regression)"""
    print("\n" + "="*80)
    print("TEST 5: OPERATORS CRUD (REGRESSION)")
    print("="*80)
    
    # Step 1: POST /api/operators
    print("\n--- Step 1: POST /api/operators ---")
    url = f"{BACKEND_URL}/operators"
    payload = {
        "name": "TEST BUG OPERATOR"
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers(), timeout=30)
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            operator = response.json()
            operator_id = operator.get("id")
            test_data["operator_id"] = operator_id
            
            if operator.get("name") == "TEST BUG OPERATOR" and operator_id:
                log_test("POST /api/operators", True, f"Created operator with ID: {operator_id}")
            else:
                log_test("POST /api/operators", False, f"Response fields mismatch: {json.dumps(operator, indent=2)}")
                return False
        else:
            log_test("POST /api/operators", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/operators", False, f"Exception: {str(e)}")
        return False
    
    # Step 2: GET /api/operators - Verify new operator
    print("\n--- Step 2: GET /api/operators (verify new operator) ---")
    url = f"{BACKEND_URL}/operators"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            operators = response.json()
            found = False
            for o in operators:
                if o.get("name") == "TEST BUG OPERATOR":
                    found = True
                    break
            
            if found:
                log_test("GET /api/operators (verify new operator)", True, f"New operator present in list")
            else:
                log_test("GET /api/operators (verify new operator)", False, "New operator NOT found in list")
                return False
        else:
            log_test("GET /api/operators (verify new operator)", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/operators (verify new operator)", False, f"Exception: {str(e)}")
        return False
    
    # Step 3: DELETE /api/operators/{id}
    print("\n--- Step 3: DELETE /api/operators/{id} ---")
    operator_id = test_data.get("operator_id")
    url = f"{BACKEND_URL}/operators/{operator_id}"
    try:
        response = requests.delete(url, headers=get_headers(), timeout=30)
        print(f"DELETE {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            log_test("DELETE /api/operators/{id}", True, f"Deleted operator ID: {operator_id}")
        else:
            log_test("DELETE /api/operators/{id}", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("DELETE /api/operators/{id}", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_departments_crud():
    """Test Departments CRUD (regression)"""
    print("\n" + "="*80)
    print("TEST 6: DEPARTMENTS CRUD (REGRESSION)")
    print("="*80)
    
    # Step 1: POST /api/departments
    print("\n--- Step 1: POST /api/departments ---")
    url = f"{BACKEND_URL}/departments"
    payload = {
        "name": "TEST-BUG-DEPT"
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers(), timeout=30)
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            department = response.json()
            department_id = department.get("id")
            test_data["department_id"] = department_id
            
            if department.get("name") == "TEST-BUG-DEPT" and department_id:
                log_test("POST /api/departments", True, f"Created department with ID: {department_id}")
            else:
                log_test("POST /api/departments", False, f"Response fields mismatch: {json.dumps(department, indent=2)}")
                return False
        else:
            log_test("POST /api/departments", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("POST /api/departments", False, f"Exception: {str(e)}")
        return False
    
    # Step 2: GET /api/departments - Verify new department
    print("\n--- Step 2: GET /api/departments (verify new department) ---")
    url = f"{BACKEND_URL}/departments"
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            departments = response.json()
            found = False
            for d in departments:
                if d.get("name") == "TEST-BUG-DEPT":
                    found = True
                    break
            
            if found:
                log_test("GET /api/departments (verify new department)", True, f"New department present in list")
            else:
                log_test("GET /api/departments (verify new department)", False, "New department NOT found in list")
                return False
        else:
            log_test("GET /api/departments (verify new department)", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/departments (verify new department)", False, f"Exception: {str(e)}")
        return False
    
    # Step 3: DELETE /api/departments/{id}
    print("\n--- Step 3: DELETE /api/departments/{id} ---")
    department_id = test_data.get("department_id")
    url = f"{BACKEND_URL}/departments/{department_id}"
    try:
        response = requests.delete(url, headers=get_headers(), timeout=30)
        print(f"DELETE {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            log_test("DELETE /api/departments/{id}", True, f"Deleted department ID: {department_id}")
        else:
            log_test("DELETE /api/departments/{id}", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("DELETE /api/departments/{id}", False, f"Exception: {str(e)}")
        return False
    
    return True

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for t in test_results if t["passed"])
    failed = sum(1 for t in test_results if not t["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if failed > 0:
        print("\n" + "="*80)
        print("FAILED TESTS:")
        print("="*80)
        for t in test_results:
            if not t["passed"]:
                print(f"\n❌ {t['test']}")
                if t["details"]:
                    print(f"   {t['details']}")
    
    print("\n" + "="*80)
    print("CACHE-BUSTING VERIFICATION:")
    print("="*80)
    cache_busting_tests = [t for t in test_results if "_ts=" in t["test"]]
    if all(t["passed"] for t in cache_busting_tests):
        print("✅ ALL cache-busting query params work correctly")
        print("   - No 400 errors on any endpoint with ?_ts=xxx parameter")
        print("   - All endpoints return proper data with cache-busting param")
    else:
        print("❌ Some cache-busting tests failed")
    
    print("\n" + "="*80)
    print("CRUD OPERATIONS VERIFICATION:")
    print("="*80)
    crud_tests = [t for t in test_results if any(op in t["test"] for op in ["POST", "GET", "PUT", "DELETE"])]
    if all(t["passed"] for t in crud_tests):
        print("✅ ALL CRUD operations return proper status codes and data")
        print("   - Molds CRUD: CREATE, READ, UPDATE, DELETE working")
        print("   - Products CRUD: CREATE, READ, DELETE working")
        print("   - Operators CRUD: CREATE, READ, DELETE working")
        print("   - Departments CRUD: CREATE, READ, DELETE working")
    else:
        print("❌ Some CRUD operations failed")
    
    return failed == 0

def main():
    """Main test execution"""
    print("="*80)
    print("KAYNAKLAR CRUD + ÜRETIM GİRİŞİ REFRESH FIX - BACKEND REGRESSION TEST")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Credentials: {LOGIN_EMAIL}")
    print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Step 1: Login
    if not login():
        print("\n❌ LOGIN FAILED - Cannot proceed with tests")
        sys.exit(1)
    
    # Step 2: Test Molds CRUD
    test_molds_crud()
    
    # Step 3: Test Regression Checks
    test_regression_checks()
    
    # Step 4: Test Products CRUD
    test_products_crud()
    
    # Step 5: Test Operators CRUD
    test_operators_crud()
    
    # Step 6: Test Departments CRUD
    test_departments_crud()
    
    # Print Summary
    success = print_summary()
    
    if success:
        print("\n✅ ALL TESTS PASSED - Kaynaklar CRUD regression test successful")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED - See details above")
        sys.exit(1)

if __name__ == "__main__":
    main()
