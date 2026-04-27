from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import json
import os
from datetime import datetime

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health():
    return {"status": "ok"}

# Livestock species data
SPECIES_DATA = {
    "cattle": {"dmi_multiplier": 0.025, "name": "Cattle"},
    "sheep": {"dmi_multiplier": 0.04, "name": "Sheep"},
    "goats": {"dmi_multiplier": 0.03, "name": "Goats"},
    "pigs": {"dmi_multiplier": 0.035, "name": "Pigs"},
    "chickens": {"dmi_multiplier": 0.05, "name": "Chickens"},
    "horses": {"dmi_multiplier": 0.02, "name": "Horses"},
    "camels": {"dmi_multiplier": 0.015, "name": "Camels"},
}

# Disease database
DISEASES = {
    "FMD": {
        "name": "Foot and Mouth Disease",
        "symptoms": ["fever", "salivation", "lameness", "udder lesions"],
        "severity": "high",
        "treatment": "Supportive care, quarantine"
    },
    "Anthrax": {
        "name": "Anthrax",
        "symptoms": ["fever", "depression", "sudden death"],
        "severity": "critical",
        "treatment": "Antibiotics (penicillin)"
    },
    "Babesiosis": {
        "name": "Babesiosis",
        "symptoms": ["fever", "anemia", "dark urine"],
        "severity": "high",
        "treatment": "Antiprotozoal drugs"
    },
    "Mastitis": {
        "name": "Mastitis",
        "symptoms": ["udder swelling", "fever", "decreased milk"],
        "severity": "medium",
        "treatment": "Antibiotics, frequent milking"
    },
}

class NutritionRequest(BaseModel):
    species: str
    weight_kg: float
    production_type: str = "maintenance"

class DiagnosisRequest(BaseModel):
    symptoms: list
    species: str

@app.post("/api/nutrition")
async def calculate_nutrition(req: NutritionRequest):
    try:
        if req.species.lower() not in SPECIES_DATA:
            raise HTTPException(status_code=400, detail="Species not found")
        
        species_info = SPECIES_DATA[req.species.lower()]
        dmi = req.weight_kg * species_info["dmi_multiplier"]
        
        # Adjust for production type
        if req.production_type == "growth":
            dmi *= 1.2
        elif req.production_type == "production":
            dmi *= 1.3
        
        return {
            "species": species_info["name"],
            "weight_kg": req.weight_kg,
            "daily_dmi_kg": round(dmi, 2),
            "production_type": req.production_type,
            "calculated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/diagnosis")
async def diagnose_disease(req: DiagnosisRequest):
    try:
        matches = []
        symptoms_lower = [s.lower() for s in req.symptoms]
        
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
            "species": req.species,
            "symptoms_analyzed": symptoms_lower,
            "potential_diseases": matches[:3],  # Top 3 matches
            "disclaimer": "⚠️ This tool is for informational purposes only. Always consult a certified veterinarian for definitive medical advice."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/species")
async def get_species():
    return {
        "species": [{"code": code, "name": info["name"]} for code, info in SPECIES_DATA.items()]
    }

@app.get("/api/diseases")
async def get_diseases():
    return {
        "diseases": [
            {
                "code": code,
                "name": info["name"],
                "symptoms": info["symptoms"],
                "severity": info["severity"]
            }
            for code, info in DISEASES.items()
        ]
    }
