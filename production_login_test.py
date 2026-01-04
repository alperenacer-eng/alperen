#!/usr/bin/env python3
"""
Production Login Test Suite
Tests login functionality on production environment
"""

import requests
import json
import sys
import time
from datetime import datetime

# Production URL from review request
PRODUCTION_URL = "https://project-upload-12.emergent.host"
API_BASE = f"{PRODUCTION_URL}/api"

class ProductionLoginTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
        
        # Test credentials from review request
        self.test_email = "alperenacer@acerler.com"
        self.test_password = "1234"
    
    def log_result(self, test_name, success, message="", response=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.status_code}")
            try:
                print(f"   Body: {response.text[:300]}")
            except:
                print(f"   Body: [Unable to decode response]")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
        print()
    
    def test_production_connectivity(self):
        """Test if production server is accessible"""
        try:
            response = requests.get(PRODUCTION_URL, timeout=10)
            
            if response.status_code in [200, 404]:  # 404 is OK for root, means server is up
                self.log_result("Production Server Connectivity", True, f"Server is accessible (status: {response.status_code})")
                return True
            else:
                self.log_result("Production Server Connectivity", False, f"Unexpected status code: {response.status_code}", response)
                return False
                
        except requests.exceptions.Timeout:
            self.log_result("Production Server Connectivity", False, "Connection timeout")
            return False
        except requests.exceptions.ConnectionError:
            self.log_result("Production Server Connectivity", False, "Connection error - server may be down")
            return False
        except Exception as e:
            self.log_result("Production Server Connectivity", False, f"Exception: {str(e)}")
            return False
    
    def test_login_api_first_time(self):
        """Test login API with valid credentials (first time)"""
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        try:
            # Clear any existing session data
            self.session.cookies.clear()
            self.session.headers.clear()
            
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.token = data.get("access_token")
                    self.user_data = data.get("user")
                    
                    if self.token and self.user_data:
                        self.log_result("Login API (First Time)", True, 
                                      f"Login successful - User: {self.user_data.get('name', 'Unknown')}, Token length: {len(self.token)}")
                        return True
                    else:
                        self.log_result("Login API (First Time)", False, "Missing access_token or user in response")
                        return False
                        
                except json.JSONDecodeError:
                    self.log_result("Login API (First Time)", False, "Invalid JSON response", response)
                    return False
            else:
                self.log_result("Login API (First Time)", False, f"Login failed with status {response.status_code}", response)
                return False
                
        except requests.exceptions.Timeout:
            self.log_result("Login API (First Time)", False, "Request timeout")
            return False
        except Exception as e:
            self.log_result("Login API (First Time)", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_me_endpoint(self):
        """Test /api/auth/me endpoint with token"""
        if not self.token:
            self.log_result("Auth Me Endpoint", False, "No token available from login")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    user_email = data.get("email")
                    user_name = data.get("name")
                    
                    if user_email == self.test_email:
                        self.log_result("Auth Me Endpoint", True, 
                                      f"Token validation successful - User: {user_name} ({user_email})")
                        return True
                    else:
                        self.log_result("Auth Me Endpoint", False, f"Email mismatch: expected {self.test_email}, got {user_email}")
                        return False
                        
                except json.JSONDecodeError:
                    self.log_result("Auth Me Endpoint", False, "Invalid JSON response", response)
                    return False
            else:
                self.log_result("Auth Me Endpoint", False, f"Auth me failed with status {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_result("Auth Me Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_logout_simulation(self):
        """Simulate logout by clearing session data"""
        try:
            # Clear session data to simulate logout
            self.session.cookies.clear()
            self.session.headers.clear()
            self.token = None
            
            self.log_result("Logout Simulation", True, "Session data cleared (simulating logout)")
            return True
            
        except Exception as e:
            self.log_result("Logout Simulation", False, f"Exception: {str(e)}")
            return False
    
    def test_login_api_after_logout(self):
        """Test login API after logout (reproducing the reported issue)"""
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        try:
            # Wait a moment to simulate real user behavior
            time.sleep(1)
            
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    token = data.get("access_token")
                    user = data.get("user")
                    
                    if token and user:
                        self.log_result("Login API (After Logout)", True, 
                                      f"Re-login successful - User: {user.get('name', 'Unknown')}")
                        self.token = token  # Store for further tests
                        return True
                    else:
                        self.log_result("Login API (After Logout)", False, "Missing access_token or user in response")
                        return False
                        
                except json.JSONDecodeError:
                    self.log_result("Login API (After Logout)", False, "Invalid JSON response", response)
                    return False
            else:
                self.log_result("Login API (After Logout)", False, 
                              f"Re-login failed with status {response.status_code} - This reproduces the reported issue!", response)
                return False
                
        except Exception as e:
            self.log_result("Login API (After Logout)", False, f"Exception: {str(e)}")
            return False
    
    def test_cors_headers(self):
        """Test CORS headers in responses"""
        try:
            # Test OPTIONS request to login endpoint
            response = self.session.options(f"{API_BASE}/auth/login", timeout=10)
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
                'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
            }
            
            # Check if CORS headers are present
            has_cors = any(value for value in cors_headers.values())
            
            if has_cors:
                cors_info = ", ".join([f"{k}: {v}" for k, v in cors_headers.items() if v])
                self.log_result("CORS Headers", True, f"CORS headers present: {cors_info}")
                return True
            else:
                self.log_result("CORS Headers", False, "No CORS headers found - this could cause frontend issues")
                return False
                
        except Exception as e:
            self.log_result("CORS Headers", False, f"Exception: {str(e)}")
            return False
    
    def test_curl_login_flow(self):
        """Test the complete login flow using curl-like requests"""
        print("🔄 Testing complete login flow with fresh session...")
        
        # Create a completely new session
        fresh_session = requests.Session()
        
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        try:
            # Step 1: Login
            login_response = fresh_session.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
            
            if login_response.status_code != 200:
                self.log_result("Curl-like Login Flow", False, f"Login step failed: {login_response.status_code}", login_response)
                return False
            
            # Extract token
            login_data_response = login_response.json()
            token = login_data_response.get("access_token")
            
            if not token:
                self.log_result("Curl-like Login Flow", False, "No token in login response")
                return False
            
            # Step 2: Use token for /auth/me
            headers = {"Authorization": f"Bearer {token}"}
            me_response = fresh_session.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
            
            if me_response.status_code == 200:
                me_data = me_response.json()
                user_email = me_data.get("email")
                
                if user_email == self.test_email:
                    self.log_result("Curl-like Login Flow", True, "Complete login flow successful")
                    return True
                else:
                    self.log_result("Curl-like Login Flow", False, f"Email mismatch in /auth/me: {user_email}")
                    return False
            else:
                self.log_result("Curl-like Login Flow", False, f"/auth/me failed: {me_response.status_code}", me_response)
                return False
                
        except Exception as e:
            self.log_result("Curl-like Login Flow", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all production login tests"""
        print("=" * 70)
        print("PRODUCTION LOGIN TEST SUITE")
        print("=" * 70)
        print(f"Testing production at: {PRODUCTION_URL}")
        print(f"Test credentials: {self.test_email}")
        print()
        
        # Connectivity test
        print("🌐 CONNECTIVITY TEST")
        print("-" * 30)
        if not self.test_production_connectivity():
            print("❌ Cannot proceed - production server not accessible")
            return False
        
        # Authentication tests
        print("🔐 AUTHENTICATION TESTS")
        print("-" * 30)
        
        # Test first login
        first_login_success = self.test_login_api_first_time()
        
        # Test /auth/me with token
        if first_login_success:
            self.test_auth_me_endpoint()
        
        # Test logout and re-login (reproducing the issue)
        print("🔄 LOGOUT/RE-LOGIN TEST (Issue Reproduction)")
        print("-" * 30)
        self.test_logout_simulation()
        self.test_login_api_after_logout()
        
        # CORS tests
        print("🌍 CORS TESTS")
        print("-" * 30)
        self.test_cors_headers()
        
        # Complete flow test
        print("🔗 COMPLETE FLOW TEST")
        print("-" * 30)
        self.test_curl_login_flow()
        
        # Summary
        print("=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        if self.results['passed'] + self.results['failed'] > 0:
            success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
            print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return self.results['failed'] == 0

def main():
    """Main test runner"""
    tester = ProductionLoginTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()