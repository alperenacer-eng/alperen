#!/usr/bin/env python3
"""
Backend Test Suite for Parke Ürünler API Endpoints
Testing new fields: paletteki_adet and paletteki_m2
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://alperen-dev.preview.emergentagent.com/api"
LOGIN_EMAIL = "alperenacer@acerler.com"
LOGIN_PASSWORD = "1234"

class ParkeUrunlerAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = []
        self.created_product_id = None
        
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
        """Test 1: POST /api/auth/login - Login functionality"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": LOGIN_EMAIL,
                "password": LOGIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                
                if not self.access_token:
                    self.log_test("POST /api/auth/login", False, "No access_token in response")
                    return False
                
                if not data.get("user"):
                    self.log_test("POST /api/auth/login", False, "No user object in response")
                    return False
                
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                self.log_test("POST /api/auth/login", True, f"Successfully logged in as {data.get('user', {}).get('name', 'Unknown')}")
                return True
            else:
                self.log_test("POST /api/auth/login", False, f"Login failed with status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("POST /api/auth/login", False, f"Login error: {str(e)}")
            return False
    
    def test_create_parke_urun(self):
        """Test 2: POST /api/parke-urunler - Create product with new fields"""
        try:
            product_data = {
                "urun_adi": "TEST_PARKE_PLT",
                "birim": "m²",
                "birim_fiyat": 100,
                "ebat": "30x30",
                "renk": "BEYAZ",
                "paletteki_adet": 50,
                "paletteki_m2": 10.5
            }
            
            response = self.session.post(f"{BACKEND_URL}/parke-urunler", json=product_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields are present
                required_fields = ['id', 'urun_adi', 'birim', 'birim_fiyat', 'ebat', 'renk', 'paletteki_adet', 'paletteki_m2', 'created_at']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("POST /api/parke-urunler", False, f"Missing required fields: {missing_fields}")
                    return None
                
                # Verify new fields match input
                if abs(float(data['paletteki_adet']) - product_data['paletteki_adet']) > 0.01:
                    self.log_test("POST /api/parke-urunler", False, f"paletteki_adet mismatch: expected {product_data['paletteki_adet']}, got {data['paletteki_adet']}")
                    return None
                
                if abs(float(data['paletteki_m2']) - product_data['paletteki_m2']) > 0.01:
                    self.log_test("POST /api/parke-urunler", False, f"paletteki_m2 mismatch: expected {product_data['paletteki_m2']}, got {data['paletteki_m2']}")
                    return None
                
                # Verify other fields
                if data['urun_adi'] != product_data['urun_adi']:
                    self.log_test("POST /api/parke-urunler", False, f"urun_adi mismatch: expected {product_data['urun_adi']}, got {data['urun_adi']}")
                    return None
                
                if data['birim'] != product_data['birim']:
                    self.log_test("POST /api/parke-urunler", False, f"birim mismatch: expected {product_data['birim']}, got {data['birim']}")
                    return None
                
                if abs(float(data['birim_fiyat']) - product_data['birim_fiyat']) > 0.01:
                    self.log_test("POST /api/parke-urunler", False, f"birim_fiyat mismatch: expected {product_data['birim_fiyat']}, got {data['birim_fiyat']}")
                    return None
                
                if data['ebat'] != product_data['ebat']:
                    self.log_test("POST /api/parke-urunler", False, f"ebat mismatch: expected {product_data['ebat']}, got {data['ebat']}")
                    return None
                
                if data['renk'] != product_data['renk']:
                    self.log_test("POST /api/parke-urunler", False, f"renk mismatch: expected {product_data['renk']}, got {data['renk']}")
                    return None
                
                self.created_product_id = data['id']
                self.log_test("POST /api/parke-urunler", True, f"Successfully created product with ID: {self.created_product_id}, paletteki_adet={data['paletteki_adet']}, paletteki_m2={data['paletteki_m2']}")
                return data
            else:
                self.log_test("POST /api/parke-urunler", False, f"Failed with status {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("POST /api/parke-urunler", False, f"Error: {str(e)}")
            return None
    
    def test_list_all_products(self):
        """Test 3: GET /api/parke-urunler - List all products and verify new fields"""
        try:
            response = self.session.get(f"{BACKEND_URL}/parke-urunler")
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    self.log_test("GET /api/parke-urunler", False, "Response is not a list")
                    return []
                
                # Verify all products have the new fields
                products_without_new_fields = []
                for product in data:
                    if 'paletteki_adet' not in product or 'paletteki_m2' not in product:
                        products_without_new_fields.append(product.get('id', 'unknown'))
                
                if products_without_new_fields:
                    self.log_test("GET /api/parke-urunler", False, f"Products missing new fields: {products_without_new_fields}")
                    return []
                
                # Find our test product
                test_product = None
                for product in data:
                    if product.get('id') == self.created_product_id:
                        test_product = product
                        break
                
                if not test_product:
                    self.log_test("GET /api/parke-urunler", False, f"Test product with ID {self.created_product_id} not found in list")
                    return []
                
                # Verify test product has correct values
                if abs(float(test_product['paletteki_adet']) - 50) > 0.01:
                    self.log_test("GET /api/parke-urunler", False, f"Test product paletteki_adet incorrect: expected 50, got {test_product['paletteki_adet']}")
                    return []
                
                if abs(float(test_product['paletteki_m2']) - 10.5) > 0.01:
                    self.log_test("GET /api/parke-urunler", False, f"Test product paletteki_m2 incorrect: expected 10.5, got {test_product['paletteki_m2']}")
                    return []
                
                # Check if existing products have default values (0)
                existing_products_with_defaults = 0
                for product in data:
                    if product.get('id') != self.created_product_id:
                        if float(product.get('paletteki_adet', -1)) == 0 and float(product.get('paletteki_m2', -1)) == 0:
                            existing_products_with_defaults += 1
                
                self.log_test("GET /api/parke-urunler", True, 
                             f"Successfully retrieved {len(data)} products. Test product found with correct values. "
                             f"{existing_products_with_defaults} existing products have default values (0, 0) as expected from migration.")
                return data
            else:
                self.log_test("GET /api/parke-urunler", False, f"Failed with status {response.status_code}: {response.text}")
                return []
        except Exception as e:
            self.log_test("GET /api/parke-urunler", False, f"Error: {str(e)}")
            return []
    
    def test_update_paletteki_adet(self):
        """Test 4: PUT /api/parke-urunler/{id} - Update only paletteki_adet"""
        try:
            if not self.created_product_id:
                self.log_test("PUT /api/parke-urunler/{id}", False, "No product ID available for testing")
                return None
            
            update_data = {
                "paletteki_adet": 75
            }
            
            response = self.session.put(f"{BACKEND_URL}/parke-urunler/{self.created_product_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify paletteki_adet was updated
                if abs(float(data.get('paletteki_adet', 0)) - 75) > 0.01:
                    self.log_test("PUT /api/parke-urunler/{id}", False, f"paletteki_adet not updated: expected 75, got {data.get('paletteki_adet')}")
                    return None
                
                # Verify paletteki_m2 stayed at 10.5
                if abs(float(data.get('paletteki_m2', 0)) - 10.5) > 0.01:
                    self.log_test("PUT /api/parke-urunler/{id}", False, f"paletteki_m2 changed unexpectedly: expected 10.5, got {data.get('paletteki_m2')}")
                    return None
                
                # Verify updated_at is present
                if 'updated_at' not in data:
                    self.log_test("PUT /api/parke-urunler/{id}", False, "updated_at field missing")
                    return None
                
                self.log_test("PUT /api/parke-urunler/{id}", True, 
                             f"Successfully updated paletteki_adet to 75. paletteki_m2 correctly stayed at 10.5")
                return data
            else:
                self.log_test("PUT /api/parke-urunler/{id}", False, f"Failed with status {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("PUT /api/parke-urunler/{id}", False, f"Error: {str(e)}")
            return None
    
    def test_delete_product(self):
        """Test 5: DELETE /api/parke-urunler/{id} - Delete test product"""
        try:
            if not self.created_product_id:
                self.log_test("DELETE /api/parke-urunler/{id}", False, "No product ID available for testing")
                return False
            
            response = self.session.delete(f"{BACKEND_URL}/parke-urunler/{self.created_product_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                if 'message' not in data:
                    self.log_test("DELETE /api/parke-urunler/{id}", False, "No message in response")
                    return False
                
                self.log_test("DELETE /api/parke-urunler/{id}", True, f"Successfully deleted test product with ID: {self.created_product_id}")
                return True
            else:
                self.log_test("DELETE /api/parke-urunler/{id}", False, f"Failed with status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("DELETE /api/parke-urunler/{id}", False, f"Error: {str(e)}")
            return False
    
    def test_verify_deletion(self):
        """Test 6: GET /api/parke-urunler - Verify product was deleted"""
        try:
            if not self.created_product_id:
                self.log_test("GET /api/parke-urunler (verify deletion)", False, "No product ID available for testing")
                return False
            
            response = self.session.get(f"{BACKEND_URL}/parke-urunler")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if test product is still in the list
                for product in data:
                    if product.get('id') == self.created_product_id:
                        self.log_test("GET /api/parke-urunler (verify deletion)", False, f"Test product still exists after deletion")
                        return False
                
                self.log_test("GET /api/parke-urunler (verify deletion)", True, "Test product successfully removed from list")
                return True
            else:
                self.log_test("GET /api/parke-urunler (verify deletion)", False, f"Failed with status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("GET /api/parke-urunler (verify deletion)", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all Parke Ürünler API tests"""
        print("🚀 Starting Parke Ürünler API Testing...")
        print("=" * 80)
        print("Testing new fields: paletteki_adet and paletteki_m2")
        print("=" * 80)
        
        # Test 1: Login
        if not self.login():
            print("❌ Login failed. Cannot proceed with tests.")
            return False
        
        # Test 2: Create product with new fields
        self.test_create_parke_urun()
        
        # Test 3: List all products and verify new fields
        self.test_list_all_products()
        
        # Test 4: Update only paletteki_adet
        self.test_update_paletteki_adet()
        
        # Test 5: Delete test product
        self.test_delete_product()
        
        # Test 6: Verify deletion
        self.test_verify_deletion()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
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
        
        print("\n✅ All Parke Ürünler API endpoints tested successfully!" if passed == total else "\n⚠️  Some tests failed. Please review the results above.")
        
        return passed == total

def main():
    """Main test execution"""
    tester = ParkeUrunlerAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
