from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import aiosqlite
import os
import logging
import uuid
import shutil
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Data klasörü - Docker volume için
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# SQLite Database path - data klasöründe tutulacak (Docker volume)
DB_PATH = DATA_DIR / "database.db"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Database helper functions
async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db

# Health check endpoint - Docker için
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "database": str(DB_PATH)}

async def init_db():
    """Initialize SQLite database with all tables"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Users table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                permissions TEXT DEFAULT '["bims"]',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Products table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                unit TEXT DEFAULT 'adet',
                sira_no INTEGER DEFAULT 0,
                sevk_agirligi REAL DEFAULT 0,
                adet_basi_cimento REAL DEFAULT 0,
                harcanan_hisir REAL DEFAULT 0,
                paket_adet_7_boy INTEGER DEFAULT 0,
                paket_adet_5_boy INTEGER DEFAULT 0,
                uretim_palet_adetleri TEXT DEFAULT '{}',
                paket_adetleri_7_boy TEXT DEFAULT '{}',
                paket_adetleri_5_boy TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Departments table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS departments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Operators table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS operators (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                employee_id TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Molds table - Ürün ve 10 adet kalıp numarası ile
        await db.execute('''
            CREATE TABLE IF NOT EXISTS molds (
                id TEXT PRIMARY KEY,
                mold_no TEXT NOT NULL,
                description TEXT,
                product_id TEXT DEFAULT '',
                product_name TEXT DEFAULT '',
                kalip_no_1 TEXT DEFAULT '',
                kalip_no_2 TEXT DEFAULT '',
                kalip_no_3 TEXT DEFAULT '',
                kalip_no_4 TEXT DEFAULT '',
                kalip_no_5 TEXT DEFAULT '',
                kalip_no_6 TEXT DEFAULT '',
                kalip_no_7 TEXT DEFAULT '',
                kalip_no_8 TEXT DEFAULT '',
                kalip_no_9 TEXT DEFAULT '',
                kalip_no_10 TEXT DEFAULT '',
                duvar_kalinlik_1 TEXT DEFAULT '',
                duvar_kalinlik_2 TEXT DEFAULT '',
                duvar_kalinlik_3 TEXT DEFAULT '',
                duvar_kalinlik_4 TEXT DEFAULT '',
                duvar_kalinlik_5 TEXT DEFAULT '',
                duvar_kalinlik_6 TEXT DEFAULT '',
                duvar_kalinlik_7 TEXT DEFAULT '',
                duvar_kalinlik_8 TEXT DEFAULT '',
                duvar_kalinlik_9 TEXT DEFAULT '',
                duvar_kalinlik_10 TEXT DEFAULT '',
                makina_cinsi_1 TEXT DEFAULT '',
                makina_cinsi_2 TEXT DEFAULT '',
                makina_cinsi_3 TEXT DEFAULT '',
                makina_cinsi_4 TEXT DEFAULT '',
                makina_cinsi_5 TEXT DEFAULT '',
                makina_cinsi_6 TEXT DEFAULT '',
                makina_cinsi_7 TEXT DEFAULT '',
                makina_cinsi_8 TEXT DEFAULT '',
                makina_cinsi_9 TEXT DEFAULT '',
                makina_cinsi_10 TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # BIMS Stok Urunler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS bims_stok_urunler (
                id TEXT PRIMARY KEY,
                urun_adi TEXT NOT NULL,
                birim TEXT DEFAULT 'adet',
                aciklama TEXT DEFAULT '',
                acilis_miktari REAL DEFAULT 0,
                acilis_tarihi TEXT DEFAULT '',
                mevcut_stok REAL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # BIMS Stok Hareketler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS bims_stok_hareketler (
                id TEXT PRIMARY KEY,
                urun_id TEXT NOT NULL,
                urun_adi TEXT DEFAULT '',
                hareket_tipi TEXT NOT NULL,
                miktar REAL NOT NULL,
                tarih TEXT NOT NULL,
                aciklama TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Cimento Firmalar table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS cimento_firmalar (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                contact_person TEXT,
                phone TEXT,
                address TEXT,
                notes TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Cimento İşletmeler table - Açılış stok takibi
        await db.execute('''
            CREATE TABLE IF NOT EXISTS cimento_isletmeler (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                adres TEXT DEFAULT '',
                yetkili_kisi TEXT DEFAULT '',
                telefon TEXT DEFAULT '',
                acilis_stok_kg REAL DEFAULT 0,
                acilis_tarihi TEXT DEFAULT '',
                mevcut_stok_kg REAL DEFAULT 0,
                notlar TEXT DEFAULT '',
                aktif INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Cimento Stok Hareketler - İşletme bazlı stok takibi
        await db.execute('''
            CREATE TABLE IF NOT EXISTS cimento_stok_hareketler (
                id TEXT PRIMARY KEY,
                isletme_id TEXT NOT NULL,
                isletme_adi TEXT DEFAULT '',
                hareket_tipi TEXT NOT NULL,
                miktar_kg REAL NOT NULL,
                tarih TEXT NOT NULL,
                aciklama TEXT DEFAULT '',
                referans_id TEXT DEFAULT '',
                referans_tip TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Nakliyeci Firmalar table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS nakliyeci_firmalar (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                contact_person TEXT,
                phone TEXT,
                address TEXT,
                notes TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Plakalar table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS plakalar (
                id TEXT PRIMARY KEY,
                plaka TEXT NOT NULL,
                vehicle_type TEXT,
                nakliyeci_id TEXT,
                nakliyeci_name TEXT,
                notes TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Soforler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS soforler (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT,
                license_no TEXT,
                nakliyeci_id TEXT,
                nakliyeci_name TEXT,
                notes TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Sehirler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS sehirler (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Cimento Cinsleri table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS cimento_cinsleri (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Production Records table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS production_records (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit TEXT DEFAULT 'adet',
                department_id TEXT,
                department_name TEXT,
                operator_id TEXT,
                operator_name TEXT,
                shift TEXT,
                notes TEXT,
                module TEXT DEFAULT 'bims',
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                production_date TEXT,
                shift_type TEXT,
                shift_number TEXT,
                worked_hours REAL,
                required_hours REAL,
                product_type TEXT,
                mold_no TEXT,
                strip_used TEXT,
                pallet_count INTEGER,
                pallet_quantity INTEGER,
                waste INTEGER,
                pieces_per_pallet INTEGER,
                mix_count INTEGER,
                cement_in_mix REAL,
                machine_cement REAL,
                product_to_field INTEGER,
                product_length REAL,
                breakdown_1 TEXT,
                breakdown_2 TEXT,
                breakdown_3 TEXT,
                paket_7_boy INTEGER DEFAULT 0,
                paket_5_boy INTEGER DEFAULT 0,
                cikan_paket_urun_id TEXT DEFAULT '',
                cikan_paket_urun_adi TEXT DEFAULT ''
            )
        ''')
        
        # Migration: Add paket columns to production_records if not exists
        try:
            await db.execute("ALTER TABLE production_records ADD COLUMN paket_7_boy INTEGER DEFAULT 0")
        except:
            pass
        try:
            await db.execute("ALTER TABLE production_records ADD COLUMN paket_5_boy INTEGER DEFAULT 0")
        except:
            pass
        try:
            await db.execute("ALTER TABLE production_records ADD COLUMN cikan_paket_urun_id TEXT DEFAULT ''")
        except:
            pass
        try:
            await db.execute("ALTER TABLE production_records ADD COLUMN cikan_paket_urun_adi TEXT DEFAULT ''")
        except:
            pass
        
        # Cimento Giris table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS cimento_giris (
                id TEXT PRIMARY KEY,
                yukleme_tarihi TEXT DEFAULT '',
                bosaltim_tarihi TEXT DEFAULT '',
                irsaliye_no TEXT DEFAULT '',
                fatura_no TEXT DEFAULT '',
                vade_tarihi TEXT DEFAULT '',
                giris_miktari REAL DEFAULT 0,
                kantar_kg_miktari REAL DEFAULT 0,
                birim_fiyat REAL DEFAULT 0,
                giris_kdv_orani REAL DEFAULT 20,
                nakliye_birim_fiyat REAL DEFAULT 0,
                nakliye_kdv_orani REAL DEFAULT 20,
                nakliye_tevkifat_orani REAL DEFAULT 0,
                plaka TEXT DEFAULT '',
                nakliye_firmasi TEXT DEFAULT '',
                sofor TEXT DEFAULT '',
                sehir TEXT DEFAULT '',
                cimento_alinan_firma TEXT DEFAULT '',
                cimento_cinsi TEXT DEFAULT '',
                bosaltim_isletmesi TEXT DEFAULT '',
                aradaki_fark REAL DEFAULT 0,
                giris_tutari REAL DEFAULT 0,
                giris_kdv_tutari REAL DEFAULT 0,
                giris_kdv_dahil_toplam REAL DEFAULT 0,
                nakliye_matrahi REAL DEFAULT 0,
                nakliye_kdv_tutari REAL DEFAULT 0,
                nakliye_t1 REAL DEFAULT 0,
                nakliye_t2 REAL DEFAULT 0,
                nakliye_genel_toplam REAL DEFAULT 0,
                urun_nakliye_matrah REAL DEFAULT 0,
                urun_nakliye_kdv_toplam REAL DEFAULT 0,
                urun_nakliye_tevkifat_toplam REAL DEFAULT 0,
                urun_nakliye_genel_toplam REAL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL
            )
        ''')
        
        # Personeller table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS personeller (
                id TEXT PRIMARY KEY,
                ad_soyad TEXT NOT NULL,
                tc_kimlik TEXT DEFAULT '',
                telefon TEXT DEFAULT '',
                email TEXT DEFAULT '',
                adres TEXT DEFAULT '',
                dogum_tarihi TEXT DEFAULT '',
                ise_giris_tarihi TEXT DEFAULT '',
                departman TEXT DEFAULT '',
                pozisyon TEXT DEFAULT '',
                maas REAL DEFAULT 0,
                banka TEXT DEFAULT '',
                iban TEXT DEFAULT '',
                sgk_no TEXT DEFAULT '',
                ehliyet_sinifi TEXT DEFAULT '',
                kan_grubu TEXT DEFAULT '',
                acil_durum_kisi TEXT DEFAULT '',
                acil_durum_telefon TEXT DEFAULT '',
                notlar TEXT DEFAULT '',
                aktif INTEGER DEFAULT 1,
                yillik_izin_hakki INTEGER DEFAULT 14,
                kullanilan_izin INTEGER DEFAULT 0,
                kalan_izin INTEGER DEFAULT 14,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Puantaj table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS puantaj (
                id TEXT PRIMARY KEY,
                personel_id TEXT NOT NULL,
                personel_adi TEXT NOT NULL,
                tarih TEXT NOT NULL,
                giris_saati TEXT DEFAULT '',
                cikis_saati TEXT DEFAULT '',
                mesai_suresi REAL DEFAULT 0,
                fazla_mesai REAL DEFAULT 0,
                notlar TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Izinler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS izinler (
                id TEXT PRIMARY KEY,
                personel_id TEXT NOT NULL,
                personel_adi TEXT NOT NULL,
                izin_turu TEXT NOT NULL,
                baslangic_tarihi TEXT NOT NULL,
                bitis_tarihi TEXT NOT NULL,
                gun_sayisi INTEGER DEFAULT 1,
                aciklama TEXT DEFAULT '',
                durum TEXT DEFAULT 'Beklemede',
                onayla_tarihi TEXT DEFAULT '',
                onaylayan TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Maas Bordrolari table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS maas_bordrolari (
                id TEXT PRIMARY KEY,
                personel_id TEXT NOT NULL,
                personel_adi TEXT NOT NULL,
                yil INTEGER NOT NULL,
                ay INTEGER NOT NULL,
                brut_maas REAL DEFAULT 0,
                sgk_isci REAL DEFAULT 0,
                sgk_isveren REAL DEFAULT 0,
                gelir_vergisi REAL DEFAULT 0,
                damga_vergisi REAL DEFAULT 0,
                net_maas REAL DEFAULT 0,
                fazla_mesai_ucreti REAL DEFAULT 0,
                ikramiye REAL DEFAULT 0,
                kesintiler REAL DEFAULT 0,
                toplam_odeme REAL DEFAULT 0,
                odeme_tarihi TEXT DEFAULT '',
                odendi INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Personel Departmanlar table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS personel_departmanlar (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                aciklama TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Pozisyonlar table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS pozisyonlar (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                departman TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Araclar table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS araclar (
                id TEXT PRIMARY KEY,
                plaka TEXT UNIQUE NOT NULL,
                arac_cinsi TEXT DEFAULT '',
                marka TEXT DEFAULT '',
                model TEXT DEFAULT '',
                model_yili INTEGER,
                kayitli_sirket TEXT DEFAULT '',
                muayene_tarihi TEXT DEFAULT '',
                ilk_muayene_tarihi TEXT DEFAULT '',
                son_muayene_tarihi TEXT DEFAULT '',
                kasko_yenileme_tarihi TEXT DEFAULT '',
                sigorta_yenileme_tarihi TEXT DEFAULT '',
                arac_takip_id TEXT DEFAULT '',
                arac_takip_hat_no TEXT DEFAULT '',
                notlar TEXT DEFAULT '',
                aktif INTEGER DEFAULT 1,
                ruhsat_dosya TEXT,
                kasko_dosya TEXT,
                sigorta_dosya TEXT,
                muayene_evrak TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Muayene Gecmisi table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS muayene_gecmisi (
                id TEXT PRIMARY KEY,
                arac_id TEXT NOT NULL,
                plaka TEXT NOT NULL,
                ilk_muayene_tarihi TEXT NOT NULL,
                son_muayene_tarihi TEXT NOT NULL,
                notlar TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                created_by TEXT DEFAULT ''
            )
        ''')
        
        # Arac Cinsleri table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS arac_cinsleri (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Markalar table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS markalar (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Modeller table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS modeller (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                marka TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Sirketler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS sirketler (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                vergi_no TEXT DEFAULT '',
                adres TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Ana Sigorta Firmalari table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS ana_sigorta_firmalari (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                telefon TEXT DEFAULT '',
                email TEXT DEFAULT '',
                adres TEXT DEFAULT '',
                notlar TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Sigorta Acentalari table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS sigorta_acentalari (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                ana_firma TEXT DEFAULT '',
                yetkili_kisi TEXT DEFAULT '',
                telefon TEXT DEFAULT '',
                email TEXT DEFAULT '',
                adres TEXT DEFAULT '',
                notlar TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        ''')
        
        # Motorin Tedarikciler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS motorin_tedarikciler (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                yetkili_kisi TEXT DEFAULT '',
                telefon TEXT DEFAULT '',
                email TEXT DEFAULT '',
                adres TEXT DEFAULT '',
                vergi_no TEXT DEFAULT '',
                notlar TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Bosaltim Tesisleri table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS bosaltim_tesisleri (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                adres TEXT DEFAULT '',
                notlar TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Akaryakit Markalari table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS akaryakit_markalari (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                notlar TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Motorin Alimlar table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS motorin_alimlar (
                id TEXT PRIMARY KEY,
                tarih TEXT NOT NULL,
                tedarikci_id TEXT DEFAULT '',
                tedarikci_adi TEXT DEFAULT '',
                akaryakit_markasi TEXT DEFAULT '',
                cekici_plaka TEXT DEFAULT '',
                dorse_plaka TEXT DEFAULT '',
                sofor_adi TEXT DEFAULT '',
                sofor_soyadi TEXT DEFAULT '',
                miktar_litre REAL NOT NULL,
                miktar_kg REAL DEFAULT 0,
                kesafet REAL DEFAULT 0,
                kantar_kg REAL DEFAULT 0,
                birim_fiyat REAL NOT NULL,
                toplam_tutar REAL NOT NULL,
                fatura_no TEXT DEFAULT '',
                irsaliye_no TEXT DEFAULT '',
                odeme_durumu TEXT DEFAULT 'beklemede',
                vade_tarihi TEXT DEFAULT '',
                teslim_alan TEXT DEFAULT '',
                bosaltim_tesisi TEXT DEFAULT '',
                notlar TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_by_name TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Motorin Verme table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS motorin_verme (
                id TEXT PRIMARY KEY,
                tarih TEXT NOT NULL,
                bosaltim_tesisi TEXT DEFAULT '',
                arac_id TEXT NOT NULL,
                arac_plaka TEXT DEFAULT '',
                arac_bilgi TEXT DEFAULT '',
                miktar_litre REAL NOT NULL,
                kilometre REAL DEFAULT 0,
                sofor_id TEXT DEFAULT '',
                sofor_adi TEXT DEFAULT '',
                personel_id TEXT DEFAULT '',
                personel_adi TEXT DEFAULT '',
                notlar TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_by_name TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Motorin Stok table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS motorin_stok (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                toplam_alim REAL DEFAULT 0,
                toplam_verme REAL DEFAULT 0,
                mevcut_stok REAL DEFAULT 0,
                updated_at TEXT
            )
        ''')
        
        # Teklif Musteriler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS teklif_musteriler (
                id TEXT PRIMARY KEY,
                firma_adi TEXT NOT NULL,
                yetkili_kisi TEXT DEFAULT '',
                telefon TEXT DEFAULT '',
                email TEXT DEFAULT '',
                adres TEXT DEFAULT '',
                vergi_no TEXT DEFAULT '',
                vergi_dairesi TEXT DEFAULT '',
                notlar TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Teklifler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS teklifler (
                id TEXT PRIMARY KEY,
                teklif_no TEXT UNIQUE NOT NULL,
                teklif_turu TEXT DEFAULT 'bims',
                musteri_id TEXT DEFAULT '',
                musteri_adi TEXT DEFAULT '',
                musteri_adres TEXT DEFAULT '',
                musteri_vergi_no TEXT DEFAULT '',
                musteri_vergi_dairesi TEXT DEFAULT '',
                teklif_tarihi TEXT NOT NULL,
                gecerlilik_tarihi TEXT DEFAULT '',
                konu TEXT DEFAULT '',
                kalemler TEXT DEFAULT '[]',
                ara_toplam REAL DEFAULT 0,
                toplam_iskonto REAL DEFAULT 0,
                toplam_kdv REAL DEFAULT 0,
                genel_toplam REAL DEFAULT 0,
                para_birimi TEXT DEFAULT 'TRY',
                odeme_kosullari TEXT DEFAULT '',
                teslim_suresi TEXT DEFAULT '',
                notlar TEXT DEFAULT '',
                durum TEXT DEFAULT 'taslak',
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_by_name TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Teklif Urunler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS teklif_urunler (
                id TEXT PRIMARY KEY,
                urun_adi TEXT NOT NULL,
                aciklama TEXT DEFAULT '',
                birim TEXT DEFAULT 'adet',
                birim_fiyat REAL DEFAULT 0,
                kdv_orani REAL DEFAULT 20,
                aktif INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # BIMS Urunler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS bims_urunler (
                id TEXT PRIMARY KEY,
                urun_adi TEXT NOT NULL,
                birim TEXT DEFAULT 'adet',
                birim_fiyat REAL DEFAULT 0,
                aciklama TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Parke Urunler table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS parke_urunler (
                id TEXT PRIMARY KEY,
                urun_adi TEXT NOT NULL,
                birim TEXT DEFAULT 'm²',
                birim_fiyat REAL DEFAULT 0,
                ebat TEXT DEFAULT '',
                renk TEXT DEFAULT '',
                aciklama TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        
        # Migration: Add new columns to molds table if they don't exist
        try:
            await db.execute("ALTER TABLE molds ADD COLUMN product_id TEXT DEFAULT ''")
        except:
            pass
        try:
            await db.execute("ALTER TABLE molds ADD COLUMN product_name TEXT DEFAULT ''")
        except:
            pass
        for i in range(1, 11):
            try:
                await db.execute(f"ALTER TABLE molds ADD COLUMN kalip_no_{i} TEXT DEFAULT ''")
            except:
                pass
            try:
                await db.execute(f"ALTER TABLE molds ADD COLUMN duvar_kalinlik_{i} TEXT DEFAULT ''")
            except:
                pass
            try:
                await db.execute(f"ALTER TABLE molds ADD COLUMN makina_cinsi_{i} TEXT DEFAULT ''")
            except:
                pass
        
        # Migration: Add bosaltim_isletmesi to cimento_giris
        try:
            await db.execute("ALTER TABLE cimento_giris ADD COLUMN bosaltim_isletmesi TEXT DEFAULT ''")
        except:
            pass
        
        await db.commit()

def row_to_dict(row):
    """Convert SQLite Row to dictionary"""
    if row is None:
        return None
    return dict(row)

def rows_to_list(rows):
    """Convert list of SQLite Rows to list of dictionaries"""
    return [dict(row) for row in rows]

# Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"
    permissions: List[str] = ["bims"]

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: str = "user"
    permissions: List[str] = []
    created_at: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProductCreate(BaseModel):
    name: str
    unit: str = "adet"
    sira_no: int = 0
    sevk_agirligi: float = 0
    adet_basi_cimento: float = 0
    paket_adet_7_boy: int = 0
    paket_adet_5_boy: int = 0
    uretim_palet_adetleri: dict = {}
    paket_adetleri_7_boy: dict = {}
    paket_adetleri_5_boy: dict = {}

class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    unit: str
    sira_no: Optional[int] = 0
    sevk_agirligi: Optional[float] = 0
    adet_basi_cimento: Optional[float] = 0
    harcanan_hisir: Optional[float] = 0
    paket_adet_7_boy: Optional[int] = 0
    paket_adet_5_boy: Optional[int] = 0
    uretim_palet_adetleri: Optional[dict] = {}
    paket_adetleri_7_boy: Optional[dict] = {}
    paket_adetleri_5_boy: Optional[dict] = {}
    created_at: str

class DepartmentCreate(BaseModel):
    name: str

class DepartmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    created_at: str

class OperatorCreate(BaseModel):
    name: str
    employee_id: Optional[str] = None

class OperatorResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    employee_id: Optional[str]
    created_at: str

class MoldCreate(BaseModel):
    mold_no: str
    description: Optional[str] = None
    product_id: Optional[str] = ''
    product_name: Optional[str] = ''
    kalip_no_1: Optional[str] = ''
    kalip_no_2: Optional[str] = ''
    kalip_no_3: Optional[str] = ''
    kalip_no_4: Optional[str] = ''
    kalip_no_5: Optional[str] = ''
    kalip_no_6: Optional[str] = ''
    kalip_no_7: Optional[str] = ''
    kalip_no_8: Optional[str] = ''
    kalip_no_9: Optional[str] = ''
    kalip_no_10: Optional[str] = ''
    duvar_kalinlik_1: Optional[str] = ''
    duvar_kalinlik_2: Optional[str] = ''
    duvar_kalinlik_3: Optional[str] = ''
    duvar_kalinlik_4: Optional[str] = ''
    duvar_kalinlik_5: Optional[str] = ''
    duvar_kalinlik_6: Optional[str] = ''
    duvar_kalinlik_7: Optional[str] = ''
    duvar_kalinlik_8: Optional[str] = ''
    duvar_kalinlik_9: Optional[str] = ''
    duvar_kalinlik_10: Optional[str] = ''
    makina_cinsi_1: Optional[str] = ''
    makina_cinsi_2: Optional[str] = ''
    makina_cinsi_3: Optional[str] = ''
    makina_cinsi_4: Optional[str] = ''
    makina_cinsi_5: Optional[str] = ''
    makina_cinsi_6: Optional[str] = ''
    makina_cinsi_7: Optional[str] = ''
    makina_cinsi_8: Optional[str] = ''
    makina_cinsi_9: Optional[str] = ''
    makina_cinsi_10: Optional[str] = ''

class MoldResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    mold_no: str
    description: Optional[str]
    product_id: Optional[str] = ''
    product_name: Optional[str] = ''
    kalip_no_1: Optional[str] = ''
    kalip_no_2: Optional[str] = ''
    kalip_no_3: Optional[str] = ''
    kalip_no_4: Optional[str] = ''
    kalip_no_5: Optional[str] = ''
    kalip_no_6: Optional[str] = ''
    kalip_no_7: Optional[str] = ''
    kalip_no_8: Optional[str] = ''
    kalip_no_9: Optional[str] = ''
    kalip_no_10: Optional[str] = ''
    duvar_kalinlik_1: Optional[str] = ''
    duvar_kalinlik_2: Optional[str] = ''
    duvar_kalinlik_3: Optional[str] = ''
    duvar_kalinlik_4: Optional[str] = ''
    duvar_kalinlik_5: Optional[str] = ''
    duvar_kalinlik_6: Optional[str] = ''
    duvar_kalinlik_7: Optional[str] = ''
    duvar_kalinlik_8: Optional[str] = ''
    duvar_kalinlik_9: Optional[str] = ''
    duvar_kalinlik_10: Optional[str] = ''
    makina_cinsi_1: Optional[str] = ''
    makina_cinsi_2: Optional[str] = ''
    makina_cinsi_3: Optional[str] = ''
    makina_cinsi_4: Optional[str] = ''
    makina_cinsi_5: Optional[str] = ''
    makina_cinsi_6: Optional[str] = ''
    makina_cinsi_7: Optional[str] = ''
    makina_cinsi_8: Optional[str] = ''
    makina_cinsi_9: Optional[str] = ''
    makina_cinsi_10: Optional[str] = ''
    created_at: str

# BIMS Stok Modeli
class BimsStokUrunCreate(BaseModel):
    urun_adi: str
    birim: str = "adet"
    aciklama: str = ""
    acilis_miktari: float = 0
    acilis_tarihi: str = ""

class BimsStokUrunUpdate(BaseModel):
    urun_adi: Optional[str] = None
    birim: Optional[str] = None
    aciklama: Optional[str] = None
    acilis_miktari: Optional[float] = None
    acilis_tarihi: Optional[str] = None

class BimsStokHareketCreate(BaseModel):
    urun_id: str
    urun_adi: str = ""
    hareket_tipi: str
    miktar: float
    tarih: str
    aciklama: str = ""

# Çimento Modülü Modelleri
class CimentoFirmaCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class CimentoFirmaResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    notes: Optional[str]
    created_at: str

class NakliyeciFirmaCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class NakliyeciFirmaResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    notes: Optional[str]
    created_at: str

class PlakaCreate(BaseModel):
    plaka: str
    vehicle_type: Optional[str] = None
    nakliyeci_id: Optional[str] = None
    nakliyeci_name: Optional[str] = None
    notes: Optional[str] = None

class PlakaResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    plaka: str
    vehicle_type: Optional[str]
    nakliyeci_id: Optional[str]
    nakliyeci_name: Optional[str]
    notes: Optional[str]
    created_at: str

class SoforCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    license_no: Optional[str] = None
    nakliyeci_id: Optional[str] = None
    nakliyeci_name: Optional[str] = None
    notes: Optional[str] = None

class SoforResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: Optional[str]
    license_no: Optional[str]
    nakliyeci_id: Optional[str]
    nakliyeci_name: Optional[str]
    notes: Optional[str]
    created_at: str

class SehirCreate(BaseModel):
    name: str
    code: Optional[str] = None

class SehirResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    code: Optional[str]
    created_at: str

class ProductionRecordCreate(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit: str = "adet"
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    shift: Optional[str] = None
    notes: Optional[str] = None
    module: str = "bims"
    production_date: Optional[str] = None
    shift_type: Optional[str] = None
    shift_number: Optional[str] = None
    worked_hours: Optional[float] = None
    required_hours: Optional[float] = None
    product_type: Optional[str] = None
    mold_no: Optional[str] = None
    strip_used: Optional[str] = None
    pallet_count: Optional[int] = None
    pallet_quantity: Optional[int] = None
    waste: Optional[int] = None
    pieces_per_pallet: Optional[int] = None
    mix_count: Optional[int] = None
    cement_in_mix: Optional[float] = None
    machine_cement: Optional[float] = None
    product_to_field: Optional[int] = None
    product_length: Optional[float] = None
    breakdown_1: Optional[str] = None
    breakdown_2: Optional[str] = None
    breakdown_3: Optional[str] = None
    paket_7_boy: Optional[int] = None
    paket_5_boy: Optional[int] = None

class ProductionRecordUpdate(BaseModel):
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    shift: Optional[str] = None
    notes: Optional[str] = None
    module: Optional[str] = None
    production_date: Optional[str] = None
    shift_type: Optional[str] = None
    shift_number: Optional[str] = None
    worked_hours: Optional[float] = None
    required_hours: Optional[float] = None
    product_type: Optional[str] = None
    mold_no: Optional[str] = None
    strip_used: Optional[str] = None
    pallet_count: Optional[int] = None
    pallet_quantity: Optional[int] = None
    waste: Optional[int] = None
    pieces_per_pallet: Optional[int] = None
    mix_count: Optional[int] = None
    cement_in_mix: Optional[float] = None
    machine_cement: Optional[float] = None
    product_to_field: Optional[int] = None
    product_length: Optional[float] = None
    breakdown_1: Optional[str] = None
    breakdown_2: Optional[str] = None
    breakdown_3: Optional[str] = None
    paket_7_boy: Optional[int] = None
    paket_5_boy: Optional[int] = None

class ProductionRecordResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    product_id: str
    product_name: str
    quantity: int
    unit: str
    department_id: Optional[str]
    department_name: Optional[str]
    operator_id: Optional[str]
    operator_name: Optional[str]
    shift: Optional[str]
    notes: Optional[str]
    user_id: str
    user_name: str
    module: str
    created_at: str
    updated_at: str
    production_date: Optional[str] = None
    shift_type: Optional[str] = None
    shift_number: Optional[str] = None
    worked_hours: Optional[float] = None
    required_hours: Optional[float] = None
    product_type: Optional[str] = None
    mold_no: Optional[str] = None
    strip_used: Optional[str] = None
    pallet_count: Optional[int] = None
    pallet_quantity: Optional[int] = None
    waste: Optional[int] = None
    pieces_per_pallet: Optional[int] = None
    mix_count: Optional[int] = None
    cement_in_mix: Optional[float] = None
    machine_cement: Optional[float] = None
    product_to_field: Optional[int] = None
    product_length: Optional[float] = None
    breakdown_1: Optional[str] = None
    breakdown_2: Optional[str] = None
    breakdown_3: Optional[str] = None
    paket_7_boy: Optional[int] = None
    paket_5_boy: Optional[int] = None

class DashboardStats(BaseModel):
    total_records: int
    today_production: int
    week_production: int
    month_production: int
    recent_records: List[ProductionRecordResponse]

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_id():
    return str(datetime.now(timezone.utc).timestamp()).replace(".", "")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        db = await get_db()
        async with db.execute("SELECT * FROM users WHERE email = ?", (email,)) as cursor:
            row = await cursor.fetchone()
        await db.close()
        
        if row is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        user = row_to_dict(row)
        user['permissions'] = json.loads(user.get('permissions', '["bims"]'))
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    db = await get_db()
    
    # Check if user exists
    async with db.execute("SELECT id FROM users WHERE email = ?", (user_data.email,)) as cursor:
        existing = await cursor.fetchone()
    if existing:
        await db.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is the first user
    async with db.execute("SELECT COUNT(*) FROM users") as cursor:
        row = await cursor.fetchone()
        user_count = row[0]
    is_first_user = user_count == 0
    
    # Create user
    user_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    role = "admin" if is_first_user else user_data.role
    permissions = ["bims", "cimento", "parke", "araclar", "personel", "motorin"] if is_first_user else user_data.permissions
    
    await db.execute(
        "INSERT INTO users (id, name, email, password, role, permissions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, user_data.name, user_data.email, hash_password(user_data.password), role, json.dumps(permissions), created_at)
    )
    await db.commit()
    await db.close()
    
    access_token = create_access_token({"sub": user_data.email})
    
    user_response = UserResponse(
        id=user_id,
        name=user_data.name,
        email=user_data.email,
        role=role,
        permissions=permissions,
        created_at=created_at
    )
    
    return Token(access_token=access_token, user=user_response)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    db = await get_db()
    async with db.execute("SELECT * FROM users WHERE email = ?", (credentials.email,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = row_to_dict(row)
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": credentials.email})
    permissions = json.loads(user.get('permissions', '["bims"]'))
    
    user_response = UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user.get("role", "user"),
        permissions=permissions,
        created_at=user["created_at"]
    )
    
    return Token(access_token=access_token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user.get("role", "user"),
        permissions=current_user.get("permissions", ["bims"]),
        created_at=current_user["created_at"]
    )

# Admin routes
async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(require_admin)):
    db = await get_db()
    async with db.execute("SELECT id, name, email, role, permissions, created_at FROM users ORDER BY created_at DESC") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    result = []
    for row in rows:
        u = row_to_dict(row)
        u['permissions'] = json.loads(u.get('permissions', '["bims"]'))
        result.append(UserResponse(**u))
    return result

@api_router.post("/admin/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_admin)):
    db = await get_db()
    
    async with db.execute("SELECT id FROM users WHERE email = ?", (user_data.email,)) as cursor:
        existing = await cursor.fetchone()
    if existing:
        await db.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO users (id, name, email, password, role, permissions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, user_data.name, user_data.email, hash_password(user_data.password), user_data.role, json.dumps(user_data.permissions), created_at)
    )
    await db.commit()
    await db.close()
    
    return UserResponse(
        id=user_id,
        name=user_data.name,
        email=user_data.email,
        role=user_data.role,
        permissions=user_data.permissions,
        created_at=created_at
    )

@api_router.put("/admin/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update_data: UserUpdate, current_user: dict = Depends(require_admin)):
    db = await get_db()
    
    async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cursor:
        row = await cursor.fetchone()
    if not row:
        await db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    user = row_to_dict(row)
    
    updates = []
    params = []
    if update_data.name is not None:
        updates.append("name = ?")
        params.append(update_data.name)
    if update_data.role is not None:
        updates.append("role = ?")
        params.append(update_data.role)
    if update_data.permissions is not None:
        updates.append("permissions = ?")
        params.append(json.dumps(update_data.permissions))
    
    if updates:
        params.append(user_id)
        await db.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        await db.commit()
    
    async with db.execute("SELECT id, name, email, role, permissions, created_at FROM users WHERE id = ?", (user_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    u = row_to_dict(row)
    u['permissions'] = json.loads(u.get('permissions', '["bims"]'))
    return UserResponse(**u)

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    db = await get_db()
    cursor = await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
    await db.commit()
    await db.close()
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted"}

# Product routes
@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    harcanan_hisir = product.sevk_agirligi - product.adet_basi_cimento
    product_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """INSERT INTO products (id, name, unit, sira_no, sevk_agirligi, adet_basi_cimento, harcanan_hisir, 
           paket_adet_7_boy, paket_adet_5_boy, uretim_palet_adetleri, paket_adetleri_7_boy, paket_adetleri_5_boy, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (product_id, product.name, product.unit, product.sira_no, product.sevk_agirligi, product.adet_basi_cimento,
         harcanan_hisir, product.paket_adet_7_boy, product.paket_adet_5_boy, 
         json.dumps(product.uretim_palet_adetleri), json.dumps(product.paket_adetleri_7_boy),
         json.dumps(product.paket_adetleri_5_boy), created_at)
    )
    
    # Otomatik olarak stoka da ekle
    stok_id = product_id + "_stok"
    await db.execute(
        """INSERT INTO bims_stok_urunler (id, urun_adi, birim, aciklama, acilis_miktari, acilis_tarihi, mevcut_stok, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (stok_id, product.name, product.unit, "", 0, datetime.now().strftime('%Y-%m-%d'), 0, created_at)
    )
    
    await db.commit()
    await db.close()
    
    return ProductResponse(
        id=product_id, name=product.name, unit=product.unit, sira_no=product.sira_no, sevk_agirligi=product.sevk_agirligi,
        adet_basi_cimento=product.adet_basi_cimento, harcanan_hisir=harcanan_hisir,
        paket_adet_7_boy=product.paket_adet_7_boy, paket_adet_5_boy=product.paket_adet_5_boy,
        uretim_palet_adetleri=product.uretim_palet_adetleri, 
        paket_adetleri_7_boy=product.paket_adetleri_7_boy,
        paket_adetleri_5_boy=product.paket_adetleri_5_boy,
        created_at=created_at
    )

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM products ORDER BY sira_no ASC, name ASC") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    result = []
    for row in rows:
        p = row_to_dict(row)
        p['uretim_palet_adetleri'] = json.loads(p.get('uretim_palet_adetleri', '{}'))
        p['paket_adetleri_7_boy'] = json.loads(p.get('paket_adetleri_7_boy', '{}'))
        p['paket_adetleri_5_boy'] = json.loads(p.get('paket_adetleri_5_boy', '{}'))
        result.append(ProductResponse(**p))
    return result

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT id FROM products WHERE id = ?", (product_id,)) as cursor:
        existing = await cursor.fetchone()
    if not existing:
        await db.close()
        raise HTTPException(status_code=404, detail="Product not found")
    
    harcanan_hisir = product.sevk_agirligi - product.adet_basi_cimento
    updated_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """UPDATE products SET name=?, unit=?, sira_no=?, sevk_agirligi=?, adet_basi_cimento=?, harcanan_hisir=?,
           paket_adet_7_boy=?, paket_adet_5_boy=?, uretim_palet_adetleri=?, paket_adetleri_7_boy=?, paket_adetleri_5_boy=?, updated_at=? WHERE id=?""",
        (product.name, product.unit, product.sira_no, product.sevk_agirligi, product.adet_basi_cimento, harcanan_hisir,
         product.paket_adet_7_boy, product.paket_adet_5_boy, json.dumps(product.uretim_palet_adetleri),
         json.dumps(product.paket_adetleri_7_boy), json.dumps(product.paket_adetleri_5_boy),
         updated_at, product_id)
    )
    
    # Stok adını da güncelle
    stok_id = product_id + "_stok"
    await db.execute("UPDATE bims_stok_urunler SET urun_adi=?, birim=? WHERE id=?", (product.name, product.unit, stok_id))
    
    await db.commit()
    
    async with db.execute("SELECT * FROM products WHERE id = ?", (product_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    p = row_to_dict(row)
    p['uretim_palet_adetleri'] = json.loads(p.get('uretim_palet_adetleri', '{}'))
    p['paket_adetleri_7_boy'] = json.loads(p.get('paket_adetleri_7_boy', '{}'))
    p['paket_adetleri_5_boy'] = json.loads(p.get('paket_adetleri_5_boy', '{}'))
    return ProductResponse(**p)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM products WHERE id = ?", (product_id,))
    await db.execute("DELETE FROM bims_stok_urunler WHERE id = ?", (product_id + "_stok",))
    await db.commit()
    await db.close()
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# =====================================================
# BIMS STOK API'LERİ
# =====================================================

@api_router.post("/bims-stok-urunler")
async def create_bims_stok_urun(input: BimsStokUrunCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    stok_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    mevcut_stok = input.acilis_miktari
    
    await db.execute(
        """INSERT INTO bims_stok_urunler (id, urun_adi, birim, aciklama, acilis_miktari, acilis_tarihi, mevcut_stok, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (stok_id, input.urun_adi, input.birim, input.aciklama, input.acilis_miktari, input.acilis_tarihi, mevcut_stok, created_at)
    )
    
    # Açılış fişi hareketi
    if input.acilis_miktari > 0:
        hareket_id = generate_id() + "h"
        hareket_tarih = input.acilis_tarihi or datetime.now().strftime('%Y-%m-%d')
        await db.execute(
            """INSERT INTO bims_stok_hareketler (id, urun_id, urun_adi, hareket_tipi, miktar, tarih, aciklama, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (hareket_id, stok_id, input.urun_adi, 'acilis', input.acilis_miktari, hareket_tarih, 'Açılış fişi', created_at)
        )
    
    await db.commit()
    await db.close()
    
    return {
        "id": stok_id, "urun_adi": input.urun_adi, "birim": input.birim, "aciklama": input.aciklama,
        "acilis_miktari": input.acilis_miktari, "acilis_tarihi": input.acilis_tarihi,
        "mevcut_stok": mevcut_stok, "created_at": created_at
    }

@api_router.get("/bims-stok-urunler")
async def get_bims_stok_urunler(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM bims_stok_urunler ORDER BY urun_adi") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.get("/bims-stok-urunler/{id}")
async def get_bims_stok_urun(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM bims_stok_urunler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Stok ürün bulunamadı")
    return row_to_dict(row)

@api_router.put("/bims-stok-urunler/{id}")
async def update_bims_stok_urun(id: str, input: BimsStokUrunUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT * FROM bims_stok_urunler WHERE id = ?", (id,)) as cursor:
        existing = await cursor.fetchone()
    if not existing:
        await db.close()
        raise HTTPException(status_code=404, detail="Stok ürün bulunamadı")
    
    updates = []
    params = []
    for field, value in input.model_dump().items():
        if value is not None:
            updates.append(f"{field} = ?")
            params.append(value)
    
    if updates:
        updates.append("updated_at = ?")
        params.append(datetime.now(timezone.utc).isoformat())
        params.append(id)
        await db.execute(f"UPDATE bims_stok_urunler SET {', '.join(updates)} WHERE id = ?", params)
        await db.commit()
    
    async with db.execute("SELECT * FROM bims_stok_urunler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    return row_to_dict(row)

@api_router.delete("/bims-stok-urunler/{id}")
async def delete_bims_stok_urun(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM bims_stok_urunler WHERE id = ?", (id,))
    await db.execute("DELETE FROM bims_stok_hareketler WHERE urun_id = ?", (id,))
    await db.commit()
    await db.close()
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Stok ürün bulunamadı")
    return {"message": "Stok ürün silindi"}

# Stok Hareketleri
@api_router.post("/bims-stok-hareketler")
async def create_bims_stok_hareket(input: BimsStokHareketCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT * FROM bims_stok_urunler WHERE id = ?", (input.urun_id,)) as cursor:
        urun_row = await cursor.fetchone()
    if not urun_row:
        await db.close()
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    urun = row_to_dict(urun_row)
    hareket_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """INSERT INTO bims_stok_hareketler (id, urun_id, urun_adi, hareket_tipi, miktar, tarih, aciklama, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (hareket_id, input.urun_id, urun['urun_adi'], input.hareket_tipi, input.miktar, input.tarih, input.aciklama, created_at)
    )
    
    # Stok güncelle
    mevcut_stok = urun.get('mevcut_stok', 0)
    if input.hareket_tipi in ['giris', 'acilis']:
        yeni_stok = mevcut_stok + input.miktar
    else:
        yeni_stok = mevcut_stok - input.miktar
    
    await db.execute(
        "UPDATE bims_stok_urunler SET mevcut_stok = ?, updated_at = ? WHERE id = ?",
        (yeni_stok, created_at, input.urun_id)
    )
    
    await db.commit()
    await db.close()
    
    return {
        "id": hareket_id, "urun_id": input.urun_id, "urun_adi": urun['urun_adi'],
        "hareket_tipi": input.hareket_tipi, "miktar": input.miktar, "tarih": input.tarih,
        "aciklama": input.aciklama, "created_at": created_at
    }

@api_router.get("/bims-stok-hareketler")
async def get_bims_stok_hareketler(urun_id: str = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    if urun_id:
        async with db.execute("SELECT * FROM bims_stok_hareketler WHERE urun_id = ? ORDER BY created_at DESC", (urun_id,)) as cursor:
            rows = await cursor.fetchall()
    else:
        async with db.execute("SELECT * FROM bims_stok_hareketler ORDER BY created_at DESC") as cursor:
            rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.delete("/bims-stok-hareketler/{id}")
async def delete_bims_stok_hareket(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT * FROM bims_stok_hareketler WHERE id = ?", (id,)) as cursor:
        hareket_row = await cursor.fetchone()
    if not hareket_row:
        await db.close()
        raise HTTPException(status_code=404, detail="Hareket bulunamadı")
    
    hareket = row_to_dict(hareket_row)
    
    # Stok geri al
    async with db.execute("SELECT mevcut_stok FROM bims_stok_urunler WHERE id = ?", (hareket['urun_id'],)) as cursor:
        urun_row = await cursor.fetchone()
    
    if urun_row:
        mevcut_stok = urun_row[0] or 0
        if hareket['hareket_tipi'] in ['giris', 'acilis']:
            yeni_stok = mevcut_stok - hareket['miktar']
        else:
            yeni_stok = mevcut_stok + hareket['miktar']
        
        await db.execute(
            "UPDATE bims_stok_urunler SET mevcut_stok = ?, updated_at = ? WHERE id = ?",
            (yeni_stok, datetime.now(timezone.utc).isoformat(), hareket['urun_id'])
        )
    
    await db.execute("DELETE FROM bims_stok_hareketler WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    return {"message": "Hareket silindi"}

# Stok Özeti
@api_router.get("/bims-stok-ozet")
async def get_bims_stok_ozet(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM bims_stok_urunler") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    urunler = rows_to_list(rows)
    toplam_urun = len(urunler)
    toplam_stok = sum([u.get('mevcut_stok', 0) for u in urunler])
    dusuk_stok = len([u for u in urunler if u.get('mevcut_stok', 0) < 10])
    
    return {
        "toplam_urun": toplam_urun,
        "toplam_stok": toplam_stok,
        "dusuk_stok": dusuk_stok
    }

# Department routes
@api_router.post("/departments", response_model=DepartmentResponse)
async def create_department(department: DepartmentCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    dept_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute("INSERT INTO departments (id, name, created_at) VALUES (?, ?, ?)", (dept_id, department.name, created_at))
    await db.commit()
    await db.close()
    
    return DepartmentResponse(id=dept_id, name=department.name, created_at=created_at)

@api_router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM departments ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return [DepartmentResponse(**row_to_dict(row)) for row in rows]

@api_router.delete("/departments/{department_id}")
async def delete_department(department_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM departments WHERE id = ?", (department_id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department deleted"}

# Operator routes
@api_router.post("/operators", response_model=OperatorResponse)
async def create_operator(operator: OperatorCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    op_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute("INSERT INTO operators (id, name, employee_id, created_at) VALUES (?, ?, ?, ?)",
                     (op_id, operator.name, operator.employee_id, created_at))
    await db.commit()
    await db.close()
    
    return OperatorResponse(id=op_id, name=operator.name, employee_id=operator.employee_id, created_at=created_at)

@api_router.get("/operators", response_model=List[OperatorResponse])
async def get_operators(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM operators ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return [OperatorResponse(**row_to_dict(row)) for row in rows]

@api_router.delete("/operators/{operator_id}")
async def delete_operator(operator_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM operators WHERE id = ?", (operator_id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Operator not found")
    return {"message": "Operator deleted"}

# Mold routes
@api_router.post("/molds", response_model=MoldResponse)
async def create_mold(mold: MoldCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    mold_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute("""
        INSERT INTO molds (id, mold_no, description, product_id, product_name, 
                          kalip_no_1, kalip_no_2, kalip_no_3, kalip_no_4, kalip_no_5,
                          kalip_no_6, kalip_no_7, kalip_no_8, kalip_no_9, kalip_no_10,
                          duvar_kalinlik_1, duvar_kalinlik_2, duvar_kalinlik_3, duvar_kalinlik_4, duvar_kalinlik_5,
                          duvar_kalinlik_6, duvar_kalinlik_7, duvar_kalinlik_8, duvar_kalinlik_9, duvar_kalinlik_10,
                          makina_cinsi_1, makina_cinsi_2, makina_cinsi_3, makina_cinsi_4, makina_cinsi_5,
                          makina_cinsi_6, makina_cinsi_7, makina_cinsi_8, makina_cinsi_9, makina_cinsi_10,
                          created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (mold_id, mold.mold_no, mold.description, mold.product_id, mold.product_name,
         mold.kalip_no_1, mold.kalip_no_2, mold.kalip_no_3, mold.kalip_no_4, mold.kalip_no_5,
         mold.kalip_no_6, mold.kalip_no_7, mold.kalip_no_8, mold.kalip_no_9, mold.kalip_no_10,
         mold.duvar_kalinlik_1, mold.duvar_kalinlik_2, mold.duvar_kalinlik_3, mold.duvar_kalinlik_4, mold.duvar_kalinlik_5,
         mold.duvar_kalinlik_6, mold.duvar_kalinlik_7, mold.duvar_kalinlik_8, mold.duvar_kalinlik_9, mold.duvar_kalinlik_10,
         mold.makina_cinsi_1, mold.makina_cinsi_2, mold.makina_cinsi_3, mold.makina_cinsi_4, mold.makina_cinsi_5,
         mold.makina_cinsi_6, mold.makina_cinsi_7, mold.makina_cinsi_8, mold.makina_cinsi_9, mold.makina_cinsi_10,
         created_at))
    await db.commit()
    await db.close()
    
    return MoldResponse(**{
        'id': mold_id, 'mold_no': mold.mold_no, 'description': mold.description,
        'product_id': mold.product_id, 'product_name': mold.product_name,
        **{f'kalip_no_{i}': getattr(mold, f'kalip_no_{i}') for i in range(1, 11)},
        **{f'duvar_kalinlik_{i}': getattr(mold, f'duvar_kalinlik_{i}') for i in range(1, 11)},
        **{f'makina_cinsi_{i}': getattr(mold, f'makina_cinsi_{i}') for i in range(1, 11)},
        'created_at': created_at
    })

@api_router.get("/molds", response_model=List[MoldResponse])
async def get_molds(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM molds ORDER BY product_name, mold_no") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return [MoldResponse(**row_to_dict(row)) for row in rows]

@api_router.put("/molds/{mold_id}", response_model=MoldResponse)
async def update_mold(mold_id: str, mold: MoldCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    await db.execute("""
        UPDATE molds SET mold_no=?, description=?, product_id=?, product_name=?,
                        kalip_no_1=?, kalip_no_2=?, kalip_no_3=?, kalip_no_4=?, kalip_no_5=?,
                        kalip_no_6=?, kalip_no_7=?, kalip_no_8=?, kalip_no_9=?, kalip_no_10=?,
                        duvar_kalinlik_1=?, duvar_kalinlik_2=?, duvar_kalinlik_3=?, duvar_kalinlik_4=?, duvar_kalinlik_5=?,
                        duvar_kalinlik_6=?, duvar_kalinlik_7=?, duvar_kalinlik_8=?, duvar_kalinlik_9=?, duvar_kalinlik_10=?,
                        makina_cinsi_1=?, makina_cinsi_2=?, makina_cinsi_3=?, makina_cinsi_4=?, makina_cinsi_5=?,
                        makina_cinsi_6=?, makina_cinsi_7=?, makina_cinsi_8=?, makina_cinsi_9=?, makina_cinsi_10=?
        WHERE id=?""",
        (mold.mold_no, mold.description, mold.product_id, mold.product_name,
         mold.kalip_no_1, mold.kalip_no_2, mold.kalip_no_3, mold.kalip_no_4, mold.kalip_no_5,
         mold.kalip_no_6, mold.kalip_no_7, mold.kalip_no_8, mold.kalip_no_9, mold.kalip_no_10,
         mold.duvar_kalinlik_1, mold.duvar_kalinlik_2, mold.duvar_kalinlik_3, mold.duvar_kalinlik_4, mold.duvar_kalinlik_5,
         mold.duvar_kalinlik_6, mold.duvar_kalinlik_7, mold.duvar_kalinlik_8, mold.duvar_kalinlik_9, mold.duvar_kalinlik_10,
         mold.makina_cinsi_1, mold.makina_cinsi_2, mold.makina_cinsi_3, mold.makina_cinsi_4, mold.makina_cinsi_5,
         mold.makina_cinsi_6, mold.makina_cinsi_7, mold.makina_cinsi_8, mold.makina_cinsi_9, mold.makina_cinsi_10,
         mold_id))
    await db.commit()
    
    async with db.execute("SELECT * FROM molds WHERE id=?", (mold_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Mold not found")
    return MoldResponse(**row_to_dict(row))

@api_router.delete("/molds/{mold_id}")
async def delete_mold(mold_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM molds WHERE id = ?", (mold_id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Mold not found")
    return {"message": "Mold deleted"}

# ============ Çimento Modülü Kaynakları ============

# Çimento Firmaları
@api_router.post("/cimento-firmalar", response_model=CimentoFirmaResponse)
async def create_cimento_firma(firma: CimentoFirmaCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    firma_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO cimento_firmalar (id, name, contact_person, phone, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (firma_id, firma.name, firma.contact_person, firma.phone, firma.address, firma.notes, created_at)
    )
    await db.commit()
    await db.close()
    
    return CimentoFirmaResponse(id=firma_id, name=firma.name, contact_person=firma.contact_person,
                                 phone=firma.phone, address=firma.address, notes=firma.notes, created_at=created_at)

@api_router.get("/cimento-firmalar", response_model=List[CimentoFirmaResponse])
async def get_cimento_firmalar(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM cimento_firmalar ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return [CimentoFirmaResponse(**row_to_dict(row)) for row in rows]

@api_router.delete("/cimento-firmalar/{firma_id}")
async def delete_cimento_firma(firma_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM cimento_firmalar WHERE id = ?", (firma_id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Firma not found")
    return {"message": "Firma deleted"}

# Nakliyeci Firmaları
@api_router.post("/nakliyeci-firmalar", response_model=NakliyeciFirmaResponse)
async def create_nakliyeci_firma(firma: NakliyeciFirmaCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    firma_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO nakliyeci_firmalar (id, name, contact_person, phone, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (firma_id, firma.name, firma.contact_person, firma.phone, firma.address, firma.notes, created_at)
    )
    await db.commit()
    await db.close()
    
    return NakliyeciFirmaResponse(id=firma_id, name=firma.name, contact_person=firma.contact_person,
                                   phone=firma.phone, address=firma.address, notes=firma.notes, created_at=created_at)

@api_router.get("/nakliyeci-firmalar", response_model=List[NakliyeciFirmaResponse])
async def get_nakliyeci_firmalar(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM nakliyeci_firmalar ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return [NakliyeciFirmaResponse(**row_to_dict(row)) for row in rows]

@api_router.delete("/nakliyeci-firmalar/{firma_id}")
async def delete_nakliyeci_firma(firma_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM nakliyeci_firmalar WHERE id = ?", (firma_id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Firma not found")
    return {"message": "Firma deleted"}

# Plakalar
@api_router.post("/plakalar", response_model=PlakaResponse)
async def create_plaka(plaka: PlakaCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    plaka_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO plakalar (id, plaka, vehicle_type, nakliyeci_id, nakliyeci_name, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (plaka_id, plaka.plaka, plaka.vehicle_type, plaka.nakliyeci_id, plaka.nakliyeci_name, plaka.notes, created_at)
    )
    await db.commit()
    await db.close()
    
    return PlakaResponse(id=plaka_id, plaka=plaka.plaka, vehicle_type=plaka.vehicle_type,
                         nakliyeci_id=plaka.nakliyeci_id, nakliyeci_name=plaka.nakliyeci_name,
                         notes=plaka.notes, created_at=created_at)

@api_router.get("/plakalar", response_model=List[PlakaResponse])
async def get_plakalar(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM plakalar ORDER BY plaka") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return [PlakaResponse(**row_to_dict(row)) for row in rows]

@api_router.delete("/plakalar/{plaka_id}")
async def delete_plaka(plaka_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM plakalar WHERE id = ?", (plaka_id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Plaka not found")
    return {"message": "Plaka deleted"}

# Şoförler
@api_router.post("/soforler", response_model=SoforResponse)
async def create_sofor(sofor: SoforCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    sofor_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO soforler (id, name, phone, license_no, nakliyeci_id, nakliyeci_name, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (sofor_id, sofor.name, sofor.phone, sofor.license_no, sofor.nakliyeci_id, sofor.nakliyeci_name, sofor.notes, created_at)
    )
    await db.commit()
    await db.close()
    
    return SoforResponse(id=sofor_id, name=sofor.name, phone=sofor.phone, license_no=sofor.license_no,
                         nakliyeci_id=sofor.nakliyeci_id, nakliyeci_name=sofor.nakliyeci_name,
                         notes=sofor.notes, created_at=created_at)

@api_router.get("/soforler", response_model=List[SoforResponse])
async def get_soforler(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM soforler ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return [SoforResponse(**row_to_dict(row)) for row in rows]

@api_router.delete("/soforler/{sofor_id}")
async def delete_sofor(sofor_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM soforler WHERE id = ?", (sofor_id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Şoför not found")
    return {"message": "Şoför deleted"}

# Şehirler
@api_router.post("/sehirler", response_model=SehirResponse)
async def create_sehir(sehir: SehirCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    sehir_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute("INSERT INTO sehirler (id, name, code, created_at) VALUES (?, ?, ?, ?)",
                     (sehir_id, sehir.name, sehir.code, created_at))
    await db.commit()
    await db.close()
    
    return SehirResponse(id=sehir_id, name=sehir.name, code=sehir.code, created_at=created_at)

@api_router.get("/sehirler", response_model=List[SehirResponse])
async def get_sehirler(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM sehirler ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return [SehirResponse(**row_to_dict(row)) for row in rows]

@api_router.delete("/sehirler/{sehir_id}")
async def delete_sehir(sehir_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM sehirler WHERE id = ?", (sehir_id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Şehir not found")
    return {"message": "Şehir deleted"}

# Çimento Cinsleri
class CimentoCinsiCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CimentoCinsiResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    created_at: str

@api_router.post("/cimento-cinsleri", response_model=CimentoCinsiResponse)
async def create_cimento_cinsi(cins: CimentoCinsiCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cins_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute("INSERT INTO cimento_cinsleri (id, name, description, created_at) VALUES (?, ?, ?, ?)",
                     (cins_id, cins.name, cins.description, created_at))
    await db.commit()
    await db.close()
    
    return CimentoCinsiResponse(id=cins_id, name=cins.name, description=cins.description, created_at=created_at)

@api_router.get("/cimento-cinsleri", response_model=List[CimentoCinsiResponse])
async def get_cimento_cinsleri(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM cimento_cinsleri ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return [CimentoCinsiResponse(**row_to_dict(row)) for row in rows]

@api_router.delete("/cimento-cinsleri/{cins_id}")
async def delete_cimento_cinsi(cins_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM cimento_cinsleri WHERE id = ?", (cins_id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Çimento cinsi not found")
    return {"message": "Çimento cinsi deleted"}

# ============ ÇİMENTO İŞLETMELER API'LERİ ============

class CimentoIsletmeCreate(BaseModel):
    name: str
    adres: str = ""
    yetkili_kisi: str = ""
    telefon: str = ""
    acilis_stok_kg: float = 0
    acilis_tarihi: str = ""
    notlar: str = ""
    aktif: bool = True

class CimentoIsletmeUpdate(BaseModel):
    name: Optional[str] = None
    adres: Optional[str] = None
    yetkili_kisi: Optional[str] = None
    telefon: Optional[str] = None
    acilis_stok_kg: Optional[float] = None
    acilis_tarihi: Optional[str] = None
    notlar: Optional[str] = None
    aktif: Optional[bool] = None

@api_router.post("/cimento-isletmeler")
async def create_cimento_isletme(input: CimentoIsletmeCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    isletme_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    mevcut_stok = input.acilis_stok_kg
    
    await db.execute(
        """INSERT INTO cimento_isletmeler (id, name, adres, yetkili_kisi, telefon, acilis_stok_kg, 
           acilis_tarihi, mevcut_stok_kg, notlar, aktif, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (isletme_id, input.name, input.adres, input.yetkili_kisi, input.telefon, 
         input.acilis_stok_kg, input.acilis_tarihi, mevcut_stok, input.notlar, 
         1 if input.aktif else 0, created_at)
    )
    
    # Açılış fişi hareketi oluştur
    if input.acilis_stok_kg > 0:
        hareket_id = generate_id() + "h"
        hareket_tarih = input.acilis_tarihi or datetime.now().strftime('%Y-%m-%d')
        await db.execute(
            """INSERT INTO cimento_stok_hareketler (id, isletme_id, isletme_adi, hareket_tipi, 
               miktar_kg, tarih, aciklama, referans_id, referans_tip, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (hareket_id, isletme_id, input.name, 'acilis', input.acilis_stok_kg, 
             hareket_tarih, 'Açılış fişi', '', 'acilis', created_at)
        )
    
    await db.commit()
    
    async with db.execute("SELECT * FROM cimento_isletmeler WHERE id = ?", (isletme_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    return row_to_dict(row)

@api_router.get("/cimento-isletmeler")
async def get_cimento_isletmeler(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM cimento_isletmeler ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.get("/cimento-isletmeler/{id}")
async def get_cimento_isletme(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM cimento_isletmeler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="İşletme bulunamadı")
    return row_to_dict(row)

@api_router.put("/cimento-isletmeler/{id}")
async def update_cimento_isletme(id: str, input: CimentoIsletmeUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT * FROM cimento_isletmeler WHERE id = ?", (id,)) as cursor:
        existing_row = await cursor.fetchone()
    if not existing_row:
        await db.close()
        raise HTTPException(status_code=404, detail="İşletme bulunamadı")
    
    existing = row_to_dict(existing_row)
    old_acilis_stok = existing.get('acilis_stok_kg', 0) or 0
    
    updates = []
    params = []
    new_acilis_stok = None
    
    for field, value in input.model_dump().items():
        if value is not None:
            if field == 'aktif':
                updates.append(f"{field} = ?")
                params.append(1 if value else 0)
            elif field == 'acilis_stok_kg':
                new_acilis_stok = value
                updates.append(f"{field} = ?")
                params.append(value)
                # Mevcut stoku da güncelle (fark kadar)
                stok_fark = value - old_acilis_stok
                new_mevcut = (existing.get('mevcut_stok_kg', 0) or 0) + stok_fark
                updates.append("mevcut_stok_kg = ?")
                params.append(new_mevcut)
            else:
                updates.append(f"{field} = ?")
                params.append(value)
    
    if updates:
        updates.append("updated_at = ?")
        params.append(datetime.now(timezone.utc).isoformat())
        params.append(id)
        await db.execute(f"UPDATE cimento_isletmeler SET {', '.join(updates)} WHERE id = ?", params)
        await db.commit()
    
    async with db.execute("SELECT * FROM cimento_isletmeler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    return row_to_dict(row)

@api_router.delete("/cimento-isletmeler/{id}")
async def delete_cimento_isletme(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    # İlişkili stok hareketlerini de sil
    await db.execute("DELETE FROM cimento_stok_hareketler WHERE isletme_id = ?", (id,))
    cursor = await db.execute("DELETE FROM cimento_isletmeler WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="İşletme bulunamadı")
    return {"message": "İşletme silindi"}

# Çimento Stok Hareketleri
@api_router.get("/cimento-stok-hareketler")
async def get_cimento_stok_hareketler(isletme_id: str = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    if isletme_id:
        async with db.execute(
            "SELECT * FROM cimento_stok_hareketler WHERE isletme_id = ? ORDER BY created_at DESC", 
            (isletme_id,)
        ) as cursor:
            rows = await cursor.fetchall()
    else:
        async with db.execute("SELECT * FROM cimento_stok_hareketler ORDER BY created_at DESC") as cursor:
            rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

# İşletme bazlı stok özeti
@api_router.get("/cimento-isletme-stok-ozet")
async def get_cimento_isletme_stok_ozet(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM cimento_isletmeler WHERE aktif = 1") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    isletmeler = rows_to_list(rows)
    toplam_stok = sum(i.get('mevcut_stok_kg', 0) or 0 for i in isletmeler)
    
    return {
        "toplam_isletme": len(isletmeler),
        "toplam_stok_kg": toplam_stok,
        "toplam_stok_ton": round(toplam_stok / 1000, 2),
        "isletmeler": isletmeler
    }

# ============ Çimento Stok Raporu API'si ============
@api_router.get("/cimento-stok-raporu")
async def get_cimento_stok_raporu(
    baslangic_tarihi: str = None,
    bitis_tarihi: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    İşletme bazlı çimento stok raporu:
    - Açılış Stoku (cimento_isletmeler.acilis_stok_kg)
    - Gelen Tonaj (cimento_giris tablosundan bosaltim_isletmesi bazında)
    - Harcanan Tonaj (production_records.machine_cement department_name bazında)
    - Mevcut Stok = Açılış + Gelen - Harcanan
    """
    db = await get_db()
    
    # 1. Tüm işletmeleri al
    async with db.execute("SELECT * FROM cimento_isletmeler WHERE aktif = 1 ORDER BY name") as cursor:
        isletme_rows = await cursor.fetchall()
    isletmeler = rows_to_list(isletme_rows)
    
    # 2. Çimento giriş kayıtlarını al (tarih filtreli)
    giris_query = "SELECT bosaltim_isletmesi, SUM(giris_miktari) as toplam_giris FROM cimento_giris WHERE 1=1"
    params = []
    if baslangic_tarihi:
        giris_query += " AND bosaltim_tarihi >= ?"
        params.append(baslangic_tarihi)
    if bitis_tarihi:
        giris_query += " AND bosaltim_tarihi <= ?"
        params.append(bitis_tarihi)
    giris_query += " GROUP BY bosaltim_isletmesi"
    
    async with db.execute(giris_query, params) as cursor:
        giris_rows = await cursor.fetchall()
    giris_data = {row[0]: row[1] or 0 for row in giris_rows}
    
    # 3. Üretim kayıtlarından harcanan çimentoyu al (machine_cement, department_name bazında)
    harcanan_query = """
        SELECT department_name, SUM(COALESCE(machine_cement, 0)) as toplam_harcanan 
        FROM production_records WHERE 1=1
    """
    params2 = []
    if baslangic_tarihi:
        harcanan_query += " AND (production_date >= ? OR created_at >= ?)"
        params2.extend([baslangic_tarihi, baslangic_tarihi])
    if bitis_tarihi:
        harcanan_query += " AND (production_date <= ? OR created_at <= ?)"
        params2.extend([bitis_tarihi, bitis_tarihi])
    harcanan_query += " GROUP BY department_name"
    
    async with db.execute(harcanan_query, params2) as cursor:
        harcanan_rows = await cursor.fetchall()
    harcanan_data = {row[0]: row[1] or 0 for row in harcanan_rows}
    
    # 4. Günlük giriş detayları (tarih bazlı)
    gunluk_giris_query = """
        SELECT bosaltim_tarihi, bosaltim_isletmesi, SUM(giris_miktari) as toplam
        FROM cimento_giris WHERE 1=1
    """
    params3 = []
    if baslangic_tarihi:
        gunluk_giris_query += " AND bosaltim_tarihi >= ?"
        params3.append(baslangic_tarihi)
    if bitis_tarihi:
        gunluk_giris_query += " AND bosaltim_tarihi <= ?"
        params3.append(bitis_tarihi)
    gunluk_giris_query += " GROUP BY bosaltim_tarihi, bosaltim_isletmesi ORDER BY bosaltim_tarihi DESC"
    
    async with db.execute(gunluk_giris_query, params3) as cursor:
        gunluk_giris_rows = await cursor.fetchall()
    gunluk_giris = [{"tarih": r[0], "isletme": r[1], "miktar_ton": r[2]} for r in gunluk_giris_rows]
    
    # 5. Günlük harcanan detayları (tarih bazlı)
    gunluk_harcanan_query = """
        SELECT COALESCE(production_date, DATE(created_at)) as tarih, department_name, 
               SUM(COALESCE(machine_cement, 0)) as toplam
        FROM production_records WHERE 1=1
    """
    params4 = []
    if baslangic_tarihi:
        gunluk_harcanan_query += " AND (production_date >= ? OR created_at >= ?)"
        params4.extend([baslangic_tarihi, baslangic_tarihi])
    if bitis_tarihi:
        gunluk_harcanan_query += " AND (production_date <= ? OR created_at <= ?)"
        params4.extend([bitis_tarihi, bitis_tarihi])
    gunluk_harcanan_query += " GROUP BY tarih, department_name ORDER BY tarih DESC"
    
    async with db.execute(gunluk_harcanan_query, params4) as cursor:
        gunluk_harcanan_rows = await cursor.fetchall()
    gunluk_harcanan = [{"tarih": r[0], "isletme": r[1], "miktar_kg": r[2]} for r in gunluk_harcanan_rows]
    
    await db.close()
    
    # 6. İşletme bazlı özet hesapla
    isletme_ozet = []
    toplam_acilis = 0
    toplam_gelen = 0
    toplam_harcanan_toplam = 0
    toplam_mevcut = 0
    
    for isletme in isletmeler:
        isletme_adi = isletme.get('name', '')
        acilis_kg = isletme.get('acilis_stok_kg', 0) or 0
        
        # Gelen tonaj (TON olarak kaydedilmiş, KG'ye çevir)
        gelen_ton = giris_data.get(isletme_adi, 0)
        gelen_kg = gelen_ton * 1000  # TON -> KG
        
        # Harcanan (zaten KG)
        harcanan_kg = harcanan_data.get(isletme_adi, 0)
        
        # Mevcut stok hesapla
        mevcut_kg = acilis_kg + gelen_kg - harcanan_kg
        
        isletme_ozet.append({
            "id": isletme.get('id'),
            "isletme_adi": isletme_adi,
            "acilis_stok_kg": acilis_kg,
            "acilis_stok_ton": round(acilis_kg / 1000, 2),
            "gelen_kg": gelen_kg,
            "gelen_ton": round(gelen_kg / 1000, 2),
            "harcanan_kg": harcanan_kg,
            "harcanan_ton": round(harcanan_kg / 1000, 2),
            "mevcut_stok_kg": mevcut_kg,
            "mevcut_stok_ton": round(mevcut_kg / 1000, 2)
        })
        
        toplam_acilis += acilis_kg
        toplam_gelen += gelen_kg
        toplam_harcanan_toplam += harcanan_kg
        toplam_mevcut += mevcut_kg
    
    return {
        "toplam_ozet": {
            "toplam_acilis_kg": toplam_acilis,
            "toplam_acilis_ton": round(toplam_acilis / 1000, 2),
            "toplam_gelen_kg": toplam_gelen,
            "toplam_gelen_ton": round(toplam_gelen / 1000, 2),
            "toplam_harcanan_kg": toplam_harcanan_toplam,
            "toplam_harcanan_ton": round(toplam_harcanan_toplam / 1000, 2),
            "toplam_mevcut_kg": toplam_mevcut,
            "toplam_mevcut_ton": round(toplam_mevcut / 1000, 2)
        },
        "isletme_ozet": isletme_ozet,
        "gunluk_giris": gunluk_giris,
        "gunluk_harcanan": gunluk_harcanan,
        "filtreler": {
            "baslangic_tarihi": baslangic_tarihi,
            "bitis_tarihi": bitis_tarihi
        }
    }

# Uploads klasörü
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Dosya yükleme endpoint'i
@api_router.post("/upload-file")
async def upload_general_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "filename": unique_filename,
        "original_name": file.filename,
        "path": f"/api/files/{unique_filename}"
    }

# Dosya indirme/görüntüleme endpoint'i
@api_router.get("/files/{filename}")
async def get_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    media_types = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt': 'text/plain',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed'
    }
    media_type = media_types.get(ext, 'application/octet-stream')
    
    return FileResponse(file_path, media_type=media_type, filename=filename)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ Production Routes ============

@api_router.post("/production", response_model=ProductionRecordResponse)
async def create_production_record(record: ProductionRecordCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    record_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """INSERT INTO production_records (id, product_id, product_name, quantity, unit, department_id, department_name,
           operator_id, operator_name, shift, notes, module, user_id, user_name, created_at, updated_at,
           production_date, shift_type, shift_number, worked_hours, required_hours, product_type, mold_no,
           strip_used, pallet_count, pallet_quantity, waste, pieces_per_pallet, mix_count, cement_in_mix,
           machine_cement, product_to_field, product_length, breakdown_1, breakdown_2, breakdown_3)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (record_id, record.product_id, record.product_name, record.quantity, record.unit, record.department_id,
         record.department_name, record.operator_id, record.operator_name, record.shift, record.notes, record.module,
         current_user["id"], current_user["name"], created_at, created_at, record.production_date, record.shift_type,
         record.shift_number, record.worked_hours, record.required_hours, record.product_type, record.mold_no,
         record.strip_used, record.pallet_count, record.pallet_quantity, record.waste, record.pieces_per_pallet,
         record.mix_count, record.cement_in_mix, record.machine_cement, record.product_to_field, record.product_length,
         record.breakdown_1, record.breakdown_2, record.breakdown_3)
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM production_records WHERE id = ?", (record_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    return ProductionRecordResponse(**row_to_dict(row))

@api_router.get("/production", response_model=List[ProductionRecordResponse])
async def get_production_records(skip: int = 0, limit: int = 50, start_date: Optional[str] = None,
                                  end_date: Optional[str] = None, module: Optional[str] = None,
                                  current_user: dict = Depends(get_current_user)):
    db = await get_db()
    query = "SELECT * FROM production_records WHERE 1=1"
    params = []
    
    if module:
        query += " AND module = ?"
        params.append(module)
    if start_date:
        query += " AND created_at >= ?"
        params.append(start_date)
    if end_date:
        query += " AND created_at <= ?"
        params.append(end_date)
    
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, skip])
    
    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    return [ProductionRecordResponse(**row_to_dict(row)) for row in rows]

@api_router.get("/production/{record_id}", response_model=ProductionRecordResponse)
async def get_production_record(record_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM production_records WHERE id = ?", (record_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Record not found")
    return ProductionRecordResponse(**row_to_dict(row))

@api_router.put("/production/{record_id}", response_model=ProductionRecordResponse)
async def update_production_record(record_id: str, update_data: ProductionRecordUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT id FROM production_records WHERE id = ?", (record_id,)) as cursor:
        existing = await cursor.fetchone()
    if not existing:
        await db.close()
        raise HTTPException(status_code=404, detail="Record not found")
    
    updates = []
    params = []
    for field, value in update_data.model_dump().items():
        if value is not None:
            updates.append(f"{field} = ?")
            params.append(value)
    
    if updates:
        updates.append("updated_at = ?")
        params.append(datetime.now(timezone.utc).isoformat())
        params.append(record_id)
        await db.execute(f"UPDATE production_records SET {', '.join(updates)} WHERE id = ?", params)
        await db.commit()
    
    async with db.execute("SELECT * FROM production_records WHERE id = ?", (record_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    return ProductionRecordResponse(**row_to_dict(row))

@api_router.delete("/production/{record_id}")
async def delete_production_record(record_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM production_records WHERE id = ?", (record_id,))
    await db.commit()
    await db.close()
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted successfully"}

# Reports routes
@api_router.get("/reports/stats", response_model=DashboardStats)
async def get_dashboard_stats(module: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today = now.strftime('%Y-%m-%d')
    week_ago = (now - timedelta(days=7)).strftime('%Y-%m-%d')
    month_ago = (now - timedelta(days=30)).strftime('%Y-%m-%d')
    
    db = await get_db()
    
    query = "SELECT * FROM production_records"
    params = []
    if module:
        query += " WHERE module = ?"
        params.append(module)
    
    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
    
    all_records = rows_to_list(rows)
    total_records = len(all_records)
    
    today_production = 0
    week_production = 0
    month_production = 0
    
    for r in all_records:
        prod_date = r.get("production_date") or r["created_at"][:10]
        qty = r.get("quantity", 0) or 0
        
        if prod_date == today:
            today_production += qty
        if prod_date >= week_ago:
            week_production += qty
        if prod_date >= month_ago:
            month_production += qty
    
    recent_query = "SELECT * FROM production_records"
    if module:
        recent_query += " WHERE module = ?"
    recent_query += " ORDER BY created_at DESC LIMIT 5"
    
    async with db.execute(recent_query, params if module else []) as cursor:
        recent_rows = await cursor.fetchall()
    await db.close()
    
    recent_records = [ProductionRecordResponse(**row_to_dict(r)) for r in recent_rows]
    
    return DashboardStats(
        total_records=total_records,
        today_production=today_production,
        week_production=week_production,
        month_production=month_production,
        recent_records=recent_records
    )

@api_router.get("/reports/daily")
async def get_daily_report(days: int = 7, module: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days)).strftime('%Y-%m-%d')
    
    db = await get_db()
    query = "SELECT * FROM production_records"
    params = []
    if module:
        query += " WHERE module = ?"
        params.append(module)
    
    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    records = rows_to_list(rows)
    daily_data = {}
    
    for record in records:
        date_key = record.get("production_date") or record["created_at"][:10]
        if date_key >= start_date:
            if date_key not in daily_data:
                daily_data[date_key] = {"date": date_key, "quantity": 0, "records": 0, "net_pallets": 0}
            daily_data[date_key]["quantity"] += record.get("quantity", 0) or 0
            daily_data[date_key]["records"] += 1
            pallet_count = record.get("pallet_count", 0) or 0
            waste = record.get("waste", 0) or 0
            daily_data[date_key]["net_pallets"] += (pallet_count - waste)
    
    return {"data": sorted(daily_data.values(), key=lambda x: x["date"])}

# ============ Çimento Giriş API'leri ============

class CimentoGirisCreate(BaseModel):
    yukleme_tarihi: str = ""
    bosaltim_tarihi: str = ""
    irsaliye_no: str = ""
    fatura_no: str = ""
    vade_tarihi: str = ""
    giris_miktari: float = 0
    kantar_kg_miktari: float = 0
    birim_fiyat: float = 0
    giris_kdv_orani: float = 20
    nakliye_birim_fiyat: float = 0
    nakliye_kdv_orani: float = 20
    nakliye_tevkifat_orani: float = 0
    plaka: str = ""
    nakliye_firmasi: str = ""
    sofor: str = ""
    sehir: str = ""
    cimento_alinan_firma: str = ""
    cimento_cinsi: str = ""
    bosaltim_isletmesi: str = ""

class CimentoGirisUpdate(BaseModel):
    yukleme_tarihi: Optional[str] = None
    bosaltim_tarihi: Optional[str] = None
    irsaliye_no: Optional[str] = None
    fatura_no: Optional[str] = None
    vade_tarihi: Optional[str] = None
    giris_miktari: Optional[float] = None
    kantar_kg_miktari: Optional[float] = None
    birim_fiyat: Optional[float] = None
    giris_kdv_orani: Optional[float] = None
    nakliye_birim_fiyat: Optional[float] = None
    nakliye_kdv_orani: Optional[float] = None
    nakliye_tevkifat_orani: Optional[float] = None
    plaka: Optional[str] = None
    nakliye_firmasi: Optional[str] = None
    sofor: Optional[str] = None
    sehir: Optional[str] = None
    cimento_alinan_firma: Optional[str] = None
    cimento_cinsi: Optional[str] = None
    bosaltim_isletmesi: Optional[str] = None

def calculate_cimento_fields(data: dict) -> dict:
    giris_miktari = float(data.get('giris_miktari', 0) or 0)
    kantar_kg_miktari = float(data.get('kantar_kg_miktari', 0) or 0)
    data['aradaki_fark'] = giris_miktari - kantar_kg_miktari
    
    birim_fiyat = float(data.get('birim_fiyat', 0) or 0)
    giris_kdv_orani = float(data.get('giris_kdv_orani', 0) or 0)
    
    data['giris_tutari'] = giris_miktari * birim_fiyat
    data['giris_kdv_tutari'] = data['giris_tutari'] * (giris_kdv_orani / 100)
    data['giris_kdv_dahil_toplam'] = data['giris_tutari'] + data['giris_kdv_tutari']
    
    nakliye_birim_fiyat = float(data.get('nakliye_birim_fiyat', 0) or 0)
    nakliye_kdv_orani = float(data.get('nakliye_kdv_orani', 0) or 0)
    nakliye_tevkifat_orani = float(data.get('nakliye_tevkifat_orani', 0) or 0)
    
    data['nakliye_matrahi'] = giris_miktari * nakliye_birim_fiyat
    data['nakliye_kdv_tutari'] = data['nakliye_matrahi'] * (nakliye_kdv_orani / 100)
    data['nakliye_t1'] = data['nakliye_matrahi'] + data['nakliye_kdv_tutari']
    data['nakliye_t2'] = data['nakliye_kdv_tutari'] * (nakliye_tevkifat_orani / 100)
    data['nakliye_genel_toplam'] = data['nakliye_t1'] - data['nakliye_t2']
    
    data['urun_nakliye_matrah'] = data['giris_tutari'] + data['nakliye_matrahi']
    data['urun_nakliye_kdv_toplam'] = data['giris_kdv_tutari'] + data['nakliye_kdv_tutari']
    data['urun_nakliye_tevkifat_toplam'] = data['nakliye_t2']
    data['urun_nakliye_genel_toplam'] = data['giris_kdv_dahil_toplam'] + data['nakliye_genel_toplam']
    
    return data

@api_router.post("/cimento-giris")
async def create_cimento_giris(input: CimentoGirisCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    data = input.model_dump()
    data = calculate_cimento_fields(data)
    giris_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """INSERT INTO cimento_giris (id, yukleme_tarihi, bosaltim_tarihi, irsaliye_no, fatura_no, vade_tarihi,
           giris_miktari, kantar_kg_miktari, birim_fiyat, giris_kdv_orani, nakliye_birim_fiyat, nakliye_kdv_orani,
           nakliye_tevkifat_orani, plaka, nakliye_firmasi, sofor, sehir, cimento_alinan_firma, cimento_cinsi,
           bosaltim_isletmesi, aradaki_fark, giris_tutari, giris_kdv_tutari, giris_kdv_dahil_toplam, nakliye_matrahi, nakliye_kdv_tutari,
           nakliye_t1, nakliye_t2, nakliye_genel_toplam, urun_nakliye_matrah, urun_nakliye_kdv_toplam,
           urun_nakliye_tevkifat_toplam, urun_nakliye_genel_toplam, created_at, updated_at, user_id, user_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (giris_id, data['yukleme_tarihi'], data['bosaltim_tarihi'], data['irsaliye_no'], data['fatura_no'],
         data['vade_tarihi'], data['giris_miktari'], data['kantar_kg_miktari'], data['birim_fiyat'],
         data['giris_kdv_orani'], data['nakliye_birim_fiyat'], data['nakliye_kdv_orani'], data['nakliye_tevkifat_orani'],
         data['plaka'], data['nakliye_firmasi'], data['sofor'], data['sehir'], data['cimento_alinan_firma'],
         data['cimento_cinsi'], data.get('bosaltim_isletmesi', ''), data['aradaki_fark'], data['giris_tutari'], data['giris_kdv_tutari'],
         data['giris_kdv_dahil_toplam'], data['nakliye_matrahi'], data['nakliye_kdv_tutari'], data['nakliye_t1'],
         data['nakliye_t2'], data['nakliye_genel_toplam'], data['urun_nakliye_matrah'], data['urun_nakliye_kdv_toplam'],
         data['urun_nakliye_tevkifat_toplam'], data['urun_nakliye_genel_toplam'], created_at, created_at,
         current_user['id'], current_user['name'])
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM cimento_giris WHERE id = ?", (giris_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    return row_to_dict(row)

@api_router.get("/cimento-giris")
async def get_cimento_giris(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM cimento_giris ORDER BY created_at DESC") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.put("/cimento-giris/{id}")
async def update_cimento_giris(id: str, input: CimentoGirisUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT * FROM cimento_giris WHERE id = ?", (id,)) as cursor:
        existing_row = await cursor.fetchone()
    if not existing_row:
        await db.close()
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    
    existing = row_to_dict(existing_row)
    for key, value in input.model_dump().items():
        if value is not None:
            existing[key] = value
    
    existing = calculate_cimento_fields(existing)
    existing['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """UPDATE cimento_giris SET yukleme_tarihi=?, bosaltim_tarihi=?, irsaliye_no=?, fatura_no=?, vade_tarihi=?,
           giris_miktari=?, kantar_kg_miktari=?, birim_fiyat=?, giris_kdv_orani=?, nakliye_birim_fiyat=?,
           nakliye_kdv_orani=?, nakliye_tevkifat_orani=?, plaka=?, nakliye_firmasi=?, sofor=?, sehir=?,
           cimento_alinan_firma=?, cimento_cinsi=?, bosaltim_isletmesi=?, aradaki_fark=?, giris_tutari=?, giris_kdv_tutari=?,
           giris_kdv_dahil_toplam=?, nakliye_matrahi=?, nakliye_kdv_tutari=?, nakliye_t1=?, nakliye_t2=?,
           nakliye_genel_toplam=?, urun_nakliye_matrah=?, urun_nakliye_kdv_toplam=?, urun_nakliye_tevkifat_toplam=?,
           urun_nakliye_genel_toplam=?, updated_at=? WHERE id=?""",
        (existing['yukleme_tarihi'], existing['bosaltim_tarihi'], existing['irsaliye_no'], existing['fatura_no'],
         existing['vade_tarihi'], existing['giris_miktari'], existing['kantar_kg_miktari'], existing['birim_fiyat'],
         existing['giris_kdv_orani'], existing['nakliye_birim_fiyat'], existing['nakliye_kdv_orani'],
         existing['nakliye_tevkifat_orani'], existing['plaka'], existing['nakliye_firmasi'], existing['sofor'],
         existing['sehir'], existing['cimento_alinan_firma'], existing['cimento_cinsi'], existing.get('bosaltim_isletmesi', ''),
         existing['aradaki_fark'], existing['giris_tutari'], existing['giris_kdv_tutari'], existing['giris_kdv_dahil_toplam'],
         existing['nakliye_matrahi'], existing['nakliye_kdv_tutari'], existing['nakliye_t1'], existing['nakliye_t2'],
         existing['nakliye_genel_toplam'], existing['urun_nakliye_matrah'], existing['urun_nakliye_kdv_toplam'],
         existing['urun_nakliye_tevkifat_toplam'], existing['urun_nakliye_genel_toplam'], existing['updated_at'], id)
    )
    await db.commit()
    await db.close()
    
    return existing

@api_router.delete("/cimento-giris/{id}")
async def delete_cimento_giris(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM cimento_giris WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    return {"message": "Kayıt silindi"}

@api_router.get("/cimento-giris-ozet")
async def get_cimento_giris_ozet(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM cimento_giris") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    records = rows_to_list(rows)
    return {
        "kayit_sayisi": len(records),
        "toplam_giris_miktari": sum(r.get('giris_miktari', 0) or 0 for r in records),
        "toplam_kantar_kg": sum(r.get('kantar_kg_miktari', 0) or 0 for r in records),
        "toplam_fark": sum(r.get('aradaki_fark', 0) or 0 for r in records),
        "toplam_giris_tutari": sum(r.get('giris_tutari', 0) or 0 for r in records),
        "toplam_giris_kdv": sum(r.get('giris_kdv_tutari', 0) or 0 for r in records),
        "toplam_giris_kdv_dahil": sum(r.get('giris_kdv_dahil_toplam', 0) or 0 for r in records),
        "toplam_nakliye_matrah": sum(r.get('nakliye_matrahi', 0) or 0 for r in records),
        "toplam_nakliye_kdv": sum(r.get('nakliye_kdv_tutari', 0) or 0 for r in records),
        "toplam_nakliye_genel": sum(r.get('nakliye_genel_toplam', 0) or 0 for r in records),
        "toplam_urun_nakliye_matrah": sum(r.get('urun_nakliye_matrah', 0) or 0 for r in records),
        "toplam_urun_nakliye_kdv": sum(r.get('urun_nakliye_kdv_toplam', 0) or 0 for r in records),
        "toplam_urun_nakliye_tevkifat": sum(r.get('urun_nakliye_tevkifat_toplam', 0) or 0 for r in records),
        "toplam_urun_nakliye_genel": sum(r.get('urun_nakliye_genel_toplam', 0) or 0 for r in records)
    }

# ============ PERSONEL MODÜLÜ API'LERİ ============

class PersonelCreate(BaseModel):
    ad_soyad: str
    tc_kimlik: str = ""
    telefon: str = ""
    email: str = ""
    adres: str = ""
    dogum_tarihi: str = ""
    ise_giris_tarihi: str = ""
    departman: str = ""
    pozisyon: str = ""
    maas: float = 0
    banka: str = ""
    iban: str = ""
    sgk_no: str = ""
    ehliyet_sinifi: str = ""
    kan_grubu: str = ""
    acil_durum_kisi: str = ""
    acil_durum_telefon: str = ""
    notlar: str = ""
    aktif: bool = True

class PersonelUpdate(BaseModel):
    ad_soyad: Optional[str] = None
    tc_kimlik: Optional[str] = None
    telefon: Optional[str] = None
    email: Optional[str] = None
    adres: Optional[str] = None
    dogum_tarihi: Optional[str] = None
    ise_giris_tarihi: Optional[str] = None
    departman: Optional[str] = None
    pozisyon: Optional[str] = None
    maas: Optional[float] = None
    banka: Optional[str] = None
    iban: Optional[str] = None
    sgk_no: Optional[str] = None
    ehliyet_sinifi: Optional[str] = None
    kan_grubu: Optional[str] = None
    acil_durum_kisi: Optional[str] = None
    acil_durum_telefon: Optional[str] = None
    notlar: Optional[str] = None
    aktif: Optional[bool] = None

@api_router.post("/personeller")
async def create_personel(input: PersonelCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    personel_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """INSERT INTO personeller (id, ad_soyad, tc_kimlik, telefon, email, adres, dogum_tarihi, ise_giris_tarihi,
           departman, pozisyon, maas, banka, iban, sgk_no, ehliyet_sinifi, kan_grubu, acil_durum_kisi,
           acil_durum_telefon, notlar, aktif, yillik_izin_hakki, kullanilan_izin, kalan_izin, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (personel_id, input.ad_soyad, input.tc_kimlik, input.telefon, input.email, input.adres,
         input.dogum_tarihi, input.ise_giris_tarihi, input.departman, input.pozisyon, input.maas,
         input.banka, input.iban, input.sgk_no, input.ehliyet_sinifi, input.kan_grubu, input.acil_durum_kisi,
         input.acil_durum_telefon, input.notlar, 1 if input.aktif else 0, 14, 0, 14, created_at)
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM personeller WHERE id = ?", (personel_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    return row_to_dict(row)

@api_router.get("/personeller")
async def get_personeller(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM personeller ORDER BY ad_soyad") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.get("/personeller/{id}")
async def get_personel(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM personeller WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    return row_to_dict(row)

@api_router.put("/personeller/{id}")
async def update_personel(id: str, input: PersonelUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT * FROM personeller WHERE id = ?", (id,)) as cursor:
        existing = await cursor.fetchone()
    if not existing:
        await db.close()
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    updates = []
    params = []
    for field, value in input.model_dump().items():
        if value is not None:
            if field == 'aktif':
                updates.append(f"{field} = ?")
                params.append(1 if value else 0)
            else:
                updates.append(f"{field} = ?")
                params.append(value)
    
    if updates:
        updates.append("updated_at = ?")
        params.append(datetime.now(timezone.utc).isoformat())
        params.append(id)
        await db.execute(f"UPDATE personeller SET {', '.join(updates)} WHERE id = ?", params)
        await db.commit()
    
    async with db.execute("SELECT * FROM personeller WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    return row_to_dict(row)

@api_router.delete("/personeller/{id}")
async def delete_personel(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM personeller WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    return {"message": "Personel silindi"}

# Puantaj
class PuantajCreate(BaseModel):
    personel_id: str
    personel_adi: str
    tarih: str
    giris_saati: str = ""
    cikis_saati: str = ""
    mesai_suresi: float = 0
    fazla_mesai: float = 0
    notlar: str = ""

@api_router.post("/puantaj")
async def create_puantaj(input: PuantajCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    puantaj_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    data = input.model_dump()
    if data['giris_saati'] and data['cikis_saati']:
        try:
            giris = datetime.strptime(data['giris_saati'], "%H:%M")
            cikis = datetime.strptime(data['cikis_saati'], "%H:%M")
            fark = (cikis - giris).seconds / 3600
            data['mesai_suresi'] = round(fark, 2)
            data['fazla_mesai'] = max(0, round(fark - 8, 2))
        except:
            pass
    
    await db.execute(
        """INSERT INTO puantaj (id, personel_id, personel_adi, tarih, giris_saati, cikis_saati,
           mesai_suresi, fazla_mesai, notlar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (puantaj_id, data['personel_id'], data['personel_adi'], data['tarih'], data['giris_saati'],
         data['cikis_saati'], data['mesai_suresi'], data['fazla_mesai'], data['notlar'], created_at)
    )
    await db.commit()
    await db.close()
    
    data['id'] = puantaj_id
    data['created_at'] = created_at
    return data

@api_router.get("/puantaj")
async def get_puantaj(personel_id: Optional[str] = None, tarih_baslangic: Optional[str] = None,
                      tarih_bitis: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    query = "SELECT * FROM puantaj WHERE 1=1"
    params = []
    
    if personel_id:
        query += " AND personel_id = ?"
        params.append(personel_id)
    if tarih_baslangic and tarih_bitis:
        query += " AND tarih >= ? AND tarih <= ?"
        params.extend([tarih_baslangic, tarih_bitis])
    
    query += " ORDER BY tarih DESC"
    
    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.delete("/puantaj/{id}")
async def delete_puantaj(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM puantaj WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Puantaj kaydı bulunamadı")
    return {"message": "Puantaj kaydı silindi"}

# İzin
class IzinCreate(BaseModel):
    personel_id: str
    personel_adi: str
    izin_turu: str
    baslangic_tarihi: str
    bitis_tarihi: str
    gun_sayisi: int = 1
    aciklama: str = ""
    durum: str = "Beklemede"

@api_router.post("/izinler")
async def create_izin(input: IzinCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    izin_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """INSERT INTO izinler (id, personel_id, personel_adi, izin_turu, baslangic_tarihi, bitis_tarihi,
           gun_sayisi, aciklama, durum, onayla_tarihi, onaylayan, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (izin_id, input.personel_id, input.personel_adi, input.izin_turu, input.baslangic_tarihi,
         input.bitis_tarihi, input.gun_sayisi, input.aciklama, input.durum, "", "", created_at)
    )
    await db.commit()
    await db.close()
    
    return {
        "id": izin_id, "personel_id": input.personel_id, "personel_adi": input.personel_adi,
        "izin_turu": input.izin_turu, "baslangic_tarihi": input.baslangic_tarihi,
        "bitis_tarihi": input.bitis_tarihi, "gun_sayisi": input.gun_sayisi, "aciklama": input.aciklama,
        "durum": input.durum, "onayla_tarihi": "", "onaylayan": "", "created_at": created_at
    }

@api_router.get("/izinler")
async def get_izinler(personel_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    if personel_id:
        async with db.execute("SELECT * FROM izinler WHERE personel_id = ? ORDER BY created_at DESC", (personel_id,)) as cursor:
            rows = await cursor.fetchall()
    else:
        async with db.execute("SELECT * FROM izinler ORDER BY created_at DESC") as cursor:
            rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.put("/izinler/{id}/onayla")
async def onayla_izin(id: str, durum: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT * FROM izinler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    if not row:
        await db.close()
        raise HTTPException(status_code=404, detail="İzin kaydı bulunamadı")
    
    existing = row_to_dict(row)
    onayla_tarihi = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "UPDATE izinler SET durum = ?, onayla_tarihi = ?, onaylayan = ? WHERE id = ?",
        (durum, onayla_tarihi, current_user['name'], id)
    )
    
    if durum == "Onaylandı" and existing['izin_turu'] == "Yıllık":
        async with db.execute("SELECT * FROM personeller WHERE id = ?", (existing['personel_id'],)) as cursor:
            personel_row = await cursor.fetchone()
        if personel_row:
            personel = row_to_dict(personel_row)
            kullanilan = (personel.get('kullanilan_izin', 0) or 0) + existing['gun_sayisi']
            kalan = (personel.get('yillik_izin_hakki', 14) or 14) - kullanilan
            await db.execute(
                "UPDATE personeller SET kullanilan_izin = ?, kalan_izin = ? WHERE id = ?",
                (kullanilan, kalan, existing['personel_id'])
            )
    
    await db.commit()
    
    async with db.execute("SELECT * FROM izinler WHERE id = ?", (id,)) as cursor:
        updated = await cursor.fetchone()
    await db.close()
    
    return row_to_dict(updated)

@api_router.delete("/izinler/{id}")
async def delete_izin(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM izinler WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="İzin kaydı bulunamadı")
    return {"message": "İzin kaydı silindi"}

# Maaş Bordrosu
class MaasBordrosuCreate(BaseModel):
    personel_id: str
    personel_adi: str
    yil: int
    ay: int
    brut_maas: float = 0
    sgk_isci: float = 0
    sgk_isveren: float = 0
    gelir_vergisi: float = 0
    damga_vergisi: float = 0
    net_maas: float = 0
    fazla_mesai_ucreti: float = 0
    ikramiye: float = 0
    kesintiler: float = 0
    toplam_odeme: float = 0
    odeme_tarihi: str = ""
    odendi: bool = False

@api_router.post("/maas-bordrolari")
async def create_maas_bordrosu(input: MaasBordrosuCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    bordro_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    brut = input.brut_maas
    sgk_isci = round(brut * 0.14, 2)
    sgk_isveren = round(brut * 0.205, 2)
    gelir_vergisi = round((brut - sgk_isci) * 0.15, 2)
    damga_vergisi = round(brut * 0.00759, 2)
    net_maas = round(brut - sgk_isci - gelir_vergisi - damga_vergisi, 2)
    toplam_odeme = round(net_maas + input.fazla_mesai_ucreti + input.ikramiye - input.kesintiler, 2)
    
    await db.execute(
        """INSERT INTO maas_bordrolari (id, personel_id, personel_adi, yil, ay, brut_maas, sgk_isci,
           sgk_isveren, gelir_vergisi, damga_vergisi, net_maas, fazla_mesai_ucreti, ikramiye,
           kesintiler, toplam_odeme, odeme_tarihi, odendi, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (bordro_id, input.personel_id, input.personel_adi, input.yil, input.ay, brut, sgk_isci,
         sgk_isveren, gelir_vergisi, damga_vergisi, net_maas, input.fazla_mesai_ucreti, input.ikramiye,
         input.kesintiler, toplam_odeme, input.odeme_tarihi, 1 if input.odendi else 0, created_at)
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM maas_bordrolari WHERE id = ?", (bordro_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    return row_to_dict(row)

@api_router.get("/maas-bordrolari")
async def get_maas_bordrolari(personel_id: Optional[str] = None, yil: Optional[int] = None,
                               ay: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    query = "SELECT * FROM maas_bordrolari WHERE 1=1"
    params = []
    
    if personel_id:
        query += " AND personel_id = ?"
        params.append(personel_id)
    if yil:
        query += " AND yil = ?"
        params.append(yil)
    if ay:
        query += " AND ay = ?"
        params.append(ay)
    
    query += " ORDER BY yil DESC, ay DESC"
    
    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.put("/maas-bordrolari/{id}/odendi")
async def maas_odendi(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    odeme_tarihi = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "UPDATE maas_bordrolari SET odendi = 1, odeme_tarihi = ? WHERE id = ?",
        (odeme_tarihi, id)
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM maas_bordrolari WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Bordro bulunamadı")
    return row_to_dict(row)

# Personel Özet
@api_router.get("/personel-ozet")
async def get_personel_ozet(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    today = datetime.now().strftime("%Y-%m-%d")
    
    async with db.execute("SELECT * FROM personeller WHERE aktif = 1") as cursor:
        personeller_rows = await cursor.fetchall()
    
    async with db.execute("SELECT * FROM puantaj WHERE tarih = ?", (today,)) as cursor:
        puantaj_rows = await cursor.fetchall()
    
    async with db.execute("SELECT * FROM izinler WHERE durum = 'Beklemede'") as cursor:
        izinler_rows = await cursor.fetchall()
    
    await db.close()
    
    personeller = rows_to_list(personeller_rows)
    toplam_maas = sum(p.get('maas', 0) or 0 for p in personeller)
    
    return {
        "toplam_personel": len(personeller),
        "bugun_giris_yapan": len(rows_to_list(puantaj_rows)),
        "bekleyen_izin_talepleri": len(rows_to_list(izinler_rows)),
        "toplam_maas_gideri": toplam_maas
    }

# Personel Departmanlar
class PersonelDepartmanCreate(BaseModel):
    name: str
    aciklama: str = ""

@api_router.post("/personel-departmanlar")
async def create_personel_departman(input: PersonelDepartmanCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    dept_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO personel_departmanlar (id, name, aciklama, created_at) VALUES (?, ?, ?, ?)",
        (dept_id, input.name, input.aciklama, created_at)
    )
    await db.commit()
    await db.close()
    
    return {"id": dept_id, "name": input.name, "aciklama": input.aciklama, "created_at": created_at}

@api_router.get("/personel-departmanlar")
async def get_personel_departmanlar(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM personel_departmanlar ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.delete("/personel-departmanlar/{id}")
async def delete_personel_departman(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    await db.execute("DELETE FROM personel_departmanlar WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    return {"message": "Departman silindi"}

# Pozisyonlar
class PozisyonCreate(BaseModel):
    name: str
    departman: str = ""

@api_router.post("/pozisyonlar")
async def create_pozisyon(input: PozisyonCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    poz_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO pozisyonlar (id, name, departman, created_at) VALUES (?, ?, ?, ?)",
        (poz_id, input.name, input.departman, created_at)
    )
    await db.commit()
    await db.close()
    
    return {"id": poz_id, "name": input.name, "departman": input.departman, "created_at": created_at}

@api_router.get("/pozisyonlar")
async def get_pozisyonlar(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM pozisyonlar ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.delete("/pozisyonlar/{id}")
async def delete_pozisyon(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    await db.execute("DELETE FROM pozisyonlar WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    return {"message": "Pozisyon silindi"}

# ============ ARAÇ MODÜLÜ API'LERİ ============

class AracCreate(BaseModel):
    plaka: str
    arac_cinsi: str = ""
    marka: str = ""
    model: str = ""
    model_yili: Optional[int] = None
    kayitli_sirket: str = ""
    muayene_tarihi: str = ""
    ilk_muayene_tarihi: str = ""
    son_muayene_tarihi: str = ""
    kasko_yenileme_tarihi: str = ""
    sigorta_yenileme_tarihi: str = ""
    arac_takip_id: str = ""
    arac_takip_hat_no: str = ""
    notlar: str = ""
    aktif: bool = True

class AracUpdate(BaseModel):
    plaka: Optional[str] = None
    arac_cinsi: Optional[str] = None
    marka: Optional[str] = None
    model: Optional[str] = None
    model_yili: Optional[int] = None
    kayitli_sirket: Optional[str] = None
    muayene_tarihi: Optional[str] = None
    ilk_muayene_tarihi: Optional[str] = None
    son_muayene_tarihi: Optional[str] = None
    kasko_yenileme_tarihi: Optional[str] = None
    sigorta_yenileme_tarihi: Optional[str] = None
    arac_takip_id: Optional[str] = None
    arac_takip_hat_no: Optional[str] = None
    notlar: Optional[str] = None
    aktif: Optional[bool] = None

@api_router.post("/araclar")
async def create_arac(input: AracCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    plaka_upper = input.plaka.upper()
    
    async with db.execute("SELECT id FROM araclar WHERE plaka = ?", (plaka_upper,)) as cursor:
        existing = await cursor.fetchone()
    if existing:
        await db.close()
        raise HTTPException(status_code=400, detail="Bu plaka zaten kayıtlı")
    
    arac_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """INSERT INTO araclar (id, plaka, arac_cinsi, marka, model, model_yili, kayitli_sirket,
           muayene_tarihi, ilk_muayene_tarihi, son_muayene_tarihi, kasko_yenileme_tarihi,
           sigorta_yenileme_tarihi, arac_takip_id, arac_takip_hat_no, notlar, aktif, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (arac_id, plaka_upper, input.arac_cinsi, input.marka, input.model, input.model_yili,
         input.kayitli_sirket, input.muayene_tarihi, input.ilk_muayene_tarihi, input.son_muayene_tarihi,
         input.kasko_yenileme_tarihi, input.sigorta_yenileme_tarihi, input.arac_takip_id,
         input.arac_takip_hat_no, input.notlar, 1 if input.aktif else 0, created_at, created_at)
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM araclar WHERE id = ?", (arac_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    return row_to_dict(row)

@api_router.get("/araclar")
async def get_araclar(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM araclar ORDER BY plaka") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.get("/araclar/{id}")
async def get_arac(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM araclar WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    return row_to_dict(row)

@api_router.put("/araclar/{id}")
async def update_arac(id: str, input: AracUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT * FROM araclar WHERE id = ?", (id,)) as cursor:
        existing = await cursor.fetchone()
    if not existing:
        await db.close()
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    updates = []
    params = []
    for field, value in input.model_dump().items():
        if value is not None:
            if field == 'plaka':
                value = value.upper()
                async with db.execute("SELECT id FROM araclar WHERE plaka = ? AND id != ?", (value, id)) as cursor:
                    check = await cursor.fetchone()
                if check:
                    await db.close()
                    raise HTTPException(status_code=400, detail="Bu plaka başka bir araçta kayıtlı")
            if field == 'aktif':
                updates.append(f"{field} = ?")
                params.append(1 if value else 0)
            else:
                updates.append(f"{field} = ?")
                params.append(value)
    
    if updates:
        updates.append("updated_at = ?")
        params.append(datetime.now(timezone.utc).isoformat())
        params.append(id)
        await db.execute(f"UPDATE araclar SET {', '.join(updates)} WHERE id = ?", params)
        await db.commit()
    
    async with db.execute("SELECT * FROM araclar WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    return row_to_dict(row)

@api_router.delete("/araclar/{id}")
async def delete_arac(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT ruhsat_dosya, kasko_dosya, sigorta_dosya FROM araclar WHERE id = ?", (id,)) as cursor:
        arac = await cursor.fetchone()
    if arac:
        for i in range(3):
            if arac[i]:
                file_path = UPLOAD_DIR / arac[i].split('/')[-1]
                if file_path.exists():
                    file_path.unlink()
    
    cursor = await db.execute("DELETE FROM araclar WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    return {"message": "Araç silindi"}

# Araç dosya yükleme
@api_router.post("/araclar/{id}/upload/{doc_type}")
async def upload_arac_document(id: str, doc_type: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if doc_type not in ['ruhsat', 'kasko', 'sigorta']:
        raise HTTPException(status_code=400, detail="Geçersiz dosya tipi")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyaları yüklenebilir")
    
    db = await get_db()
    async with db.execute("SELECT * FROM araclar WHERE id = ?", (id,)) as cursor:
        arac_row = await cursor.fetchone()
    
    if not arac_row:
        await db.close()
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    arac = row_to_dict(arac_row)
    old_file_field = f"{doc_type}_dosya"
    
    if arac.get(old_file_field):
        old_file_path = UPLOAD_DIR / arac[old_file_field].split('/')[-1]
        if old_file_path.exists():
            old_file_path.unlink()
    
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{id}_{doc_type}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    await db.execute(
        f"UPDATE araclar SET {old_file_field} = ?, updated_at = ? WHERE id = ?",
        (f"/api/files/{unique_filename}", datetime.now(timezone.utc).isoformat(), id)
    )
    await db.commit()
    await db.close()
    
    return {"filename": unique_filename, "path": f"/api/files/{unique_filename}", "doc_type": doc_type}

@api_router.delete("/araclar/{id}/file/{doc_type}")
async def delete_arac_document(id: str, doc_type: str, current_user: dict = Depends(get_current_user)):
    if doc_type not in ['ruhsat', 'kasko', 'sigorta']:
        raise HTTPException(status_code=400, detail="Geçersiz dosya tipi")
    
    db = await get_db()
    file_field = f"{doc_type}_dosya"
    
    async with db.execute(f"SELECT {file_field} FROM araclar WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    
    if row and row[0]:
        file_path = UPLOAD_DIR / row[0].split('/')[-1]
        if file_path.exists():
            file_path.unlink()
        
        await db.execute(f"UPDATE araclar SET {file_field} = NULL, updated_at = ? WHERE id = ?",
                        (datetime.now(timezone.utc).isoformat(), id))
        await db.commit()
    
    await db.close()
    return {"message": f"{doc_type} dosyası silindi"}

@api_router.get("/arac-ozet")
async def get_arac_ozet(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM araclar WHERE aktif = 1") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    araclar = rows_to_list(rows)
    next_30_days = (datetime.now(timezone.utc) + timedelta(days=30)).strftime('%Y-%m-%d')
    
    muayene_yaklasan = sum(1 for a in araclar if a.get('muayene_tarihi') and a['muayene_tarihi'] <= next_30_days)
    kasko_yaklasan = sum(1 for a in araclar if a.get('kasko_yenileme_tarihi') and a['kasko_yenileme_tarihi'] <= next_30_days)
    sigorta_yaklasan = sum(1 for a in araclar if a.get('sigorta_yenileme_tarihi') and a['sigorta_yenileme_tarihi'] <= next_30_days)
    
    return {
        "toplam_arac": len(araclar),
        "muayene_yaklasan": muayene_yaklasan,
        "kasko_yaklasan": kasko_yaklasan,
        "sigorta_yaklasan": sigorta_yaklasan
    }

# Araç Kaynak API'leri
class AracCinsiCreate(BaseModel):
    name: str

@api_router.post("/arac-cinsleri")
async def create_arac_cinsi(input: AracCinsiCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cins_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    await db.execute("INSERT INTO arac_cinsleri (id, name, created_at) VALUES (?, ?, ?)", (cins_id, input.name, created_at))
    await db.commit()
    await db.close()
    return {"id": cins_id, "name": input.name, "created_at": created_at}

@api_router.get("/arac-cinsleri")
async def get_arac_cinsleri(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM arac_cinsleri ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.delete("/arac-cinsleri/{id}")
async def delete_arac_cinsi(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    await db.execute("DELETE FROM arac_cinsleri WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    return {"message": "Araç cinsi silindi"}

class MarkaCreate(BaseModel):
    name: str

@api_router.post("/markalar")
async def create_marka(input: MarkaCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    marka_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    await db.execute("INSERT INTO markalar (id, name, created_at) VALUES (?, ?, ?)", (marka_id, input.name, created_at))
    await db.commit()
    await db.close()
    return {"id": marka_id, "name": input.name, "created_at": created_at}

@api_router.get("/markalar")
async def get_markalar(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM markalar ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.delete("/markalar/{id}")
async def delete_marka(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    await db.execute("DELETE FROM markalar WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    return {"message": "Marka silindi"}

class ModelCreate(BaseModel):
    name: str
    marka: str = ""

@api_router.post("/modeller")
async def create_model(input: ModelCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    model_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    await db.execute("INSERT INTO modeller (id, name, marka, created_at) VALUES (?, ?, ?, ?)",
                     (model_id, input.name, input.marka, created_at))
    await db.commit()
    await db.close()
    return {"id": model_id, "name": input.name, "marka": input.marka, "created_at": created_at}

@api_router.get("/modeller")
async def get_modeller(marka: str = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    if marka:
        async with db.execute("SELECT * FROM modeller WHERE marka = ? ORDER BY name", (marka,)) as cursor:
            rows = await cursor.fetchall()
    else:
        async with db.execute("SELECT * FROM modeller ORDER BY name") as cursor:
            rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.delete("/modeller/{id}")
async def delete_model(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    await db.execute("DELETE FROM modeller WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    return {"message": "Model silindi"}

class SirketCreate(BaseModel):
    name: str
    vergi_no: str = ""
    adres: str = ""

@api_router.post("/sirketler")
async def create_sirket(input: SirketCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    sirket_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    await db.execute("INSERT INTO sirketler (id, name, vergi_no, adres, created_at) VALUES (?, ?, ?, ?, ?)",
                     (sirket_id, input.name, input.vergi_no, input.adres, created_at))
    await db.commit()
    await db.close()
    return {"id": sirket_id, "name": input.name, "vergi_no": input.vergi_no, "adres": input.adres, "created_at": created_at}

@api_router.get("/sirketler")
async def get_sirketler(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM sirketler ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.delete("/sirketler/{id}")
async def delete_sirket(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    await db.execute("DELETE FROM sirketler WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    return {"message": "Şirket silindi"}

# ============ MOTORİN MODÜLÜ API'LERİ ============

class MotorinTedarikciCreate(BaseModel):
    name: str
    yetkili_kisi: str = ""
    telefon: str = ""
    email: str = ""
    adres: str = ""
    vergi_no: str = ""
    notlar: str = ""

@api_router.post("/motorin-tedarikciler")
async def create_motorin_tedarikci(input: MotorinTedarikciCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    ted_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO motorin_tedarikciler (id, name, yetkili_kisi, telefon, email, adres, vergi_no, notlar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (ted_id, input.name, input.yetkili_kisi, input.telefon, input.email, input.adres, input.vergi_no, input.notlar, created_at)
    )
    await db.commit()
    await db.close()
    return {"id": ted_id, "name": input.name, "yetkili_kisi": input.yetkili_kisi, "telefon": input.telefon,
            "email": input.email, "adres": input.adres, "vergi_no": input.vergi_no, "notlar": input.notlar, "created_at": created_at}

@api_router.get("/motorin-tedarikciler")
async def get_motorin_tedarikciler(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM motorin_tedarikciler ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.put("/motorin-tedarikciler/{id}")
async def update_motorin_tedarikci(id: str, input: MotorinTedarikciCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    updated_at = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "UPDATE motorin_tedarikciler SET name=?, yetkili_kisi=?, telefon=?, email=?, adres=?, vergi_no=?, notlar=?, updated_at=? WHERE id=?",
        (input.name, input.yetkili_kisi, input.telefon, input.email, input.adres, input.vergi_no, input.notlar, updated_at, id)
    )
    await db.commit()
    async with db.execute("SELECT * FROM motorin_tedarikciler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    return row_to_dict(row)

@api_router.delete("/motorin-tedarikciler/{id}")
async def delete_motorin_tedarikci(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    await db.execute("DELETE FROM motorin_tedarikciler WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    return {"message": "Tedarikçi silindi"}

# Motorin Alım
class MotorinAlimCreate(BaseModel):
    tarih: str
    tedarikci_id: str = ""
    tedarikci_adi: str = ""
    akaryakit_markasi: str = ""
    cekici_plaka: str = ""
    dorse_plaka: str = ""
    sofor_adi: str = ""
    sofor_soyadi: str = ""
    miktar_litre: float
    miktar_kg: float = 0
    kesafet: float = 0
    kantar_kg: float = 0
    birim_fiyat: float
    toplam_tutar: float
    fatura_no: str = ""
    irsaliye_no: str = ""
    odeme_durumu: str = "beklemede"
    vade_tarihi: str = ""
    teslim_alan: str = ""
    bosaltim_tesisi: str = ""
    notlar: str = ""

async def update_motorin_stok_sqlite():
    db = await get_db()
    async with db.execute("SELECT SUM(miktar_litre) FROM motorin_alimlar") as cursor:
        row = await cursor.fetchone()
        toplam_alim = row[0] or 0
    
    async with db.execute("SELECT SUM(miktar_litre) FROM motorin_verme") as cursor:
        row = await cursor.fetchone()
        toplam_verme = row[0] or 0
    
    mevcut_stok = toplam_alim - toplam_verme
    updated_at = datetime.now(timezone.utc).isoformat()
    
    async with db.execute("SELECT COUNT(*) FROM motorin_stok") as cursor:
        count = (await cursor.fetchone())[0]
    
    if count == 0:
        await db.execute(
            "INSERT INTO motorin_stok (toplam_alim, toplam_verme, mevcut_stok, updated_at) VALUES (?, ?, ?, ?)",
            (toplam_alim, toplam_verme, mevcut_stok, updated_at)
        )
    else:
        await db.execute(
            "UPDATE motorin_stok SET toplam_alim=?, toplam_verme=?, mevcut_stok=?, updated_at=?",
            (toplam_alim, toplam_verme, mevcut_stok, updated_at)
        )
    
    await db.commit()
    await db.close()

@api_router.post("/motorin-alimlar")
async def create_motorin_alim(input: MotorinAlimCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    alim_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """INSERT INTO motorin_alimlar (id, tarih, tedarikci_id, tedarikci_adi, akaryakit_markasi,
           cekici_plaka, dorse_plaka, sofor_adi, sofor_soyadi, miktar_litre, miktar_kg, kesafet,
           kantar_kg, birim_fiyat, toplam_tutar, fatura_no, irsaliye_no, odeme_durumu, vade_tarihi,
           teslim_alan, bosaltim_tesisi, notlar, created_at, created_by, created_by_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (alim_id, input.tarih, input.tedarikci_id, input.tedarikci_adi, input.akaryakit_markasi,
         input.cekici_plaka, input.dorse_plaka, input.sofor_adi, input.sofor_soyadi, input.miktar_litre,
         input.miktar_kg, input.kesafet, input.kantar_kg, input.birim_fiyat, input.toplam_tutar,
         input.fatura_no, input.irsaliye_no, input.odeme_durumu, input.vade_tarihi, input.teslim_alan,
         input.bosaltim_tesisi, input.notlar, created_at, current_user['id'], current_user['name'])
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM motorin_alimlar WHERE id = ?", (alim_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    await update_motorin_stok_sqlite()
    return row_to_dict(row)

@api_router.get("/motorin-alimlar")
async def get_motorin_alimlar(baslangic_tarihi: str = None, bitis_tarihi: str = None,
                               tedarikci_id: str = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    query = "SELECT * FROM motorin_alimlar WHERE 1=1"
    params = []
    
    if baslangic_tarihi and bitis_tarihi:
        query += " AND tarih >= ? AND tarih <= ?"
        params.extend([baslangic_tarihi, bitis_tarihi])
    if tedarikci_id:
        query += " AND tedarikci_id = ?"
        params.append(tedarikci_id)
    
    query += " ORDER BY tarih DESC"
    
    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.get("/motorin-alimlar/{id}")
async def get_motorin_alim(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM motorin_alimlar WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    return row_to_dict(row)

@api_router.put("/motorin-alimlar/{id}")
async def update_motorin_alim(id: str, input: MotorinAlimCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    updated_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """UPDATE motorin_alimlar SET tarih=?, tedarikci_id=?, tedarikci_adi=?, akaryakit_markasi=?,
           cekici_plaka=?, dorse_plaka=?, sofor_adi=?, sofor_soyadi=?, miktar_litre=?, miktar_kg=?,
           kesafet=?, kantar_kg=?, birim_fiyat=?, toplam_tutar=?, fatura_no=?, irsaliye_no=?,
           odeme_durumu=?, vade_tarihi=?, teslim_alan=?, bosaltim_tesisi=?, notlar=?, updated_at=?
           WHERE id=?""",
        (input.tarih, input.tedarikci_id, input.tedarikci_adi, input.akaryakit_markasi, input.cekici_plaka,
         input.dorse_plaka, input.sofor_adi, input.sofor_soyadi, input.miktar_litre, input.miktar_kg,
         input.kesafet, input.kantar_kg, input.birim_fiyat, input.toplam_tutar, input.fatura_no,
         input.irsaliye_no, input.odeme_durumu, input.vade_tarihi, input.teslim_alan, input.bosaltim_tesisi,
         input.notlar, updated_at, id)
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM motorin_alimlar WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    await update_motorin_stok_sqlite()
    return row_to_dict(row)

@api_router.delete("/motorin-alimlar/{id}")
async def delete_motorin_alim(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    await db.execute("DELETE FROM motorin_alimlar WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    await update_motorin_stok_sqlite()
    return {"message": "Alım kaydı silindi"}

# Motorin Verme
class MotorinVermeCreate(BaseModel):
    tarih: str
    bosaltim_tesisi: str = ""
    arac_id: str
    arac_plaka: str = ""
    arac_bilgi: str = ""
    miktar_litre: float
    kilometre: float = 0
    sofor_id: str = ""
    sofor_adi: str = ""
    personel_id: str = ""
    personel_adi: str = ""
    notlar: str = ""

@api_router.post("/motorin-verme")
async def create_motorin_verme(input: MotorinVermeCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    verme_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """INSERT INTO motorin_verme (id, tarih, bosaltim_tesisi, arac_id, arac_plaka, arac_bilgi,
           miktar_litre, kilometre, sofor_id, sofor_adi, personel_id, personel_adi, notlar,
           created_at, created_by, created_by_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (verme_id, input.tarih, input.bosaltim_tesisi, input.arac_id, input.arac_plaka, input.arac_bilgi,
         input.miktar_litre, input.kilometre, input.sofor_id, input.sofor_adi, input.personel_id,
         input.personel_adi, input.notlar, created_at, current_user['id'], current_user['name'])
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM motorin_verme WHERE id = ?", (verme_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    await update_motorin_stok_sqlite()
    return row_to_dict(row)

@api_router.get("/motorin-verme")
async def get_motorin_verme(baslangic_tarihi: str = None, bitis_tarihi: str = None,
                             arac_id: str = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    query = "SELECT * FROM motorin_verme WHERE 1=1"
    params = []
    
    if baslangic_tarihi and bitis_tarihi:
        query += " AND tarih >= ? AND tarih <= ?"
        params.extend([baslangic_tarihi, bitis_tarihi])
    if arac_id:
        query += " AND arac_id = ?"
        params.append(arac_id)
    
    query += " ORDER BY tarih DESC"
    
    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.get("/motorin-verme/{id}")
async def get_motorin_verme_by_id(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM motorin_verme WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    return row_to_dict(row)

@api_router.put("/motorin-verme/{id}")
async def update_motorin_verme(id: str, input: MotorinVermeCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    updated_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """UPDATE motorin_verme SET tarih=?, bosaltim_tesisi=?, arac_id=?, arac_plaka=?, arac_bilgi=?,
           miktar_litre=?, kilometre=?, sofor_id=?, sofor_adi=?, personel_id=?, personel_adi=?,
           notlar=?, updated_at=? WHERE id=?""",
        (input.tarih, input.bosaltim_tesisi, input.arac_id, input.arac_plaka, input.arac_bilgi,
         input.miktar_litre, input.kilometre, input.sofor_id, input.sofor_adi, input.personel_id,
         input.personel_adi, input.notlar, updated_at, id)
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM motorin_verme WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    await update_motorin_stok_sqlite()
    return row_to_dict(row)

@api_router.delete("/motorin-verme/{id}")
async def delete_motorin_verme(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    await db.execute("DELETE FROM motorin_verme WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    await update_motorin_stok_sqlite()
    return {"message": "Verme kaydı silindi"}

@api_router.get("/motorin-stok")
async def get_motorin_stok(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM motorin_stok LIMIT 1") as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    if not row:
        return {"toplam_alim": 0, "toplam_verme": 0, "mevcut_stok": 0}
    return row_to_dict(row)

@api_router.get("/motorin-ozet")
async def get_motorin_ozet(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    month_start = datetime.now(timezone.utc).replace(day=1).strftime("%Y-%m-%d")
    
    db = await get_db()
    
    async with db.execute("SELECT * FROM motorin_stok LIMIT 1") as cursor:
        stok_row = await cursor.fetchone()
    stok = row_to_dict(stok_row) if stok_row else {"mevcut_stok": 0, "toplam_alim": 0, "toplam_verme": 0}
    
    async with db.execute("SELECT * FROM motorin_alimlar WHERE tarih >= ?", (month_start,)) as cursor:
        ayki_alimlar = rows_to_list(await cursor.fetchall())
    
    async with db.execute("SELECT * FROM motorin_verme WHERE tarih >= ?", (month_start,)) as cursor:
        ayki_vermeler = rows_to_list(await cursor.fetchall())
    
    async with db.execute("SELECT COUNT(*) FROM motorin_alimlar WHERE tarih = ?", (today,)) as cursor:
        bugunki_alim = (await cursor.fetchone())[0]
    
    async with db.execute("SELECT COUNT(*) FROM motorin_verme WHERE tarih = ?", (today,)) as cursor:
        bugunki_verme = (await cursor.fetchone())[0]
    
    async with db.execute("SELECT COUNT(*) FROM motorin_tedarikciler") as cursor:
        tedarikci_sayisi = (await cursor.fetchone())[0]
    
    await db.close()
    
    ayki_alim = sum(a.get('miktar_litre', 0) for a in ayki_alimlar)
    ayki_maliyet = sum(a.get('toplam_tutar', 0) for a in ayki_alimlar)
    ayki_verme = sum(v.get('miktar_litre', 0) for v in ayki_vermeler)
    
    return {
        "mevcut_stok": stok.get("mevcut_stok", 0),
        "toplam_alim": stok.get("toplam_alim", 0),
        "toplam_verme": stok.get("toplam_verme", 0),
        "ayki_alim": ayki_alim,
        "ayki_maliyet": ayki_maliyet,
        "ayki_verme": ayki_verme,
        "bugunki_alim_sayisi": bugunki_alim,
        "bugunki_verme_sayisi": bugunki_verme,
        "tedarikci_sayisi": tedarikci_sayisi
    }

@api_router.get("/motorin-arac-tuketim")
async def get_motorin_arac_tuketim(baslangic_tarihi: str = None, bitis_tarihi: str = None,
                                    current_user: dict = Depends(get_current_user)):
    db = await get_db()
    query = "SELECT * FROM motorin_verme WHERE 1=1"
    params = []
    
    if baslangic_tarihi and bitis_tarihi:
        query += " AND tarih >= ? AND tarih <= ?"
        params.extend([baslangic_tarihi, bitis_tarihi])
    
    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    vermeler = rows_to_list(rows)
    arac_tuketim = {}
    
    for v in vermeler:
        arac_id = v.get('arac_id', '')
        if arac_id not in arac_tuketim:
            arac_tuketim[arac_id] = {
                "arac_id": arac_id,
                "arac_plaka": v.get('arac_plaka', ''),
                "arac_bilgi": v.get('arac_bilgi', ''),
                "toplam_litre": 0,
                "kayit_sayisi": 0,
                "son_kilometre": 0,
                "ilk_kilometre": float('inf')
            }
        arac_tuketim[arac_id]["toplam_litre"] += v.get('miktar_litre', 0) or 0
        arac_tuketim[arac_id]["kayit_sayisi"] += 1
        km = v.get('kilometre', 0) or 0
        if km > 0:
            if km > arac_tuketim[arac_id]["son_kilometre"]:
                arac_tuketim[arac_id]["son_kilometre"] = km
            if km < arac_tuketim[arac_id]["ilk_kilometre"]:
                arac_tuketim[arac_id]["ilk_kilometre"] = km
    
    result = []
    for arac_id, data in arac_tuketim.items():
        if data["ilk_kilometre"] == float('inf'):
            data["ilk_kilometre"] = 0
        km_fark = data["son_kilometre"] - data["ilk_kilometre"]
        if km_fark > 0 and data["toplam_litre"] > 0:
            data["ortalama_tuketim"] = round((data["toplam_litre"] / km_fark) * 100, 2)
        else:
            data["ortalama_tuketim"] = 0
        result.append(data)
    
    result.sort(key=lambda x: x["toplam_litre"], reverse=True)
    return result

# ============ TEKLİF MODÜLÜ API'LERİ ============

class TeklifMusteriCreate(BaseModel):
    firma_adi: str
    yetkili_kisi: str = ""
    telefon: str = ""
    email: str = ""
    adres: str = ""
    vergi_no: str = ""
    vergi_dairesi: str = ""
    notlar: str = ""

@api_router.post("/teklif-musteriler")
async def create_teklif_musteri(input: TeklifMusteriCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    musteri_id = generate_id()
    created_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """INSERT INTO teklif_musteriler (id, firma_adi, yetkili_kisi, telefon, email, adres, vergi_no, vergi_dairesi, notlar, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (musteri_id, input.firma_adi, input.yetkili_kisi, input.telefon, input.email, input.adres, input.vergi_no, input.vergi_dairesi, input.notlar, created_at)
    )
    await db.commit()
    await db.close()
    
    return {"id": musteri_id, "firma_adi": input.firma_adi, "yetkili_kisi": input.yetkili_kisi, "telefon": input.telefon,
            "email": input.email, "adres": input.adres, "vergi_no": input.vergi_no, "vergi_dairesi": input.vergi_dairesi,
            "notlar": input.notlar, "created_at": created_at}

@api_router.get("/teklif-musteriler")
async def get_teklif_musteriler(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM teklif_musteriler ORDER BY firma_adi") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return rows_to_list(rows)

@api_router.get("/teklif-musteriler/{id}")
async def get_teklif_musteri(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM teklif_musteriler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return row_to_dict(row)

@api_router.put("/teklif-musteriler/{id}")
async def update_teklif_musteri(id: str, input: TeklifMusteriCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    updated_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        """UPDATE teklif_musteriler SET firma_adi=?, yetkili_kisi=?, telefon=?, email=?, adres=?,
           vergi_no=?, vergi_dairesi=?, notlar=?, updated_at=? WHERE id=?""",
        (input.firma_adi, input.yetkili_kisi, input.telefon, input.email, input.adres,
         input.vergi_no, input.vergi_dairesi, input.notlar, updated_at, id)
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM teklif_musteriler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    return row_to_dict(row)

@api_router.delete("/teklif-musteriler/{id}")
async def delete_teklif_musteri(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    await db.execute("DELETE FROM teklif_musteriler WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    return {"message": "Müşteri silindi"}

# Teklif
class TeklifKalem(BaseModel):
    urun_hizmet: str
    aciklama: str = ""
    miktar: float = 1
    birim: str = "adet"
    birim_fiyat: float = 0
    kdv_orani: float = 20
    iskonto_orani: float = 0
    toplam: float = 0

class TeklifCreate(BaseModel):
    teklif_turu: str = "bims"
    musteri_id: str = ""
    musteri_adi: str = ""
    musteri_adres: str = ""
    musteri_vergi_no: str = ""
    musteri_vergi_dairesi: str = ""
    teklif_tarihi: str
    gecerlilik_tarihi: str = ""
    konu: str = ""
    kalemler: List[TeklifKalem] = []
    ara_toplam: float = 0
    toplam_iskonto: float = 0
    toplam_kdv: float = 0
    genel_toplam: float = 0
    para_birimi: str = "TRY"
    odeme_kosullari: str = ""
    teslim_suresi: str = ""
    notlar: str = ""
    durum: str = "taslak"

class TeklifUpdate(BaseModel):
    teklif_turu: Optional[str] = None
    musteri_id: Optional[str] = None
    musteri_adi: Optional[str] = None
    musteri_adres: Optional[str] = None
    musteri_vergi_no: Optional[str] = None
    musteri_vergi_dairesi: Optional[str] = None
    teklif_tarihi: Optional[str] = None
    gecerlilik_tarihi: Optional[str] = None
    konu: Optional[str] = None
    kalemler: Optional[List[TeklifKalem]] = None
    ara_toplam: Optional[float] = None
    toplam_iskonto: Optional[float] = None
    toplam_kdv: Optional[float] = None
    genel_toplam: Optional[float] = None
    para_birimi: Optional[str] = None
    odeme_kosullari: Optional[str] = None
    teslim_suresi: Optional[str] = None
    notlar: Optional[str] = None
    durum: Optional[str] = None

async def generate_teklif_no_sqlite():
    current_year = datetime.now().year
    db = await get_db()
    
    async with db.execute(
        "SELECT teklif_no FROM teklifler WHERE teklif_no LIKE ? ORDER BY teklif_no DESC LIMIT 1",
        (f"TKL-{current_year}-%",)
    ) as cursor:
        row = await cursor.fetchone()
    
    await db.close()
    
    if row:
        last_num = int(row[0].split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"TKL-{current_year}-{str(new_num).zfill(4)}"

@api_router.post("/teklifler")
async def create_teklif(input: TeklifCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    teklif_id = generate_id()
    teklif_no = await generate_teklif_no_sqlite()
    created_at = datetime.now(timezone.utc).isoformat()
    
    kalemler_json = json.dumps([k.model_dump() if hasattr(k, 'model_dump') else dict(k) for k in input.kalemler])
    
    await db.execute(
        """INSERT INTO teklifler (id, teklif_no, teklif_turu, musteri_id, musteri_adi, musteri_adres,
           musteri_vergi_no, musteri_vergi_dairesi, teklif_tarihi, gecerlilik_tarihi, konu, kalemler,
           ara_toplam, toplam_iskonto, toplam_kdv, genel_toplam, para_birimi, odeme_kosullari,
           teslim_suresi, notlar, durum, created_at, created_by, created_by_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (teklif_id, teklif_no, input.teklif_turu, input.musteri_id, input.musteri_adi, input.musteri_adres,
         input.musteri_vergi_no, input.musteri_vergi_dairesi, input.teklif_tarihi, input.gecerlilik_tarihi,
         input.konu, kalemler_json, input.ara_toplam, input.toplam_iskonto, input.toplam_kdv, input.genel_toplam,
         input.para_birimi, input.odeme_kosullari, input.teslim_suresi, input.notlar, input.durum,
         created_at, current_user['id'], current_user['name'])
    )
    await db.commit()
    
    async with db.execute("SELECT * FROM teklifler WHERE id = ?", (teklif_id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    result = row_to_dict(row)
    result['kalemler'] = json.loads(result.get('kalemler', '[]'))
    return result

@api_router.get("/teklifler")
async def get_teklifler(durum: str = None, teklif_turu: str = None, musteri_id: str = None,
                         baslangic_tarihi: str = None, bitis_tarihi: str = None,
                         current_user: dict = Depends(get_current_user)):
    db = await get_db()
    query = "SELECT * FROM teklifler WHERE 1=1"
    params = []
    
    if durum:
        query += " AND durum = ?"
        params.append(durum)
    if teklif_turu:
        query += " AND teklif_turu = ?"
        params.append(teklif_turu)
    if musteri_id:
        query += " AND musteri_id = ?"
        params.append(musteri_id)
    if baslangic_tarihi and bitis_tarihi:
        query += " AND teklif_tarihi >= ? AND teklif_tarihi <= ?"
        params.extend([baslangic_tarihi, bitis_tarihi])
    
    query += " ORDER BY created_at DESC"
    
    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    result = []
    for row in rows:
        r = row_to_dict(row)
        r['kalemler'] = json.loads(r.get('kalemler', '[]'))
        result.append(r)
    return result

@api_router.get("/teklifler/{id}")
async def get_teklif(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM teklifler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    result = row_to_dict(row)
    result['kalemler'] = json.loads(result.get('kalemler', '[]'))
    return result

@api_router.put("/teklifler/{id}")
async def update_teklif(id: str, input: TeklifUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    async with db.execute("SELECT id FROM teklifler WHERE id = ?", (id,)) as cursor:
        existing = await cursor.fetchone()
    if not existing:
        await db.close()
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    updates = []
    params = []
    for field, value in input.model_dump().items():
        if value is not None:
            if field == 'kalemler':
                value = json.dumps([k if isinstance(k, dict) else k.model_dump() for k in value])
            updates.append(f"{field} = ?")
            params.append(value)
    
    if updates:
        updates.append("updated_at = ?")
        params.append(datetime.now(timezone.utc).isoformat())
        params.append(id)
        await db.execute(f"UPDATE teklifler SET {', '.join(updates)} WHERE id = ?", params)
        await db.commit()
    
    async with db.execute("SELECT * FROM teklifler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    result = row_to_dict(row)
    result['kalemler'] = json.loads(result.get('kalemler', '[]'))
    return result

@api_router.delete("/teklifler/{id}")
async def delete_teklif(id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = await db.execute("DELETE FROM teklifler WHERE id = ?", (id,))
    await db.commit()
    await db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    return {"message": "Teklif silindi"}

@api_router.put("/teklifler/{id}/durum")
async def update_teklif_durum(id: str, durum: str, current_user: dict = Depends(get_current_user)):
    valid_durumlar = ["taslak", "gonderildi", "beklemede", "kabul_edildi", "reddedildi", "iptal"]
    if durum not in valid_durumlar:
        raise HTTPException(status_code=400, detail=f"Geçersiz durum. Geçerli durumlar: {valid_durumlar}")
    
    db = await get_db()
    updated_at = datetime.now(timezone.utc).isoformat()
    
    await db.execute("UPDATE teklifler SET durum = ?, updated_at = ? WHERE id = ?", (durum, updated_at, id))
    await db.commit()
    
    async with db.execute("SELECT * FROM teklifler WHERE id = ?", (id,)) as cursor:
        row = await cursor.fetchone()
    await db.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    result = row_to_dict(row)
    result['kalemler'] = json.loads(result.get('kalemler', '[]'))
    return result

@api_router.get("/teklif-ozet")
async def get_teklif_ozet(teklif_turu: str = None, current_user: dict = Depends(get_current_user)):
    month_start = datetime.now().strftime("%Y-%m-01")
    
    db = await get_db()
    
    base_query = " WHERE 1=1"
    params = []
    if teklif_turu:
        base_query += " AND teklif_turu = ?"
        params.append(teklif_turu)
    
    async with db.execute(f"SELECT COUNT(*) FROM teklifler{base_query}", params) as cursor:
        toplam_teklif = (await cursor.fetchone())[0]
    
    durumlar = {}
    for d in ['taslak', 'gonderildi', 'beklemede', 'kabul_edildi', 'reddedildi']:
        async with db.execute(f"SELECT COUNT(*) FROM teklifler{base_query} AND durum = ?", params + [d]) as cursor:
            durumlar[d] = (await cursor.fetchone())[0]
    
    async with db.execute(f"SELECT * FROM teklifler{base_query} AND teklif_tarihi >= ?", params + [month_start]) as cursor:
        ayki_rows = await cursor.fetchall()
    ayki_teklifler = rows_to_list(ayki_rows)
    
    async with db.execute(f"SELECT * FROM teklifler{base_query} AND durum = 'kabul_edildi'", params) as cursor:
        kabul_rows = await cursor.fetchall()
    kabul_teklifler = rows_to_list(kabul_rows)
    
    async with db.execute("SELECT COUNT(*) FROM teklif_musteriler") as cursor:
        musteri_sayisi = (await cursor.fetchone())[0]
    
    async with db.execute(f"SELECT * FROM teklifler{base_query} ORDER BY created_at DESC LIMIT 5", params) as cursor:
        son_rows = await cursor.fetchall()
    
    await db.close()
    
    son_teklifler = []
    for row in son_rows:
        r = row_to_dict(row)
        r['kalemler'] = json.loads(r.get('kalemler', '[]'))
        son_teklifler.append(r)
    
    return {
        "toplam_teklif": toplam_teklif,
        "taslak": durumlar['taslak'],
        "gonderildi": durumlar['gonderildi'],
        "beklemede": durumlar['beklemede'],
        "kabul_edildi": durumlar['kabul_edildi'],
        "reddedildi": durumlar['reddedildi'],
        "ayki_teklif_sayisi": len(ayki_teklifler),
        "ayki_toplam_tutar": sum(t.get('genel_toplam', 0) or 0 for t in ayki_teklifler),
        "kabul_toplam_tutar": sum(t.get('genel_toplam', 0) or 0 for t in kabul_teklifler),
        "musteri_sayisi": musteri_sayisi,
        "son_teklifler": son_teklifler
    }

# Include the API router after all routes are defined
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    await init_db()
    logger.info("SQLite database initialized")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown")
