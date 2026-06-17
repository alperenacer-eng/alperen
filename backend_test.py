#!/usr/bin/env python3
"""
Backend API Testing Script for BIMS Üretim Aylık Rapor - Ürün Bazlı yeni alanlar
Tests newly added fields in GET /api/reports/monthly endpoint
"""

import requests
import json
import sys

# Backend URL from frontend/.env
BACKEND_URL = "https://getir-project-1.preview.emergentagent.com/api"

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

def find_year_month_with_records():
    """Find a year/month that has production records"""
    print("\n" + "="*80)
    print("TEST 2: Find Year/Month with Production Records")
    print("="*80)
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/production",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Get the first record's date
                first_record = data[0]
                production_date = first_record.get("production_date") or first_record.get("created_at", "")[:10]
                
                if production_date:
                    year = int(production_date.split("-")[0])
                    month = int(production_date.split("-")[1])
                    print_test("GET /api/production", True, f"Found {len(data)} records. Using year={year}, month={month} from date: {production_date}")
                    return year, month, len(data)
                else:
                    print_test("GET /api/production", False, f"No production_date found in record: {first_record}")
                    return None, None, 0
            else:
                print_test("GET /api/production", False, f"No production records found. Cannot test monthly report.")
                return None, None, 0
        else:
            print_test("GET /api/production", False, f"Status: {response.status_code}, Response: {response.text}")
            return None, None, 0
    except Exception as e:
        print_test("GET /api/production", False, f"Exception: {str(e)}")
        return None, None, 0

