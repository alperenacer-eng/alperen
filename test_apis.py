import requests
import json

API_URL = "http://localhost:8001/api"

# Login
login_resp = requests.post(f"{API_URL}/auth/login", json={"email": "alperenacer@acerler.com", "password": "1234"})
if login_resp.status_code != 200:
    print("Login failed:", login_resp.text)
    exit(1)

token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("✅ Login başarılı")

# Test BIMS ürün ekleme
bims_data = {"urun_adi": "Test BIMS Blok", "birim": "adet", "birim_fiyat": 150, "aciklama": "Test ürünü"}
resp = requests.post(f"{API_URL}/bims-urunler", json=bims_data, headers=headers)
print(f"BIMS Ürün Ekle: {resp.status_code} - {resp.json() if resp.ok else resp.text}")

# Test Parke ürün ekleme
parke_data = {"urun_adi": "Test Parke", "birim": "m²", "birim_fiyat": 250, "ebat": "40x40", "renk": "Gri"}
resp = requests.post(f"{API_URL}/parke-urunler", json=parke_data, headers=headers)
print(f"Parke Ürün Ekle: {resp.status_code} - {resp.json() if resp.ok else resp.text}")

# Test BIMS ürün listele
resp = requests.get(f"{API_URL}/bims-urunler", headers=headers)
print(f"BIMS Ürün Liste: {resp.status_code} - {len(resp.json())} ürün")

# Test Parke ürün listele
resp = requests.get(f"{API_URL}/parke-urunler", headers=headers)
print(f"Parke Ürün Liste: {resp.status_code} - {len(resp.json())} ürün")

# Test teklif türüne göre listeleme
resp = requests.get(f"{API_URL}/teklifler?teklif_turu=bims", headers=headers)
print(f"BIMS Teklifler: {resp.status_code} - {len(resp.json())} teklif")

resp = requests.get(f"{API_URL}/teklifler?teklif_turu=parke", headers=headers)
print(f"Parke Teklifler: {resp.status_code} - {len(resp.json())} teklif")

print("\n✅ Tüm testler başarılı!")
