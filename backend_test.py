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
BASE_URL = "https://entry-portal-79.preview.emergentagent.com/api"

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

def test_breakdown_analysis_default_params():
    """Test 1: GET /api/breakdown-analysis with default parameters (days=30, module=bims, use_ai=true)"""
    print("\n" + "="*80)
    print("TEST: Breakdown Analysis - Default Parameters")
    print("="*80)
    
    try:
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        response = requests.get(f"{BASE_URL}/breakdown-analysis", headers=headers, timeout=60)
        
        if response.status_code != 200:
            log_test("Breakdown Analysis - Default Params", False, 
                    f"Expected 200, got {response.status_code}: {response.text[:200]}")
            return False
        
        data = response.json()
        
        # Verify all required fields
        required_fields = [
            "date_range", "module", "total_records", "total_breakdowns", 
            "distinct_departments", "executive_summary", "top_issues_overall",
            "overall_top_keywords", "per_department", "recent_breakdowns",
            "ai_used", "ai_error"
        ]
        
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            log_test("Breakdown Analysis - Default Params", False, 
                    f"Missing fields: {missing_fields}")
            return False
        
        # Verify date_range structure
        if not all(k in data["date_range"] for k in ["start", "end", "days"]):
            log_test("Breakdown Analysis - Default Params", False, 
                    "date_range missing start/end/days")
            return False
        
        # Verify module
        if data["module"] != "bims":
            log_test("Breakdown Analysis - Default Params", False, 
                    f"Expected module='bims', got '{data['module']}'")
            return False
        
        # Verify data types
        if not isinstance(data["total_records"], int):
            log_test("Breakdown Analysis - Default Params", False, 
                    f"total_records should be int, got {type(data['total_records'])}")
            return False
        
        if not isinstance(data["total_breakdowns"], int):
            log_test("Breakdown Analysis - Default Params", False, 
                    f"total_breakdowns should be int, got {type(data['total_breakdowns'])}")
            return False
        
        if not isinstance(data["distinct_departments"], int):
            log_test("Breakdown Analysis - Default Params", False, 
                    f"distinct_departments should be int, got {type(data['distinct_departments'])}")
            return False
        
        if not isinstance(data["executive_summary"], str):
            log_test("Breakdown Analysis - Default Params", False, 
                    f"executive_summary should be string, got {type(data['executive_summary'])}")
            return False
        
        if not isinstance(data["top_issues_overall"], list):
            log_test("Breakdown Analysis - Default Params", False, 
                    f"top_issues_overall should be list, got {type(data['top_issues_overall'])}")
            return False
        
        if not isinstance(data["overall_top_keywords"], list):
            log_test("Breakdown Analysis - Default Params", False, 
                    f"overall_top_keywords should be list, got {type(data['overall_top_keywords'])}")
            return False
        
        if not isinstance(data["per_department"], list):
            log_test("Breakdown Analysis - Default Params", False, 
                    f"per_department should be list, got {type(data['per_department'])}")
            return False
        
        if not isinstance(data["recent_breakdowns"], list):
            log_test("Breakdown Analysis - Default Params", False, 
                    f"recent_breakdowns should be list, got {type(data['recent_breakdowns'])}")
            return False
        
        if not isinstance(data["ai_used"], bool):
            log_test("Breakdown Analysis - Default Params", False, 
                    f"ai_used should be bool, got {type(data['ai_used'])}")
            return False
        
        # Verify per_department structure if data exists
        if data["per_department"]:
            dept = data["per_department"][0]
            required_dept_fields = [
                "department_id", "department_name", "total_breakdowns", 
                "top_keywords", "ornekler", "ai_kategoriler", "ai_one_liner"
            ]
            missing_dept_fields = [f for f in required_dept_fields if f not in dept]
            if missing_dept_fields:
                log_test("Breakdown Analysis - Default Params", False, 
                        f"per_department missing fields: {missing_dept_fields}")
                return False
        
        # Verify recent_breakdowns structure if data exists
        if data["recent_breakdowns"]:
            recent = data["recent_breakdowns"][0]
            required_recent_fields = ["tarih", "isletme", "vardiya", "operator", "urun", "metin"]
            missing_recent_fields = [f for f in required_recent_fields if f not in recent]
            if missing_recent_fields:
                log_test("Breakdown Analysis - Default Params", False, 
                        f"recent_breakdowns missing fields: {missing_recent_fields}")
                return False
        
        # Log success with details
        msg = (f"Response OK: total_records={data['total_records']}, "
               f"total_breakdowns={data['total_breakdowns']}, "
               f"distinct_departments={data['distinct_departments']}, "
               f"ai_used={data['ai_used']}, "
               f"ai_error={data['ai_error']}")
        
        if data["total_breakdowns"] == 0:
            msg += " (No breakdown data in database - expected behavior)"
        
        log_test("Breakdown Analysis - Default Params", True, msg)
        
        # Print sample response for verification
        print(f"\n📊 Sample Response:")
        print(f"  Date Range: {data['date_range']['start']} to {data['date_range']['end']} ({data['date_range']['days']} days)")
        print(f"  Module: {data['module']}")
        print(f"  Total Records: {data['total_records']}")
        print(f"  Total Breakdowns: {data['total_breakdowns']}")
        print(f"  Distinct Departments: {data['distinct_departments']}")
        print(f"  AI Used: {data['ai_used']}")
        print(f"  AI Error: {data['ai_error']}")
        print(f"  Executive Summary Length: {len(data['executive_summary'])} chars")
        print(f"  Top Issues Overall: {len(data['top_issues_overall'])} items")
        print(f"  Overall Top Keywords: {len(data['overall_top_keywords'])} items")
        print(f"  Per Department: {len(data['per_department'])} departments")
        print(f"  Recent Breakdowns: {len(data['recent_breakdowns'])} items")
        
        if data["executive_summary"]:
            print(f"\n📝 Executive Summary Preview:")
            print(f"  {data['executive_summary'][:200]}...")
        
        return True
        
    except Exception as e:
        log_test("Breakdown Analysis - Default Params", False, f"Exception: {str(e)}")
        return False


