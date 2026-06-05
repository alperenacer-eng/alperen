#!/usr/bin/env python3
"""
Comprehensive Login Issue Reproduction Test
Tests multiple login scenarios to reproduce the reported issue
"""

import requests
import json
import sys
import time
from datetime import datetime

# Production URL from review request
PRODUCTION_URL = "https://project-upload-12.emergent.host"
API_BASE = f"{PRODUCTION_URL}/api"

class LoginIssueReproducer:
    def __init__(self):
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
    
    def test_multiple_rapid_logins(self):
        """Test multiple rapid login attempts"""
        print("Testing multiple rapid login attempts...")
        
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        success_count = 0
        fail_count = 0
        
        for i in range(5):
            try:
                session = requests.Session()
                response = session.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
                
                if response.status_code == 200:
                    success_count += 1
                    print(f"   Attempt {i+1}: ✅ Success")
                else:
                    fail_count += 1
                    print(f"   Attempt {i+1}: ❌ Failed ({response.status_code})")
                
                # Small delay between attempts
                time.sleep(0.5)
                
            except Exception as e:
                fail_count += 1
                print(f"   Attempt {i+1}: ❌ Exception: {str(e)}")
        
        if fail_count == 0:
            self.log_result("Multiple Rapid Logins", True, f"All {success_count} attempts successful")
            return True
        else:
            self.log_result("Multiple Rapid Logins", False, f"{fail_count} out of 5 attempts failed")
            return False
    
    def test_login_logout_cycle(self):
        """Test login -> logout simulation -> login cycle multiple times"""
        print("Testing login-logout-login cycles...")
        
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        for cycle in range(3):
            print(f"   Cycle {cycle + 1}:")
            
            try:
                # Create fresh session for each cycle
                session = requests.Session()
                
                # Login
                login_response = session.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
                
                if login_response.status_code != 200:
                    self.log_result(f"Login-Logout Cycle {cycle + 1}", False, 
                                  f"Login failed: {login_response.status_code}")
                    return False
                
                # Extract token
                login_data_response = login_response.json()
                token = login_data_response.get("access_token")
                
                if not token:
                    self.log_result(f"Login-Logout Cycle {cycle + 1}", False, "No token received")
                    return False
                
                print(f"     Login: ✅ Success")
                
                # Test /auth/me
                headers = {"Authorization": f"Bearer {token}"}
                me_response = session.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
                
                if me_response.status_code != 200:
                    self.log_result(f"Login-Logout Cycle {cycle + 1}", False, 
                                  f"/auth/me failed: {me_response.status_code}")
                    return False
                
                print(f"     Auth/me: ✅ Success")
                
                # Simulate logout by clearing session
                session.cookies.clear()
                session.headers.clear()
                
                print(f"     Logout: ✅ Simulated")
                
                # Wait a moment
                time.sleep(1)
                
                # Try to login again
                login_response2 = session.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
                
                if login_response2.status_code != 200:
                    self.log_result(f"Login-Logout Cycle {cycle + 1}", False, 
                                  f"Re-login failed: {login_response2.status_code}")
                    return False
                
                print(f"     Re-login: ✅ Success")
                
            except Exception as e:
                self.log_result(f"Login-Logout Cycle {cycle + 1}", False, f"Exception: {str(e)}")
                return False
        
        self.log_result("Login-Logout Cycles", True, "All 3 cycles completed successfully")
        return True
    
    def test_session_persistence(self):
        """Test if sessions persist across requests"""
        print("Testing session persistence...")
        
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        try:
            # Create session and login
            session = requests.Session()
            login_response = session.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
            
            if login_response.status_code != 200:
                self.log_result("Session Persistence", False, f"Initial login failed: {login_response.status_code}")
                return False
            
            # Extract token
            login_data_response = login_response.json()
            token = login_data_response.get("access_token")
            
            # Set authorization header
            session.headers.update({"Authorization": f"Bearer {token}"})
            
            # Make multiple requests with the same session
            for i in range(3):
                me_response = session.get(f"{API_BASE}/auth/me", timeout=10)
                
                if me_response.status_code != 200:
                    self.log_result("Session Persistence", False, 
                                  f"Request {i+1} failed: {me_response.status_code}")
                    return False
                
                print(f"   Request {i+1}: ✅ Success")
                time.sleep(0.5)
            
            self.log_result("Session Persistence", True, "Session persisted across multiple requests")
            return True
            
        except Exception as e:
            self.log_result("Session Persistence", False, f"Exception: {str(e)}")
            return False
    
    def test_different_browsers_simulation(self):
        """Simulate different browser sessions"""
        print("Simulating different browser sessions...")
        
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        ]
        
        for i, user_agent in enumerate(user_agents):
            try:
                session = requests.Session()
                session.headers.update({"User-Agent": user_agent})
                
                response = session.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
                
                if response.status_code == 200:
                    print(f"   Browser {i+1}: ✅ Success")
                else:
                    print(f"   Browser {i+1}: ❌ Failed ({response.status_code})")
                    self.log_result("Different Browser Simulation", False, 
                                  f"Browser {i+1} failed: {response.status_code}")
                    return False
                
            except Exception as e:
                self.log_result("Different Browser Simulation", False, f"Browser {i+1} exception: {str(e)}")
                return False
        
        self.log_result("Different Browser Simulation", True, "All browser simulations successful")
        return True
    
    def test_cors_preflight(self):
        """Test CORS preflight requests"""
        print("Testing CORS preflight...")
        
        try:
            # Test OPTIONS request
            response = requests.options(f"{API_BASE}/auth/login", 
                                      headers={
                                          "Origin": "https://project-upload-12.emergent.host",
                                          "Access-Control-Request-Method": "POST",
                                          "Access-Control-Request-Headers": "Content-Type"
                                      }, timeout=10)
            
            # Check CORS headers
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
                'Access-Control-Allow-Methods': response.headers.get('access-control-allow-methods'),
                'Access-Control-Allow-Headers': response.headers.get('access-control-allow-headers'),
                'Access-Control-Allow-Credentials': response.headers.get('access-control-allow-credentials')
            }
            
            print(f"   Status: {response.status_code}")
            for header, value in cors_headers.items():
                if value:
                    print(f"   {header}: {value}")
            
            # Check if essential CORS headers are present
            if cors_headers['Access-Control-Allow-Origin']:
                self.log_result("CORS Preflight", True, "CORS headers present and configured")
                return True
            else:
                self.log_result("CORS Preflight", False, "Missing essential CORS headers")
                return False
                
        except Exception as e:
            self.log_result("CORS Preflight", False, f"Exception: {str(e)}")
            return False
    
    def test_invalid_credentials(self):
        """Test with invalid credentials to ensure proper error handling"""
        print("Testing invalid credentials...")
        
        invalid_login_data = {
            "email": self.test_email,
            "password": "wrongpassword"
        }
        
        try:
            session = requests.Session()
            response = session.post(f"{API_BASE}/auth/login", json=invalid_login_data, timeout=10)
            
            if response.status_code == 401:
                self.log_result("Invalid Credentials", True, "Properly rejected invalid credentials")
                return True
            else:
                self.log_result("Invalid Credentials", False, 
                              f"Unexpected response to invalid credentials: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Invalid Credentials", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all reproduction tests"""
        print("=" * 80)
        print("LOGIN ISSUE REPRODUCTION TEST SUITE")
        print("=" * 80)
        print(f"Testing production at: {PRODUCTION_URL}")
        print(f"Test credentials: {self.test_email}")
        print()
        
        # Run various test scenarios
        print("🔄 MULTIPLE LOGIN SCENARIOS")
        print("-" * 40)
        self.test_multiple_rapid_logins()
        
        print("🔄 LOGIN-LOGOUT CYCLES")
        print("-" * 40)
        self.test_login_logout_cycle()
        
        print("🔄 SESSION PERSISTENCE")
        print("-" * 40)
        self.test_session_persistence()
        
        print("🌐 BROWSER SIMULATION")
        print("-" * 40)
        self.test_different_browsers_simulation()
        
        print("🌍 CORS TESTING")
        print("-" * 40)
        self.test_cors_preflight()
        
        print("🚫 ERROR HANDLING")
        print("-" * 40)
        self.test_invalid_credentials()
        
        # Summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        else:
            print("\n🎉 ALL TESTS PASSED!")
            print("   The login functionality appears to be working correctly.")
            print("   The reported issue may be:")
            print("   • Browser-specific (cache/cookies)")
            print("   • Network-related (intermittent connectivity)")
            print("   • Frontend-specific (JavaScript errors)")
            print("   • User-specific (different credentials/session state)")
        
        if self.results['passed'] + self.results['failed'] > 0:
            success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
            print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return self.results['failed'] == 0

def main():
    """Main test runner"""
    reproducer = LoginIssueReproducer()
    success = reproducer.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()