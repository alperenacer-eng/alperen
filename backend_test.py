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
        self.test_new_fields_alim_id = None  # For testing new fields
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
    
    def test_create_tedarikci(self):
        """Test motorin tedarikci creation"""
        timestamp = str(int(datetime.now().timestamp()))[-6:]
        tedarikci_data = {
            "name": f"Test Tedarikçi {timestamp}",
            "yetkili_kisi": "Ahmet Yılmaz",
            "telefon": "0532 123 4567",
            "email": f"tedarikci{timestamp}@example.com",
            "adres": "İstanbul, Türkiye",
            "vergi_no": f"123456789{timestamp[-3:]}",
            "notlar": "Test tedarikçisi"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/motorin-tedarikciler", json=tedarikci_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_tedarikci_id = data.get("id")
                
                self.log_result("Create Motorin Tedarikci", True, f"Tedarikci created with ID: {self.test_tedarikci_id}")
                return True
            else:
                self.log_result("Create Motorin Tedarikci", False, "Tedarikci creation failed", response)
                return False
                
        except Exception as e:
            self.log_result("Create Motorin Tedarikci", False, f"Exception: {str(e)}")
            return False
    
    def test_get_tedarikciler(self):
        """Test getting all motorin tedarikciler"""
        try:
            response = self.session.get(f"{BACKEND_URL}/motorin-tedarikciler")
            
            if response.status_code == 200:
                data = response.json()
                tedarikci_count = len(data)
                
                self.log_result("Get All Motorin Tedarikciler", True, f"Retrieved {tedarikci_count} tedarikciler")
                return True
            else:
                self.log_result("Get All Motorin Tedarikciler", False, "Failed to get tedarikciler", response)
                return False
                
        except Exception as e:
            self.log_result("Get All Motorin Tedarikciler", False, f"Exception: {str(e)}")
            return False
    
    def test_update_tedarikci(self):
        """Test updating a motorin tedarikci"""
        if not self.test_tedarikci_id:
            self.log_result("Update Motorin Tedarikci", False, "No test tedarikci ID available")
            return False
            
        update_data = {
            "name": "Updated Test Tedarikçi",
            "yetkili_kisi": "Mehmet Demir",
            "telefon": "0533 987 6543",
            "email": "updated@example.com",
            "adres": "Ankara, Türkiye",
            "vergi_no": "987654321",
            "notlar": "Updated test tedarikçisi"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/motorin-tedarikciler/{self.test_tedarikci_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                updated_name = data.get("name")
                
                self.log_result("Update Motorin Tedarikci", True, f"Tedarikci updated, new name: {updated_name}")
                return True
            else:
                self.log_result("Update Motorin Tedarikci", False, "Failed to update tedarikci", response)
                return False
                
        except Exception as e:
            self.log_result("Update Motorin Tedarikci", False, f"Exception: {str(e)}")
            return False
    
    def test_create_arac_for_motorin(self):
        """Create a test vehicle for motorin verme operations"""
        timestamp = str(int(datetime.now().timestamp()))[-6:]
        vehicle_data = {
            "plaka": f"34 MOT {timestamp}",
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
            "notlar": "Test aracı motorin için",
            "aktif": True
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/araclar", json=vehicle_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_arac_id = data.get("id")
                
                self.log_result("Create Test Vehicle for Motorin", True, f"Vehicle created with ID: {self.test_arac_id}")
                return True
            else:
                self.log_result("Create Test Vehicle for Motorin", False, "Vehicle creation failed", response)
                return False
                
        except Exception as e:
            self.log_result("Create Test Vehicle for Motorin", False, f"Exception: {str(e)}")
            return False
    
    def test_create_motorin_alim(self):
        """Test motorin alim creation"""
        if not self.test_tedarikci_id:
            self.log_result("Create Motorin Alim", False, "No test tedarikci ID available")
            return False
            
        today = datetime.now().strftime("%Y-%m-%d")
        alim_data = {
            "tarih": today,
            "tedarikci_id": self.test_tedarikci_id,
            "tedarikci_adi": "Test Tedarikçi",
            "miktar_litre": 1000.0,
            "birim_fiyat": 35.50,
            "toplam_tutar": 35500.0,
            "fatura_no": "FAT2024001",
            "irsaliye_no": "IRS2024001",
            "odeme_durumu": "beklemede",
            "vade_tarihi": "2024-12-31",
            "notlar": "Test alım kaydı"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/motorin-alimlar", json=alim_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_alim_id = data.get("id")
                
                self.log_result("Create Motorin Alim", True, f"Alim created with ID: {self.test_alim_id}")
                return True
            else:
                self.log_result("Create Motorin Alim", False, "Alim creation failed", response)
                return False
                
        except Exception as e:
            self.log_result("Create Motorin Alim", False, f"Exception: {str(e)}")
            return False

    def test_create_motorin_alim_with_new_fields(self):
        """Test motorin alim creation with new fields as requested in review"""
        if not self.test_tedarikci_id:
            self.log_result("Create Motorin Alim with New Fields", False, "No test tedarikci ID available")
            return False
            
        today = datetime.now().strftime("%Y-%m-%d")
        alim_data = {
            "tarih": today,
            "tedarikci_adi": "Test Petrol",
            "cekici_plaka": "34 ABC 123",
            "dorse_plaka": "34 DEF 456",
            "sofor_adi": "Ahmet",
            "sofor_soyadi": "Yılmaz",
            "miktar_litre": 10000,
            "miktar_kg": 8350,
            "kesafet": 0.835,
            "kantar_kg": 8400,
            "birim_fiyat": 42.50,
            "toplam_tutar": 425000,
            "fatura_no": "FTR-2025-001",
            "irsaliye_no": "IRS-2025-001",
            "odeme_durumu": "vadeli",
            "vade_tarihi": "2025-08-15",
            "teslim_alan": "Mehmet Demir"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/motorin-alimlar", json=alim_data)
            
            if response.status_code == 200:
                data = response.json()
                new_alim_id = data.get("id")
                
                # Verify all new fields are present in response
                new_fields_check = {
                    "cekici_plaka": "34 ABC 123",
                    "dorse_plaka": "34 DEF 456", 
                    "sofor_adi": "Ahmet",
                    "sofor_soyadi": "Yılmaz",
                    "miktar_kg": 8350,
                    "kesafet": 0.835,
                    "kantar_kg": 8400,
                    "teslim_alan": "Mehmet Demir"
                }
                
                missing_fields = []
                incorrect_values = []
                
                for field, expected_value in new_fields_check.items():
                    if field not in data:
                        missing_fields.append(field)
                    elif data[field] != expected_value:
                        incorrect_values.append(f"{field}: expected {expected_value}, got {data[field]}")
                
                if missing_fields:
                    self.log_result("Create Motorin Alim with New Fields", False, f"Missing fields: {', '.join(missing_fields)}")
                    return False
                elif incorrect_values:
                    self.log_result("Create Motorin Alim with New Fields", False, f"Incorrect values: {', '.join(incorrect_values)}")
                    return False
                else:
                    self.log_result("Create Motorin Alim with New Fields", True, f"Alim created with all new fields. ID: {new_alim_id}")
                    
                    # Store this ID for verification test
                    self.test_new_fields_alim_id = new_alim_id
                    return True
            else:
                self.log_result("Create Motorin Alim with New Fields", False, "Alim creation failed", response)
                return False
                
        except Exception as e:
            self.log_result("Create Motorin Alim with New Fields", False, f"Exception: {str(e)}")
            return False
    
    def test_get_motorin_alimlar(self):
        """Test getting all motorin alimlar"""
        try:
            response = self.session.get(f"{BACKEND_URL}/motorin-alimlar")
            
            if response.status_code == 200:
                data = response.json()
                alim_count = len(data)
                
                self.log_result("Get All Motorin Alimlar", True, f"Retrieved {alim_count} alimlar")
                return True
            else:
                self.log_result("Get All Motorin Alimlar", False, "Failed to get alimlar", response)
                return False
                
        except Exception as e:
            self.log_result("Get All Motorin Alimlar", False, f"Exception: {str(e)}")
            return False

    def test_verify_new_fields_in_list(self):
        """Test that new fields are returned when listing motorin alimlar"""
        try:
            response = self.session.get(f"{BACKEND_URL}/motorin-alimlar")
            
            if response.status_code == 200:
                data = response.json()
                
                # Find our test record with new fields
                test_record = None
                if hasattr(self, 'test_new_fields_alim_id') and self.test_new_fields_alim_id:
                    test_record = next((record for record in data if record.get('id') == self.test_new_fields_alim_id), None)
                
                if test_record:
                    # Verify new fields are present in the list response
                    new_fields_check = {
                        "cekici_plaka": "34 ABC 123",
                        "dorse_plaka": "34 DEF 456", 
                        "sofor_adi": "Ahmet",
                        "sofor_soyadi": "Yılmaz",
                        "miktar_kg": 8350,
                        "kesafet": 0.835,
                        "kantar_kg": 8400,
                        "teslim_alan": "Mehmet Demir"
                    }
                    
                    missing_fields = []
                    incorrect_values = []
                    
                    for field, expected_value in new_fields_check.items():
                        if field not in test_record:
                            missing_fields.append(field)
                        elif test_record[field] != expected_value:
                            incorrect_values.append(f"{field}: expected {expected_value}, got {test_record[field]}")
                    
                    if missing_fields:
                        self.log_result("Verify New Fields in List", False, f"Missing fields in list response: {', '.join(missing_fields)}")
                        return False
                    elif incorrect_values:
                        self.log_result("Verify New Fields in List", False, f"Incorrect values in list response: {', '.join(incorrect_values)}")
                        return False
                    else:
                        self.log_result("Verify New Fields in List", True, "All new fields present and correct in list response")
                        return True
                else:
                    self.log_result("Verify New Fields in List", False, "Test record with new fields not found in list")
                    return False
            else:
                self.log_result("Verify New Fields in List", False, "Failed to get alimlar list", response)
                return False
                
        except Exception as e:
            self.log_result("Verify New Fields in List", False, f"Exception: {str(e)}")
            return False
    
    def test_get_single_motorin_alim(self):
        """Test getting a single motorin alim"""
        if not self.test_alim_id:
            self.log_result("Get Single Motorin Alim", False, "No test alim ID available")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/motorin-alimlar/{self.test_alim_id}")
            
            if response.status_code == 200:
                data = response.json()
                miktar = data.get("miktar_litre")
                
                self.log_result("Get Single Motorin Alim", True, f"Retrieved alim: {miktar} litre")
                return True
            else:
                self.log_result("Get Single Motorin Alim", False, "Failed to get single alim", response)
                return False
                
        except Exception as e:
            self.log_result("Get Single Motorin Alim", False, f"Exception: {str(e)}")
            return False
    
    def test_update_motorin_alim(self):
        """Test updating a motorin alim"""
        if not self.test_alim_id:
            self.log_result("Update Motorin Alim", False, "No test alim ID available")
            return False
            
        today = datetime.now().strftime("%Y-%m-%d")
        update_data = {
            "tarih": today,
            "tedarikci_id": self.test_tedarikci_id,
            "tedarikci_adi": "Updated Test Tedarikçi",
            "miktar_litre": 1500.0,
            "birim_fiyat": 36.00,
            "toplam_tutar": 54000.0,
            "fatura_no": "FAT2024002",
            "irsaliye_no": "IRS2024002",
            "odeme_durumu": "odendi",
            "vade_tarihi": "",
            "notlar": "Updated test alım kaydı"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/motorin-alimlar/{self.test_alim_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                updated_miktar = data.get("miktar_litre")
                
                self.log_result("Update Motorin Alim", True, f"Alim updated, new miktar: {updated_miktar} litre")
                return True
            else:
                self.log_result("Update Motorin Alim", False, "Failed to update alim", response)
                return False
                
        except Exception as e:
            self.log_result("Update Motorin Alim", False, f"Exception: {str(e)}")
            return False
    
    def test_create_motorin_verme(self):
        """Test motorin verme creation"""
        if not self.test_arac_id:
            self.log_result("Create Motorin Verme", False, "No test arac ID available")
            return False
            
        today = datetime.now().strftime("%Y-%m-%d")
        verme_data = {
            "tarih": today,
            "arac_id": self.test_arac_id,
            "arac_plaka": "34 MOT 123",
            "arac_bilgi": "Mercedes Actros",
            "miktar_litre": 200.0,
            "kilometre": 125000.0,
            "sofor_id": "",
            "sofor_adi": "Ali Veli",
            "personel_id": "",
            "personel_adi": "Mehmet Özkan",
            "notlar": "Test verme kaydı"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/motorin-verme", json=verme_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_verme_id = data.get("id")
                
                self.log_result("Create Motorin Verme", True, f"Verme created with ID: {self.test_verme_id}")
                return True
            else:
                self.log_result("Create Motorin Verme", False, "Verme creation failed", response)
                return False
                
        except Exception as e:
            self.log_result("Create Motorin Verme", False, f"Exception: {str(e)}")
            return False
    
    def test_get_motorin_verme(self):
        """Test getting all motorin verme"""
        try:
            response = self.session.get(f"{BACKEND_URL}/motorin-verme")
            
            if response.status_code == 200:
                data = response.json()
                verme_count = len(data)
                
                self.log_result("Get All Motorin Verme", True, f"Retrieved {verme_count} verme records")
                return True
            else:
                self.log_result("Get All Motorin Verme", False, "Failed to get verme records", response)
                return False
                
        except Exception as e:
            self.log_result("Get All Motorin Verme", False, f"Exception: {str(e)}")
            return False
    
    def test_get_single_motorin_verme(self):
        """Test getting a single motorin verme"""
        if not self.test_verme_id:
            self.log_result("Get Single Motorin Verme", False, "No test verme ID available")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/motorin-verme/{self.test_verme_id}")
            
            if response.status_code == 200:
                data = response.json()
                miktar = data.get("miktar_litre")
                
                self.log_result("Get Single Motorin Verme", True, f"Retrieved verme: {miktar} litre")
                return True
            else:
                self.log_result("Get Single Motorin Verme", False, "Failed to get single verme", response)
                return False
                
        except Exception as e:
            self.log_result("Get Single Motorin Verme", False, f"Exception: {str(e)}")
            return False
    
    def test_update_motorin_verme(self):
        """Test updating a motorin verme"""
        if not self.test_verme_id or not self.test_arac_id:
            self.log_result("Update Motorin Verme", False, "No test verme or arac ID available")
            return False
            
        today = datetime.now().strftime("%Y-%m-%d")
        update_data = {
            "tarih": today,
            "arac_id": self.test_arac_id,
            "arac_plaka": "34 MOT 123",
            "arac_bilgi": "Mercedes Actros Updated",
            "miktar_litre": 250.0,
            "kilometre": 126000.0,
            "sofor_id": "",
            "sofor_adi": "Veli Ali",
            "personel_id": "",
            "personel_adi": "Özkan Mehmet",
            "notlar": "Updated test verme kaydı"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/motorin-verme/{self.test_verme_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                updated_miktar = data.get("miktar_litre")
                
                self.log_result("Update Motorin Verme", True, f"Verme updated, new miktar: {updated_miktar} litre")
                return True
            else:
                self.log_result("Update Motorin Verme", False, "Failed to update verme", response)
                return False
                
        except Exception as e:
            self.log_result("Update Motorin Verme", False, f"Exception: {str(e)}")
            return False
    
    def test_motorin_stok(self):
        """Test motorin stok API"""
        try:
            response = self.session.get(f"{BACKEND_URL}/motorin-stok")
            
            if response.status_code == 200:
                data = response.json()
                mevcut_stok = data.get("mevcut_stok", 0)
                toplam_alim = data.get("toplam_alim", 0)
                toplam_verme = data.get("toplam_verme", 0)
                
                self.log_result("Motorin Stok", True, f"Stok: {mevcut_stok}L, Alım: {toplam_alim}L, Verme: {toplam_verme}L")
                return True
            else:
                self.log_result("Motorin Stok", False, "Failed to get motorin stok", response)
                return False
                
        except Exception as e:
            self.log_result("Motorin Stok", False, f"Exception: {str(e)}")
            return False
    
    def test_motorin_ozet(self):
        """Test motorin ozet API"""
        try:
            response = self.session.get(f"{BACKEND_URL}/motorin-ozet")
            
            if response.status_code == 200:
                data = response.json()
                mevcut_stok = data.get("mevcut_stok", 0)
                ayki_alim = data.get("ayki_alim", 0)
                ayki_maliyet = data.get("ayki_maliyet", 0)
                tedarikci_sayisi = data.get("tedarikci_sayisi", 0)
                
                self.log_result("Motorin Ozet", True, f"Stok: {mevcut_stok}L, Aylık alım: {ayki_alim}L, Tedarikçi: {tedarikci_sayisi}")
                return True
            else:
                self.log_result("Motorin Ozet", False, "Failed to get motorin ozet", response)
                return False
                
        except Exception as e:
            self.log_result("Motorin Ozet", False, f"Exception: {str(e)}")
            return False
    
    def test_motorin_arac_tuketim(self):
        """Test motorin arac tuketim raporu API"""
        try:
            # Test with date filter
            today = datetime.now().strftime("%Y-%m-%d")
            response = self.session.get(f"{BACKEND_URL}/motorin-arac-tuketim?tarih_baslangic={today}&tarih_bitis={today}")
            
            if response.status_code == 200:
                data = response.json()
                rapor_count = len(data)
                
                self.log_result("Motorin Arac Tuketim Raporu", True, f"Retrieved {rapor_count} arac tuketim records")
                return True
            else:
                self.log_result("Motorin Arac Tuketim Raporu", False, "Failed to get arac tuketim raporu", response)
                return False
                
        except Exception as e:
            self.log_result("Motorin Arac Tuketim Raporu", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_motorin_verme(self):
        """Test deleting a motorin verme"""
        if not self.test_verme_id:
            self.log_result("Delete Motorin Verme", False, "No test verme ID available")
            return False
            
        try:
            response = self.session.delete(f"{BACKEND_URL}/motorin-verme/{self.test_verme_id}")
            
            if response.status_code == 200:
                self.log_result("Delete Motorin Verme", True, "Verme deleted successfully")
                return True
            else:
                self.log_result("Delete Motorin Verme", False, "Failed to delete verme", response)
                return False
                
        except Exception as e:
            self.log_result("Delete Motorin Verme", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_motorin_alim(self):
        """Test deleting a motorin alim"""
        if not self.test_alim_id:
            self.log_result("Delete Motorin Alim", False, "No test alim ID available")
            return False
            
        try:
            response = self.session.delete(f"{BACKEND_URL}/motorin-alimlar/{self.test_alim_id}")
            
            if response.status_code == 200:
                self.log_result("Delete Motorin Alim", True, "Alim deleted successfully")
                return True
            else:
                self.log_result("Delete Motorin Alim", False, "Failed to delete alim", response)
                return False
                
        except Exception as e:
            self.log_result("Delete Motorin Alim", False, f"Exception: {str(e)}")
            return False

    def test_delete_motorin_alim_new_fields(self):
        """Test deleting the motorin alim with new fields"""
        if not hasattr(self, 'test_new_fields_alim_id') or not self.test_new_fields_alim_id:
            self.log_result("Delete Motorin Alim (New Fields)", False, "No test new fields alim ID available")
            return False
            
        try:
            response = self.session.delete(f"{BACKEND_URL}/motorin-alimlar/{self.test_new_fields_alim_id}")
            
            if response.status_code == 200:
                self.log_result("Delete Motorin Alim (New Fields)", True, "New fields alim deleted successfully")
                return True
            else:
                self.log_result("Delete Motorin Alim (New Fields)", False, "Failed to delete new fields alim", response)
                return False
                
        except Exception as e:
            self.log_result("Delete Motorin Alim (New Fields)", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_tedarikci(self):
        """Test deleting a motorin tedarikci"""
        if not self.test_tedarikci_id:
            self.log_result("Delete Motorin Tedarikci", False, "No test tedarikci ID available")
            return False
            
        try:
            response = self.session.delete(f"{BACKEND_URL}/motorin-tedarikciler/{self.test_tedarikci_id}")
            
            if response.status_code == 200:
                self.log_result("Delete Motorin Tedarikci", True, "Tedarikci deleted successfully")
                return True
            else:
                self.log_result("Delete Motorin Tedarikci", False, "Failed to delete tedarikci", response)
                return False
                
        except Exception as e:
            self.log_result("Delete Motorin Tedarikci", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_test_arac(self):
        """Test deleting the test vehicle"""
        if not self.test_arac_id:
            self.log_result("Delete Test Vehicle", False, "No test arac ID available")
            return False
            
        try:
            response = self.session.delete(f"{BACKEND_URL}/araclar/{self.test_arac_id}")
            
            if response.status_code == 200:
                self.log_result("Delete Test Vehicle", True, "Test vehicle deleted successfully")
                return True
            else:
                self.log_result("Delete Test Vehicle", False, "Failed to delete test vehicle", response)
                return False
                
        except Exception as e:
            self.log_result("Delete Test Vehicle", False, f"Exception: {str(e)}")
            return False
            response = self.session.get(f"{BACKEND_URL}/motorin-stok")
            
            if response.status_code == 200:
                data = response.json()
                mevcut_stok = data.get("mevcut_stok", 0)
                toplam_alim = data.get("toplam_alim", 0)
                toplam_verme = data.get("toplam_verme", 0)
                
                self.log_result("Motorin Stok", True, f"Stok: {mevcut_stok}L, Alım: {toplam_alim}L, Verme: {toplam_verme}L")
                return True
            else:
                self.log_result("Motorin Stok", False, "Failed to get motorin stok", response)
                return False
                
        except Exception as e:
            self.log_result("Motorin Stok", False, f"Exception: {str(e)}")
            return False
    
    def test_motorin_ozet(self):
        """Test motorin ozet API"""
        try:
            response = self.session.get(f"{BACKEND_URL}/motorin-ozet")
            
            if response.status_code == 200:
                data = response.json()
                mevcut_stok = data.get("mevcut_stok", 0)
                ayki_alim = data.get("ayki_alim", 0)
                ayki_maliyet = data.get("ayki_maliyet", 0)
                tedarikci_sayisi = data.get("tedarikci_sayisi", 0)
                
                self.log_result("Motorin Ozet", True, f"Stok: {mevcut_stok}L, Aylık alım: {ayki_alim}L, Tedarikçi: {tedarikci_sayisi}")
                return True
            else:
                self.log_result("Motorin Ozet", False, "Failed to get motorin ozet", response)
                return False
                
        except Exception as e:
            self.log_result("Motorin Ozet", False, f"Exception: {str(e)}")
            return False
    
    def test_motorin_arac_tuketim(self):
        """Test motorin arac tuketim raporu API"""
        try:
            # Test with date filter
            today = datetime.now().strftime("%Y-%m-%d")
            response = self.session.get(f"{BACKEND_URL}/motorin-arac-tuketim?tarih_baslangic={today}&tarih_bitis={today}")
            
            if response.status_code == 200:
                data = response.json()
                rapor_count = len(data)
                
                self.log_result("Motorin Arac Tuketim Raporu", True, f"Retrieved {rapor_count} arac tuketim records")
                return True
            else:
                self.log_result("Motorin Arac Tuketim Raporu", False, "Failed to get arac tuketim raporu", response)
                return False
                
        except Exception as e:
            self.log_result("Motorin Arac Tuketim Raporu", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("MOTORIN MANAGEMENT API TEST SUITE")
        print("=" * 60)
        print(f"Testing backend at: {BACKEND_URL}")
        print()
        
        # Authentication tests
        print("🔐 AUTHENTICATION TESTS")
        print("-" * 30)
        if not self.test_auth_login_existing():
            print("❌ Cannot proceed without authentication")
            return False
        
        # Motorin Tedarikci tests
        print("🏢 MOTORIN TEDARİKÇİ TESTS")
        print("-" * 30)
        self.test_create_tedarikci()
        self.test_get_tedarikciler()
        self.test_update_tedarikci()
        
        # Create test vehicle for motorin operations
        print("🚗 TEST VEHICLE CREATION")
        print("-" * 30)
        self.test_create_arac_for_motorin()
        
        # Motorin Alim tests
        print("⛽ MOTORIN ALIM TESTS")
        print("-" * 30)
        self.test_create_motorin_alim()
        self.test_get_motorin_alimlar()
        self.test_get_single_motorin_alim()
        self.test_update_motorin_alim()
        
        # NEW FIELDS TESTING (as requested in review)
        print("🆕 MOTORIN ALIM NEW FIELDS TESTS")
        print("-" * 30)
        self.test_create_motorin_alim_with_new_fields()
        self.test_verify_new_fields_in_list()
        
        # Motorin Verme tests
        print("🚛 MOTORIN VERME TESTS")
        print("-" * 30)
        self.test_create_motorin_verme()
        self.test_get_motorin_verme()
        self.test_get_single_motorin_verme()
        self.test_update_motorin_verme()
        
        # Motorin Stok and Summary tests
        print("📊 MOTORIN STOK & ÖZET TESTS")
        print("-" * 30)
        self.test_motorin_stok()
        self.test_motorin_ozet()
        
        # Motorin Reports tests
        print("📈 MOTORIN RAPOR TESTS")
        print("-" * 30)
        self.test_motorin_arac_tuketim()
        
        # Cleanup
        print("🧹 CLEANUP")
        print("-" * 30)
        self.test_delete_motorin_verme()
        self.test_delete_motorin_alim()
        self.test_delete_motorin_alim_new_fields()
        self.test_delete_tedarikci()
        self.test_delete_test_arac()
        
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
    tester = MotorinAPITester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()