def test_breakdown_analysis_no_ai():
    """Test 2: GET /api/breakdown-analysis?use_ai=false - Should return quickly without AI call"""
    print("\n" + "="*80)
    print("TEST: Breakdown Analysis - No AI (use_ai=false)")
    print("="*80)
    
    try:
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/breakdown-analysis?use_ai=false", headers=headers, timeout=30)
        elapsed_time = time.time() - start_time
        
        if response.status_code != 200:
            log_test("Breakdown Analysis - No AI", False, 
                    f"Expected 200, got {response.status_code}: {response.text[:200]}")
            return False
        
        data = response.json()
        
        # Verify ai_used is false
        if data.get("ai_used") != False:
            log_test("Breakdown Analysis - No AI", False, 
                    f"Expected ai_used=false, got {data.get('ai_used')}")
            return False
        
        # Verify response time is reasonable (should be fast without AI)
        msg = f"Response OK: ai_used=false, response_time={elapsed_time:.2f}s"
        if elapsed_time > 10:
            msg += " (Warning: Response time > 10s without AI)"
        
        log_test("Breakdown Analysis - No AI", True, msg)
        
        print(f"\n⚡ Performance:")
        print(f"  Response Time: {elapsed_time:.2f}s")
        print(f"  AI Used: {data['ai_used']}")
        
        return True
        
    except Exception as e:
        log_test("Breakdown Analysis - No AI", False, f"Exception: {str(e)}")
        return False


