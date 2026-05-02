from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
import json
import os
from datetime import datetime
from urllib.parse import urlencode
from typing import List, Optional

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, use system env vars

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== ENVIRONMENT & OAUTH ====================
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/google/callback")

VERCEL_URL = os.getenv("VERCEL_URL", "")
if VERCEL_URL and not VERCEL_URL.startswith("http"):
    VERCEL_URL = f"https://{VERCEL_URL}"

if VERCEL_URL:
    GOOGLE_REDIRECT_URI = f"{VERCEL_URL}/auth/google/callback"

# ==================== HEALTH CHECK ====================
@app.get("/health")
async def health():
    return {"status": "ok"}

# ==================== OAUTH ENDPOINTS ====================
@app.get("/auth/google/login")
async def google_login():
    """Redirect user to Google OAuth consent screen"""
    if not GOOGLE_CLIENT_ID:
        return JSONResponse(
            {"error": "Google OAuth not configured. Set GOOGLE_CLIENT_ID environment variable."},
            status_code=500
        )
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline"
    }
    
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=google_auth_url)

@app.get("/auth/google/callback")
async def google_callback(code: str = None, error: str = None):
    """Handle OAuth callback from Google"""
    if error:
        return RedirectResponse(url=f"/?auth_error={error}")
    
    if not code:
        return RedirectResponse(url="/?auth_error=no_code")
    
    if not GOOGLE_CLIENT_SECRET:
        return JSONResponse(
            {"error": "GOOGLE_CLIENT_SECRET not configured"},
            status_code=500
        )
    
    try:
        # Exchange authorization code for access token
        import requests
        
        token_response = requests.post("https://oauth2.googleapis.com/token", data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI
        })
        
        if token_response.status_code != 200:
            return RedirectResponse(url=f"/?auth_error=token_exchange_failed")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            return RedirectResponse(url=f"/?auth_error=no_access_token")
        
        # Get user info
        user_response = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", 
                                   headers={"Authorization": f"Bearer {access_token}"})
        
        if user_response.status_code != 200:
            return RedirectResponse(url=f"/?auth_error=user_info_failed")
        
        user_info = user_response.json()
        
        # Log the user
        _log_active_user(user_info.get("email", "unknown"))
        
        # Create a simple JWT-like token (for demo purposes)
        # In production, use proper JWT library
        import base64
        import json
        
        token_payload = {
            "email": user_info.get("email"),
            "name": user_info.get("name"),
            "picture": user_info.get("picture"),
            "id": user_info.get("id"),
            "exp": int(datetime.now().timestamp()) + 3600  # 1 hour
        }
        
        token_string = base64.b64encode(json.dumps(token_payload).encode()).decode()
        
        return RedirectResponse(url=f"/?token={token_string}&user={user_info.get('name', 'User')}")
        
    except Exception as e:
        print(f"OAuth error: {e}")
        return RedirectResponse(url=f"/?auth_error=oauth_error")

# ==================== NATIVE LOGIN ====================
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/auth/login")
async def native_login(req: LoginRequest):
    """Native username/password login (for development)"""
    if not req.username or not req.password:
        raise HTTPException(status_code=400, detail="Username and password required")
    
    # Log the user
    _log_active_user(req.username)
    
    return {
        "status": "success",
        "message": "Login successful",
        "user": {
            "name": req.username.capitalize(),
            "email": f"{req.username}@agritech.farm"
        }
    }

@app.post("/auth/bypass")
async def bypass_login():
    """Development mode bypass login"""
    _log_active_user("dev@agritech.local")
    return {
        "status": "success",
        "message": "Development mode enabled",
        "user": {
            "name": "Dev Farmer",
            "email": "dev@agritech.local"
        }
    }

# ==================== DATA MODELS ====================
class NutritionRequest(BaseModel):
    species: str
    weight_kg: float
    life_stage: str = "maintenance"

class DiagnosisRequest(BaseModel):
    symptoms: List[str]
    species: Optional[str] = None

class AnimalRequest(BaseModel):
    name: str
    type: str
    weight_kg: float

