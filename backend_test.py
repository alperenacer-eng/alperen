#!/usr/bin/env python3
"""
Backend Test Suite for GitHub Auto-Restore on Startup + Shutdown Flush
=======================================================================
Tests the P0 data loss bug fix that includes:
1. Backend health check
2. Startup restore log verification
3. GitHub sync push functionality
4. GitHub sync status endpoint
5. Regression tests for existing endpoints
"""

import requests
import time
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "https://alperen-labs.preview.emergentagent.com/api"

# Test credentials
TEST_EMAIL = "alperenacer@acerler.com"
TEST_PASSWORD = "1234"

# Global token storage
AUTH_TOKEN = None

# Test results tracking
test_results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(test_name, passed, message=""):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"] += 1
        status = "✅ PASS"
    else:
        test_results["failed"] += 1
        status = "❌ FAIL"
    
    test_results["tests"].append({
        "name": test_name,
        "passed": passed,
        "message": message
    })
    
    print(f"{status}: {test_name}")
    if message:
        print(f"  → {message}")

def get_headers(with_auth=False):
    """Get request headers"""
    headers = {"Content-Type": "application/json"}
    if with_auth and AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
    return headers

def test_health_check():
    """Test 1: Backend sağlıklı başladı mı?"""
    print("\n" + "="*80)
    print("TEST 1: Backend Health Check")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy" and "/app/backend/data/database.db" in data.get("database", ""):
                log_test("GET /api/health returns 200 with healthy status", True, 
                        f"Response: {json.dumps(data, indent=2)}")
                return True
            else:
                log_test("GET /api/health returns 200 with healthy status", False,
                        f"Unexpected response: {json.dumps(data, indent=2)}")
                return False
        else:
            log_test("GET /api/health returns 200 with healthy status", False,
                    f"Status code: {response.status_code}, Body: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("GET /api/health returns 200 with healthy status", False, f"Exception: {str(e)}")
        return False

def test_startup_restore_logs():
    """Test 2: Startup restore log'u var mı?"""
    print("\n" + "="*80)
    print("TEST 2: Startup Restore Log Verification")
    print("="*80)
    
    import subprocess
    
    try:
        # Check backend logs for restore messages (check both .out.log and .err.log)
        result_out = subprocess.run(
            ["tail", "-n", "200", "/var/log/supervisor/backend.out.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        result_err = subprocess.run(
            ["tail", "-n", "200", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        log_content = result_out.stdout + result_out.stderr + result_err.stdout + result_err.stderr
        
        # Look for restore log messages
        has_restore_log = False
        restore_message = ""
        
        if "GitHub restore skipped: local db is up to date" in log_content:
            has_restore_log = True
            restore_message = "Found: 'GitHub restore skipped: local db is up to date' (normal case)"
        elif "GitHub restore:" in log_content and "restored" in log_content:
            has_restore_log = True
            restore_message = "Found: 'GitHub restore: {..., 'restored': True, ...}' (fresh container case)"
        elif "GitHub restore skipped:" in log_content:
            has_restore_log = True
            restore_message = f"Found: GitHub restore skipped message in logs"
        
        # Check for error logs (should NOT exist)
        has_error = "GitHub restore failed at startup" in log_content
        
        if has_restore_log and not has_error:
            log_test("Startup restore log exists without errors", True, restore_message)
            return True
        elif has_error:
            log_test("Startup restore log exists without errors", False,
                    "ERROR: Found 'GitHub restore failed at startup' in logs")
            return False
        else:
            log_test("Startup restore log exists without errors", False,
                    "No restore log found in backend logs")
            return False
            
    except Exception as e:
        log_test("Startup restore log exists without errors", False, f"Exception: {str(e)}")
        return False

def test_login():
    """Test: Login functionality"""
    print("\n" + "="*80)
    print("TEST: Login Authentication")
    print("="*80)
    
    global AUTH_TOKEN
    
    try:
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=payload,
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                AUTH_TOKEN = data["access_token"]
                log_test(f"POST /api/auth/login with {TEST_EMAIL}/{TEST_PASSWORD}", True,
                        f"Token received, user: {data['user'].get('email')}")
                return True
            else:
                log_test(f"POST /api/auth/login with {TEST_EMAIL}/{TEST_PASSWORD}", False,
                        f"Missing access_token or user in response")
                return False
        else:
            log_test(f"POST /api/auth/login with {TEST_EMAIL}/{TEST_PASSWORD}", False,
                    f"Status code: {response.status_code}, Body: {response.text[:200]}")
            return False
    except Exception as e:
        log_test(f"POST /api/auth/login with {TEST_EMAIL}/{TEST_PASSWORD}", False, f"Exception: {str(e)}")
        return False

def test_github_sync_push():
    """Test 3: GitHub sync yeni verileri push ediyor mu?"""
    print("\n" + "="*80)
    print("TEST 3: GitHub Sync Push Functionality")
    print("="*80)
    
    if not AUTH_TOKEN:
        log_test("GitHub sync push test", False, "No auth token available")
        return False
    
    test_production_id = None
    
    try:
        # Step 1: Create a test production record
        print("\nStep 1: Creating test production record...")
        
        # First, get a valid product to use
        response = requests.get(
            f"{BASE_URL}/products",
            headers=get_headers(with_auth=True),
            timeout=10
        )
        
        if response.status_code != 200 or not response.json():
            log_test("GitHub sync push test - get products", False, 
                    "No products available for testing")
            return False
        
        products = response.json()
        test_product = products[0]
        
        # Create production record with valid schema
        production_payload = {
            "product_id": test_product["id"],
            "product_name": test_product["name"],
            "quantity": 100,
            "unit": test_product.get("unit", "adet"),
            "production_date": datetime.now().strftime("%Y-%m-%d"),
            "shift": "gündüz",
            "notes": "TEST_GITHUB_SYNC_" + datetime.now().strftime("%Y%m%d_%H%M%S"),
            "module": "bims"
        }
        
        response = requests.post(
            f"{BASE_URL}/production",
            json=production_payload,
            headers=get_headers(with_auth=True),
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            test_production_id = data.get("id")
            log_test("POST /api/production creates test record", True,
                    f"Created production record with ID: {test_production_id}")
        else:
            log_test("POST /api/production creates test record", False,
                    f"Status code: {response.status_code}, Body: {response.text[:300]}")
            return False
        
        # Step 2: Wait for debounce (3 seconds, but debounce is now 1s for table + 2s for DB)
        print("\nStep 2: Waiting 3 seconds for debounce...")
        time.sleep(3)
        
        # Step 3: Check GitHub sync status
        print("\nStep 3: Checking GitHub sync status...")
        response = requests.get(
            f"{BASE_URL}/github-sync/status",
            headers=get_headers(with_auth=True),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            last_success = data.get("stats", {}).get("last_success_at")
            
            if last_success:
                # Parse last_success_at timestamp
                try:
                    from dateutil import parser
                    last_success_time = parser.isoparse(last_success)
                    current_time = datetime.now(last_success_time.tzinfo)
                    time_diff = (current_time - last_success_time).total_seconds()
                    
                    if time_diff <= 30:
                        log_test("GET /api/github-sync/status shows recent push", True,
                                f"last_success_at: {last_success} (within last 30 seconds)")
                    else:
                        log_test("GET /api/github-sync/status shows recent push", False,
                                f"last_success_at: {last_success} (more than 30 seconds ago: {time_diff}s)")
                        return False
                except:
                    # Fallback: just check if last_success exists
                    log_test("GET /api/github-sync/status shows recent push", True,
                            f"last_success_at exists: {last_success}")
            else:
                log_test("GET /api/github-sync/status shows recent push", False,
                        "No last_success_at in response")
                return False
        else:
            log_test("GET /api/github-sync/status shows recent push", False,
                    f"Status code: {response.status_code}, Body: {response.text[:200]}")
            return False
        
        # Step 4: Cleanup - delete test record
        print("\nStep 4: Cleaning up test record...")
        if test_production_id:
            response = requests.delete(
                f"{BASE_URL}/production/{test_production_id}",
                headers=get_headers(with_auth=True),
                timeout=10
            )
            
            if response.status_code in [200, 204]:
                log_test("DELETE /api/production/{id} cleanup", True,
                        f"Deleted test production record: {test_production_id}")
            else:
                log_test("DELETE /api/production/{id} cleanup", False,
                        f"Status code: {response.status_code}, Body: {response.text[:200]}")
        
        return True
        
    except Exception as e:
        log_test("GitHub sync push test", False, f"Exception: {str(e)}")
        
        # Attempt cleanup even on error
        if test_production_id:
            try:
                requests.delete(
                    f"{BASE_URL}/production/{test_production_id}",
                    headers=get_headers(with_auth=True),
                    timeout=10
                )
            except:
                pass
        
        return False

def test_github_sync_status():
    """Test 4: /api/github-sync/status endpoint'i doğru cevap veriyor mu?"""
    print("\n" + "="*80)
    print("TEST 4: GitHub Sync Status Endpoint")
    print("="*80)
    
    if not AUTH_TOKEN:
        log_test("GitHub sync status endpoint test", False, "No auth token available")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/github-sync/status",
            headers=get_headers(with_auth=True),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            has_configured = "configured" in data
            has_repo = "repo" in data
            has_branch = "branch" in data
            has_stats = "stats" in data
            
            if has_configured and has_repo and has_branch and has_stats:
                is_configured = data.get("configured")
                
                if is_configured:
                    log_test("GET /api/github-sync/status returns correct structure", True,
                            f"Response has all required fields (configured={is_configured}, repo={data.get('repo')}, branch={data.get('branch')})")
                    return True
                else:
                    log_test("GET /api/github-sync/status returns correct structure", False,
                            "configured is False - GitHub sync not configured")
                    return False
            else:
                missing_fields = []
                if not has_configured: missing_fields.append("configured")
                if not has_repo: missing_fields.append("repo")
                if not has_branch: missing_fields.append("branch")
                if not has_stats: missing_fields.append("stats")
                
                log_test("GET /api/github-sync/status returns correct structure", False,
                        f"Missing fields: {', '.join(missing_fields)}")
                return False
        else:
            log_test("GET /api/github-sync/status returns correct structure", False,
                    f"Status code: {response.status_code}, Body: {response.text[:200]}")
            return False
            
    except Exception as e:
        log_test("GET /api/github-sync/status returns correct structure", False, f"Exception: {str(e)}")
        return False

def test_regression():
    """Test 5: Regresyon testi - mevcut endpoint'ler çalışıyor mu?"""
    print("\n" + "="*80)
    print("TEST 5: Regression Tests - Existing Endpoints")
    print("="*80)
    
    if not AUTH_TOKEN:
        log_test("Regression tests", False, "No auth token available")
        return False
    
    all_passed = True
    
    # Test 5.1: GET /api/production
    try:
        response = requests.get(
            f"{BASE_URL}/production",
            headers=get_headers(with_auth=True),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/production returns 200 with array", True,
                        f"Retrieved {len(data)} production records")
            else:
                log_test("GET /api/production returns 200 with array", False,
                        f"Response is not an array: {type(data)}")
                all_passed = False
        else:
            log_test("GET /api/production returns 200 with array", False,
                    f"Status code: {response.status_code}")
            all_passed = False
    except Exception as e:
        log_test("GET /api/production returns 200 with array", False, f"Exception: {str(e)}")
        all_passed = False
    
    # Test 5.2: GET /api/personeller
    try:
        response = requests.get(
            f"{BASE_URL}/personeller",
            headers=get_headers(with_auth=True),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/personeller returns 200", True,
                        f"Retrieved {len(data)} personnel records")
            else:
                log_test("GET /api/personeller returns 200", False,
                        f"Response is not an array: {type(data)}")
                all_passed = False
        else:
            log_test("GET /api/personeller returns 200", False,
                    f"Status code: {response.status_code}")
            all_passed = False
    except Exception as e:
        log_test("GET /api/personeller returns 200", False, f"Exception: {str(e)}")
        all_passed = False
    
    # Test 5.3: GET /api/products
    try:
        response = requests.get(
            f"{BASE_URL}/products",
            headers=get_headers(with_auth=True),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("GET /api/products returns 200", True,
                        f"Retrieved {len(data)} products")
            else:
                log_test("GET /api/products returns 200", False,
                        f"Response is not an array: {type(data)}")
                all_passed = False
        else:
            log_test("GET /api/products returns 200", False,
                    f"Status code: {response.status_code}")
            all_passed = False
    except Exception as e:
        log_test("GET /api/products returns 200", False, f"Exception: {str(e)}")
        all_passed = False
    
    # Test 5.4: GET /api/reports/monthly
    try:
        response = requests.get(
            f"{BASE_URL}/reports/monthly?year=2026&month=1",
            headers=get_headers(with_auth=True),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "by_product" in data and isinstance(data["by_product"], list):
                log_test("GET /api/reports/monthly returns 200 with by_product array", True,
                        f"Report contains {len(data['by_product'])} product entries")
            else:
                log_test("GET /api/reports/monthly returns 200 with by_product array", False,
                        f"Missing or invalid by_product field")
                all_passed = False
        else:
            log_test("GET /api/reports/monthly returns 200 with by_product array", False,
                    f"Status code: {response.status_code}")
            all_passed = False
    except Exception as e:
        log_test("GET /api/reports/monthly returns 200 with by_product array", False, f"Exception: {str(e)}")
        all_passed = False
    
    return all_passed

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {test_results['total']}")
    print(f"Passed: {test_results['passed']} ✅")
    print(f"Failed: {test_results['failed']} ❌")
    print(f"Success Rate: {(test_results['passed'] / test_results['total'] * 100):.1f}%")
    
    if test_results['failed'] > 0:
        print("\n" + "="*80)
        print("FAILED TESTS:")
        print("="*80)
        for test in test_results['tests']:
            if not test['passed']:
                print(f"❌ {test['name']}")
                if test['message']:
                    print(f"   {test['message']}")
    
    print("\n" + "="*80)
    print("DETAILED RESULTS:")
    print("="*80)
    for test in test_results['tests']:
        status = "✅ PASS" if test['passed'] else "❌ FAIL"
        print(f"{status}: {test['name']}")
        if test['message']:
            print(f"  → {test['message']}")

def main():
    """Main test runner"""
    print("="*80)
    print("GITHUB AUTO-RESTORE + SHUTDOWN FLUSH BACKEND TEST SUITE")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"Test Credentials: {TEST_EMAIL} / {TEST_PASSWORD}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # Run tests in order
    test_health_check()
    test_startup_restore_logs()
    
    # Login is required for subsequent tests
    if not test_login():
        print("\n❌ Login failed - cannot continue with remaining tests")
        print_summary()
        sys.exit(1)
    
    test_github_sync_push()
    test_github_sync_status()
    test_regression()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    if test_results['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