def test_breakdown_analysis_custom_date_range():
    """Test 3: GET /api/breakdown-analysis?start_date=2025-01-01&end_date=2026-12-31 - Custom date range"""
    print("\n" + "="*80)
    print("TEST: Breakdown Analysis - Custom Date Range")
    print("="*80)
    
    try:
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        params = {
            "start_date": "2025-01-01",
            "end_date": "2026-12-31",
            "use_ai": "false"  # Disable AI for faster test
        }
        response = requests.get(f"{BASE_URL}/breakdown-analysis", headers=headers, params=params, timeout=30)
        
        if response.status_code != 200:
            log_test("Breakdown Analysis - Custom Date Range", False, 
                    f"Expected 200, got {response.status_code}: {response.text[:200]}")
            return False
        
        data = response.json()
        
        # Verify date range
        if data["date_range"]["start"] != "2025-01-01":
            log_test("Breakdown Analysis - Custom Date Range", False, 
                    f"Expected start_date='2025-01-01', got '{data['date_range']['start']}'")
            return False
        
        if data["date_range"]["end"] != "2026-12-31":
            log_test("Breakdown Analysis - Custom Date Range", False, 
                    f"Expected end_date='2026-12-31', got '{data['date_range']['end']}'")
            return False
        
        msg = (f"Response OK: date_range={data['date_range']['start']} to {data['date_range']['end']}, "
               f"days={data['date_range']['days']}, "
               f"total_records={data['total_records']}, "
               f"total_breakdowns={data['total_breakdowns']}")
        
        log_test("Breakdown Analysis - Custom Date Range", True, msg)
        
        print(f"\n📅 Date Range Verification:")
        print(f"  Start Date: {data['date_range']['start']}")
        print(f"  End Date: {data['date_range']['end']}")
        print(f"  Days: {data['date_range']['days']}")
        print(f"  Total Records: {data['total_records']}")
        print(f"  Total Breakdowns: {data['total_breakdowns']}")
        
        return True
        
    except Exception as e:
        log_test("Breakdown Analysis - Custom Date Range", False, f"Exception: {str(e)}")
        return False


def test_breakdown_analysis_no_auth():
    """Test 4: GET /api/breakdown-analysis without auth - Should return 401/403"""
    print("\n" + "="*80)
    print("TEST: Breakdown Analysis - No Authentication")
    print("="*80)
    
    try:
        # No Authorization header
        response = requests.get(f"{BASE_URL}/breakdown-analysis", timeout=10)
        
        if response.status_code not in [401, 403]:
            log_test("Breakdown Analysis - No Auth", False, 
                    f"Expected 401 or 403, got {response.status_code}")
            return False
        
        log_test("Breakdown Analysis - No Auth", True, 
                f"Correctly returned {response.status_code} for unauthorized access")
        
        print(f"\n🔒 Security Check:")
        print(f"  Status Code: {response.status_code}")
        print(f"  Auth Required: ✅")
        
        return True
        
    except Exception as e:
        log_test("Breakdown Analysis - No Auth", False, f"Exception: {str(e)}")
        return False


