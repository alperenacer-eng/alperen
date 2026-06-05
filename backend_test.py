#!/usr/bin/env python3
"""
Backend API Testing Script for Maaş Bordrosu (Salary Payroll) Module
Tests the new automatic calculation feature and CRUD operations
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://alperen-dev.preview.emergentagent.com/api"
LOGIN_EMAIL = "alperenacer@acerler.com"
LOGIN_PASSWORD = "1234"

# Global variables
token = None
test_personel_id = None
test_bordro_id = None
test_puantaj_ids = []

def print_test(test_name):
    """Print test header"""
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print('='*80)

def print_result(success, message, data=None):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if data:
        print(f"Data: {json.dumps(data, indent=2, ensure_ascii=False)}")
    return success

def login():
    """Login and get authentication token"""
    global token
    print_test("Login Authentication")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print_result(True, f"Login successful for {LOGIN_EMAIL}")
                return True
            else:
                print_result(False, "No access_token in response", data)
                return False
        else:
            print_result(False, f"Login failed with status {response.status_code}", response.text)
            return False
    except Exception as e:
        print_result(False, f"Login exception: {str(e)}")
        return False

def get_headers():
    """Get headers with authentication token"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def get_active_personel():
    """Get an active personnel with salary > 0"""
    global test_personel_id
    print_test("Get Active Personnel with Salary")
    
    try:
        response = requests.get(
            f"{BASE_URL}/personeller",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            personeller = response.json()
            # Find active personnel with salary > 0
            for p in personeller:
                if p.get('aktif') and float(p.get('maas', 0)) > 0:
                    test_personel_id = p['id']
                    print_result(True, f"Found active personnel: {p.get('ad_soyad')} (ID: {test_personel_id}, Salary: {p.get('maas')})", 
                               {"id": test_personel_id, "ad_soyad": p.get('ad_soyad'), "maas": p.get('maas')})
                    return True
            
            print_result(False, "No active personnel with salary > 0 found")
            return False
        else:
            print_result(False, f"Failed to get personnel list: {response.status_code}", response.text)
            return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def create_test_puantaj():
    """Create test puantaj entries for July 2025"""
    global test_puantaj_ids
    print_test("Create Test Puantaj Entries for July 2025")
    
    if not test_personel_id:
        print_result(False, "No test_personel_id available")
        return False
    
    # Get personnel name
    try:
        response = requests.get(
            f"{BASE_URL}/personeller",
            headers=get_headers()
        )
        personeller = response.json()
        personel_adi = next((p['ad_soyad'] for p in personeller if p['id'] == test_personel_id), "Test Personel")
    except:
        personel_adi = "Test Personel"
    
    # Create test puantaj entries - using individual POST requests
    test_entries = [
        # Sunday work (July 6, 2025 is a Sunday)
        {
            "personel_id": test_personel_id,
            "personel_adi": personel_adi,
            "tarih": "2025-07-06",
            "giris_saati": "08:00",
            "cikis_saati": "17:00",
            "mesai_suresi": 9,
            "fazla_mesai": 1,
            "durum": "geldi",
            "notlar": ""
        },
        # Holiday work (resmi_tatil)
        {
            "personel_id": test_personel_id,
            "personel_adi": personel_adi,
            "tarih": "2025-07-15",
            "giris_saati": "08:00",
            "cikis_saati": "17:00",
            "mesai_suresi": 9,
            "fazla_mesai": 1,
            "durum": "resmi_tatil",
            "notlar": ""
        },
        # Normal weekday with overtime
        {
            "personel_id": test_personel_id,
            "personel_adi": personel_adi,
            "tarih": "2025-07-07",
            "giris_saati": "08:00",
            "cikis_saati": "19:00",
            "mesai_suresi": 11,
            "fazla_mesai": 3,
            "durum": "geldi",
            "notlar": ""
        },
        # Another weekday with overtime
        {
            "personel_id": test_personel_id,
            "personel_adi": personel_adi,
            "tarih": "2025-07-08",
            "giris_saati": "08:00",
            "cikis_saati": "18:00",
            "mesai_suresi": 10,
            "fazla_mesai": 2,
            "durum": "geldi",
            "notlar": ""
        },
        # Another Sunday (July 13, 2025)
        {
            "personel_id": test_personel_id,
            "personel_adi": personel_adi,
            "tarih": "2025-07-13",
            "giris_saati": "08:00",
            "cikis_saati": "16:00",
            "mesai_suresi": 8,
            "fazla_mesai": 0,
            "durum": "geldi",
            "notlar": ""
        }
    ]
    
    try:
        # Create entries individually
        created_count = 0
        for entry in test_entries:
            response = requests.post(
                f"{BASE_URL}/puantaj",
                headers=get_headers(),
                json=entry
            )
            
            if response.status_code in [200, 201]:
                created_count += 1
                data = response.json()
                test_puantaj_ids.append(data.get('id'))
            else:
                print(f"Warning: Failed to create entry for {entry['tarih']}: {response.status_code}")
        
        if created_count > 0:
            print_result(True, f"Created {created_count}/{len(test_entries)} test puantaj entries for July 2025", 
                       {"count": created_count, "total": len(test_entries)})
            return True
        else:
            print_result(False, f"Failed to create any puantaj entries")
            return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_hesapla_endpoint():
    """Test POST /api/maas-bordrolari/hesapla endpoint"""
    print_test("POST /api/maas-bordrolari/hesapla - Automatic Calculation")
    
    if not test_personel_id:
        print_result(False, "No test_personel_id available")
        return False
    
    try:
        payload = {
            "personel_id": test_personel_id,
            "yil": 2025,
            "ay": 7
        }
        
        response = requests.post(
            f"{BASE_URL}/maas-bordrolari/hesapla",
            headers=get_headers(),
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify all required fields are present
            required_fields = [
                "personel_id", "personel_adi", "yil", "ay", "brut_maas",
                "fazla_mesai_carpan", "pazar_carpan", "resmi_tatil_carpan",
                "saatlik_ucret", "gunluk_ucret", "fazla_mesai_saat",
                "pazar_gun", "resmi_tatil_gun", "fazla_mesai_ucreti",
                "pazar_ucreti", "resmi_tatil_ucreti"
            ]
            
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                print_result(False, f"Missing required fields: {missing_fields}", data)
                return False
            
            # Verify calculations
            brut_maas = data['brut_maas']
            saatlik = brut_maas / 30 / 8
            gunluk = brut_maas / 30
            
            # Check if calculations are correct
            expected_saatlik = round(saatlik, 4)
            expected_gunluk = round(gunluk, 4)
            
            print(f"\n📊 Calculation Details:")
            print(f"   Brut Maaş: {brut_maas}")
            print(f"   Saatlik Ücret: {data['saatlik_ucret']} (expected: {expected_saatlik})")
            print(f"   Günlük Ücret: {data['gunluk_ucret']} (expected: {expected_gunluk})")
            print(f"   Fazla Mesai Saat: {data['fazla_mesai_saat']}")
            print(f"   Pazar Gün: {data['pazar_gun']}")
            print(f"   Resmi Tatil Gün: {data['resmi_tatil_gun']}")
            print(f"   Fazla Mesai Ücreti: {data['fazla_mesai_ucreti']}")
            print(f"   Pazar Ücreti: {data['pazar_ucreti']}")
            print(f"   Resmi Tatil Ücreti: {data['resmi_tatil_ucreti']}")
            
            # Verify upper rounding (math.ceil)
            import math
            if data['fazla_mesai_saat'] > 0:
                expected_fm = math.ceil(saatlik * data['fazla_mesai_carpan'] * data['fazla_mesai_saat'])
                if data['fazla_mesai_ucreti'] != expected_fm:
                    print_result(False, f"Fazla mesai calculation incorrect. Expected: {expected_fm}, Got: {data['fazla_mesai_ucreti']}")
                    return False
            
            if data['pazar_gun'] > 0:
                expected_pz = math.ceil(gunluk * data['pazar_carpan'] * data['pazar_gun'])
                if data['pazar_ucreti'] != expected_pz:
                    print_result(False, f"Pazar calculation incorrect. Expected: {expected_pz}, Got: {data['pazar_ucreti']}")
                    return False
            
            if data['resmi_tatil_gun'] > 0:
                expected_rt = math.ceil(gunluk * data['resmi_tatil_carpan'] * data['resmi_tatil_gun'])
                if data['resmi_tatil_ucreti'] != expected_rt:
                    print_result(False, f"Resmi tatil calculation incorrect. Expected: {expected_rt}, Got: {data['resmi_tatil_ucreti']}")
                    return False
            
            print_result(True, "Automatic calculation working correctly with proper math.ceil rounding", data)
            return True
        else:
            print_result(False, f"Failed with status {response.status_code}", response.text)
            return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_create_bordro():
    """Test POST /api/maas-bordrolari - Create payroll"""
    global test_bordro_id
    print_test("POST /api/maas-bordrolari - Create Payroll")
    
    if not test_personel_id:
        print_result(False, "No test_personel_id available")
        return False
    
    try:
        # First get calculation
        calc_response = requests.post(
            f"{BASE_URL}/maas-bordrolari/hesapla",
            headers=get_headers(),
            json={"personel_id": test_personel_id, "yil": 2025, "ay": 7}
        )
        
        if calc_response.status_code != 200:
            print_result(False, "Failed to get calculation for create test")
            return False
        
        calc_data = calc_response.json()
        
        # Create bordro with calculated values
        payload = {
            "personel_id": test_personel_id,
            "personel_adi": calc_data['personel_adi'],
            "yil": 2025,
            "ay": 7,
            "brut_maas": calc_data['brut_maas'],
            "fazla_mesai_ucreti": calc_data['fazla_mesai_ucreti'],
            "pazar_ucreti": calc_data['pazar_ucreti'],
            "resmi_tatil_ucreti": calc_data['resmi_tatil_ucreti'],
            "fazla_mesai_saat": calc_data['fazla_mesai_saat'],
            "pazar_gun": calc_data['pazar_gun'],
            "resmi_tatil_gun": calc_data['resmi_tatil_gun'],
            "ikramiye": 500,
            "kesintiler": 100,
            "odeme_tarihi": "",
            "odendi": False
        }
        
        response = requests.post(
            f"{BASE_URL}/maas-bordrolari",
            headers=get_headers(),
            json=payload
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            test_bordro_id = data.get('id')
            
            # Verify new fields are present
            new_fields = ['pazar_ucreti', 'resmi_tatil_ucreti', 'fazla_mesai_saat', 'pazar_gun', 'resmi_tatil_gun']
            missing = [f for f in new_fields if f not in data]
            if missing:
                print_result(False, f"Missing new fields in response: {missing}", data)
                return False
            
            # Verify toplam_odeme calculation
            # toplam_odeme = net_maas + fazla_mesai_ucreti + pazar_ucreti + resmi_tatil_ucreti + ikramiye - kesintiler
            expected_toplam = (data['net_maas'] + data['fazla_mesai_ucreti'] + 
                             data['pazar_ucreti'] + data['resmi_tatil_ucreti'] + 
                             data['ikramiye'] - data['kesintiler'])
            
            if abs(data['toplam_odeme'] - expected_toplam) > 0.01:
                print_result(False, f"toplam_odeme calculation incorrect. Expected: {expected_toplam}, Got: {data['toplam_odeme']}")
                return False
            
            print_result(True, f"Payroll created successfully with ID: {test_bordro_id}", data)
            return True
        else:
            print_result(False, f"Failed with status {response.status_code}", response.text)
            return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_get_bordro():
    """Test GET /api/maas-bordrolari - List payrolls"""
    print_test("GET /api/maas-bordrolari - List Payrolls")
    
    try:
        response = requests.get(
            f"{BASE_URL}/maas-bordrolari?yil=2025&ay=7",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify new fields are present in list
            if len(data) > 0:
                new_fields = ['pazar_ucreti', 'resmi_tatil_ucreti', 'fazla_mesai_saat', 'pazar_gun', 'resmi_tatil_gun']
                missing = [f for f in new_fields if f not in data[0]]
                if missing:
                    print_result(False, f"Missing new fields in list response: {missing}", data[0])
                    return False
                
                print_result(True, f"Retrieved {len(data)} payroll(s) with all new fields", 
                           {"count": len(data), "sample": data[0] if data else None})
            else:
                print_result(True, "Retrieved 0 payrolls (empty list is valid)")
            return True
        else:
            print_result(False, f"Failed with status {response.status_code}", response.text)
            return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_update_bordro():
    """Test PUT /api/maas-bordrolari/{id} - Update payroll"""
    print_test("PUT /api/maas-bordrolari/{id} - Update Payroll")
    
    if not test_bordro_id:
        print_result(False, "No test_bordro_id available")
        return False
    
    try:
        # Get current bordro
        response = requests.get(
            f"{BASE_URL}/maas-bordrolari",
            headers=get_headers()
        )
        
        if response.status_code != 200:
            print_result(False, "Failed to get bordro for update test")
            return False
        
        bordros = response.json()
        current = next((b for b in bordros if b['id'] == test_bordro_id), None)
        
        if not current:
            print_result(False, f"Bordro with ID {test_bordro_id} not found")
            return False
        
        # Update with modified values
        payload = {
            "personel_id": current['personel_id'],
            "personel_adi": current['personel_adi'],
            "yil": current['yil'],
            "ay": current['ay'],
            "brut_maas": current['brut_maas'],
            "fazla_mesai_ucreti": current['fazla_mesai_ucreti'],
            "pazar_ucreti": current['pazar_ucreti'] + 100,  # Modify
            "resmi_tatil_ucreti": current['resmi_tatil_ucreti'] + 50,  # Modify
            "fazla_mesai_saat": current['fazla_mesai_saat'],
            "pazar_gun": current['pazar_gun'],
            "resmi_tatil_gun": current['resmi_tatil_gun'],
            "ikramiye": 1000,  # Modify
            "kesintiler": current['kesintiler'],
            "odeme_tarihi": current.get('odeme_tarihi', ''),
            "odendi": current.get('odendi', False)
        }
        
        response = requests.put(
            f"{BASE_URL}/maas-bordrolari/{test_bordro_id}",
            headers=get_headers(),
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify updates
            if data['pazar_ucreti'] != payload['pazar_ucreti']:
                print_result(False, f"pazar_ucreti not updated. Expected: {payload['pazar_ucreti']}, Got: {data['pazar_ucreti']}")
                return False
            
            if data['resmi_tatil_ucreti'] != payload['resmi_tatil_ucreti']:
                print_result(False, f"resmi_tatil_ucreti not updated. Expected: {payload['resmi_tatil_ucreti']}, Got: {data['resmi_tatil_ucreti']}")
                return False
            
            if data['ikramiye'] != payload['ikramiye']:
                print_result(False, f"ikramiye not updated. Expected: {payload['ikramiye']}, Got: {data['ikramiye']}")
                return False
            
            print_result(True, f"Payroll updated successfully", 
                       {"updated_fields": {"pazar_ucreti": data['pazar_ucreti'], 
                                          "resmi_tatil_ucreti": data['resmi_tatil_ucreti'],
                                          "ikramiye": data['ikramiye']}})
            return True
        else:
            print_result(False, f"Failed with status {response.status_code}", response.text)
            return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_delete_bordro():
    """Test DELETE /api/maas-bordrolari/{id} - Delete payroll"""
    print_test("DELETE /api/maas-bordrolari/{id} - Delete Payroll")
    
    if not test_bordro_id:
        print_result(False, "No test_bordro_id available")
        return False
    
    try:
        response = requests.delete(
            f"{BASE_URL}/maas-bordrolari/{test_bordro_id}",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify deletion
            verify_response = requests.get(
                f"{BASE_URL}/maas-bordrolari",
                headers=get_headers()
            )
            
            if verify_response.status_code == 200:
                bordros = verify_response.json()
                if any(b['id'] == test_bordro_id for b in bordros):
                    print_result(False, "Bordro still exists after deletion")
                    return False
                
                print_result(True, f"Payroll deleted successfully (ID: {test_bordro_id})")
                return True
            else:
                print_result(False, "Failed to verify deletion")
                return False
        else:
            print_result(False, f"Failed with status {response.status_code}", response.text)
            return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_smoke_existing_endpoints():
    """Smoke test existing endpoints to ensure nothing broke"""
    print_test("SMOKE TEST - Existing Endpoints")
    
    endpoints = [
        ("GET /api/personeller", f"{BASE_URL}/personeller"),
        ("GET /api/puantaj", f"{BASE_URL}/puantaj")
    ]
    
    all_passed = True
    for name, url in endpoints:
        try:
            response = requests.get(url, headers=get_headers())
            if response.status_code == 200:
                print_result(True, f"{name} - Working")
            else:
                print_result(False, f"{name} - Failed with status {response.status_code}")
                all_passed = False
        except Exception as e:
            print_result(False, f"{name} - Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def cleanup_test_data():
    """Clean up test puantaj entries"""
    print_test("CLEANUP - Remove Test Puantaj Entries")
    
    if not test_personel_id:
        print("No test data to clean up")
        return
    
    try:
        # Get all puantaj for test personnel in July 2025
        response = requests.get(
            f"{BASE_URL}/puantaj?personel_id={test_personel_id}",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            puantaj_list = response.json()
            july_entries = [p for p in puantaj_list if p.get('tarih', '').startswith('2025-07')]
            
            deleted_count = 0
            for entry in july_entries:
                try:
                    del_response = requests.delete(
                        f"{BASE_URL}/puantaj/{entry['id']}",
                        headers=get_headers()
                    )
                    if del_response.status_code == 200:
                        deleted_count += 1
                except:
                    pass
            
            print(f"Cleaned up {deleted_count} test puantaj entries")
    except Exception as e:
        print(f"Cleanup exception: {str(e)}")

def main():
    """Main test execution"""
    print("\n" + "="*80)
    print("MAAŞ BORDROSU (SALARY PAYROLL) BACKEND API TESTING")
    print("Testing automatic calculation and CRUD operations")
    print("="*80)
    
    results = []
    
    # Test sequence
    results.append(("Login", login()))
    
    if not results[-1][1]:
        print("\n❌ Login failed. Cannot continue testing.")
        return
    
    results.append(("Get Active Personnel", get_active_personel()))
    
    if not results[-1][1]:
        print("\n❌ No active personnel found. Cannot continue testing.")
        return
    
    results.append(("Create Test Puantaj", create_test_puantaj()))
    results.append(("Test Hesapla Endpoint", test_hesapla_endpoint()))
    results.append(("Test Create Bordro", test_create_bordro()))
    results.append(("Test Get Bordro", test_get_bordro()))
    results.append(("Test Update Bordro", test_update_bordro()))
    results.append(("Test Delete Bordro", test_delete_bordro()))
    results.append(("Smoke Test Existing Endpoints", test_smoke_existing_endpoints()))
    
    # Cleanup
    cleanup_test_data()
    
    # Summary
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
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