class HerdResponse(BaseModel):
    id: str
    name: str
    type: str
    weight_kg: float
    status: str

# ==================== LIVESTOCK DATA ====================
SPECIES_DATA = {
    "cattle": {"dmi_multiplier": 0.025, "name": "Cattle", "default_weight": 450.0},
    "sheep": {"dmi_multiplier": 0.04, "name": "Sheep", "default_weight": 50.0},
    "goat": {"dmi_multiplier": 0.03, "name": "Goat", "default_weight": 50.0},
    "pigs": {"dmi_multiplier": 0.035, "name": "Pigs", "default_weight": 100.0},
    "poultry (broilers/layers)": {"dmi_multiplier": 0.05, "name": "Poultry", "default_weight": 2.0},
    "rabbit": {"dmi_multiplier": 0.045, "name": "Rabbit", "default_weight": 3.0},
    "horse": {"dmi_multiplier": 0.02, "name": "Horse", "default_weight": 500.0},
    "donkey": {"dmi_multiplier": 0.02, "name": "Donkey", "default_weight": 200.0},
    "camel": {"dmi_multiplier": 0.015, "name": "Camel", "default_weight": 600.0},
    "turkey": {"dmi_multiplier": 0.045, "name": "Turkey", "default_weight": 8.0},
}

# ==================== DISEASE DATABASE ====================
DISEASES = {
    "babesiosis": {
        "name": "Babesiosis (Redwater)",
        "symptoms": ["fever", "dark urine", "anemia"],
        "severity": "high",
        "treatment": "Administer diminazene aceturate and contact vet."
    },
    "fmd": {
        "name": "Foot and Mouth Disease (FMD)",
        "symptoms": ["fever", "salivation", "lameness", "udder lesions", "blisters on mouth/feet"],
        "severity": "critical",
        "treatment": "Quarantine animal immediately. Report to local authorities."
    },
    "anthrax": {
        "name": "Anthrax",
        "symptoms": ["fever", "depression", "sudden death", "blood from orifices"],
        "severity": "extreme",
        "treatment": "DO NOT TOUCH CARCASS. Report to health officials immediately."
    },
    "pneumonia": {
        "name": "Pneumonia / Respiratory Infection",
        "symptoms": ["coughing", "nasal discharge", "fever"],
        "severity": "medium",
        "treatment": "Keep in a dry, ventilated area. Check for antibiotics with a vet."
    },
    "mastitis": {
        "name": "Mastitis",
        "symptoms": ["swollen udder", "clotted milk", "fever", "udder lesions"],
        "severity": "medium",
        "treatment": "Strip milk frequently. Use intramammary antibiotics."
    }
}

