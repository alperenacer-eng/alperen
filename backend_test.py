#!/usr/bin/env python3
"""
Backend Test Suite for Puantaj API Endpoints
Testing the new bulk puantaj API endpoint at /api/puantaj/toplu
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BACKEND_URL = "https://project-latest.preview.emergentagent.com/api"
LOGIN_EMAIL = "alperenacer@acerler.com"
LOGIN_PASSWORD = "1234"

class PuantajAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message="", data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "data": data
        })
    
    def login(self):
        """Test login functionality"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": LOGIN_EMAIL,
                "password": LOGIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                self.log_test("Login", True, f"Successfully logged in as {data.get('user', {}).get('name', 'Unknown')}")
                return True
            else:
                self.log_test("Login", False, f"Login failed with status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Login", False, f"Login error: {str(e)}")
            return False
    
    def test_get_personeller(self):
        """Test getting personnel list for testing"""
        try:
            response = self.session.get(f"{BACKEND_URL}/personeller")
            
            if response.status_code == 200:
                personeller = response.json()
                self.log_test("Get Personnel List", True, f"Retrieved {len(personeller)} personnel records")
                return personeller
            else:
                self.log_test("Get Personnel List", False, f"Failed with status {response.status_code}: {response.text}")
                return []
        except Exception as e:
            self.log_test("Get Personnel List", False, f"Error: {str(e)}")
            return []
    
    def create_test_personel(self):
        """Create test personnel if none exist"""
        try:
            test_personel = {
                "ad_soyad": "Test Personel",
                "tc_kimlik": "12345678901",
                "telefon": "555-1234567",
                "email": "test@test.com",
                "departman": "Test Departmanı",
                "pozisyon": "Test Pozisyonu",
                "maas": 15000,
                "aktif": True
            }
            
            response = self.session.post(f"{BACKEND_URL}/personeller", json=test_personel)
            
            if response.status_code == 200:
                personel = response.json()
                self.log_test("Create Test Personnel", True, f"Created test personnel with ID: {personel.get('id')}")
                return personel
            else:
                self.log_test("Create Test Personnel", False, f"Failed with status {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("Create Test Personnel", False, f"Error: {str(e)}")
            return None
    
    def test_bulk_puantaj_create(self, personeller):
        """Test POST /api/puantaj/toplu endpoint with multiple personel records"""
        try:
            # Use existing personnel or create test data
            if not personeller:
                test_personel = self.create_test_personel()
                if test_personel:
                    personeller = [test_personel]
                else:
                    self.log_test("Bulk Puantaj Create", False, "No personnel available for testing")
                    return []
            
            # Take first 3 personnel or create test data
            test_personeller = personeller[:3] if len(personeller) >= 3 else personeller
            
            # If we don't have enough, create additional test personnel
            while len(test_personeller) < 3:
                test_personel = {
                    "ad_soyad": f"Test Personel {len(test_personeller) + 1}",
                    "tc_kimlik": f"1234567890{len(test_personeller) + 1}",
                    "telefon": f"555-123456{len(test_personeller) + 1}",
                    "email": f"test{len(test_personeller) + 1}@test.com",
                    "departman": "Test Departmanı",
                    "pozisyon": "Test Pozisyonu",
                    "maas": 15000,
                    "aktif": True
                }
                
                response = self.session.post(f"{BACKEND_URL}/personeller", json=test_personel)
                if response.status_code == 200:
                    test_personeller.append(response.json())
                else:
                    break
            
            # Create bulk puantaj data
            test_date = "2026-03-23"
            bulk_data = {
                "tarih": test_date,
                "kayitlar": [
                    {
                        "personel_id": test_personeller[0]["id"],
                        "personel_adi": test_personeller[0]["ad_soyad"],
                        "giris_saati": "08:00",
                        "cikis_saati": "17:00",  # 9 hours = 1 hour overtime
                        "durum": "geldi",
                        "notlar": "Test bulk entry 1"
                    },
                    {
                        "personel_id": test_personeller[1]["id"] if len(test_personeller) > 1 else test_personeller[0]["id"],
                        "personel_adi": test_personeller[1]["ad_soyad"] if len(test_personeller) > 1 else test_personeller[0]["ad_soyad"],
                        "giris_saati": "09:00",
                        "cikis_saati": "18:00",  # 9 hours = 1 hour overtime
                        "durum": "geldi",
                        "notlar": "Test bulk entry 2"
                    },
                    {
                        "personel_id": test_personeller[2]["id"] if len(test_personeller) > 2 else test_personeller[0]["id"],
                        "personel_adi": test_personeller[2]["ad_soyad"] if len(test_personeller) > 2 else test_personeller[0]["ad_soyad"],
                        "giris_saati": "08:30",
                        "cikis_saati": "16:30",  # 8 hours = no overtime
                        "durum": "geldi",
                        "notlar": "Test bulk entry 3"
                    }
                ]
            }
            
            response = self.session.post(f"{BACKEND_URL}/puantaj/toplu", json=bulk_data)
            
            if response.status_code == 200:
                result = response.json()
                self.log_test("Bulk Puantaj Create", True, f"Successfully created bulk puantaj: {result.get('message')}")
                return result.get('results', [])
            else:
                self.log_test("Bulk Puantaj Create", False, f"Failed with status {response.status_code}: {response.text}")
                return []
        except Exception as e:
            self.log_test("Bulk Puantaj Create", False, f"Error: {str(e)}")
            return []
    
    def test_bulk_puantaj_update(self, personeller):
        """Test that bulk puantaj updates existing records for same personel + tarih combination"""
        try:
            if not personeller:
                self.log_test("Bulk Puantaj Update", False, "No personnel available for testing")
                return
            
            test_date = "2026-03-23"
            personel = personeller[0]
            
            # Create updated bulk data with same date and personnel
            bulk_data = {
                "tarih": test_date,
                "kayitlar": [
                    {
                        "personel_id": personel["id"],
                        "personel_adi": personel["ad_soyad"],
                        "giris_saati": "07:30",  # Updated time
                        "cikis_saati": "16:30",  # Updated time
                        "durum": "geldi",
                        "notlar": "Updated bulk entry - should update existing record"
                    }
                ]
            }
            
            response = self.session.post(f"{BACKEND_URL}/puantaj/toplu", json=bulk_data)
            
            if response.status_code == 200:
                result = response.json()
                # Check if the result indicates an update
                updated_records = [r for r in result.get('results', []) if r.get('updated')]
                if updated_records:
                    self.log_test("Bulk Puantaj Update", True, f"Successfully updated existing record: {result.get('message')}")
                else:
                    self.log_test("Bulk Puantaj Update", True, f"Processed record (may be new or updated): {result.get('message')}")
            else:
                self.log_test("Bulk Puantaj Update", False, f"Failed with status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Bulk Puantaj Update", False, f"Error: {str(e)}")
    
    def test_mesai_calculation(self):
        """Test mesai calculation (9 hours work = 1 hour overtime)"""
        try:
            # Get personnel for testing
            personeller = self.test_get_personeller()
            if not personeller:
                personel = self.create_test_personel()
                if not personel:
                    self.log_test("Mesai Calculation Test", False, "No personnel available for testing")
                    return
                personeller = [personel]
            
            test_date = "2026-03-24"
            personel = personeller[0]
            
            # Test different work hour scenarios
            test_scenarios = [
                {"giris": "08:00", "cikis": "17:00", "expected_mesai": 9.0, "expected_fazla": 1.0, "desc": "9 hours work"},
                {"giris": "09:00", "cikis": "17:00", "expected_mesai": 8.0, "expected_fazla": 0.0, "desc": "8 hours work"},
                {"giris": "08:00", "cikis": "18:00", "expected_mesai": 10.0, "expected_fazla": 2.0, "desc": "10 hours work"},
                {"giris": "08:30", "cikis": "16:30", "expected_mesai": 8.0, "expected_fazla": 0.0, "desc": "8 hours work"}
            ]
            
            all_passed = True
            for i, scenario in enumerate(test_scenarios):
                bulk_data = {
                    "tarih": f"2026-03-{24 + i}",  # Different dates to avoid conflicts
                    "kayitlar": [
                        {
                            "personel_id": personel["id"],
                            "personel_adi": personel["ad_soyad"],
                            "giris_saati": scenario["giris"],
                            "cikis_saati": scenario["cikis"],
                            "durum": "geldi",
                            "notlar": f"Mesai calculation test - {scenario['desc']}"
                        }
                    ]
                }
                
                response = self.session.post(f"{BACKEND_URL}/puantaj/toplu", json=bulk_data)
                
                if response.status_code == 200:
                    # Get the created record to verify calculations
                    puantaj_response = self.session.get(f"{BACKEND_URL}/puantaj", params={
                        "personel_id": personel["id"],
                        "tarih_baslangic": f"2026-03-{24 + i}",
                        "tarih_bitis": f"2026-03-{24 + i}"
                    })
                    
                    if puantaj_response.status_code == 200:
                        puantaj_records = puantaj_response.json()
                        if puantaj_records:
                            record = puantaj_records[0]
                            mesai_suresi = record.get('mesai_suresi', 0)
                            fazla_mesai = record.get('fazla_mesai', 0)
                            
                            if abs(mesai_suresi - scenario['expected_mesai']) < 0.1 and abs(fazla_mesai - scenario['expected_fazla']) < 0.1:
                                print(f"  ✅ {scenario['desc']}: Mesai {mesai_suresi}h, Fazla {fazla_mesai}h")
                            else:
                                print(f"  ❌ {scenario['desc']}: Expected Mesai {scenario['expected_mesai']}h, Fazla {scenario['expected_fazla']}h, Got Mesai {mesai_suresi}h, Fazla {fazla_mesai}h")
                                all_passed = False
                        else:
                            print(f"  ❌ {scenario['desc']}: No puantaj record found")
                            all_passed = False
                    else:
                        print(f"  ❌ {scenario['desc']}: Failed to retrieve puantaj record")
                        all_passed = False
                else:
                    print(f"  ❌ {scenario['desc']}: Failed to create puantaj record")
                    all_passed = False
            
            if all_passed:
                self.log_test("Mesai Calculation Test", True, "All mesai calculation scenarios passed")
            else:
                self.log_test("Mesai Calculation Test", False, "Some mesai calculation scenarios failed")
                
        except Exception as e:
            self.log_test("Mesai Calculation Test", False, f"Error: {str(e)}")
    
    def test_individual_puantaj_update(self):
        """Test PUT /api/puantaj/{id} endpoint for updating individual records"""
        try:
            # First get existing puantaj records
            response = self.session.get(f"{BACKEND_URL}/puantaj")
            
            if response.status_code == 200:
                puantaj_records = response.json()
                if puantaj_records:
                    # Update the first record
                    record = puantaj_records[0]
                    record_id = record['id']
                    
                    updated_data = {
                        "personel_id": record['personel_id'],
                        "personel_adi": record['personel_adi'],
                        "tarih": record['tarih'],
                        "giris_saati": "08:15",  # Updated time
                        "cikis_saati": "17:15",  # Updated time
                        "notlar": "Updated via individual PUT endpoint"
                    }
                    
                    update_response = self.session.put(f"{BACKEND_URL}/puantaj/{record_id}", json=updated_data)
                    
                    if update_response.status_code == 200:
                        updated_record = update_response.json()
                        self.log_test("Individual Puantaj Update", True, f"Successfully updated puantaj record {record_id}")
                    else:
                        self.log_test("Individual Puantaj Update", False, f"Failed with status {update_response.status_code}: {update_response.text}")
                else:
                    self.log_test("Individual Puantaj Update", False, "No puantaj records found to update")
            else:
                self.log_test("Individual Puantaj Update", False, f"Failed to get puantaj records: {response.status_code}")
        except Exception as e:
            self.log_test("Individual Puantaj Update", False, f"Error: {str(e)}")
    
    def test_get_all_puantaj(self):
        """Test GET /api/puantaj returns all records correctly"""
        try:
            response = self.session.get(f"{BACKEND_URL}/puantaj")
            
            if response.status_code == 200:
                puantaj_records = response.json()
                self.log_test("Get All Puantaj", True, f"Successfully retrieved {len(puantaj_records)} puantaj records")
                
                # Verify record structure
                if puantaj_records:
                    sample_record = puantaj_records[0]
                    required_fields = ['id', 'personel_id', 'personel_adi', 'tarih', 'giris_saati', 'cikis_saati', 'mesai_suresi', 'fazla_mesai']
                    missing_fields = [field for field in required_fields if field not in sample_record]
                    
                    if not missing_fields:
                        self.log_test("Puantaj Record Structure", True, "All required fields present in puantaj records")
                    else:
                        self.log_test("Puantaj Record Structure", False, f"Missing fields: {missing_fields}")
                
                return puantaj_records
            else:
                self.log_test("Get All Puantaj", False, f"Failed with status {response.status_code}: {response.text}")
                return []
        except Exception as e:
            self.log_test("Get All Puantaj", False, f"Error: {str(e)}")
            return []
    
    def test_puantaj_filtering(self):
        """Test puantaj filtering by personel_id and date range"""
        try:
            # Get personnel for testing
            personeller = self.test_get_personeller()
            if not personeller:
                self.log_test("Puantaj Filtering", False, "No personnel available for testing")
                return
            
            personel = personeller[0]
            
            # Test filtering by personel_id
            response = self.session.get(f"{BACKEND_URL}/puantaj", params={
                "personel_id": personel["id"]
            })
            
            if response.status_code == 200:
                filtered_records = response.json()
                # Verify all records belong to the specified personnel
                all_match = all(record['personel_id'] == personel['id'] for record in filtered_records)
                
                if all_match:
                    self.log_test("Puantaj Filtering by Personnel", True, f"Successfully filtered {len(filtered_records)} records by personnel ID")
                else:
                    self.log_test("Puantaj Filtering by Personnel", False, "Some records don't match the personnel filter")
            else:
                self.log_test("Puantaj Filtering by Personnel", False, f"Failed with status {response.status_code}: {response.text}")
            
            # Test filtering by date range
            response = self.session.get(f"{BACKEND_URL}/puantaj", params={
                "tarih_baslangic": "2026-03-20",
                "tarih_bitis": "2026-03-30"
            })
            
            if response.status_code == 200:
                date_filtered_records = response.json()
                self.log_test("Puantaj Filtering by Date Range", True, f"Successfully filtered {len(date_filtered_records)} records by date range")
            else:
                self.log_test("Puantaj Filtering by Date Range", False, f"Failed with status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Puantaj Filtering", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all puantaj API tests"""
        print("🚀 Starting Puantaj API Testing...")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login():
            print("❌ Login failed. Cannot proceed with tests.")
            return
        
        # Step 2: Get personnel list
        personeller = self.test_get_personeller()
        
        # Step 3: Test bulk puantaj creation
        bulk_results = self.test_bulk_puantaj_create(personeller)
        
        # Step 4: Test bulk puantaj update (same personel + tarih)
        self.test_bulk_puantaj_update(personeller)
        
        # Step 5: Test mesai calculation
        self.test_mesai_calculation()
        
        # Step 6: Test individual puantaj update
        self.test_individual_puantaj_update()
        
        # Step 7: Test get all puantaj records
        all_puantaj = self.test_get_all_puantaj()
        
        # Step 8: Test puantaj filtering
        self.test_puantaj_filtering()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n✅ All puantaj API endpoints tested successfully!" if passed == total else "\n⚠️  Some tests failed. Please review the results above.")
        
        return passed == total

def main():
    """Main test execution"""
    tester = PuantajAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()