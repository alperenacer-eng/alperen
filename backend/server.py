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

# SQLite Database path
DB_PATH = ROOT_DIR / "database.db"

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
                sevk_agirligi REAL DEFAULT 0,
                adet_basi_cimento REAL DEFAULT 0,
                harcanan_hisir REAL DEFAULT 0,
                paket_adet_7_boy INTEGER DEFAULT 0,
                paket_adet_5_boy INTEGER DEFAULT 0,
                uretim_palet_adetleri TEXT DEFAULT '{}',
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
        
        # Molds table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS molds (
                id TEXT PRIMARY KEY,
                mold_no TEXT NOT NULL,
                description TEXT,
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
                breakdown_3 TEXT
            )
        ''')
        
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
    sevk_agirligi: float = 0
    adet_basi_cimento: float = 0
    paket_adet_7_boy: int = 0
    paket_adet_5_boy: int = 0
    uretim_palet_adetleri: dict = {}

class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    unit: str
    sevk_agirligi: Optional[float] = 0
    adet_basi_cimento: Optional[float] = 0
    harcanan_hisir: Optional[float] = 0
    paket_adet_7_boy: Optional[int] = 0
    paket_adet_5_boy: Optional[int] = 0
    uretim_palet_adetleri: Optional[dict] = {}
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

class MoldResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    mold_no: str
    description: Optional[str]
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
        """INSERT INTO products (id, name, unit, sevk_agirligi, adet_basi_cimento, harcanan_hisir, 
           paket_adet_7_boy, paket_adet_5_boy, uretim_palet_adetleri, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (product_id, product.name, product.unit, product.sevk_agirligi, product.adet_basi_cimento,
         harcanan_hisir, product.paket_adet_7_boy, product.paket_adet_5_boy, 
         json.dumps(product.uretim_palet_adetleri), created_at)
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
        id=product_id, name=product.name, unit=product.unit, sevk_agirligi=product.sevk_agirligi,
        adet_basi_cimento=product.adet_basi_cimento, harcanan_hisir=harcanan_hisir,
        paket_adet_7_boy=product.paket_adet_7_boy, paket_adet_5_boy=product.paket_adet_5_boy,
        uretim_palet_adetleri=product.uretim_palet_adetleri, created_at=created_at
    )

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM products ORDER BY name") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    
    result = []
    for row in rows:
        p = row_to_dict(row)
        p['uretim_palet_adetleri'] = json.loads(p.get('uretim_palet_adetleri', '{}'))
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
        """UPDATE products SET name=?, unit=?, sevk_agirligi=?, adet_basi_cimento=?, harcanan_hisir=?,
           paket_adet_7_boy=?, paket_adet_5_boy=?, uretim_palet_adetleri=?, updated_at=? WHERE id=?""",
        (product.name, product.unit, product.sevk_agirligi, product.adet_basi_cimento, harcanan_hisir,
         product.paket_adet_7_boy, product.paket_adet_5_boy, json.dumps(product.uretim_palet_adetleri),
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
    
    await db.execute("INSERT INTO molds (id, mold_no, description, created_at) VALUES (?, ?, ?, ?)",
                     (mold_id, mold.mold_no, mold.description, created_at))
    await db.commit()
    await db.close()
    
    return MoldResponse(id=mold_id, mold_no=mold.mold_no, description=mold.description, created_at=created_at)

@api_router.get("/molds", response_model=List[MoldResponse])
async def get_molds(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM molds ORDER BY mold_no") as cursor:
        rows = await cursor.fetchall()
    await db.close()
    return [MoldResponse(**row_to_dict(row)) for row in rows]

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

app.include_router(api_router)

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
           aradaki_fark, giris_tutari, giris_kdv_tutari, giris_kdv_dahil_toplam, nakliye_matrahi, nakliye_kdv_tutari,
           nakliye_t1, nakliye_t2, nakliye_genel_toplam, urun_nakliye_matrah, urun_nakliye_kdv_toplam,
           urun_nakliye_tevkifat_toplam, urun_nakliye_genel_toplam, created_at, updated_at, user_id, user_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (giris_id, data['yukleme_tarihi'], data['bosaltim_tarihi'], data['irsaliye_no'], data['fatura_no'],
         data['vade_tarihi'], data['giris_miktari'], data['kantar_kg_miktari'], data['birim_fiyat'],
         data['giris_kdv_orani'], data['nakliye_birim_fiyat'], data['nakliye_kdv_orani'], data['nakliye_tevkifat_orani'],
         data['plaka'], data['nakliye_firmasi'], data['sofor'], data['sehir'], data['cimento_alinan_firma'],
         data['cimento_cinsi'], data['aradaki_fark'], data['giris_tutari'], data['giris_kdv_tutari'],
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
           cimento_alinan_firma=?, cimento_cinsi=?, aradaki_fark=?, giris_tutari=?, giris_kdv_tutari=?,
           giris_kdv_dahil_toplam=?, nakliye_matrahi=?, nakliye_kdv_tutari=?, nakliye_t1=?, nakliye_t2=?,
           nakliye_genel_toplam=?, urun_nakliye_matrah=?, urun_nakliye_kdv_toplam=?, urun_nakliye_tevkifat_toplam=?,
           urun_nakliye_genel_toplam=?, updated_at=? WHERE id=?""",
        (existing['yukleme_tarihi'], existing['bosaltim_tarihi'], existing['irsaliye_no'], existing['fatura_no'],
         existing['vade_tarihi'], existing['giris_miktari'], existing['kantar_kg_miktari'], existing['birim_fiyat'],
         existing['giris_kdv_orani'], existing['nakliye_birim_fiyat'], existing['nakliye_kdv_orani'],
         existing['nakliye_tevkifat_orani'], existing['plaka'], existing['nakliye_firmasi'], existing['sofor'],
         existing['sehir'], existing['cimento_alinan_firma'], existing['cimento_cinsi'], existing['aradaki_fark'],
         existing['giris_tutari'], existing['giris_kdv_tutari'], existing['giris_kdv_dahil_toplam'],
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

@app.on_event("startup")
async def startup_event():
    await init_db()
    logger.info("SQLite database initialized")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown")