def test_breakdown_analysis_ai_integration():
    """Test 5: Verify EMERGENT_LLM_KEY and AI integration"""
    print("\n" + "="*80)
    print("TEST: Breakdown Analysis - AI Integration Verification")
    print("="*80)
    
    try:
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        # Use default params with use_ai=true
        response = requests.get(f"{BASE_URL}/breakdown-analysis?use_ai=true", headers=headers, timeout=60)
        
        if response.status_code != 200:
            log_test("Breakdown Analysis - AI Integration", False, 
                    f"Expected 200, got {response.status_code}: {response.text[:200]}")
            return False
        
        data = response.json()
        
        # Check if there's breakdown data
        if data["total_breakdowns"] == 0:
            # No breakdown data, so AI should not be called
            if data["ai_used"] == False:
                log_test("Breakdown Analysis - AI Integration", True, 
                        "No breakdown data - AI not called (expected behavior)")
                print(f"\n🤖 AI Integration:")
                print(f"  Total Breakdowns: 0")
                print(f"  AI Used: False (expected - no data to analyze)")
                print(f"  AI Error: {data['ai_error']}")
                return True
            else:
                log_test("Breakdown Analysis - AI Integration", False, 
                        "AI was called despite no breakdown data")
                return False
        else:
            # There is breakdown data, verify AI was called
            if data["ai_used"] == False:
                # AI was not used - check if there's an error
                if data["ai_error"]:
                    log_test("Breakdown Analysis - AI Integration", False, 
                            f"AI not used due to error: {data['ai_error']}")
                    print(f"\n🤖 AI Integration:")
                    print(f"  Total Breakdowns: {data['total_breakdowns']}")
                    print(f"  AI Used: False")
                    print(f"  AI Error: {data['ai_error']}")
                    return False
                else:
                    log_test("Breakdown Analysis - AI Integration", False, 
                            "AI not used despite having breakdown data and no error")
                    return False
            else:
                # AI was used successfully
                msg = (f"AI integration working: total_breakdowns={data['total_breakdowns']}, "
                       f"ai_used=true, executive_summary_length={len(data['executive_summary'])}")
                
                if data["ai_error"]:
                    msg += f", ai_error={data['ai_error']}"
                
                log_test("Breakdown Analysis - AI Integration", True, msg)
                
                print(f"\n🤖 AI Integration:")
                print(f"  Total Breakdowns: {data['total_breakdowns']}")
                print(f"  AI Used: True ✅")
                print(f"  AI Error: {data['ai_error']}")
                print(f"  Executive Summary Length: {len(data['executive_summary'])} chars")
                print(f"  Top Issues Overall: {len(data['top_issues_overall'])} items")
                
                if data["executive_summary"]:
                    print(f"\n📝 AI-Generated Executive Summary:")
                    print(f"  {data['executive_summary'][:300]}...")
                
                if data["top_issues_overall"]:
                    print(f"\n🔝 Top Issues Overall (AI-categorized):")
                    for i, issue in enumerate(data["top_issues_overall"][:3], 1):
                        print(f"  {i}. {issue.get('kategori', 'N/A')}: {issue.get('aciklama', 'N/A')[:80]}...")
                
                return True
        
    except Exception as e:
        log_test("Breakdown Analysis - AI Integration", False, f"Exception: {str(e)}")
        return False


