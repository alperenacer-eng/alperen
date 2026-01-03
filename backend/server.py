from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    unit: str
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
        "permissions": ["bims", "cimento", "parke", "araclar", "personel"] if is_first_user else user_data.permissions,
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
    return {"message": "Product deleted"}

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
    return [PlakaResponse(**p) for p in plakalar]

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
    return [SoforResponse(**s) for s in soforler]

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
    return [SehirResponse(**s) for s in sehirler]

@api_router.delete("/sehirler/{sehir_id}")
async def delete_sehir(sehir_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.sehirler.delete_one({"id": sehir_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Şehir not found")
    return {"message": "Şehir deleted"}

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