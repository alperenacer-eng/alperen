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
BACKEND_URL = "https://getir-clone-5.preview.emergentagent.com/api"

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
    
    def test_create_teklif_musteri(self):
        """Test teklif musteri creation"""
        timestamp = str(int(datetime.now().timestamp()))[-6:]
        musteri_data = {
            "firma_adi": f"Acme Şirketi {timestamp}",
            "yetkili_kisi": "Ahmet Yılmaz",
            "telefon": "0532 123 4567",
            "email": f"ahmet{timestamp}@acme.com",
            "adres": "Atatürk Cad. No:123 Kadıköy/İstanbul",
            "vergi_no": f"123456789{timestamp[-3:]}",
            "vergi_dairesi": "Kadıköy Vergi Dairesi",
            "notlar": "Test müşterisi"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/teklif-musteriler", json=musteri_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_musteri_id = data.get("id")
                
                self.log_result("Create Teklif Musteri", True, f"Musteri created with ID: {self.test_musteri_id}")
                return True
            else:
                self.log_result("Create Teklif Musteri", False, "Musteri creation failed", response)
                return False
                
        except Exception as e:
            self.log_result("Create Teklif Musteri", False, f"Exception: {str(e)}")
            return False
    
    def test_get_teklif_musteriler(self):
        """Test getting all teklif musteriler"""
        try:
            response = self.session.get(f"{BACKEND_URL}/teklif-musteriler")
            
            if response.status_code == 200:
                data = response.json()
                musteri_count = len(data)
                
                self.log_result("Get All Teklif Musteriler", True, f"Retrieved {musteri_count} musteriler")
                return True
            else:
                self.log_result("Get All Teklif Musteriler", False, "Failed to get musteriler", response)
                return False
                
        except Exception as e:
            self.log_result("Get All Teklif Musteriler", False, f"Exception: {str(e)}")
            return False
    
    def test_get_single_teklif_musteri(self):
        """Test getting a single teklif musteri"""
        if not self.test_musteri_id:
            self.log_result("Get Single Teklif Musteri", False, "No test musteri ID available")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/teklif-musteriler/{self.test_musteri_id}")
            
            if response.status_code == 200:
                data = response.json()
                firma_adi = data.get("firma_adi")
                
                self.log_result("Get Single Teklif Musteri", True, f"Retrieved musteri: {firma_adi}")
                return True
            else:
                self.log_result("Get Single Teklif Musteri", False, "Failed to get single musteri", response)
                return False
                
        except Exception as e:
            self.log_result("Get Single Teklif Musteri", False, f"Exception: {str(e)}")
            return False
    
    def test_update_teklif_musteri(self):
        """Test updating a teklif musteri"""
        if not self.test_musteri_id:
            self.log_result("Update Teklif Musteri", False, "No test musteri ID available")
            return False
            
        update_data = {
            "firma_adi": "Updated Acme Şirketi",
            "yetkili_kisi": "Mehmet Demir",
            "telefon": "0533 987 6543",
            "email": "mehmet@acme.com",
            "adres": "Bağdat Cad. No:456 Üsküdar/İstanbul",
            "vergi_no": "987654321",
            "vergi_dairesi": "Üsküdar Vergi Dairesi",
            "notlar": "Updated test müşterisi"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/teklif-musteriler/{self.test_musteri_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                updated_name = data.get("firma_adi")
                
                self.log_result("Update Teklif Musteri", True, f"Musteri updated, new name: {updated_name}")
                return True
            else:
                self.log_result("Update Teklif Musteri", False, "Failed to update musteri", response)
                return False
                
        except Exception as e:
            self.log_result("Update Teklif Musteri", False, f"Exception: {str(e)}")
            return False
    
    def test_create_teklif(self):
        """Test teklif creation"""
        if not self.test_musteri_id:
            self.log_result("Create Teklif", False, "No test musteri ID available")
            return False
            
        today = datetime.now().strftime("%Y-%m-%d")
        teklif_data = {
            "musteri_id": self.test_musteri_id,
            "musteri_adi": "Acme Şirketi",
            "musteri_adres": "Atatürk Cad. No:123 Kadıköy/İstanbul",
            "musteri_vergi_no": "1234567890",
            "musteri_vergi_dairesi": "Kadıköy Vergi Dairesi",
            "teklif_tarihi": today,
            "gecerlilik_tarihi": "2025-02-28",
            "konu": "Bims Blok Tedariki",
            "kalemler": [
                {
                    "urun_hizmet": "20x20x40 Bims Blok",
                    "aciklama": "Standart bims blok",
                    "miktar": 1000,
                    "birim": "adet",
                    "birim_fiyat": 2.50,
                    "kdv_orani": 20,
                    "iskonto_orani": 5,
                    "toplam": 2375.0
                },
                {
                    "urun_hizmet": "Nakliye",
                    "aciklama": "İstanbul içi nakliye",
                    "miktar": 1,
                    "birim": "sefer",
                    "birim_fiyat": 500.0,
                    "kdv_orani": 20,
                    "iskonto_orani": 0,
                    "toplam": 600.0
                }
            ],
            "ara_toplam": 2975.0,
            "toplam_iskonto": 125.0,
            "toplam_kdv": 570.0,
            "genel_toplam": 3420.0,
            "para_birimi": "TRY",
            "odeme_kosullari": "30 gün vadeli",
            "teslim_suresi": "7 iş günü",
            "notlar": "Test teklifi",
            "durum": "taslak"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/teklifler", json=teklif_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_teklif_id = data.get("id")
                teklif_no = data.get("teklif_no")
                
                # Verify teklif_no format (TKL-YYYY-xxxx)
                current_year = datetime.now().year
                expected_prefix = f"TKL-{current_year}-"
                if teklif_no and teklif_no.startswith(expected_prefix):
                    self.log_result("Create Teklif", True, f"Teklif created with ID: {self.test_teklif_id}, No: {teklif_no}")
                    return True
                else:
                    self.log_result("Create Teklif", False, f"Invalid teklif_no format: {teklif_no}, expected to start with {expected_prefix}")
                    return False
            else:
                self.log_result("Create Teklif", False, "Teklif creation failed", response)
                return False
                
        except Exception as e:
            self.log_result("Create Teklif", False, f"Exception: {str(e)}")
            return False
    
    def test_get_teklifler(self):
        """Test getting all teklifler"""
        try:
            response = self.session.get(f"{BACKEND_URL}/teklifler")
            
            if response.status_code == 200:
                data = response.json()
                teklif_count = len(data)
                
                self.log_result("Get All Teklifler", True, f"Retrieved {teklif_count} teklifler")
                return True
            else:
                self.log_result("Get All Teklifler", False, "Failed to get teklifler", response)
                return False
                
        except Exception as e:
            self.log_result("Get All Teklifler", False, f"Exception: {str(e)}")
            return False
    
    def test_get_single_teklif(self):
        """Test getting a single teklif"""
        if not self.test_teklif_id:
            self.log_result("Get Single Teklif", False, "No test teklif ID available")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/teklifler/{self.test_teklif_id}")
            
            if response.status_code == 200:
                data = response.json()
                teklif_no = data.get("teklif_no")
                konu = data.get("konu")
                
                self.log_result("Get Single Teklif", True, f"Retrieved teklif: {teklif_no} - {konu}")
                return True
            else:
                self.log_result("Get Single Teklif", False, "Failed to get single teklif", response)
                return False
                
        except Exception as e:
            self.log_result("Get Single Teklif", False, f"Exception: {str(e)}")
            return False
    
    def test_update_teklif(self):
        """Test updating a teklif"""
        if not self.test_teklif_id:
            self.log_result("Update Teklif", False, "No test teklif ID available")
            return False
            
        today = datetime.now().strftime("%Y-%m-%d")
        update_data = {
            "konu": "Updated Bims Blok Tedariki",
            "kalemler": [
                {
                    "urun_hizmet": "20x20x40 Bims Blok",
                    "aciklama": "Premium bims blok",
                    "miktar": 1500,
                    "birim": "adet",
                    "birim_fiyat": 2.75,
                    "kdv_orani": 20,
                    "iskonto_orani": 10,
                    "toplam": 3712.5
                }
            ],
            "ara_toplam": 3712.5,
            "toplam_iskonto": 412.5,
            "toplam_kdv": 660.0,
            "genel_toplam": 3960.0,
            "notlar": "Updated test teklifi"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/teklifler/{self.test_teklif_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                updated_konu = data.get("konu")
                
                self.log_result("Update Teklif", True, f"Teklif updated, new konu: {updated_konu}")
                return True
            else:
                self.log_result("Update Teklif", False, "Failed to update teklif", response)
                return False
                
        except Exception as e:
            self.log_result("Update Teklif", False, f"Exception: {str(e)}")
            return False
    
    def test_update_teklif_durum(self):
        """Test updating teklif durum"""
        if not self.test_teklif_id:
            self.log_result("Update Teklif Durum", False, "No test teklif ID available")
            return False
            
        try:
            response = self.session.put(f"{BACKEND_URL}/teklifler/{self.test_teklif_id}/durum?durum=gonderildi")
            
            if response.status_code == 200:
                data = response.json()
                durum = data.get("durum")
                
                self.log_result("Update Teklif Durum", True, f"Teklif durum updated to: {durum}")
                return True
            else:
                self.log_result("Update Teklif Durum", False, "Failed to update teklif durum", response)
                return False
                
        except Exception as e:
            self.log_result("Update Teklif Durum", False, f"Exception: {str(e)}")
            return False
    
    def test_teklif_ozet(self):
        """Test teklif ozet API"""
        try:
            response = self.session.get(f"{BACKEND_URL}/teklif-ozet")
            
            if response.status_code == 200:
                data = response.json()
                toplam_teklif = data.get("toplam_teklif", 0)
                ayki_teklif_sayisi = data.get("ayki_teklif_sayisi", 0)
                musteri_sayisi = data.get("musteri_sayisi", 0)
                
                self.log_result("Teklif Ozet", True, f"Toplam: {toplam_teklif}, Aylık: {ayki_teklif_sayisi}, Müşteri: {musteri_sayisi}")
                return True
            else:
                self.log_result("Teklif Ozet", False, "Failed to get teklif ozet", response)
                return False
                
        except Exception as e:
            self.log_result("Teklif Ozet", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_teklif(self):
        """Test deleting a teklif"""
        if not self.test_teklif_id:
            self.log_result("Delete Teklif", False, "No test teklif ID available")
            return False
            
        try:
            response = self.session.delete(f"{BACKEND_URL}/teklifler/{self.test_teklif_id}")
            
            if response.status_code == 200:
                self.log_result("Delete Teklif", True, "Teklif deleted successfully")
                return True
            else:
                self.log_result("Delete Teklif", False, "Failed to delete teklif", response)
                return False
                
        except Exception as e:
            self.log_result("Delete Teklif", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_teklif_musteri(self):
        """Test deleting a teklif musteri"""
        if not self.test_musteri_id:
            self.log_result("Delete Teklif Musteri", False, "No test musteri ID available")
            return False
            
        try:
            response = self.session.delete(f"{BACKEND_URL}/teklif-musteriler/{self.test_musteri_id}")
            
            if response.status_code == 200:
                self.log_result("Delete Teklif Musteri", True, "Musteri deleted successfully")
                return True
            else:
                self.log_result("Delete Teklif Musteri", False, "Failed to delete musteri", response)
                return False
                
        except Exception as e:
            self.log_result("Delete Teklif Musteri", False, f"Exception: {str(e)}")
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
    tester = TeklifAPITester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()