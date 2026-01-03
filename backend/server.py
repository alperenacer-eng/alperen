from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from decimal import Decimal


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class CimentoGiris(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    yukleme_tarihi: str
    bosaltim_tarihi: str
    irsaliye_no: str
    fatura_no: str
    vade_tarihi: str
    giris_miktari: float = 0
    kantar_kg_miktari: float = 0
    aradaki_fark: float = 0  # Otomatik hesaplanacak
    birim_fiyat: float = 0
    giris_tutari: float = 0
    giris_kdv_orani: float = 0
    giris_kdv_tutari: float = 0
    giris_kdv_dahil_toplam: float = 0
    nakliye_birim_fiyat: float = 0
    nakliye_matrahi: float = 0
    nakliye_kdv_orani: float = 0
    nakliye_kdv_tutari: float = 0
    nakliye_t1: float = 0
    nakliye_t2: float = 0
    nakliye_tevkifat_orani: float = 0
    nakliye_genel_toplam: float = 0
    urun_nakliye_matrah: float = 0
    urun_nakliye_kdv_toplam: float = 0
    urun_nakliye_tevkifat_toplam: float = 0
    urun_nakliye_genel_toplam: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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


def calculate_fields(data: dict) -> dict:
    """Otomatik hesaplamaları yap"""
    # Aradaki fark
    giris_miktari = float(data.get('giris_miktari', 0) or 0)
    kantar_kg_miktari = float(data.get('kantar_kg_miktari', 0) or 0)
    data['aradaki_fark'] = giris_miktari - kantar_kg_miktari
    
    # Giriş hesaplamaları
    birim_fiyat = float(data.get('birim_fiyat', 0) or 0)
    giris_kdv_orani = float(data.get('giris_kdv_orani', 0) or 0)
    
    data['giris_tutari'] = giris_miktari * birim_fiyat
    data['giris_kdv_tutari'] = data['giris_tutari'] * (giris_kdv_orani / 100)
    data['giris_kdv_dahil_toplam'] = data['giris_tutari'] + data['giris_kdv_tutari']
    
    # Nakliye hesaplamaları
    nakliye_birim_fiyat = float(data.get('nakliye_birim_fiyat', 0) or 0)
    nakliye_kdv_orani = float(data.get('nakliye_kdv_orani', 0) or 0)
    nakliye_tevkifat_orani = float(data.get('nakliye_tevkifat_orani', 0) or 0)
    
    data['nakliye_matrahi'] = giris_miktari * nakliye_birim_fiyat
    data['nakliye_kdv_tutari'] = data['nakliye_matrahi'] * (nakliye_kdv_orani / 100)
    
    # T1 ve T2 hesaplamaları (Tevkifat)
    data['nakliye_t1'] = data['nakliye_matrahi'] + data['nakliye_kdv_tutari']
    data['nakliye_t2'] = data['nakliye_kdv_tutari'] * (nakliye_tevkifat_orani / 100)
    
    data['nakliye_genel_toplam'] = data['nakliye_t1'] - data['nakliye_t2']
    
    # Ürün-Nakliye toplamları
    data['urun_nakliye_matrah'] = data['giris_tutari'] + data['nakliye_matrahi']
    data['urun_nakliye_kdv_toplam'] = data['giris_kdv_tutari'] + data['nakliye_kdv_tutari']
    data['urun_nakliye_tevkifat_toplam'] = data['nakliye_t2']
    data['urun_nakliye_genel_toplam'] = data['giris_kdv_dahil_toplam'] + data['nakliye_genel_toplam']
    
    return data


# Routes
@api_router.get("/")
async def root():
    return {"message": "Çimento Giriş Takip API"}


@api_router.post("/cimento-giris", response_model=CimentoGiris)
async def create_cimento_giris(input: CimentoGirisCreate):
    data = input.model_dump()
    data = calculate_fields(data)
    
    cimento_obj = CimentoGiris(**data)
    doc = cimento_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.cimento_giris.insert_one(doc)
    return cimento_obj


@api_router.get("/cimento-giris", response_model=List[CimentoGiris])
async def get_all_cimento_giris():
    records = await db.cimento_giris.find({}, {"_id": 0}).to_list(1000)
    
    for record in records:
        if isinstance(record.get('created_at'), str):
            record['created_at'] = datetime.fromisoformat(record['created_at'])
        if isinstance(record.get('updated_at'), str):
            record['updated_at'] = datetime.fromisoformat(record['updated_at'])
    
    return records


@api_router.get("/cimento-giris/{id}", response_model=CimentoGiris)
async def get_cimento_giris(id: str):
    record = await db.cimento_giris.find_one({"id": id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    
    if isinstance(record.get('created_at'), str):
        record['created_at'] = datetime.fromisoformat(record['created_at'])
    if isinstance(record.get('updated_at'), str):
        record['updated_at'] = datetime.fromisoformat(record['updated_at'])
    
    return record


@api_router.put("/cimento-giris/{id}", response_model=CimentoGiris)
async def update_cimento_giris(id: str, input: CimentoGirisUpdate):
    existing = await db.cimento_giris.find_one({"id": id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    for key, value in update_data.items():
        existing[key] = value
    
    existing = calculate_fields(existing)
    existing['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.cimento_giris.update_one({"id": id}, {"$set": existing})
    
    if isinstance(existing.get('created_at'), str):
        existing['created_at'] = datetime.fromisoformat(existing['created_at'])
    if isinstance(existing.get('updated_at'), str):
        existing['updated_at'] = datetime.fromisoformat(existing['updated_at'])
    
    return existing


@api_router.delete("/cimento-giris/{id}")
async def delete_cimento_giris(id: str):
    result = await db.cimento_giris.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    return {"message": "Kayıt silindi", "id": id}


@api_router.get("/cimento-giris-ozet")
async def get_ozet():
    """Toplam özet bilgilerini getir"""
    records = await db.cimento_giris.find({}, {"_id": 0}).to_list(1000)
    
    toplam_giris_miktari = sum(r.get('giris_miktari', 0) for r in records)
    toplam_kantar_kg = sum(r.get('kantar_kg_miktari', 0) for r in records)
    toplam_fark = sum(r.get('aradaki_fark', 0) for r in records)
    toplam_giris_tutari = sum(r.get('giris_tutari', 0) for r in records)
    toplam_giris_kdv = sum(r.get('giris_kdv_tutari', 0) for r in records)
    toplam_giris_kdv_dahil = sum(r.get('giris_kdv_dahil_toplam', 0) for r in records)
    toplam_nakliye_matrah = sum(r.get('nakliye_matrahi', 0) for r in records)
    toplam_nakliye_kdv = sum(r.get('nakliye_kdv_tutari', 0) for r in records)
    toplam_nakliye_genel = sum(r.get('nakliye_genel_toplam', 0) for r in records)
    toplam_urun_nakliye_matrah = sum(r.get('urun_nakliye_matrah', 0) for r in records)
    toplam_urun_nakliye_kdv = sum(r.get('urun_nakliye_kdv_toplam', 0) for r in records)
    toplam_urun_nakliye_tevkifat = sum(r.get('urun_nakliye_tevkifat_toplam', 0) for r in records)
    toplam_urun_nakliye_genel = sum(r.get('urun_nakliye_genel_toplam', 0) for r in records)
    
    return {
        "kayit_sayisi": len(records),
        "toplam_giris_miktari": toplam_giris_miktari,
        "toplam_kantar_kg": toplam_kantar_kg,
        "toplam_fark": toplam_fark,
        "toplam_giris_tutari": toplam_giris_tutari,
        "toplam_giris_kdv": toplam_giris_kdv,
        "toplam_giris_kdv_dahil": toplam_giris_kdv_dahil,
        "toplam_nakliye_matrah": toplam_nakliye_matrah,
        "toplam_nakliye_kdv": toplam_nakliye_kdv,
        "toplam_nakliye_genel": toplam_nakliye_genel,
        "toplam_urun_nakliye_matrah": toplam_urun_nakliye_matrah,
        "toplam_urun_nakliye_kdv": toplam_urun_nakliye_kdv,
        "toplam_urun_nakliye_tevkifat": toplam_urun_nakliye_tevkifat,
        "toplam_urun_nakliye_genel": toplam_urun_nakliye_genel
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
