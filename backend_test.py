#!/usr/bin/env python3
"""
Backend API Test Suite for SQLite Migration Testing
Tests critical endpoints after MongoDB to SQLite migration
"""

import requests
import json
import sys
import os
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://veri-getirici.preview.emergentagent.com/api"

class SQLiteMigrationTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        self.test_musteri_id = None
        self.test_teklif_id = None
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
        """Test user registration with specified credentials"""
        register_data = {
            "name": "Test User",
            "email": "test@test.com",
            "password": "1234"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=register_data)
            
            if response.status_code == 201:
                data = response.json()
                self.token = data.get("access_token")
                self.user_data = data.get("user")
                
                # Set authorization header for future requests
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                
                self.log_result("Auth Register", True, f"Registration successful for: {self.user_data.get('name')}")
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                # User already exists, try to login instead
                self.log_result("Auth Register", True, "User already exists, will use login")
                return self.test_auth_login()
            else:
                self.log_result("Auth Register", False, "Registration failed", response)
                return False
                
        except Exception as e:
            self.log_result("Auth Register", False, f"Exception: {str(e)}")
            return False

    def test_auth_login(self):
        """Test user login with specified credentials"""
        login_data = {
            "email": "test@test.com",
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
                
                self.log_result("Auth Login", True, f"Login successful for: {self.user_data.get('name')}")
                return True
            else:
                self.log_result("Auth Login", False, "Login failed", response)
                return False
                
        except Exception as e:
            self.log_result("Auth Login", False, f"Exception: {str(e)}")
            return False

    def test_auth_me(self):
        """Test getting current user info with JWT token"""
        try:
            response = self.session.get(f"{BACKEND_URL}/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                user_name = data.get("name")
                user_email = data.get("email")
                
                self.log_result("Auth Me", True, f"User info retrieved: {user_name} ({user_email})")
                return True
            else:
                self.log_result("Auth Me", False, "Failed to get user info", response)
                return False
                
        except Exception as e:
            self.log_result("Auth Me", False, f"Exception: {str(e)}")
            return False

    def test_get_products(self):
        """Test getting products list"""
        try:
            response = self.session.get(f"{BACKEND_URL}/products")
            
            if response.status_code == 200:
                data = response.json()
                product_count = len(data)
                
                self.log_result("Get Products", True, f"Retrieved {product_count} products")
                return True
            else:
                self.log_result("Get Products", False, "Failed to get products", response)
                return False
                
        except Exception as e:
            self.log_result("Get Products", False, f"Exception: {str(e)}")
            return False

    def test_get_araclar(self):
        """Test getting vehicles list"""
        try:
            response = self.session.get(f"{BACKEND_URL}/araclar")
            
            if response.status_code == 200:
                data = response.json()
                arac_count = len(data)
                
                self.log_result("Get Araclar", True, f"Retrieved {arac_count} vehicles")
                return True
            else:
                self.log_result("Get Araclar", False, "Failed to get vehicles", response)
                return False
                
        except Exception as e:
            self.log_result("Get Araclar", False, f"Exception: {str(e)}")
            return False

    def test_get_personeller(self):
        """Test getting personnel list"""
        try:
            response = self.session.get(f"{BACKEND_URL}/personeller")
            
            if response.status_code == 200:
                data = response.json()
                personel_count = len(data)
                
                self.log_result("Get Personeller", True, f"Retrieved {personel_count} personnel")
                return True
            else:
                self.log_result("Get Personeller", False, "Failed to get personnel", response)
                return False
                
        except Exception as e:
            self.log_result("Get Personeller", False, f"Exception: {str(e)}")
            return False

    def test_get_teklifler(self):
        """Test getting quotes list"""
        try:
            response = self.session.get(f"{BACKEND_URL}/teklifler")
            
            if response.status_code == 200:
                data = response.json()
                teklif_count = len(data)
                
                self.log_result("Get Teklifler", True, f"Retrieved {teklif_count} quotes")
                return True
            else:
                self.log_result("Get Teklifler", False, "Failed to get quotes", response)
                return False
                
        except Exception as e:
            self.log_result("Get Teklifler", False, f"Exception: {str(e)}")
            return False

    def test_get_motorin_stok(self):
        """Test getting diesel stock status"""
        try:
            response = self.session.get(f"{BACKEND_URL}/motorin-stok")
            
            if response.status_code == 200:
                data = response.json()
                mevcut_stok = data.get("mevcut_stok", 0)
                toplam_alim = data.get("toplam_alim", 0)
                toplam_verme = data.get("toplam_verme", 0)
                
                self.log_result("Get Motorin Stok", True, f"Stock: {mevcut_stok}L, Total In: {toplam_alim}L, Total Out: {toplam_verme}L")
                return True
            else:
                self.log_result("Get Motorin Stok", False, "Failed to get diesel stock", response)
                return False
                
        except Exception as e:
            self.log_result("Get Motorin Stok", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all critical endpoint tests for SQLite migration"""
        print("=" * 60)
        print("SQLITE MIGRATION CRITICAL ENDPOINT TEST SUITE")
        print("=" * 60)
        print(f"Testing backend at: {BACKEND_URL}")
        print()
        
        # Authentication tests
        print("🔐 AUTHENTICATION TESTS")
        print("-" * 30)
        
        # Try registration first, fallback to login if user exists
        auth_success = self.test_auth_register()
        if not auth_success:
            auth_success = self.test_auth_login()
        
        if not auth_success:
            print("❌ Cannot proceed without authentication")
            return False
        
        # Test JWT token validation
        self.test_auth_me()
        
        # Critical endpoint tests
        print("📊 CRITICAL ENDPOINT TESTS")
        print("-" * 30)
        self.test_get_products()
        self.test_get_araclar()
        self.test_get_personeller()
        self.test_get_teklifler()
        self.test_get_motorin_stok()
        
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
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100 if (self.results['passed'] + self.results['failed']) > 0 else 0
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return self.results['failed'] == 0

def main():
    """Main test runner"""
    tester = SQLiteMigrationTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()