def test_monthly_report_new_fields(year, month):
    """Test GET /api/reports/monthly with new fields"""
    print("\n" + "="*80)
    print(f"TEST 3: Monthly Report New Fields (year={year}, month={month})")
    print("="*80)
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/reports/monthly?year={year}&month={month}",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code != 200:
            print_test("GET /api/reports/monthly", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        
        # Check if by_product exists
        if "by_product" not in data:
            print_test("GET /api/reports/monthly", False, f"Response missing 'by_product' field. Keys: {list(data.keys())}")
            return False
        
        by_product = data["by_product"]
        
        # Check if by_product is an array
        if not isinstance(by_product, list):
            print_test("GET /api/reports/monthly", False, f"'by_product' is not an array. Type: {type(by_product)}")
            return False
        
        print_test("GET /api/reports/monthly", True, f"Endpoint returned 200 with by_product array containing {len(by_product)} products")
        
        # If no products, that's OK for empty month
        if len(by_product) == 0:
            print_test("by_product array", True, f"Empty array (no production records for this month)")
            return True
        
        # Check each product has the required fields
        all_fields_present = True
        required_new_fields = ["records", "strip_used", "mix_count", "cement_used", "machine_cement"]
        required_existing_fields = ["product_name", "quantity", "net_pallets"]
        
        for idx, product in enumerate(by_product):
            product_name = product.get("product_name", f"Product {idx}")
            
            # Check existing fields
            missing_existing = [f for f in required_existing_fields if f not in product]
            if missing_existing:
                print_test(f"Product '{product_name}' - Existing fields", False, f"Missing fields: {missing_existing}")
                all_fields_present = False
                continue
            
            # Check new fields
            missing_new = [f for f in required_new_fields if f not in product]
            if missing_new:
                print_test(f"Product '{product_name}' - New fields", False, f"Missing fields: {missing_new}")
                all_fields_present = False
                continue
            
            # Validate field types
            records = product.get("records")
            strip_used = product.get("strip_used")
            mix_count = product.get("mix_count")
            cement_used = product.get("cement_used")
            machine_cement = product.get("machine_cement")
            
            # records should be integer >= 1
            if not isinstance(records, int) or records < 1:
                print_test(f"Product '{product_name}' - records field", False, f"Expected integer >= 1, got: {records} (type: {type(records)})")
                all_fields_present = False
                continue
            
            # Other fields should be numbers (int or float)
            if not isinstance(strip_used, (int, float)):
                print_test(f"Product '{product_name}' - strip_used field", False, f"Expected number, got: {strip_used} (type: {type(strip_used)})")
                all_fields_present = False
                continue
            
            if not isinstance(mix_count, (int, float)):
                print_test(f"Product '{product_name}' - mix_count field", False, f"Expected number, got: {mix_count} (type: {type(mix_count)})")
                all_fields_present = False
                continue
            
            if not isinstance(cement_used, (int, float)):
                print_test(f"Product '{product_name}' - cement_used field", False, f"Expected number, got: {cement_used} (type: {type(cement_used)})")
                all_fields_present = False
                continue
            
            if not isinstance(machine_cement, (int, float)):
                print_test(f"Product '{product_name}' - machine_cement field", False, f"Expected number, got: {machine_cement} (type: {type(machine_cement)})")
                all_fields_present = False
                continue
            
            print_test(f"Product '{product_name}'", True, 
                      f"All fields present - records={records}, strip_used={strip_used}, mix_count={mix_count}, cement_used={cement_used}, machine_cement={machine_cement}")
        
        return all_fields_present
        
    except Exception as e:
        print_test("GET /api/reports/monthly", False, f"Exception: {str(e)}")
        return False

def validate_records_count(year, month, by_product):
    """Validate that records count matches actual production records for each product"""
    print("\n" + "="*80)
    print(f"TEST 4: Validate Records Count (year={year}, month={month})")
    print("="*80)
    
    try:
        # Get all production records for the month (use high limit to get all)
        response = requests.get(
            f"{BACKEND_URL}/production?limit=10000",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code != 200:
            print_test("GET /api/production", False, f"Status: {response.status_code}")
            return False
        
        all_records = response.json()
        
        # Filter records for the specific year/month
        start_date = f"{year:04d}-{month:02d}-01"
        if month == 12:
            next_y, next_m = year + 1, 1
        else:
            next_y, next_m = year, month + 1
        end_date = f"{next_y:04d}-{next_m:02d}-01"
        
        month_records = []
        for r in all_records:
            dkey = r.get("production_date") or (r.get("created_at") or "")[:10]
            if dkey and dkey >= start_date and dkey < end_date:
                month_records.append(r)
        
        print(f"Found {len(month_records)} production records for {year}-{month:02d}")
        
        # Count records by product
        product_counts = {}
        for r in month_records:
            pname = r.get("product_name") or "-"
            product_counts[pname] = product_counts.get(pname, 0) + 1
        
        # Validate each product in by_product
        all_valid = True
        for product in by_product:
            product_name = product.get("product_name")
            records_in_report = product.get("records")
            actual_count = product_counts.get(product_name, 0)
            
            if records_in_report == actual_count:
                print_test(f"Product '{product_name}' records count", True, 
                          f"Report shows {records_in_report} records, actual count is {actual_count} ✅")
            else:
                print_test(f"Product '{product_name}' records count", False, 
                          f"Report shows {records_in_report} records, but actual count is {actual_count}")
                all_valid = False
        
        return all_valid
        
    except Exception as e:
        print_test("Validate records count", False, f"Exception: {str(e)}")
        return False

def test_empty_month():
    """Test that endpoint returns 200 with empty by_product for a month with no records"""
    print("\n" + "="*80)
    print("TEST 5: Empty Month (year=2099, month=12)")
    print("="*80)
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/reports/monthly?year=2099&month=12",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code != 200:
            print_test("GET /api/reports/monthly (empty month)", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        
        if "by_product" not in data:
            print_test("GET /api/reports/monthly (empty month)", False, f"Response missing 'by_product' field")
            return False
        
        by_product = data["by_product"]
        
        if not isinstance(by_product, list):
            print_test("GET /api/reports/monthly (empty month)", False, f"'by_product' is not an array")
            return False
        
        if len(by_product) == 0:
            print_test("GET /api/reports/monthly (empty month)", True, f"Correctly returned 200 with empty by_product array")
            return True
        else:
            print_test("GET /api/reports/monthly (empty month)", False, f"Expected empty array, got {len(by_product)} products")
            return False
        
    except Exception as e:
        print_test("GET /api/reports/monthly (empty month)", False, f"Exception: {str(e)}")
        return False

def main():
    """Main test execution"""
    print("\n" + "="*80)
    print("BIMS ÜRETİM AYLIK RAPOR - ÜRÜN BAZLI YENİ ALANLAR TESTİ")
    print("Testing new fields in GET /api/reports/monthly endpoint")
    print("="*80)
    
    # Login
    if not login():
        print("\n❌ LOGIN FAILED - Cannot proceed with tests")
        sys.exit(1)
    
    # Find year/month with records
    year, month, total_records = find_year_month_with_records()
    if year is None or month is None:
        print("\n❌ NO PRODUCTION RECORDS FOUND - Cannot test monthly report")
        sys.exit(1)
    
    # Test monthly report new fields
    monthly_report_result = test_monthly_report_new_fields(year, month)
    
    # Get by_product for validation
    response = requests.get(
        f"{BACKEND_URL}/reports/monthly?year={year}&month={month}",
        headers=get_headers(),
        timeout=10
    )
    by_product = response.json().get("by_product", []) if response.status_code == 200 else []
    
    # Validate records count
    records_count_result = validate_records_count(year, month, by_product) if by_product else True
    
    # Test empty month
    empty_month_result = test_empty_month()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    all_passed = monthly_report_result and records_count_result and empty_month_result
    
    print(f"\nLogin Authentication: ✅ PASSED")
    print(f"Find Year/Month with Records: ✅ PASSED (year={year}, month={month})")
    print(f"Monthly Report New Fields: {'✅ PASSED' if monthly_report_result else '❌ FAILED'}")
    print(f"Records Count Validation: {'✅ PASSED' if records_count_result else '❌ FAILED'}")
    print(f"Empty Month Test: {'✅ PASSED' if empty_month_result else '❌ FAILED'}")
    
    if all_passed:
        print("\n✅ ALL TESTS PASSED (5/5)")
        print("\nMonthly Report New Fields are working correctly:")
        print("  - by_product array exists ✅")
        print("  - New fields present: records, strip_used, mix_count, cement_used, machine_cement ✅")
        print("  - Existing fields preserved: product_name, quantity, net_pallets ✅")
        print("  - Records count matches actual production records ✅")
        print("  - Empty month returns 200 with empty by_product array ✅")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