# ==================== HEALTH SCHEDULES ====================
HEALTH_SCHEDULES = {
    "cattle": [
        {"task": "FMD Vaccine", "frequency": "Every 6 Months", "importance": "High"},
        {"task": "Anthrax & Black Quarter", "frequency": "Annual", "importance": "Critical"},
        {"task": "Brucellosis (Heifers)", "frequency": "Once (4-8 months old)", "importance": "High"},
        {"task": "Lumpy Skin Disease", "frequency": "Annual", "importance": "High"},
        {"task": "Deworming", "frequency": "Every 3-4 Months", "importance": "Essential"},
        {"task": "Tick Control (Spraying/Dipping)", "frequency": "Weekly/Bi-weekly", "importance": "Essential"}
    ],
    "sheep": [
        {"task": "PPR Vaccine", "frequency": "Annual", "importance": "Critical"},
        {"task": "Enterotoxemia", "frequency": "Twice a Year", "importance": "High"},
        {"task": "Deworming", "frequency": "Every 3 Months", "importance": "Essential"},
        {"task": "Hoof Trimming", "frequency": "Every 2-3 Months", "importance": "Essential"}
    ],
    "goat": [
        {"task": "PPR Vaccine", "frequency": "Annual", "importance": "Critical"},
        {"task": "CCPP", "frequency": "Annual", "importance": "High"},
        {"task": "Enterotoxemia", "frequency": "Twice a Year", "importance": "High"},
        {"task": "Deworming", "frequency": "Every 3 Months", "importance": "Essential"},
        {"task": "Hoof Trimming", "frequency": "Every 2-3 Months", "importance": "Essential"}
    ],
    "pigs": [
        {"task": "Swine Fever", "frequency": "Annual", "importance": "Critical"},
        {"task": "FMD Vaccine", "frequency": "Every 6 Months", "importance": "High"},
        {"task": "Parvovirus/Lepto/Erysipelas", "frequency": "Every 6 Months", "importance": "High"},
        {"task": "Iron Injection (Piglets)", "frequency": "Day 3 of life", "importance": "Critical"},
        {"task": "Deworming", "frequency": "Every 4 Months", "importance": "Essential"}
    ],
    "rabbit": [
        {"task": "Viral Hemorrhagic Disease", "frequency": "Annual", "importance": "Critical"},
        {"task": "Myxomatosis", "frequency": "Every 6-12 Months", "importance": "High"},
        {"task": "Coccidiosis Prevention", "frequency": "Monthly in water", "importance": "High"},
        {"task": "Deworming", "frequency": "Every 3 Months", "importance": "Medium"}
    ],
    "horse": [
        {"task": "Tetanus & Influenza", "frequency": "Annual", "importance": "Critical"},
        {"task": "Rabies", "frequency": "Annual", "importance": "High"},
        {"task": "West Nile Virus", "frequency": "Annual", "importance": "High"},
        {"task": "Dental Floating", "frequency": "Annual", "importance": "Essential"},
        {"task": "Hoof Trimming/Shoeing", "frequency": "Every 6-8 Weeks", "importance": "Essential"}
    ],
}