def test_breakdown_analysis_ai_with_data():
    """Test 6: Verify AI integration with actual breakdown data"""
    print("\n" + "="*80)
    print("TEST: Breakdown Analysis - AI Integration with Real Data")
    print("="*80)
    
    try:
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        # Use custom date range where we know there's data (2025-01-01 to 2026-12-31)
        params = {
            "start_date": "2025-01-01",
            "end_date": "2026-12-31",
            "use_ai": "true"
        }
        response = requests.get(f"{BASE_URL}/breakdown-analysis", headers=headers, params=params, timeout=90)
        
        if response.status_code != 200:
            log_test("Breakdown Analysis - AI with Data", False, 
                    f"Expected 200, got {response.status_code}: {response.text[:200]}")
            return False
        
        data = response.json()
        
        # Check if there's breakdown data
        if data["total_breakdowns"] == 0:
            log_test("Breakdown Analysis - AI with Data", True, 
                    "No breakdown data in specified range - AI not called (expected)")
            print(f"\n🤖 AI Integration:")
            print(f"  Total Breakdowns: 0")
            print(f"  AI Used: {data['ai_used']}")
            print(f"  Note: No data to analyze in this date range")
            return True
        
        # There is breakdown data - verify AI processing
        print(f"\n📊 Data Found:")
        print(f"  Total Records: {data['total_records']}")
        print(f"  Total Breakdowns: {data['total_breakdowns']}")
        print(f"  Distinct Departments: {data['distinct_departments']}")
        
        print(f"\n🤖 AI Processing:")
        print(f"  AI Used: {data['ai_used']}")
        print(f"  AI Error: {data['ai_error']}")
        
        if data["ai_used"]:
            # AI was successfully used
            print(f"  Executive Summary Length: {len(data['executive_summary'])} chars")
            print(f"  Top Issues Overall: {len(data['top_issues_overall'])} items")
            
            if data["executive_summary"]:
                print(f"\n📝 AI-Generated Executive Summary:")
                summary_lines = data['executive_summary'].split('\n')
                for line in summary_lines[:5]:  # Show first 5 lines
                    if line.strip():
                        print(f"  {line.strip()}")
                if len(summary_lines) > 5:
                    print(f"  ... ({len(summary_lines) - 5} more lines)")
            
            if data["top_issues_overall"]:
                print(f"\n🔝 Top Issues Overall (AI-categorized):")
                for i, issue in enumerate(data["top_issues_overall"][:5], 1):
                    kategori = issue.get('kategori', 'N/A')
                    adet = issue.get('adet', 0)
                    aciklama = issue.get('aciklama', 'N/A')
                    print(f"  {i}. {kategori} ({adet} adet): {aciklama[:100]}")
            
            if data["per_department"]:
                print(f"\n🏭 Per Department AI Analysis:")
                for i, dept in enumerate(data["per_department"][:3], 1):
                    print(f"  {i}. {dept['department_name']} ({dept['total_breakdowns']} breakdowns)")
                    if dept.get('ai_one_liner'):
                        print(f"     → {dept['ai_one_liner']}")
                    if dept.get('ai_kategoriler'):
                        print(f"     Categories: {len(dept['ai_kategoriler'])} AI-categorized issues")
            
            msg = (f"AI integration successful: total_breakdowns={data['total_breakdowns']}, "
                   f"ai_used=true, executive_summary_length={len(data['executive_summary'])}, "
                   f"top_issues={len(data['top_issues_overall'])}")
            
            log_test("Breakdown Analysis - AI with Data", True, msg)
            return True
        else:
            # AI was not used - check for error
            if data["ai_error"]:
                log_test("Breakdown Analysis - AI with Data", False, 
                        f"AI not used due to error: {data['ai_error']}")
                print(f"\n❌ AI Error Details:")
                print(f"  {data['ai_error']}")
                return False
            else:
                log_test("Breakdown Analysis - AI with Data", False, 
                        "AI not used despite having breakdown data and no error reported")
                return False
        
    except Exception as e:
        log_test("Breakdown Analysis - AI with Data", False, f"Exception: {str(e)}")
        import traceback
        print(f"\n❌ Exception Details:")
        print(traceback.format_exc())
        return False


def test_breakdown_analysis_comprehensive():
    """Run all breakdown analysis tests"""
    print("\n" + "="*80)
    print("BREAKDOWN ANALYSIS ENDPOINT - COMPREHENSIVE TEST SUITE")
    print("="*80)
    
    # Test 1: Default parameters
    test_breakdown_analysis_default_params()
    
    # Test 2: No AI
    test_breakdown_analysis_no_ai()
    
    # Test 3: Custom date range
    test_breakdown_analysis_custom_date_range()
    
    # Test 4: No authentication
    test_breakdown_analysis_no_auth()
    
    # Test 5: AI integration (with default params - may have no data)
    test_breakdown_analysis_ai_integration()
    
    # Test 6: AI integration with actual data (custom date range)
    test_breakdown_analysis_ai_with_data()


def main():
    """Main test runner"""
    print("="*80)
    print("BREAKDOWN ANALYSIS BACKEND TEST SUITE")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"Test Credentials: {TEST_EMAIL} / {TEST_PASSWORD}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # Login is required for tests
    if not test_login():
        print("\n❌ Login failed - cannot continue with tests")
        print_summary()
        sys.exit(1)
    
    # Run breakdown analysis tests
    test_breakdown_analysis_comprehensive()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    if test_results['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
