#!/usr/bin/env python3
"""
Backend API Test Suite for Motorin Management System
Tests authentication and motorin module CRUD operations
"""

import requests
import json
import sys
import os
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://getir-calisma.preview.emergentagent.com/api"

class MotorinAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        self.test_tedarikci_id = None
        self.test_alim_id = None
        self.test_verme_id = None
        self.test_arac_id = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message="", response=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.status_code} - {response.text[:200]}")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
        print()
    
    def test_auth_register(self):
        """Test user registration"""
        test_data = {
            "name": "Test Kullanıcı",
            "email": f"test_{datetime.now().timestamp()}@example.com",
            "password": "testpassword123",
            "role": "admin",
            "permissions": ["bims", "cimento", "parke", "araclar", "personel"]
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=test_data)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_data = data.get("user")
                
                # Set authorization header for future requests
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                
                self.log_result("Auth Registration", True, f"User registered: {self.user_data.get('name')}")
                return True
            else:
                self.log_result("Auth Registration", False, f"Registration failed", response)
                return False
                
        except Exception as e:
            self.log_result("Auth Registration", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_login_existing(self):
        """Test user login with existing credentials"""
        login_data = {
            "email": "alperenacer@acerler.com",
            "password": "1234"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_data = data.get("user")
                
                # Set authorization header for future requests
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                
                self.log_result("Auth Login (Existing User)", True, f"Login successful for: {self.user_data.get('name')}")
                return True
            else:
                self.log_result("Auth Login (Existing User)", False, "Login failed", response)
                return False
                
        except Exception as e:
            self.log_result("Auth Login (Existing User)", False, f"Exception: {str(e)}")
            return False
    
    def test_create_vehicle(self):
        """Test vehicle creation"""
        # Use timestamp to ensure unique plate
        timestamp = str(int(datetime.now().timestamp()))[-6:]
        vehicle_data = {
            "plaka": f"34 TEST {timestamp}",
            "arac_cinsi": "Kamyon",
            "marka": "Mercedes",
            "model": "Actros",
            "model_yili": 2022,
            "kayitli_sirket": "Acerler Bims",
            "muayene_tarihi": "2025-06-15",
            "kasko_yenileme_tarihi": "2025-03-20",
            "sigorta_yenileme_tarihi": "2025-04-10",
            "arac_takip_id": "TK123456",
            "arac_takip_hat_no": "5551234567",
            "notlar": "Test aracı",
            "aktif": True
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/araclar", json=vehicle_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_vehicle_id = data.get("id")
                
                self.log_result("Create Vehicle", True, f"Vehicle created with ID: {self.test_vehicle_id}")
                return True
            else:
                self.log_result("Create Vehicle", False, "Vehicle creation failed", response)
                return False
                
        except Exception as e:
            self.log_result("Create Vehicle", False, f"Exception: {str(e)}")
            return False
    
    def test_get_vehicles(self):
        """Test getting all vehicles"""
        try:
            response = self.session.get(f"{BACKEND_URL}/araclar")
            
            if response.status_code == 200:
                data = response.json()
                vehicle_count = len(data)
                
                self.log_result("Get All Vehicles", True, f"Retrieved {vehicle_count} vehicles")
                return True
            else:
                self.log_result("Get All Vehicles", False, "Failed to get vehicles", response)
                return False
                
        except Exception as e:
            self.log_result("Get All Vehicles", False, f"Exception: {str(e)}")
            return False
    
    def test_get_single_vehicle(self):
        """Test getting a single vehicle"""
        if not self.test_vehicle_id:
            self.log_result("Get Single Vehicle", False, "No test vehicle ID available")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/araclar/{self.test_vehicle_id}")
            
            if response.status_code == 200:
                data = response.json()
                plaka = data.get("plaka")
                
                self.log_result("Get Single Vehicle", True, f"Retrieved vehicle: {plaka}")
                return True
            else:
                self.log_result("Get Single Vehicle", False, "Failed to get single vehicle", response)
                return False
                
        except Exception as e:
            self.log_result("Get Single Vehicle", False, f"Exception: {str(e)}")
            return False
    
    def test_update_vehicle(self):
        """Test updating a vehicle"""
        if not self.test_vehicle_id:
            self.log_result("Update Vehicle", False, "No test vehicle ID available")
            return False
            
        update_data = {
            "marka": "Volvo",
            "model": "FH16",
            "notlar": "Updated test vehicle"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/araclar/{self.test_vehicle_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                updated_marka = data.get("marka")
                
                self.log_result("Update Vehicle", True, f"Vehicle updated, new marka: {updated_marka}")
                return True
            else:
                self.log_result("Update Vehicle", False, "Failed to update vehicle", response)
                return False
                
        except Exception as e:
            self.log_result("Update Vehicle", False, f"Exception: {str(e)}")
            return False
    
    def test_vehicle_summary(self):
        """Test vehicle summary stats"""
        try:
            response = self.session.get(f"{BACKEND_URL}/arac-ozet")
            
            if response.status_code == 200:
                data = response.json()
                total_vehicles = data.get("toplam_arac", 0)
                
                self.log_result("Vehicle Summary", True, f"Summary retrieved, total vehicles: {total_vehicles}")
                return True
            else:
                self.log_result("Vehicle Summary", False, "Failed to get vehicle summary", response)
                return False
                
        except Exception as e:
            self.log_result("Vehicle Summary", False, f"Exception: {str(e)}")
            return False
    
    def test_file_upload_endpoints(self):
        """Test file upload endpoints (without actual file)"""
        if not self.test_vehicle_id:
            self.log_result("File Upload Test", False, "No test vehicle ID available")
            return False
        
        # Test the upload endpoints exist (they should return 422 without file)
        upload_types = ["ruhsat", "kasko", "sigorta"]
        
        for doc_type in upload_types:
            try:
                response = self.session.post(f"{BACKEND_URL}/araclar/{self.test_vehicle_id}/upload/{doc_type}")
                
                # Expecting 422 (validation error) since we're not sending a file
                if response.status_code == 422:
                    self.log_result(f"File Upload Endpoint ({doc_type})", True, "Endpoint exists and validates input")
                else:
                    self.log_result(f"File Upload Endpoint ({doc_type})", False, f"Unexpected response", response)
                    
            except Exception as e:
                self.log_result(f"File Upload Endpoint ({doc_type})", False, f"Exception: {str(e)}")
    
    def test_delete_vehicle(self):
        """Test deleting a vehicle"""
        if not self.test_vehicle_id:
            self.log_result("Delete Vehicle", False, "No test vehicle ID available")
            return False
            
        try:
            response = self.session.delete(f"{BACKEND_URL}/araclar/{self.test_vehicle_id}")
            
            if response.status_code == 200:
                self.log_result("Delete Vehicle", True, "Vehicle deleted successfully")
                return True
            else:
                self.log_result("Delete Vehicle", False, "Failed to delete vehicle", response)
                return False
                
        except Exception as e:
            self.log_result("Delete Vehicle", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("VEHICLE MANAGEMENT API TEST SUITE")
        print("=" * 60)
        print(f"Testing backend at: {BACKEND_URL}")
        print()
        
        # Authentication tests
        print("🔐 AUTHENTICATION TESTS")
        print("-" * 30)
        if not self.test_auth_register():
            print("❌ Cannot proceed without authentication")
            return False
        
        self.test_auth_login()
        
        # Vehicle CRUD tests
        print("🚗 VEHICLE CRUD TESTS")
        print("-" * 30)
        self.test_create_vehicle()
        self.test_get_vehicles()
        self.test_get_single_vehicle()
        self.test_update_vehicle()
        self.test_vehicle_summary()
        
        # File upload tests
        print("📁 FILE UPLOAD TESTS")
        print("-" * 30)
        self.test_file_upload_endpoints()
        
        # Cleanup
        print("🧹 CLEANUP")
        print("-" * 30)
        self.test_delete_vehicle()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return self.results['failed'] == 0

def main():
    """Main test runner"""
    tester = VehicleAPITester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()