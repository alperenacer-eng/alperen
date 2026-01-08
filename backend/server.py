from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import shutil
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

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
    sevk_agirligi: float = 0  # kg
    adet_basi_cimento: float = 0  # kg
    paket_adet_7_boy: int = 0
    paket_adet_5_boy: int = 0

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
    birim: str = "adet"  # adet, palet, m², m³
    aciklama: str = ""
    acilis_miktari: float = 0  # Açılış fişi miktarı
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
    hareket_tipi: str  # giris, cikis, acilis
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
    # Bims specific fields
    production_date: Optional[str] = None
    shift_type: Optional[str] = None  # gunduz/gece
    shift_number: Optional[str] = None  # 1, 2, 3 (vardiya numarası)
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
    # Bims specific fields
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
    # Bims specific fields
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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is the first user (make them admin)
    user_count = await db.users.count_documents({})
    is_first_user = user_count == 0
    
    # Create user
    user_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "role": "admin" if is_first_user else user_data.role,
        "permissions": ["bims", "cimento", "parke", "araclar", "personel", "motorin"] if is_first_user else user_data.permissions,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token({"sub": user_data.email})
    
    user_response = UserResponse(
        id=user_dict["id"],
        name=user_dict["name"],
        email=user_dict["email"],
        role=user_dict["role"],
        permissions=user_dict["permissions"],
        created_at=user_dict["created_at"]
    )
    
    return Token(access_token=access_token, user=user_response)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": credentials.email})
    
    user_response = UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user.get("role", "user"),
        permissions=user.get("permissions", ["bims"]),
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
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.post("/admin/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_admin)):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "role": user_data.role,
        "permissions": user_data.permissions,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    return UserResponse(
        id=user_dict["id"],
        name=user_dict["name"],
        email=user_dict["email"],
        role=user_dict["role"],
        permissions=user_dict["permissions"],
        created_at=user_dict["created_at"]
    )

@api_router.put("/admin/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update_data: UserUpdate, current_user: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.users.update_one({"id": user_id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return UserResponse(**updated_user)

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    # Prevent deleting yourself
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted"}

# Product routes
@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    product_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "name": product.name,
        "unit": product.unit,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_dict)
    
    # Otomatik olarak stoka da ekle
    stok_dict = {
        "id": product_dict["id"] + "_stok",
        "urun_adi": product.name,
        "birim": product.unit,
        "aciklama": "",
        "acilis_miktari": 0,
        "acilis_tarihi": datetime.now().strftime('%Y-%m-%d'),
        "mevcut_stok": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bims_stok_urunler.insert_one(stok_dict)
    
    return ProductResponse(**product_dict)

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(current_user: dict = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [ProductResponse(**p) for p in products]

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    # Stoktan da sil
    await db.bims_stok_urunler.delete_one({"id": product_id + "_stok"})
    return {"message": "Product deleted"}

# =====================================================
# BIMS STOK API'LERİ
# =====================================================

@api_router.post("/bims-stok-urunler")
async def create_bims_stok_urun(input: BimsStokUrunCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['mevcut_stok'] = data.get('acilis_miktari', 0)  # Açılış miktarı ile başla
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.bims_stok_urunler.insert_one(data)
    
    # Açılış fişi hareketi oluştur
    if data.get('acilis_miktari', 0) > 0:
        hareket = {
            'id': str(datetime.now(timezone.utc).timestamp()).replace(".", "") + "h",
            'urun_id': data['id'],
            'urun_adi': data['urun_adi'],
            'hareket_tipi': 'acilis',
            'miktar': data['acilis_miktari'],
            'tarih': data.get('acilis_tarihi') or datetime.now().strftime('%Y-%m-%d'),
            'aciklama': 'Açılış fişi',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.bims_stok_hareketler.insert_one(hareket)
    
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/bims-stok-urunler")
async def get_bims_stok_urunler(current_user: dict = Depends(get_current_user)):
    records = await db.bims_stok_urunler.find({}, {"_id": 0}).sort("urun_adi", 1).to_list(1000)
    return records

@api_router.get("/bims-stok-urunler/{id}")
async def get_bims_stok_urun(id: str, current_user: dict = Depends(get_current_user)):
    record = await db.bims_stok_urunler.find_one({"id": id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Stok ürün bulunamadı")
    return record

@api_router.put("/bims-stok-urunler/{id}")
async def update_bims_stok_urun(id: str, input: BimsStokUrunUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.bims_stok_urunler.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Stok ürün bulunamadı")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.bims_stok_urunler.update_one({"id": id}, {"$set": update_data})
    updated = await db.bims_stok_urunler.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/bims-stok-urunler/{id}")
async def delete_bims_stok_urun(id: str, current_user: dict = Depends(get_current_user)):
    result = await db.bims_stok_urunler.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stok ürün bulunamadı")
    # İlgili hareketleri de sil
    await db.bims_stok_hareketler.delete_many({"urun_id": id})
    return {"message": "Stok ürün silindi"}

# Stok Hareketleri
@api_router.post("/bims-stok-hareketler")
async def create_bims_stok_hareket(input: BimsStokHareketCreate, current_user: dict = Depends(get_current_user)):
    # Ürünü kontrol et
    urun = await db.bims_stok_urunler.find_one({"id": input.urun_id}, {"_id": 0})
    if not urun:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['urun_adi'] = urun['urun_adi']
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.bims_stok_hareketler.insert_one(data)
    
    # Stok miktarını güncelle
    mevcut_stok = urun.get('mevcut_stok', 0)
    if data['hareket_tipi'] in ['giris', 'acilis']:
        yeni_stok = mevcut_stok + data['miktar']
    else:  # cikis
        yeni_stok = mevcut_stok - data['miktar']
    
    await db.bims_stok_urunler.update_one(
        {"id": input.urun_id},
        {"$set": {"mevcut_stok": yeni_stok, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/bims-stok-hareketler")
async def get_bims_stok_hareketler(urun_id: str = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if urun_id:
        query['urun_id'] = urun_id
    records = await db.bims_stok_hareketler.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return records

@api_router.delete("/bims-stok-hareketler/{id}")
async def delete_bims_stok_hareket(id: str, current_user: dict = Depends(get_current_user)):
    # Hareketi bul
    hareket = await db.bims_stok_hareketler.find_one({"id": id}, {"_id": 0})
    if not hareket:
        raise HTTPException(status_code=404, detail="Hareket bulunamadı")
    
    # Stok miktarını geri al
    urun = await db.bims_stok_urunler.find_one({"id": hareket['urun_id']}, {"_id": 0})
    if urun:
        mevcut_stok = urun.get('mevcut_stok', 0)
        if hareket['hareket_tipi'] in ['giris', 'acilis']:
            yeni_stok = mevcut_stok - hareket['miktar']
        else:  # cikis
            yeni_stok = mevcut_stok + hareket['miktar']
        
        await db.bims_stok_urunler.update_one(
            {"id": hareket['urun_id']},
            {"$set": {"mevcut_stok": yeni_stok, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    await db.bims_stok_hareketler.delete_one({"id": id})
    return {"message": "Hareket silindi"}

# Stok Özeti
@api_router.get("/bims-stok-ozet")
async def get_bims_stok_ozet(current_user: dict = Depends(get_current_user)):
    urunler = await db.bims_stok_urunler.find({}, {"_id": 0}).to_list(1000)
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
    department_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "name": department.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.departments.insert_one(department_dict)
    return DepartmentResponse(**department_dict)

@api_router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(current_user: dict = Depends(get_current_user)):
    departments = await db.departments.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [DepartmentResponse(**d) for d in departments]

@api_router.delete("/departments/{department_id}")
async def delete_department(department_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.departments.delete_one({"id": department_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department deleted"}

# Operator routes
@api_router.post("/operators", response_model=OperatorResponse)
async def create_operator(operator: OperatorCreate, current_user: dict = Depends(get_current_user)):
    operator_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "name": operator.name,
        "employee_id": operator.employee_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.operators.insert_one(operator_dict)
    return OperatorResponse(**operator_dict)

@api_router.get("/operators", response_model=List[OperatorResponse])
async def get_operators(current_user: dict = Depends(get_current_user)):
    operators = await db.operators.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [OperatorResponse(**o) for o in operators]

@api_router.delete("/operators/{operator_id}")
async def delete_operator(operator_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.operators.delete_one({"id": operator_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Operator not found")
    return {"message": "Operator deleted"}

# Mold routes
@api_router.post("/molds", response_model=MoldResponse)
async def create_mold(mold: MoldCreate, current_user: dict = Depends(get_current_user)):
    mold_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "mold_no": mold.mold_no,
        "description": mold.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.molds.insert_one(mold_dict)
    return MoldResponse(**mold_dict)

@api_router.get("/molds", response_model=List[MoldResponse])
async def get_molds(current_user: dict = Depends(get_current_user)):
    molds = await db.molds.find({}, {"_id": 0}).sort("mold_no", 1).to_list(1000)
    return [MoldResponse(**m) for m in molds]

@api_router.delete("/molds/{mold_id}")
async def delete_mold(mold_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.molds.delete_one({"id": mold_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mold not found")
    return {"message": "Mold deleted"}

# ============ Çimento Modülü Kaynakları ============

# Çimento Firmaları
@api_router.post("/cimento-firmalar", response_model=CimentoFirmaResponse)
async def create_cimento_firma(firma: CimentoFirmaCreate, current_user: dict = Depends(get_current_user)):
    firma_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "name": firma.name,
        "contact_person": firma.contact_person,
        "phone": firma.phone,
        "address": firma.address,
        "notes": firma.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cimento_firmalar.insert_one(firma_dict)
    return CimentoFirmaResponse(**firma_dict)

@api_router.get("/cimento-firmalar", response_model=List[CimentoFirmaResponse])
async def get_cimento_firmalar(current_user: dict = Depends(get_current_user)):
    firmalar = await db.cimento_firmalar.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [CimentoFirmaResponse(**f) for f in firmalar]

@api_router.delete("/cimento-firmalar/{firma_id}")
async def delete_cimento_firma(firma_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.cimento_firmalar.delete_one({"id": firma_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Firma not found")
    return {"message": "Firma deleted"}

# Nakliyeci Firmaları
@api_router.post("/nakliyeci-firmalar", response_model=NakliyeciFirmaResponse)
async def create_nakliyeci_firma(firma: NakliyeciFirmaCreate, current_user: dict = Depends(get_current_user)):
    firma_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "name": firma.name,
        "contact_person": firma.contact_person,
        "phone": firma.phone,
        "address": firma.address,
        "notes": firma.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.nakliyeci_firmalar.insert_one(firma_dict)
    return NakliyeciFirmaResponse(**firma_dict)

@api_router.get("/nakliyeci-firmalar", response_model=List[NakliyeciFirmaResponse])
async def get_nakliyeci_firmalar(current_user: dict = Depends(get_current_user)):
    firmalar = await db.nakliyeci_firmalar.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [NakliyeciFirmaResponse(**f) for f in firmalar]

@api_router.delete("/nakliyeci-firmalar/{firma_id}")
async def delete_nakliyeci_firma(firma_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.nakliyeci_firmalar.delete_one({"id": firma_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Firma not found")
    return {"message": "Firma deleted"}

# Plakalar
@api_router.post("/plakalar", response_model=PlakaResponse)
async def create_plaka(plaka: PlakaCreate, current_user: dict = Depends(get_current_user)):
    plaka_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "plaka": plaka.plaka,
        "vehicle_type": plaka.vehicle_type,
        "nakliyeci_id": plaka.nakliyeci_id,
        "nakliyeci_name": plaka.nakliyeci_name,
        "notes": plaka.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.plakalar.insert_one(plaka_dict)
    return PlakaResponse(**plaka_dict)

@api_router.get("/plakalar", response_model=List[PlakaResponse])
async def get_plakalar(current_user: dict = Depends(get_current_user)):
    plakalar = await db.plakalar.find({}, {"_id": 0}).sort("plaka", 1).to_list(1000)
    result = []
    for p in plakalar:
        # Eski format desteği (ad -> plaka)
        if 'ad' in p and 'plaka' not in p:
            p['plaka'] = p['ad']
        if 'plaka' not in p:
            p['plaka'] = ''
        if 'vehicle_type' not in p:
            p['vehicle_type'] = None
        if 'nakliyeci_id' not in p:
            p['nakliyeci_id'] = None
        if 'nakliyeci_name' not in p:
            p['nakliyeci_name'] = None
        if 'notes' not in p:
            p['notes'] = None
        result.append(PlakaResponse(**p))
    return result

@api_router.delete("/plakalar/{plaka_id}")
async def delete_plaka(plaka_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.plakalar.delete_one({"id": plaka_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plaka not found")
    return {"message": "Plaka deleted"}

# Şoförler
@api_router.post("/soforler", response_model=SoforResponse)
async def create_sofor(sofor: SoforCreate, current_user: dict = Depends(get_current_user)):
    sofor_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "name": sofor.name,
        "phone": sofor.phone,
        "license_no": sofor.license_no,
        "nakliyeci_id": sofor.nakliyeci_id,
        "nakliyeci_name": sofor.nakliyeci_name,
        "notes": sofor.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.soforler.insert_one(sofor_dict)
    return SoforResponse(**sofor_dict)

@api_router.get("/soforler", response_model=List[SoforResponse])
async def get_soforler(current_user: dict = Depends(get_current_user)):
    soforler = await db.soforler.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    result = []
    for s in soforler:
        # Eski format desteği (ad -> name)
        if 'ad' in s and 'name' not in s:
            s['name'] = s['ad']
        if 'name' not in s:
            s['name'] = ''
        if 'phone' not in s:
            s['phone'] = None
        if 'license_no' not in s:
            s['license_no'] = None
        if 'nakliyeci_id' not in s:
            s['nakliyeci_id'] = None
        if 'nakliyeci_name' not in s:
            s['nakliyeci_name'] = None
        if 'notes' not in s:
            s['notes'] = None
        result.append(SoforResponse(**s))
    return result

@api_router.delete("/soforler/{sofor_id}")
async def delete_sofor(sofor_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.soforler.delete_one({"id": sofor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Şoför not found")
    return {"message": "Şoför deleted"}

# Şehirler
@api_router.post("/sehirler", response_model=SehirResponse)
async def create_sehir(sehir: SehirCreate, current_user: dict = Depends(get_current_user)):
    sehir_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "name": sehir.name,
        "code": sehir.code,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sehirler.insert_one(sehir_dict)
    return SehirResponse(**sehir_dict)

@api_router.get("/sehirler", response_model=List[SehirResponse])
async def get_sehirler(current_user: dict = Depends(get_current_user)):
    sehirler = await db.sehirler.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    result = []
    for s in sehirler:
        # Eski format desteği (ad -> name)
        if 'ad' in s and 'name' not in s:
            s['name'] = s['ad']
        if 'name' not in s:
            s['name'] = ''
        if 'code' not in s:
            s['code'] = None
        result.append(SehirResponse(**s))
    return result

@api_router.delete("/sehirler/{sehir_id}")
async def delete_sehir(sehir_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.sehirler.delete_one({"id": sehir_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Şehir not found")
    return {"message": "Şehir deleted"}

# Çimento Cinsleri routes
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
    cins_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "name": cins.name,
        "description": cins.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cimento_cinsleri.insert_one(cins_dict)
    return CimentoCinsiResponse(**cins_dict)

@api_router.get("/cimento-cinsleri", response_model=List[CimentoCinsiResponse])
async def get_cimento_cinsleri(current_user: dict = Depends(get_current_user)):
    cinsleri = await db.cimento_cinsleri.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [CimentoCinsiResponse(**c) for c in cinsleri]

@api_router.delete("/cimento-cinsleri/{cins_id}")
async def delete_cimento_cinsi(cins_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.cimento_cinsleri.delete_one({"id": cins_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Çimento cinsi not found")
    return {"message": "Çimento cinsi deleted"}

# Production routes
@api_router.post("/production", response_model=ProductionRecordResponse)
async def create_production_record(record: ProductionRecordCreate, current_user: dict = Depends(get_current_user)):
    record_dict = {
        "id": str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
        "product_id": record.product_id,
        "product_name": record.product_name,
        "quantity": record.quantity,
        "unit": record.unit,
        "department_id": record.department_id,
        "department_name": record.department_name,
        "operator_id": record.operator_id,
        "operator_name": record.operator_name,
        "shift": record.shift,
        "notes": record.notes,
        "module": record.module,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        # Bims specific
        "production_date": record.production_date,
        "shift_type": record.shift_type,
        "shift_number": record.shift_number,
        "worked_hours": record.worked_hours,
        "required_hours": record.required_hours,
        "product_type": record.product_type,
        "mold_no": record.mold_no,
        "strip_used": record.strip_used,
        "pallet_count": record.pallet_count,
        "pallet_quantity": record.pallet_quantity,
        "waste": record.waste,
        "pieces_per_pallet": record.pieces_per_pallet,
        "mix_count": record.mix_count,
        "cement_in_mix": record.cement_in_mix,
        "machine_cement": record.machine_cement,
        "product_to_field": record.product_to_field,
        "product_length": record.product_length,
        "breakdown_1": record.breakdown_1,
        "breakdown_2": record.breakdown_2,
        "breakdown_3": record.breakdown_3,
    }
    
    await db.production_records.insert_one(record_dict)
    
    return ProductionRecordResponse(**record_dict)

@api_router.get("/production", response_model=List[ProductionRecordResponse])
async def get_production_records(
    skip: int = 0,
    limit: int = 50,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    module: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if module:
        query["module"] = module
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" not in query:
            query["created_at"] = {}
        query["created_at"]["$lte"] = end_date
    
    records = await db.production_records.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return [ProductionRecordResponse(**record) for record in records]

@api_router.get("/production/{record_id}", response_model=ProductionRecordResponse)
async def get_production_record(record_id: str, current_user: dict = Depends(get_current_user)):
    record = await db.production_records.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return ProductionRecordResponse(**record)

@api_router.put("/production/{record_id}", response_model=ProductionRecordResponse)
async def update_production_record(
    record_id: str,
    update_data: ProductionRecordUpdate,
    current_user: dict = Depends(get_current_user)
):
    record = await db.production_records.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.production_records.update_one({"id": record_id}, {"$set": update_dict})
    
    updated_record = await db.production_records.find_one({"id": record_id}, {"_id": 0})
    return ProductionRecordResponse(**updated_record)

@api_router.delete("/production/{record_id}")
async def delete_production_record(record_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.production_records.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return {"message": "Record deleted successfully"}

# Reports routes
@api_router.get("/reports/stats", response_model=DashboardStats)
async def get_dashboard_stats(module: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today = now.strftime('%Y-%m-%d')
    week_ago = (now - timedelta(days=7)).strftime('%Y-%m-%d')
    month_ago = (now - timedelta(days=30)).strftime('%Y-%m-%d')
    
    query = {"module": module} if module else {}
    
    total_records = await db.production_records.count_documents(query)
    
    # production_date bazlı sorgular
    all_records = await db.production_records.find(query, {"_id": 0}).to_list(10000)
    
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
    
    recent = await db.production_records.find(query, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_records = [ProductionRecordResponse(**r) for r in recent]
    
    return DashboardStats(
        total_records=total_records,
        today_production=today_production,
        week_production=week_production,
        month_production=month_production,
        recent_records=recent_records
    )

@api_router.get("/reports/daily")
async def get_daily_report(
    days: int = 7,
    module: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days)).strftime('%Y-%m-%d')
    
    query = {}
    if module:
        query["module"] = module
    
    records = await db.production_records.find(
        query,
        {"_id": 0}
    ).to_list(1000)
    
    daily_data = {}
    for record in records:
        # production_date kullan, yoksa created_at'in tarih kısmını al
        date_key = record.get("production_date") or record["created_at"][:10]
        if date_key >= start_date:
            if date_key not in daily_data:
                daily_data[date_key] = {"date": date_key, "quantity": 0, "records": 0, "net_pallets": 0}
            daily_data[date_key]["quantity"] += record.get("quantity", 0)
            daily_data[date_key]["records"] += 1
            # Net palet hesapla: pallet_count - waste
            pallet_count = record.get("pallet_count", 0) or 0
            waste = record.get("waste", 0) or 0
            daily_data[date_key]["net_pallets"] += (pallet_count - waste)
    
    return {"data": sorted(daily_data.values(), key=lambda x: x["date"])}

@api_router.get("/reports/today-details")
async def get_today_details(
    module: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Bugünkü üretimi işletme ve vardiya bazında detaylı getir (production_date bazlı)"""
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    query = {"production_date": today}
    if module:
        query["module"] = module
    
    records = await db.production_records.find(query, {"_id": 0}).to_list(1000)
    
    # İşletme ve vardiya bazında grupla
    details = {}
    total_quantity = 0
    total_net_pallets = 0
    
    for record in records:
        dept_name = record.get("department_name") or "Belirtilmemiş"
        shift_type = record.get("shift_type") or "belirtilmemis"
        
        if dept_name not in details:
            details[dept_name] = {
                "department_name": dept_name,
                "gunduz_quantity": 0,
                "gece_quantity": 0,
                "gunduz_net_pallets": 0,
                "gece_net_pallets": 0,
                "total_quantity": 0,
                "total_net_pallets": 0
            }
        
        quantity = record.get("quantity", 0) or 0
        pallet_count = record.get("pallet_count", 0) or 0
        waste = record.get("waste", 0) or 0
        net_pallets = pallet_count - waste
        
        if shift_type == "gunduz":
            details[dept_name]["gunduz_quantity"] += quantity
            details[dept_name]["gunduz_net_pallets"] += net_pallets
        else:
            details[dept_name]["gece_quantity"] += quantity
            details[dept_name]["gece_net_pallets"] += net_pallets
        
        details[dept_name]["total_quantity"] += quantity
        details[dept_name]["total_net_pallets"] += net_pallets
        total_quantity += quantity
        total_net_pallets += net_pallets
    
    return {
        "date": today,
        "departments": list(details.values()),
        "grand_total_quantity": total_quantity,
        "grand_total_net_pallets": total_net_pallets
    }

@api_router.get("/reports/daily-detailed")
async def get_daily_detailed_report(
    days: int = 7,
    module: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Gün gün detaylı üretim raporu - işletme, ürün, vardiya bazında"""
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days)).strftime('%Y-%m-%d')
    
    query = {}
    if module:
        query["module"] = module
    
    records = await db.production_records.find(query, {"_id": 0}).to_list(10000)
    
    # Gün bazında grupla
    daily_details = {}
    
    for record in records:
        prod_date = record.get("production_date") or record["created_at"][:10]
        
        if prod_date < start_date:
            continue
            
        if prod_date not in daily_details:
            daily_details[prod_date] = {
                "date": prod_date,
                "records": [],
                "totals": {
                    "gunduz_quantity": 0,
                    "gece_quantity": 0,
                    "total_quantity": 0,
                    "gunduz_net_pallets": 0,
                    "gece_net_pallets": 0,
                    "total_net_pallets": 0
                }
            }
        
        dept_name = record.get("department_name") or "Belirtilmemiş"
        product_name = record.get("product_name") or "Belirtilmemiş"
        shift_type = record.get("shift_type") or "belirtilmemis"
        quantity = record.get("quantity", 0) or 0
        pallet_count = record.get("pallet_count", 0) or 0
        waste = record.get("waste", 0) or 0
        net_pallets = pallet_count - waste
        
        # Kayıt detayını ekle
        daily_details[prod_date]["records"].append({
            "department_name": dept_name,
            "product_name": product_name,
            "shift_type": shift_type,
            "quantity": quantity,
            "net_pallets": net_pallets,
            "pallet_count": pallet_count,
            "waste": waste
        })
        
        # Günlük toplamları güncelle
        if shift_type == "gunduz":
            daily_details[prod_date]["totals"]["gunduz_quantity"] += quantity
            daily_details[prod_date]["totals"]["gunduz_net_pallets"] += net_pallets
        else:
            daily_details[prod_date]["totals"]["gece_quantity"] += quantity
            daily_details[prod_date]["totals"]["gece_net_pallets"] += net_pallets
        
        daily_details[prod_date]["totals"]["total_quantity"] += quantity
        daily_details[prod_date]["totals"]["total_net_pallets"] += net_pallets
    
    # Genel toplamları hesapla
    grand_totals = {
        "gunduz_quantity": 0,
        "gece_quantity": 0,
        "total_quantity": 0,
        "gunduz_net_pallets": 0,
        "gece_net_pallets": 0,
        "total_net_pallets": 0,
        "total_days": len(daily_details)
    }
    
    for day_data in daily_details.values():
        grand_totals["gunduz_quantity"] += day_data["totals"]["gunduz_quantity"]
        grand_totals["gece_quantity"] += day_data["totals"]["gece_quantity"]
        grand_totals["total_quantity"] += day_data["totals"]["total_quantity"]
        grand_totals["gunduz_net_pallets"] += day_data["totals"]["gunduz_net_pallets"]
        grand_totals["gece_net_pallets"] += day_data["totals"]["gece_net_pallets"]
        grand_totals["total_net_pallets"] += day_data["totals"]["total_net_pallets"]
    
    # Tarihe göre sırala (en yeni en üstte)
    sorted_data = sorted(daily_details.values(), key=lambda x: x["date"], reverse=True)
    
    return {
        "data": sorted_data,
        "grand_totals": grand_totals
    }

# ============ Çimento Giriş Tablosu API'leri ============

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
    """Çimento giriş hesaplamaları"""
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
    data = input.model_dump()
    data = calculate_cimento_fields(data)
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    data['user_id'] = current_user['id']
    data['user_name'] = current_user['name']
    
    await db.cimento_giris.insert_one(data)
    return data

@api_router.get("/cimento-giris")
async def get_cimento_giris(current_user: dict = Depends(get_current_user)):
    records = await db.cimento_giris.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return records

@api_router.put("/cimento-giris/{id}")
async def update_cimento_giris(id: str, input: CimentoGirisUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.cimento_giris.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    for key, value in update_data.items():
        existing[key] = value
    
    existing = calculate_cimento_fields(existing)
    existing['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.cimento_giris.update_one({"id": id}, {"$set": existing})
    return existing

@api_router.delete("/cimento-giris/{id}")
async def delete_cimento_giris(id: str, current_user: dict = Depends(get_current_user)):
    result = await db.cimento_giris.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    return {"message": "Kayıt silindi"}

@api_router.get("/cimento-giris-ozet")
async def get_cimento_giris_ozet(current_user: dict = Depends(get_current_user)):
    records = await db.cimento_giris.find({}, {"_id": 0}).to_list(1000)
    
    return {
        "kayit_sayisi": len(records),
        "toplam_giris_miktari": sum(r.get('giris_miktari', 0) for r in records),
        "toplam_kantar_kg": sum(r.get('kantar_kg_miktari', 0) for r in records),
        "toplam_fark": sum(r.get('aradaki_fark', 0) for r in records),
        "toplam_giris_tutari": sum(r.get('giris_tutari', 0) for r in records),
        "toplam_giris_kdv": sum(r.get('giris_kdv_tutari', 0) for r in records),
        "toplam_giris_kdv_dahil": sum(r.get('giris_kdv_dahil_toplam', 0) for r in records),
        "toplam_nakliye_matrah": sum(r.get('nakliye_matrahi', 0) for r in records),
        "toplam_nakliye_kdv": sum(r.get('nakliye_kdv_tutari', 0) for r in records),
        "toplam_nakliye_genel": sum(r.get('nakliye_genel_toplam', 0) for r in records),
        "toplam_urun_nakliye_matrah": sum(r.get('urun_nakliye_matrah', 0) for r in records),
        "toplam_urun_nakliye_kdv": sum(r.get('urun_nakliye_kdv_toplam', 0) for r in records),
        "toplam_urun_nakliye_tevkifat": sum(r.get('urun_nakliye_tevkifat_toplam', 0) for r in records),
        "toplam_urun_nakliye_genel": sum(r.get('urun_nakliye_genel_toplam', 0) for r in records)
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

# Personel CRUD
@api_router.post("/personeller")
async def create_personel(input: PersonelCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    data['yillik_izin_hakki'] = 14  # Varsayılan yıllık izin
    data['kullanilan_izin'] = 0
    data['kalan_izin'] = 14
    await db.personeller.insert_one(data)
    return data

@api_router.get("/personeller")
async def get_personeller(current_user: dict = Depends(get_current_user)):
    records = await db.personeller.find({}, {"_id": 0}).sort("ad_soyad", 1).to_list(1000)
    return records

@api_router.get("/personeller/{id}")
async def get_personel(id: str, current_user: dict = Depends(get_current_user)):
    record = await db.personeller.find_one({"id": id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    return record

@api_router.put("/personeller/{id}")
async def update_personel(id: str, input: PersonelUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.personeller.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    for key, value in update_data.items():
        existing[key] = value
    
    existing['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.personeller.update_one({"id": id}, {"$set": existing})
    return existing

@api_router.delete("/personeller/{id}")
async def delete_personel(id: str, current_user: dict = Depends(get_current_user)):
    result = await db.personeller.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    return {"message": "Personel silindi"}

# Puantaj (Giriş-Çıkış) API'leri
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
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    
    # Mesai hesaplama
    if data['giris_saati'] and data['cikis_saati']:
        try:
            giris = datetime.strptime(data['giris_saati'], "%H:%M")
            cikis = datetime.strptime(data['cikis_saati'], "%H:%M")
            fark = (cikis - giris).seconds / 3600
            data['mesai_suresi'] = round(fark, 2)
            data['fazla_mesai'] = max(0, round(fark - 8, 2))  # 8 saatten fazlası fazla mesai
        except:
            pass
    
    await db.puantaj.insert_one(data)
    return data

@api_router.get("/puantaj")
async def get_puantaj(
    personel_id: Optional[str] = None,
    tarih_baslangic: Optional[str] = None,
    tarih_bitis: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if personel_id:
        query['personel_id'] = personel_id
    if tarih_baslangic and tarih_bitis:
        query['tarih'] = {"$gte": tarih_baslangic, "$lte": tarih_bitis}
    
    records = await db.puantaj.find(query, {"_id": 0}).sort("tarih", -1).to_list(1000)
    return records

@api_router.delete("/puantaj/{id}")
async def delete_puantaj(id: str, current_user: dict = Depends(get_current_user)):
    result = await db.puantaj.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Puantaj kaydı bulunamadı")
    return {"message": "Puantaj kaydı silindi"}

# İzin API'leri
class IzinCreate(BaseModel):
    personel_id: str
    personel_adi: str
    izin_turu: str  # Yıllık, Mazeret, Hastalık, Ücretsiz
    baslangic_tarihi: str
    bitis_tarihi: str
    gun_sayisi: int = 1
    aciklama: str = ""
    durum: str = "Beklemede"  # Beklemede, Onaylandı, Reddedildi

@api_router.post("/izinler")
async def create_izin(input: IzinCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    data['onayla_tarihi'] = ""
    data['onaylayan'] = ""
    
    await db.izinler.insert_one(data)
    return data

@api_router.get("/izinler")
async def get_izinler(personel_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if personel_id:
        query['personel_id'] = personel_id
    records = await db.izinler.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return records

@api_router.put("/izinler/{id}/onayla")
async def onayla_izin(id: str, durum: str, current_user: dict = Depends(get_current_user)):
    existing = await db.izinler.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="İzin kaydı bulunamadı")
    
    existing['durum'] = durum
    existing['onayla_tarihi'] = datetime.now(timezone.utc).isoformat()
    existing['onaylayan'] = current_user['name']
    
    # Eğer onaylandıysa ve yıllık izinse, personelin izin hakkından düş
    if durum == "Onaylandı" and existing['izin_turu'] == "Yıllık":
        personel = await db.personeller.find_one({"id": existing['personel_id']})
        if personel:
            kullanilan = personel.get('kullanilan_izin', 0) + existing['gun_sayisi']
            kalan = personel.get('yillik_izin_hakki', 14) - kullanilan
            await db.personeller.update_one(
                {"id": existing['personel_id']},
                {"$set": {"kullanilan_izin": kullanilan, "kalan_izin": kalan}}
            )
    
    await db.izinler.update_one({"id": id}, {"$set": existing})
    return existing

@api_router.delete("/izinler/{id}")
async def delete_izin(id: str, current_user: dict = Depends(get_current_user)):
    result = await db.izinler.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="İzin kaydı bulunamadı")
    return {"message": "İzin kaydı silindi"}

# Maaş Bordrosu API'leri
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
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    
    # Otomatik hesaplamalar (2024 oranları tahmini)
    brut = data['brut_maas']
    data['sgk_isci'] = round(brut * 0.14, 2)  # %14 SGK işçi payı
    data['sgk_isveren'] = round(brut * 0.205, 2)  # %20.5 SGK işveren payı
    data['gelir_vergisi'] = round((brut - data['sgk_isci']) * 0.15, 2)  # %15 gelir vergisi (basit)
    data['damga_vergisi'] = round(brut * 0.00759, 2)  # %0.759 damga vergisi
    data['net_maas'] = round(brut - data['sgk_isci'] - data['gelir_vergisi'] - data['damga_vergisi'], 2)
    data['toplam_odeme'] = round(data['net_maas'] + data['fazla_mesai_ucreti'] + data['ikramiye'] - data['kesintiler'], 2)
    
    await db.maas_bordrolari.insert_one(data)
    return data

@api_router.get("/maas-bordrolari")
async def get_maas_bordrolari(
    personel_id: Optional[str] = None,
    yil: Optional[int] = None,
    ay: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if personel_id:
        query['personel_id'] = personel_id
    if yil:
        query['yil'] = yil
    if ay:
        query['ay'] = ay
    
    records = await db.maas_bordrolari.find(query, {"_id": 0}).sort([("yil", -1), ("ay", -1)]).to_list(1000)
    return records

@api_router.put("/maas-bordrolari/{id}/odendi")
async def maas_odendi(id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.maas_bordrolari.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Bordro bulunamadı")
    
    existing['odendi'] = True
    existing['odeme_tarihi'] = datetime.now(timezone.utc).isoformat()
    
    await db.maas_bordrolari.update_one({"id": id}, {"$set": existing})
    return existing

# Personel Özet API
@api_router.get("/personel-ozet")
async def get_personel_ozet(current_user: dict = Depends(get_current_user)):
    personeller = await db.personeller.find({"aktif": True}, {"_id": 0}).to_list(1000)
    puantaj_bugun = await db.puantaj.find({"tarih": datetime.now().strftime("%Y-%m-%d")}, {"_id": 0}).to_list(1000)
    bekleyen_izinler = await db.izinler.find({"durum": "Beklemede"}, {"_id": 0}).to_list(1000)
    
    toplam_maas = sum(p.get('maas', 0) for p in personeller)
    
    return {
        "toplam_personel": len(personeller),
        "bugun_giris_yapan": len(puantaj_bugun),
        "bekleyen_izin_talepleri": len(bekleyen_izinler),
        "toplam_maas_gideri": toplam_maas
    }

# Departman API'leri (Personel için)
class PersonelDepartmanCreate(BaseModel):
    name: str
    aciklama: str = ""

@api_router.post("/personel-departmanlar")
async def create_personel_departman(input: PersonelDepartmanCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.personel_departmanlar.insert_one(data)
    return data

@api_router.get("/personel-departmanlar")
async def get_personel_departmanlar(current_user: dict = Depends(get_current_user)):
    records = await db.personel_departmanlar.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.delete("/personel-departmanlar/{id}")
async def delete_personel_departman(id: str, current_user: dict = Depends(get_current_user)):
    await db.personel_departmanlar.delete_one({"id": id})
    return {"message": "Departman silindi"}

# Pozisyon API'leri
class PozisyonCreate(BaseModel):
    name: str
    departman: str = ""

@api_router.post("/pozisyonlar")
async def create_pozisyon(input: PozisyonCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.pozisyonlar.insert_one(data)
    return data

@api_router.get("/pozisyonlar")
async def get_pozisyonlar(current_user: dict = Depends(get_current_user)):
    records = await db.pozisyonlar.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.delete("/pozisyonlar/{id}")
async def delete_pozisyon(id: str, current_user: dict = Depends(get_current_user)):
    await db.pozisyonlar.delete_one({"id": id})
    return {"message": "Pozisyon silindi"}

# ============ ARAÇ MODÜLÜ API'LERİ ============

# Uploads klasörü
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

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
    ruhsat_dosya: Optional[str] = None
    kasko_dosya: Optional[str] = None
    sigorta_dosya: Optional[str] = None
    muayene_evrak: Optional[str] = None

# Dosya yükleme endpoint'i (genel - tüm formatlar)
@api_router.post("/upload-file")
async def upload_general_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Benzersiz dosya adı oluştur
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Dosyayı kaydet
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "filename": unique_filename,
        "original_name": file.filename,
        "path": f"/api/files/{unique_filename}"
    }

# Dosya indirme/görüntüleme endpoint'i (tüm formatlar)
@api_router.get("/files/{filename}")
async def get_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    # Dosya uzantısına göre media type belirle
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

# Muayene evrak yükleme endpoint'i
@api_router.post("/araclar/{id}/upload/muayene-evrak")
async def upload_muayene_evrak(
    id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    arac = await db.araclar.find_one({"id": id}, {"_id": 0})
    if not arac:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    # Eski dosyayı sil
    if arac.get('muayene_evrak'):
        old_file_path = UPLOAD_DIR / arac['muayene_evrak'].split('/')[-1]
        if old_file_path.exists():
            old_file_path.unlink()
    
    # Yeni dosyayı kaydet
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    unique_filename = f"{id}_muayene_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Veritabanını güncelle
    await db.araclar.update_one(
        {"id": id},
        {"$set": {
            "muayene_evrak": f"/api/files/{unique_filename}",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "filename": unique_filename,
        "original_name": file.filename,
        "path": f"/api/files/{unique_filename}"
    }

# Muayene evrak silme endpoint'i
@api_router.delete("/araclar/{id}/file/muayene-evrak")
async def delete_muayene_evrak(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    arac = await db.araclar.find_one({"id": id}, {"_id": 0})
    if not arac:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    if arac.get('muayene_evrak'):
        file_path = UPLOAD_DIR / arac['muayene_evrak'].split('/')[-1]
        if file_path.exists():
            file_path.unlink()
        
        await db.araclar.update_one(
            {"id": id},
            {"$set": {
                "muayene_evrak": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {"message": "Muayene evrakı silindi"}

# Muayene Geçmişi API'leri
class MuayeneGecmisiCreate(BaseModel):
    arac_id: str
    plaka: str
    ilk_muayene_tarihi: str
    son_muayene_tarihi: str
    notlar: str = ""

@api_router.post("/muayene-gecmisi")
async def create_muayene_gecmisi(input: MuayeneGecmisiCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    data['created_by'] = current_user.get('email', '')
    await db.muayene_gecmisi.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/muayene-gecmisi")
async def get_muayene_gecmisi(arac_id: str = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if arac_id:
        query['arac_id'] = arac_id
    records = await db.muayene_gecmisi.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return records

@api_router.delete("/muayene-gecmisi/{id}")
async def delete_muayene_gecmisi(id: str, current_user: dict = Depends(get_current_user)):
    await db.muayene_gecmisi.delete_one({"id": id})
    return {"message": "Muayene geçmişi silindi"}

# Muayene Geçmişi Güncelleme
class MuayeneGecmisiUpdate(BaseModel):
    ilk_muayene_tarihi: Optional[str] = None
    son_muayene_tarihi: Optional[str] = None
    notlar: Optional[str] = None

@api_router.put("/muayene-gecmisi/{id}")
async def update_muayene_gecmisi(id: str, input: MuayeneGecmisiUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.muayene_gecmisi.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.muayene_gecmisi.update_one({"id": id}, {"$set": update_data})
    
    updated = await db.muayene_gecmisi.find_one({"id": id}, {"_id": 0})
    return updated

# Muayene Yenileme (eski tarihleri geçmişe kaydet + yeni tarihleri güncelle)
class MuayeneYenileme(BaseModel):
    yeni_ilk_muayene_tarihi: str
    yeni_son_muayene_tarihi: str
    notlar: str = ""

@api_router.post("/araclar/{id}/muayene-yenile")
async def muayene_yenile(id: str, input: MuayeneYenileme, current_user: dict = Depends(get_current_user)):
    # Aracı bul
    arac = await db.araclar.find_one({"id": id}, {"_id": 0})
    if not arac:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    # Eski muayene tarihlerini geçmişe kaydet (eğer varsa)
    if arac.get('ilk_muayene_tarihi') or arac.get('son_muayene_tarihi'):
        gecmis_data = {
            'id': str(datetime.now(timezone.utc).timestamp()).replace(".", ""),
            'arac_id': id,
            'plaka': arac.get('plaka', ''),
            'ilk_muayene_tarihi': arac.get('ilk_muayene_tarihi', ''),
            'son_muayene_tarihi': arac.get('son_muayene_tarihi', ''),
            'notlar': input.notlar,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'created_by': current_user.get('email', '')
        }
        await db.muayene_gecmisi.insert_one(gecmis_data)
    
    # Aracın muayene tarihlerini güncelle
    await db.araclar.update_one(
        {"id": id},
        {"$set": {
            "ilk_muayene_tarihi": input.yeni_ilk_muayene_tarihi,
            "son_muayene_tarihi": input.yeni_son_muayene_tarihi,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Muayene yenilendi", "arac_id": id}

# Araç CRUD işlemleri
@api_router.post("/araclar")
async def create_arac(input: AracCreate, current_user: dict = Depends(get_current_user)):
    # Plaka kontrolü
    existing = await db.araclar.find_one({"plaka": input.plaka.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Bu plaka zaten kayıtlı")
    
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['plaka'] = data['plaka'].upper()
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    data['ruhsat_dosya'] = None
    data['kasko_dosya'] = None
    data['sigorta_dosya'] = None
    
    await db.araclar.insert_one(data)
    
    # Return the data without MongoDB ObjectId
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/araclar")
async def get_araclar(current_user: dict = Depends(get_current_user)):
    records = await db.araclar.find({}, {"_id": 0}).sort("plaka", 1).to_list(1000)
    return records

@api_router.get("/araclar/{id}")
async def get_arac(id: str, current_user: dict = Depends(get_current_user)):
    record = await db.araclar.find_one({"id": id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    return record

@api_router.put("/araclar/{id}")
async def update_arac(id: str, input: AracUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.araclar.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    # Plaka değişiyorsa kontrol et
    if 'plaka' in update_data:
        update_data['plaka'] = update_data['plaka'].upper()
        check_plaka = await db.araclar.find_one({"plaka": update_data['plaka'], "id": {"$ne": id}})
        if check_plaka:
            raise HTTPException(status_code=400, detail="Bu plaka başka bir araçta kayıtlı")
    
    for key, value in update_data.items():
        existing[key] = value
    
    existing['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.araclar.update_one({"id": id}, {"$set": existing})
    return existing

@api_router.delete("/araclar/{id}")
async def delete_arac(id: str, current_user: dict = Depends(get_current_user)):
    # Önce aracın dosyalarını sil
    arac = await db.araclar.find_one({"id": id}, {"_id": 0})
    if arac:
        for field in ['ruhsat_dosya', 'kasko_dosya', 'sigorta_dosya']:
            if arac.get(field):
                file_path = UPLOAD_DIR / arac[field].split('/')[-1]
                if file_path.exists():
                    file_path.unlink()
    
    result = await db.araclar.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    return {"message": "Araç silindi"}

# Araç dosya yükleme (özel endpoint)
@api_router.post("/araclar/{id}/upload/{doc_type}")
async def upload_arac_document(
    id: str,
    doc_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if doc_type not in ['ruhsat', 'kasko', 'sigorta']:
        raise HTTPException(status_code=400, detail="Geçersiz dosya tipi")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyaları yüklenebilir")
    
    arac = await db.araclar.find_one({"id": id}, {"_id": 0})
    if not arac:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    # Eski dosyayı sil
    old_file_field = f"{doc_type}_dosya"
    if arac.get(old_file_field):
        old_file_path = UPLOAD_DIR / arac[old_file_field].split('/')[-1]
        if old_file_path.exists():
            old_file_path.unlink()
    
    # Yeni dosyayı kaydet
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{id}_{doc_type}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Veritabanını güncelle
    await db.araclar.update_one(
        {"id": id},
        {"$set": {
            old_file_field: f"/api/files/{unique_filename}",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "filename": unique_filename,
        "path": f"/api/files/{unique_filename}",
        "doc_type": doc_type
    }

# Araç dosya silme
@api_router.delete("/araclar/{id}/file/{doc_type}")
async def delete_arac_document(
    id: str,
    doc_type: str,
    current_user: dict = Depends(get_current_user)
):
    if doc_type not in ['ruhsat', 'kasko', 'sigorta']:
        raise HTTPException(status_code=400, detail="Geçersiz dosya tipi")
    
    arac = await db.araclar.find_one({"id": id}, {"_id": 0})
    if not arac:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    file_field = f"{doc_type}_dosya"
    if arac.get(file_field):
        file_path = UPLOAD_DIR / arac[file_field].split('/')[-1]
        if file_path.exists():
            file_path.unlink()
        
        await db.araclar.update_one(
            {"id": id},
            {"$set": {
                file_field: None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {"message": f"{doc_type} dosyası silindi"}

# Araç özet istatistikleri
@api_router.get("/arac-ozet")
async def get_arac_ozet(current_user: dict = Depends(get_current_user)):
    araclar = await db.araclar.find({"aktif": True}, {"_id": 0}).to_list(1000)
    
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    next_30_days = (datetime.now(timezone.utc) + timedelta(days=30)).strftime('%Y-%m-%d')
    
    muayene_yaklasan = 0
    kasko_yaklasan = 0
    sigorta_yaklasan = 0
    
    for arac in araclar:
        if arac.get('muayene_tarihi') and arac['muayene_tarihi'] <= next_30_days:
            muayene_yaklasan += 1
        if arac.get('kasko_yenileme_tarihi') and arac['kasko_yenileme_tarihi'] <= next_30_days:
            kasko_yaklasan += 1
        if arac.get('sigorta_yenileme_tarihi') and arac['sigorta_yenileme_tarihi'] <= next_30_days:
            sigorta_yaklasan += 1
    
    return {
        "toplam_arac": len(araclar),
        "muayene_yaklasan": muayene_yaklasan,
        "kasko_yaklasan": kasko_yaklasan,
        "sigorta_yaklasan": sigorta_yaklasan
    }

# Araç Cinsi API'leri
class AracCinsiCreate(BaseModel):
    name: str

@api_router.post("/arac-cinsleri")
async def create_arac_cinsi(input: AracCinsiCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.arac_cinsleri.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/arac-cinsleri")
async def get_arac_cinsleri(current_user: dict = Depends(get_current_user)):
    records = await db.arac_cinsleri.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.delete("/arac-cinsleri/{id}")
async def delete_arac_cinsi(id: str, current_user: dict = Depends(get_current_user)):
    await db.arac_cinsleri.delete_one({"id": id})
    return {"message": "Araç cinsi silindi"}

# Marka API'leri
class MarkaCreate(BaseModel):
    name: str

@api_router.post("/markalar")
async def create_marka(input: MarkaCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.markalar.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/markalar")
async def get_markalar(current_user: dict = Depends(get_current_user)):
    records = await db.markalar.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.delete("/markalar/{id}")
async def delete_marka(id: str, current_user: dict = Depends(get_current_user)):
    await db.markalar.delete_one({"id": id})
    return {"message": "Marka silindi"}

# Şirket API'leri (araç kayıtlı olduğu)
class SirketCreate(BaseModel):
    name: str
    vergi_no: str = ""
    adres: str = ""

@api_router.post("/sirketler")
async def create_sirket(input: SirketCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.sirketler.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/sirketler")
async def get_sirketler(current_user: dict = Depends(get_current_user)):
    records = await db.sirketler.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.delete("/sirketler/{id}")
async def delete_sirket(id: str, current_user: dict = Depends(get_current_user)):
    await db.sirketler.delete_one({"id": id})
    return {"message": "Şirket silindi"}

# Model API'leri (araç modelleri)
class ModelCreate(BaseModel):
    name: str
    marka: str = ""

@api_router.post("/modeller")
async def create_model(input: ModelCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.modeller.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/modeller")
async def get_modeller(marka: str = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if marka:
        query['marka'] = marka
    records = await db.modeller.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.delete("/modeller/{id}")
async def delete_model(id: str, current_user: dict = Depends(get_current_user)):
    await db.modeller.delete_one({"id": id})
    return {"message": "Model silindi"}

# Ana Sigorta Firması API'leri
class AnaSigortaFirmasiCreate(BaseModel):
    name: str
    telefon: str = ""
    email: str = ""
    adres: str = ""
    notlar: str = ""

@api_router.post("/ana-sigorta-firmalari")
async def create_ana_sigorta_firmasi(input: AnaSigortaFirmasiCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.ana_sigorta_firmalari.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/ana-sigorta-firmalari")
async def get_ana_sigorta_firmalari(current_user: dict = Depends(get_current_user)):
    records = await db.ana_sigorta_firmalari.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.delete("/ana-sigorta-firmalari/{id}")
async def delete_ana_sigorta_firmasi(id: str, current_user: dict = Depends(get_current_user)):
    await db.ana_sigorta_firmalari.delete_one({"id": id})
    return {"message": "Ana sigorta firması silindi"}

# Sigorta Acentası API'leri
class SigortaAcentasiCreate(BaseModel):
    name: str
    ana_firma: str = ""
    yetkili_kisi: str = ""
    telefon: str = ""
    email: str = ""
    adres: str = ""
    notlar: str = ""

@api_router.post("/sigorta-acentalari")
async def create_sigorta_acentasi(input: SigortaAcentasiCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.sigorta_acentalari.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/sigorta-acentalari")
async def get_sigorta_acentalari(current_user: dict = Depends(get_current_user)):
    records = await db.sigorta_acentalari.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.delete("/sigorta-acentalari/{id}")
async def delete_sigorta_acentasi(id: str, current_user: dict = Depends(get_current_user)):
    await db.sigorta_acentalari.delete_one({"id": id})
    return {"message": "Sigorta acentası silindi"}

# =====================================================
# MOTORİN MODÜLÜ API'LERİ
# =====================================================

# Motorin Tedarikçi Firmaları
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
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.motorin_tedarikciler.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/motorin-tedarikciler")
async def get_motorin_tedarikciler(current_user: dict = Depends(get_current_user)):
    records = await db.motorin_tedarikciler.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.put("/motorin-tedarikciler/{id}")
async def update_motorin_tedarikci(id: str, input: MotorinTedarikciCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.motorin_tedarikciler.update_one({"id": id}, {"$set": data})
    updated = await db.motorin_tedarikciler.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/motorin-tedarikciler/{id}")
async def delete_motorin_tedarikci(id: str, current_user: dict = Depends(get_current_user)):
    await db.motorin_tedarikciler.delete_one({"id": id})
    return {"message": "Tedarikçi silindi"}

# Boşaltım Tesisleri
class BosaltimTesisiCreate(BaseModel):
    name: str
    adres: str = ""
    notlar: str = ""

@api_router.post("/bosaltim-tesisleri")
async def create_bosaltim_tesisi(input: BosaltimTesisiCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.bosaltim_tesisleri.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/bosaltim-tesisleri")
async def get_bosaltim_tesisleri(current_user: dict = Depends(get_current_user)):
    records = await db.bosaltim_tesisleri.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.put("/bosaltim-tesisleri/{id}")
async def update_bosaltim_tesisi(id: str, input: BosaltimTesisiCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.bosaltim_tesisleri.update_one({"id": id}, {"$set": data})
    updated = await db.bosaltim_tesisleri.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/bosaltim-tesisleri/{id}")
async def delete_bosaltim_tesisi(id: str, current_user: dict = Depends(get_current_user)):
    await db.bosaltim_tesisleri.delete_one({"id": id})
    return {"message": "Tesis silindi"}

# Akaryakıt Markaları
class AkaryakitMarkasiCreate(BaseModel):
    name: str
    notlar: str = ""

@api_router.post("/akaryakit-markalari")
async def create_akaryakit_markasi(input: AkaryakitMarkasiCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.akaryakit_markalari.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/akaryakit-markalari")
async def get_akaryakit_markalari(current_user: dict = Depends(get_current_user)):
    records = await db.akaryakit_markalari.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return records

@api_router.put("/akaryakit-markalari/{id}")
async def update_akaryakit_markasi(id: str, input: AkaryakitMarkasiCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.akaryakit_markalari.update_one({"id": id}, {"$set": data})
    updated = await db.akaryakit_markalari.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/akaryakit-markalari/{id}")
async def delete_akaryakit_markasi(id: str, current_user: dict = Depends(get_current_user)):
    await db.akaryakit_markalari.delete_one({"id": id})
    return {"message": "Marka silindi"}

# Motorin Alım Kayıtları
class MotorinAlimCreate(BaseModel):
    tarih: str
    tedarikci_id: str = ""
    tedarikci_adi: str = ""
    akaryakit_markasi: str = ""  # Akaryakıt markası
    cekici_plaka: str = ""
    dorse_plaka: str = ""
    sofor_adi: str = ""
    sofor_soyadi: str = ""
    miktar_litre: float
    miktar_kg: float = 0
    kesafet: float = 0  # Yoğunluk (kg/litre)
    kantar_kg: float = 0
    birim_fiyat: float
    toplam_tutar: float
    fatura_no: str = ""
    irsaliye_no: str = ""
    odeme_durumu: str = "beklemede"  # beklemede, odendi, vadeli
    vade_tarihi: str = ""
    teslim_alan: str = ""
    bosaltim_tesisi: str = ""  # Boşaltım yapılan tesis
    notlar: str = ""

@api_router.post("/motorin-alimlar")
async def create_motorin_alim(input: MotorinAlimCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    data['created_by'] = current_user['id']
    data['created_by_name'] = current_user['name']
    await db.motorin_alimlar.insert_one(data)
    
    # Stok güncelle
    await update_motorin_stok()
    
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/motorin-alimlar")
async def get_motorin_alimlar(
    baslangic_tarihi: str = None,
    bitis_tarihi: str = None,
    tedarikci_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if baslangic_tarihi and bitis_tarihi:
        query['tarih'] = {"$gte": baslangic_tarihi, "$lte": bitis_tarihi}
    if tedarikci_id:
        query['tedarikci_id'] = tedarikci_id
    records = await db.motorin_alimlar.find(query, {"_id": 0}).sort("tarih", -1).to_list(1000)
    return records

@api_router.get("/motorin-alimlar/{id}")
async def get_motorin_alim(id: str, current_user: dict = Depends(get_current_user)):
    record = await db.motorin_alimlar.find_one({"id": id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    return record

@api_router.put("/motorin-alimlar/{id}")
async def update_motorin_alim(id: str, input: MotorinAlimCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.motorin_alimlar.update_one({"id": id}, {"$set": data})
    await update_motorin_stok()
    updated = await db.motorin_alimlar.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/motorin-alimlar/{id}")
async def delete_motorin_alim(id: str, current_user: dict = Depends(get_current_user)):
    await db.motorin_alimlar.delete_one({"id": id})
    await update_motorin_stok()
    return {"message": "Alım kaydı silindi"}

# Araçlara Motorin Verme Kayıtları
class MotorinVermeCreate(BaseModel):
    tarih: str
    bosaltim_tesisi: str = ""  # Hangi tesisten verildi
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
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    data['created_by'] = current_user['id']
    data['created_by_name'] = current_user['name']
    await db.motorin_verme.insert_one(data)
    
    # Stok güncelle
    await update_motorin_stok()
    
    return {k: v for k, v in data.items() if k != '_id'}

# Toplu Motorin Verme Kaydı (Excel'den)
class MotorinVermeBulkItem(BaseModel):
    tarih: str
    bosaltim_tesisi: str = ""
    arac_plaka: str
    miktar_litre: float
    kilometre: float = 0
    sofor_adi: str = ""
    notlar: str = ""

class MotorinVermeBulkCreate(BaseModel):
    records: list[MotorinVermeBulkItem]

@api_router.post("/motorin-verme/bulk")
async def create_motorin_verme_bulk(input: MotorinVermeBulkCreate, current_user: dict = Depends(get_current_user)):
    created_count = 0
    errors = []
    
    for idx, item in enumerate(input.records):
        try:
            # Plakaya göre araç bul
            arac = await db.araclar.find_one({"plaka": item.arac_plaka.upper().strip()}, {"_id": 0})
            
            data = {
                "id": str(datetime.now(timezone.utc).timestamp()).replace(".", "") + str(idx),
                "tarih": item.tarih,
                "bosaltim_tesisi": item.bosaltim_tesisi,
                "arac_id": arac['id'] if arac else "",
                "arac_plaka": item.arac_plaka.upper().strip(),
                "arac_bilgi": f"{arac.get('marka', '')} {arac.get('model', '')}".strip() if arac else "",
                "miktar_litre": item.miktar_litre,
                "kilometre": item.kilometre,
                "sofor_adi": item.sofor_adi,
                "sofor_id": "",
                "personel_id": "",
                "personel_adi": "",
                "notlar": item.notlar,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user['id'],
                "created_by_name": current_user['name']
            }
            await db.motorin_verme.insert_one(data)
            created_count += 1
        except Exception as e:
            errors.append(f"Satır {idx + 1}: {str(e)}")
    
    # Stok güncelle
    await update_motorin_stok()
    
    return {
        "created_count": created_count,
        "total": len(input.records),
        "errors": errors
    }

@api_router.get("/motorin-verme")
async def get_motorin_verme(
    baslangic_tarihi: str = None,
    bitis_tarihi: str = None,
    arac_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if baslangic_tarihi and bitis_tarihi:
        query['tarih'] = {"$gte": baslangic_tarihi, "$lte": bitis_tarihi}
    if arac_id:
        query['arac_id'] = arac_id
    records = await db.motorin_verme.find(query, {"_id": 0}).sort("tarih", -1).to_list(1000)
    return records

@api_router.get("/motorin-verme/{id}")
async def get_motorin_verme_by_id(id: str, current_user: dict = Depends(get_current_user)):
    record = await db.motorin_verme.find_one({"id": id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    return record

@api_router.put("/motorin-verme/{id}")
async def update_motorin_verme(id: str, input: MotorinVermeCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.motorin_verme.update_one({"id": id}, {"$set": data})
    await update_motorin_stok()
    updated = await db.motorin_verme.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/motorin-verme/{id}")
async def delete_motorin_verme(id: str, current_user: dict = Depends(get_current_user)):
    await db.motorin_verme.delete_one({"id": id})
    await update_motorin_stok()
    return {"message": "Verme kaydı silindi"}

# Stok Hesaplama
async def update_motorin_stok():
    # Toplam alım
    alimlar = await db.motorin_alimlar.find({}, {"miktar_litre": 1}).to_list(10000)
    toplam_alim = sum([a.get('miktar_litre', 0) for a in alimlar])
    
    # Toplam verme
    vermeler = await db.motorin_verme.find({}, {"miktar_litre": 1}).to_list(10000)
    toplam_verme = sum([v.get('miktar_litre', 0) for v in vermeler])
    
    # Stok güncelle
    stok = {
        "toplam_alim": toplam_alim,
        "toplam_verme": toplam_verme,
        "mevcut_stok": toplam_alim - toplam_verme,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.motorin_stok.update_one({}, {"$set": stok}, upsert=True)

@api_router.get("/motorin-stok")
async def get_motorin_stok(current_user: dict = Depends(get_current_user)):
    stok = await db.motorin_stok.find_one({}, {"_id": 0})
    if not stok:
        return {
            "toplam_alim": 0,
            "toplam_verme": 0,
            "mevcut_stok": 0
        }
    return stok

# Motorin Özet İstatistikleri
@api_router.get("/motorin-ozet")
async def get_motorin_ozet(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    month_start = datetime.now(timezone.utc).replace(day=1).strftime("%Y-%m-%d")
    
    # Stok
    stok = await db.motorin_stok.find_one({}, {"_id": 0}) or {"mevcut_stok": 0, "toplam_alim": 0, "toplam_verme": 0}
    
    # Bu ayki alımlar
    ayki_alimlar = await db.motorin_alimlar.find({"tarih": {"$gte": month_start}}, {"_id": 0}).to_list(1000)
    ayki_alim_toplam = sum([a.get('miktar_litre', 0) for a in ayki_alimlar])
    ayki_maliyet = sum([a.get('toplam_tutar', 0) for a in ayki_alimlar])
    
    # Bu ayki vermeler
    ayki_vermeler = await db.motorin_verme.find({"tarih": {"$gte": month_start}}, {"_id": 0}).to_list(1000)
    ayki_verme_toplam = sum([v.get('miktar_litre', 0) for v in ayki_vermeler])
    
    # Bugünkü işlemler
    bugunki_alimlar = await db.motorin_alimlar.find({"tarih": today}, {"_id": 0}).to_list(100)
    bugunki_vermeler = await db.motorin_verme.find({"tarih": today}, {"_id": 0}).to_list(100)
    
    # Tedarikçi ve araç sayısı
    tedarikci_sayisi = await db.motorin_tedarikciler.count_documents({})
    
    return {
        "mevcut_stok": stok.get("mevcut_stok", 0),
        "toplam_alim": stok.get("toplam_alim", 0),
        "toplam_verme": stok.get("toplam_verme", 0),
        "ayki_alim": ayki_alim_toplam,
        "ayki_maliyet": ayki_maliyet,
        "ayki_verme": ayki_verme_toplam,
        "bugunki_alim_sayisi": len(bugunki_alimlar),
        "bugunki_verme_sayisi": len(bugunki_vermeler),
        "tedarikci_sayisi": tedarikci_sayisi
    }

# Araç Bazlı Tüketim Raporu
@api_router.get("/motorin-arac-tuketim")
async def get_motorin_arac_tuketim(
    baslangic_tarihi: str = None,
    bitis_tarihi: str = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if baslangic_tarihi and bitis_tarihi:
        query['tarih'] = {"$gte": baslangic_tarihi, "$lte": bitis_tarihi}
    
    vermeler = await db.motorin_verme.find(query, {"_id": 0}).to_list(10000)
    
    # Araç bazlı gruplama
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
        arac_tuketim[arac_id]["toplam_litre"] += v.get('miktar_litre', 0)
        arac_tuketim[arac_id]["kayit_sayisi"] += 1
        km = v.get('kilometre', 0)
        if km > 0:
            if km > arac_tuketim[arac_id]["son_kilometre"]:
                arac_tuketim[arac_id]["son_kilometre"] = km
            if km < arac_tuketim[arac_id]["ilk_kilometre"]:
                arac_tuketim[arac_id]["ilk_kilometre"] = km
    
    # Ortalama tüketim hesapla
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
    
    # Toplam litreye göre sırala
    result.sort(key=lambda x: x["toplam_litre"], reverse=True)
    return result

# =====================================================
# TEKLİF MODÜLÜ API'LERİ
# =====================================================

# Teklif Müşterileri
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
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.teklif_musteriler.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/teklif-musteriler")
async def get_teklif_musteriler(current_user: dict = Depends(get_current_user)):
    records = await db.teklif_musteriler.find({}, {"_id": 0}).sort("firma_adi", 1).to_list(1000)
    return records

@api_router.get("/teklif-musteriler/{id}")
async def get_teklif_musteri(id: str, current_user: dict = Depends(get_current_user)):
    record = await db.teklif_musteriler.find_one({"id": id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return record

@api_router.put("/teklif-musteriler/{id}")
async def update_teklif_musteri(id: str, input: TeklifMusteriCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.teklif_musteriler.update_one({"id": id}, {"$set": data})
    updated = await db.teklif_musteriler.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/teklif-musteriler/{id}")
async def delete_teklif_musteri(id: str, current_user: dict = Depends(get_current_user)):
    await db.teklif_musteriler.delete_one({"id": id})
    return {"message": "Müşteri silindi"}

# Teklif Ürünleri
class TeklifUrunCreate(BaseModel):
    urun_adi: str
    aciklama: str = ""
    birim: str = "adet"
    birim_fiyat: float = 0
    kdv_orani: float = 20
    aktif: bool = True

@api_router.post("/teklif-urunler")
async def create_teklif_urun(input: TeklifUrunCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.teklif_urunler.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/teklif-urunler")
async def get_teklif_urunler(current_user: dict = Depends(get_current_user)):
    records = await db.teklif_urunler.find({}, {"_id": 0}).sort("urun_adi", 1).to_list(1000)
    return records

@api_router.put("/teklif-urunler/{id}")
async def update_teklif_urun(id: str, input: TeklifUrunCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.teklif_urunler.update_one({"id": id}, {"$set": data})
    updated = await db.teklif_urunler.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/teklif-urunler/{id}")
async def delete_teklif_urun(id: str, current_user: dict = Depends(get_current_user)):
    await db.teklif_urunler.delete_one({"id": id})
    return {"message": "Ürün silindi"}

# Teklif Kalemleri Modeli
class TeklifKalem(BaseModel):
    urun_hizmet: str
    aciklama: str = ""
    miktar: float = 1
    birim: str = "adet"
    birim_fiyat: float = 0
    kdv_orani: float = 20
    iskonto_orani: float = 0
    toplam: float = 0

# BIMS Ürün Modeli
class BimsUrunCreate(BaseModel):
    urun_adi: str
    birim: str = "adet"  # adet, m², m³, kg, ton
    birim_fiyat: float = 0
    aciklama: str = ""

class BimsUrunUpdate(BaseModel):
    urun_adi: Optional[str] = None
    birim: Optional[str] = None
    birim_fiyat: Optional[float] = None
    aciklama: Optional[str] = None

# Parke Ürün Modeli
class ParkeUrunCreate(BaseModel):
    urun_adi: str
    birim: str = "m²"  # m², adet
    birim_fiyat: float = 0
    ebat: str = ""  # örn: 40x40, 50x50
    renk: str = ""
    aciklama: str = ""

class ParkeUrunUpdate(BaseModel):
    urun_adi: Optional[str] = None
    birim: Optional[str] = None
    birim_fiyat: Optional[float] = None
    ebat: Optional[str] = None
    renk: Optional[str] = None
    aciklama: Optional[str] = None

# Teklif Modeli
class TeklifCreate(BaseModel):
    teklif_turu: str = "bims"  # bims veya parke
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
    durum: str = "taslak"  # taslak, gonderildi, beklemede, kabul_edildi, reddedildi, iptal

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

# Teklif numarası oluşturma fonksiyonu
async def generate_teklif_no():
    """TKL-2025-0001 formatında teklif numarası oluştur"""
    current_year = datetime.now().year
    
    # Bu yılın son teklif numarasını bul
    last_teklif = await db.teklifler.find(
        {"teklif_no": {"$regex": f"^TKL-{current_year}-"}}
    ).sort("teklif_no", -1).limit(1).to_list(1)
    
    if last_teklif:
        # Son numarayı al ve bir artır
        last_no = last_teklif[0]['teklif_no']
        last_num = int(last_no.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"TKL-{current_year}-{str(new_num).zfill(4)}"

@api_router.post("/teklifler")
async def create_teklif(input: TeklifCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['teklif_no'] = await generate_teklif_no()
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    data['created_by'] = current_user['id']
    data['created_by_name'] = current_user['name']
    
    # Kalemler listesini dict olarak kaydet
    if data.get('kalemler'):
        data['kalemler'] = [k if isinstance(k, dict) else k.model_dump() if hasattr(k, 'model_dump') else dict(k) for k in data['kalemler']]
    
    await db.teklifler.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/teklifler")
async def get_teklifler(
    durum: str = None,
    teklif_turu: str = None,
    musteri_id: str = None,
    baslangic_tarihi: str = None,
    bitis_tarihi: str = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if durum:
        query['durum'] = durum
    if teklif_turu:
        query['teklif_turu'] = teklif_turu
    if musteri_id:
        query['musteri_id'] = musteri_id
    if baslangic_tarihi and bitis_tarihi:
        query['teklif_tarihi'] = {"$gte": baslangic_tarihi, "$lte": bitis_tarihi}
    
    records = await db.teklifler.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return records

@api_router.get("/teklifler/{id}")
async def get_teklif(id: str, current_user: dict = Depends(get_current_user)):
    record = await db.teklifler.find_one({"id": id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    return record

@api_router.put("/teklifler/{id}")
async def update_teklif(id: str, input: TeklifUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.teklifler.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    # Kalemler listesini dict olarak kaydet
    if update_data.get('kalemler'):
        update_data['kalemler'] = [k if isinstance(k, dict) else k.model_dump() if hasattr(k, 'model_dump') else dict(k) for k in update_data['kalemler']]
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.teklifler.update_one({"id": id}, {"$set": update_data})
    updated = await db.teklifler.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/teklifler/{id}")
async def delete_teklif(id: str, current_user: dict = Depends(get_current_user)):
    result = await db.teklifler.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    return {"message": "Teklif silindi"}

# Teklif Durumu Güncelleme
@api_router.put("/teklifler/{id}/durum")
async def update_teklif_durum(id: str, durum: str, current_user: dict = Depends(get_current_user)):
    existing = await db.teklifler.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    valid_durumlar = ["taslak", "gonderildi", "beklemede", "kabul_edildi", "reddedildi", "iptal"]
    if durum not in valid_durumlar:
        raise HTTPException(status_code=400, detail=f"Geçersiz durum. Geçerli durumlar: {valid_durumlar}")
    
    update_data = {
        "durum": durum,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.teklifler.update_one({"id": id}, {"$set": update_data})
    updated = await db.teklifler.find_one({"id": id}, {"_id": 0})
    return updated

# Teklif Özet İstatistikleri
@api_router.get("/teklif-ozet")
async def get_teklif_ozet(teklif_turu: str = None, current_user: dict = Depends(get_current_user)):
    today = datetime.now().strftime("%Y-%m-%d")
    month_start = datetime.now().strftime("%Y-%m-01")
    
    base_query = {}
    if teklif_turu:
        base_query['teklif_turu'] = teklif_turu
    
    # Toplam teklif sayısı
    toplam_teklif = await db.teklifler.count_documents(base_query)
    
    # Durum bazında sayılar
    taslak = await db.teklifler.count_documents({**base_query, "durum": "taslak"})
    gonderildi = await db.teklifler.count_documents({**base_query, "durum": "gonderildi"})
    beklemede = await db.teklifler.count_documents({**base_query, "durum": "beklemede"})
    kabul_edildi = await db.teklifler.count_documents({**base_query, "durum": "kabul_edildi"})
    reddedildi = await db.teklifler.count_documents({**base_query, "durum": "reddedildi"})
    
    # Bu ayki teklifler
    ayki_query = {**base_query, "teklif_tarihi": {"$gte": month_start}}
    ayki_teklifler = await db.teklifler.find(ayki_query, {"_id": 0}).to_list(1000)
    ayki_teklif_sayisi = len(ayki_teklifler)
    ayki_toplam_tutar = sum([t.get('genel_toplam', 0) for t in ayki_teklifler])
    
    # Kabul edilen tekliflerin toplam tutarı
    kabul_query = {**base_query, "durum": "kabul_edildi"}
    kabul_edilen_teklifler = await db.teklifler.find(kabul_query, {"_id": 0}).to_list(1000)
    kabul_toplam_tutar = sum([t.get('genel_toplam', 0) for t in kabul_edilen_teklifler])
    
    # Müşteri sayısı
    musteri_sayisi = await db.teklif_musteriler.count_documents({})
    
    # Son 5 teklif
    son_teklifler = await db.teklifler.find(base_query, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "toplam_teklif": toplam_teklif,
        "taslak": taslak,
        "gonderildi": gonderildi,
        "beklemede": beklemede,
        "kabul_edildi": kabul_edildi,
        "reddedildi": reddedildi,
        "ayki_teklif_sayisi": ayki_teklif_sayisi,
        "ayki_toplam_tutar": ayki_toplam_tutar,
        "kabul_toplam_tutar": kabul_toplam_tutar,
        "musteri_sayisi": musteri_sayisi,
        "son_teklifler": son_teklifler
    }

# =====================================================
# BIMS ÜRÜN API'LERİ
# =====================================================

@api_router.post("/bims-urunler")
async def create_bims_urun(input: BimsUrunCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.bims_urunler.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/bims-urunler")
async def get_bims_urunler(current_user: dict = Depends(get_current_user)):
    records = await db.bims_urunler.find({}, {"_id": 0}).sort("urun_adi", 1).to_list(1000)
    return records

@api_router.get("/bims-urunler/{id}")
async def get_bims_urun(id: str, current_user: dict = Depends(get_current_user)):
    record = await db.bims_urunler.find_one({"id": id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="BIMS ürün bulunamadı")
    return record

@api_router.put("/bims-urunler/{id}")
async def update_bims_urun(id: str, input: BimsUrunUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.bims_urunler.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="BIMS ürün bulunamadı")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.bims_urunler.update_one({"id": id}, {"$set": update_data})
    updated = await db.bims_urunler.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/bims-urunler/{id}")
async def delete_bims_urun(id: str, current_user: dict = Depends(get_current_user)):
    result = await db.bims_urunler.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="BIMS ürün bulunamadı")
    return {"message": "BIMS ürün silindi"}

# =====================================================
# PARKE ÜRÜN API'LERİ
# =====================================================

@api_router.post("/parke-urunler")
async def create_parke_urun(input: ParkeUrunCreate, current_user: dict = Depends(get_current_user)):
    data = input.model_dump()
    data['id'] = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.parke_urunler.insert_one(data)
    return {k: v for k, v in data.items() if k != '_id'}

@api_router.get("/parke-urunler")
async def get_parke_urunler(current_user: dict = Depends(get_current_user)):
    records = await db.parke_urunler.find({}, {"_id": 0}).sort("urun_adi", 1).to_list(1000)
    return records

@api_router.get("/parke-urunler/{id}")
async def get_parke_urun(id: str, current_user: dict = Depends(get_current_user)):
    record = await db.parke_urunler.find_one({"id": id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Parke ürün bulunamadı")
    return record

@api_router.put("/parke-urunler/{id}")
async def update_parke_urun(id: str, input: ParkeUrunUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.parke_urunler.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Parke ürün bulunamadı")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.parke_urunler.update_one({"id": id}, {"$set": update_data})
    updated = await db.parke_urunler.find_one({"id": id}, {"_id": 0})
    return updated

@api_router.delete("/parke-urunler/{id}")
async def delete_parke_urun(id: str, current_user: dict = Depends(get_current_user)):
    result = await db.parke_urunler.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parke ürün bulunamadı")
    return {"message": "Parke ürün silindi"}

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()