# ==================== API ENDPOINTS: NUTRITION ====================
@app.post("/api/nutrition")
async def calculate_nutrition(req: NutritionRequest):
    """Calculate Dry Matter Intake (DMI) and feed recommendations"""
    try:
        species_key = req.species.lower()
        if species_key not in SPECIES_DATA:
            raise HTTPException(status_code=400, detail=f"Species '{req.species}' not found")
        
        species_info = SPECIES_DATA[species_key]
        dmi_multiplier = species_info["dmi_multiplier"]
        
        # Adjust multiplier based on life stage
        stage = req.life_stage.lower()
        if stage == "growth":
            dmi_multiplier *= 1.2
        elif stage == "lactation (high yield)":
            dmi_multiplier *= 1.4
        elif stage == "lactation (low yield)":
            dmi_multiplier *= 1.15
        # maintenance uses base multiplier
        
        dmi = req.weight_kg * dmi_multiplier
        
        # Calculate feed breakdown
        roughage_ratio = 0.7 if stage == "maintenance" else 0.6 if stage == "growth" else 0.5
        concentrate_ratio = 1.0 - roughage_ratio
        
        roughage_kg = dmi * roughage_ratio
        concentrate_kg = dmi * concentrate_ratio
        
        return {
            "species": species_info["name"],
            "weight_kg": req.weight_kg,
            "life_stage": req.life_stage,
            "daily_dmi_kg": round(dmi, 2),
            "roughage": {
                "percentage": round(roughage_ratio * 100, 1),
                "kg": round(roughage_kg, 2),
                "includes": "Hay, Grass, Silage, Crop residues"
            },
            "concentrate": {
                "percentage": round(concentrate_ratio * 100, 1),
                "kg": round(concentrate_kg, 2),
                "includes": "Grains, Dairy Meal, Protein Cakes, Minerals"
            },
            "calculated_at": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== API ENDPOINTS: DIAGNOSIS ====================
@app.post("/api/diagnosis")
async def diagnose_disease(req: DiagnosisRequest):
    """Analyze symptoms and suggest potential diseases"""
    try:
        symptoms_lower = [s.lower() for s in req.symptoms]
        matches = []
        
        for disease_code, disease_info in DISEASES.items():
            matching_symptoms = [s for s in disease_info["symptoms"] if s in symptoms_lower]
            if matching_symptoms:
                match_percentage = (len(matching_symptoms) / len(disease_info["symptoms"])) * 100
                matches.append({
                    "disease_code": disease_code,
                    "disease_name": disease_info["name"],
                    "match_percentage": round(match_percentage, 1),
                    "severity": disease_info["severity"],
                    "treatment": disease_info["treatment"],
                    "matching_symptoms": matching_symptoms
                })
        
        # Sort by match percentage
        matches.sort(key=lambda x: x["match_percentage"], reverse=True)
        
        return {
            "species": req.species or "Unknown",
            "symptoms_analyzed": symptoms_lower,
            "potential_diseases": matches[:3],
            "disclaimer": "⚠️ This tool is for informational purposes only. Always consult a certified veterinarian for definitive medical advice."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== API ENDPOINTS: SPECIES & DISEASES ====================
@app.get("/api/species")
async def get_species():
    """Get list of all livestock species"""
    return {
        "species": [
            {"code": code, "name": info["name"], "default_weight": info["default_weight"]} 
            for code, info in SPECIES_DATA.items()
        ]
    }

@app.get("/api/diseases")
async def get_diseases():
    """Get list of all diseases"""
    return {
        "diseases": [
            {
                "code": code,
                "name": info["name"],
                "symptoms": info["symptoms"],
                "severity": info["severity"],
                "treatment": info["treatment"]
            }
            for code, info in DISEASES.items()
        ]
    }

# ==================== API ENDPOINTS: HEALTH SCHEDULE ====================
@app.get("/api/health-schedule/{species}")
async def get_health_schedule(species: str):
    """Get health maintenance schedule for a species"""
    species_key = species.lower()
    if species_key not in HEALTH_SCHEDULES:
        raise HTTPException(status_code=404, detail=f"Schedule not found for {species}")
    
    return {
        "species": SPECIES_DATA.get(species_key, {}).get("name", species),
        "schedule": HEALTH_SCHEDULES[species_key]
    }

@app.get("/api/health-schedule")
async def get_all_schedules():
    """Get all health maintenance schedules"""
    schedules = {}
    for species_code, schedule in HEALTH_SCHEDULES.items():
        schedules[species_code] = {
            "name": SPECIES_DATA.get(species_code, {}).get("name", species_code),
            "schedule": schedule
        }
    return {"schedules": schedules}

# ==================== API ENDPOINTS: INVENTORY (Simple In-Memory) ====================
inventory_state = {
    "hay_kg": 500,
    "silage_kg": 200,
    "vaccines_doses": 10
}

@app.get("/api/inventory")
async def get_inventory():
    """Get current farm inventory"""
    return {
        "inventory": {
            "hay_kg": inventory_state["hay_kg"],
            "silage_kg": inventory_state["silage_kg"],
            "vaccines_doses": inventory_state["vaccines_doses"]
        },
        "total_supplies_kg": inventory_state["hay_kg"] + inventory_state["silage_kg"]
    }

@app.post("/api/inventory/feed")
async def feed_herd(amount_kg: float = 10):
    """Deduct hay from inventory when feeding herd"""
    if inventory_state["hay_kg"] < amount_kg:
        raise HTTPException(status_code=400, detail="Not enough hay in inventory")
    
    inventory_state["hay_kg"] -= amount_kg
    return {
        "status": "success",
        "message": f"Fed herd with {amount_kg}kg of hay",
        "hay_remaining_kg": inventory_state["hay_kg"]
    }

# ==================== API ENDPOINTS: HERD MANAGEMENT (Simple In-Memory) ====================
herd_state = {}
herd_counter = 0

@app.get("/api/herd")
async def get_herd():
    """Get all animals in the herd"""
    return {
        "herd": list(herd_state.values()),
        "total": len(herd_state)
    }

@app.post("/api/herd")
async def add_animal(req: AnimalRequest):
    """Add new animal to the herd"""
    global herd_counter
    herd_counter += 1
    
    animal_id = f"animal_{herd_counter}"
    animal = {
        "id": animal_id,
        "name": req.name,
        "type": req.type,
        "weight_kg": req.weight_kg,
        "status": "Healthy",
        "added_at": datetime.now().isoformat()
    }
    herd_state[animal_id] = animal
    
    return {
        "status": "success",
        "message": f"Added {req.name} the {req.type} to your farm",
        "animal": animal
    }

@app.delete("/api/herd/{animal_id}")
async def remove_animal(animal_id: str):
    """Remove animal from the herd"""
    if animal_id not in herd_state:
        raise HTTPException(status_code=404, detail="Animal not found")
    
    animal = herd_state.pop(animal_id)
    return {
        "status": "success",
        "message": f"Removed {animal['name']} from your farm",
        "animal": animal
    }

@app.put("/api/herd/{animal_id}")
async def update_animal(animal_id: str, status: str = None, weight_kg: float = None):
    """Update animal status or weight"""
    if animal_id not in herd_state:
        raise HTTPException(status_code=404, detail="Animal not found")
    
    if status:
        herd_state[animal_id]["status"] = status
    if weight_kg:
        herd_state[animal_id]["weight_kg"] = weight_kg
    
    return {
        "status": "success",
        "animal": herd_state[animal_id]
    }

# ==================== ANALYTICS & TRACKING ====================
def _log_active_user(identifier: str):
    """Log active user to data/user_analytics.csv"""
    import csv
    
    analytics_dir = "data"
    log_path = f"{analytics_dir}/user_analytics.csv"
    
    # Create directory if it doesn't exist
    if not os.path.exists(analytics_dir):
        os.makedirs(analytics_dir)
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Check if file exists and has content
    file_exists = os.path.exists(log_path) and os.path.getsize(log_path) > 0
    
    try:
        with open(log_path, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["date", "email"])
            if not file_exists:
                writer.writeheader()
            
            # Check if this user was already logged today
            if file_exists:
                with open(log_path, "r") as check_f:
                    reader = csv.DictReader(check_f)
                    for row in reader:
                        if row["date"] == today and row["email"] == identifier:
                            return  # Already logged today
            
            # Log the user
            writer.writerow({"date": today, "email": identifier})
    except Exception as e:
        print(f"Analytics logging error: {e}")

@app.get("/api/analytics")
async def get_analytics():
    """Get user analytics data"""
    import csv
    
    log_path = "data/user_analytics.csv"
    
    if not os.path.exists(log_path):
        return {
            "total_active_users": 0,
            "daily_active": [],
            "message": "Analytics data will appear once users start logging in"
        }
    
    try:
        daily_active = {}
        with open(log_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                date = row.get("date")
                email = row.get("email")
                if date:
                    if date not in daily_active:
                        daily_active[date] = set()
                    if email:
                        daily_active[date].add(email)
        
        # Convert to list format
        daily_active_list = [
            {"date": date, "active_users": len(users)}
            for date, users in sorted(daily_active.items())
        ]
        
        total_users = len(set(
            email for users in daily_active.values() for email in users
        ))
        
        return {
            "total_active_users": total_users,
            "daily_active": daily_active_list,
            "today_count": len(daily_active.get(datetime.now().strftime("%Y-%m-%d"), set()))
        }
    except Exception as e:
        return {
            "error": str(e),
            "daily_active": []
        }

@app.get("/api/dashboard-summary")
async def get_dashboard_summary():
    """Get dashboard metrics summary"""
    return {
        "animals_count": len(herd_state),
        "supplies": {
            "hay_kg": inventory_state["hay_kg"],
            "silage_kg": inventory_state["silage_kg"],
            "vaccines_doses": inventory_state["vaccines_doses"]
        },
        "total_supplies_kg": inventory_state["hay_kg"] + inventory_state["silage_kg"],
        "upcoming_vaccinations": 5,
        "herd_health_status": "Good",
        "recent_activities": [
            "New animal added to the herd",
            "Weekly health index updated",
            "Farm supplies inventory checked"
        ]
    }

