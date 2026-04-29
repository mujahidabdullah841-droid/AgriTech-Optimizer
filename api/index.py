from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

app = FastAPI()
ROOT_DIR = Path(__file__).resolve().parent.parent

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def homepage():
    return FileResponse(ROOT_DIR / "index.html", media_type="text/html")


@app.get("/app.js")
async def frontend_js():
    return FileResponse(ROOT_DIR / "app.js", media_type="application/javascript")


@app.get("/style.css")
async def frontend_css():
    return FileResponse(ROOT_DIR / "style.css", media_type="text/css")


SPECIES_DATA = {
    "cattle": {"dmi_multiplier": 0.025, "name": "Cattle"},
    "sheep": {"dmi_multiplier": 0.04, "name": "Sheep"},
    "goats": {"dmi_multiplier": 0.03, "name": "Goats"},
    "pigs": {"dmi_multiplier": 0.035, "name": "Pigs"},
    "chickens": {"dmi_multiplier": 0.05, "name": "Chickens"},
    "horses": {"dmi_multiplier": 0.02, "name": "Horses"},
    "camels": {"dmi_multiplier": 0.015, "name": "Camels"},
    "rabbits": {"dmi_multiplier": 0.045, "name": "Rabbits"},
    "turkeys": {"dmi_multiplier": 0.045, "name": "Turkeys"},
    "donkeys": {"dmi_multiplier": 0.02, "name": "Donkeys"},
}

SPECIES_ALIASES = {
    "cattle": "cattle",
    "cow": "cattle",
    "sheep": "sheep",
    "goat": "goats",
    "goats": "goats",
    "pig": "pigs",
    "pigs": "pigs",
    "chicken": "chickens",
    "chickens": "chickens",
    "poultry": "chickens",
    "poultry (broilers/layers)": "chickens",
    "horse": "horses",
    "horses": "horses",
    "camel": "camels",
    "camels": "camels",
    "rabbit": "rabbits",
    "rabbits": "rabbits",
    "turkey": "turkeys",
    "turkeys": "turkeys",
    "donkey": "donkeys",
    "donkeys": "donkeys",
}

DISEASES = {
    "FMD": {
        "name": "Foot and Mouth Disease",
        "symptoms": ["fever", "salivation", "lameness", "udder lesions"],
        "severity": "high",
        "treatment": "Supportive care and strict quarantine",
    },
    "Anthrax": {
        "name": "Anthrax",
        "symptoms": ["fever", "depression", "sudden death"],
        "severity": "critical",
        "treatment": "Urgent veterinary treatment with recommended antibiotics",
    },
    "Babesiosis": {
        "name": "Babesiosis",
        "symptoms": ["fever", "anemia", "dark urine"],
        "severity": "high",
        "treatment": "Antiprotozoal therapy and supportive care",
    },
    "Mastitis": {
        "name": "Mastitis",
        "symptoms": ["udder swelling", "fever", "decreased milk"],
        "severity": "medium",
        "treatment": "Antibiotics and frequent milking protocol",
    },
}


def normalize_species(species: str) -> str:
    return SPECIES_ALIASES.get(species.strip().lower(), species.strip().lower())


class NutritionRequest(BaseModel):
    species: str
    weight_kg: float = Field(gt=0)
    production_type: str = "maintenance"


class DiagnosisRequest(BaseModel):
    symptoms: List[str]
    species: str


@app.post("/api/nutrition")
async def calculate_nutrition(req: NutritionRequest):
    species_code = normalize_species(req.species)
    if species_code not in SPECIES_DATA:
        raise HTTPException(status_code=400, detail="Species not found")

    species_info = SPECIES_DATA[species_code]
    dmi = req.weight_kg * species_info["dmi_multiplier"]

    production_type = req.production_type.strip().lower()
    if production_type == "growth":
        dmi *= 1.2
    elif production_type in {"production", "lactation", "high_yield"}:
        dmi *= 1.3

    return {
        "species": species_info["name"],
        "species_code": species_code,
        "weight_kg": req.weight_kg,
        "daily_dmi_kg": round(dmi, 2),
        "production_type": production_type,
        "calculated_at": datetime.now().isoformat(),
    }


@app.post("/api/diagnosis")
async def diagnose_disease(req: DiagnosisRequest):
    symptoms_lower = [value.strip().lower() for value in req.symptoms if value.strip()]
    if not symptoms_lower:
        raise HTTPException(status_code=400, detail="At least one symptom is required")

    matches = []
    for disease_code, disease_info in DISEASES.items():
        matching_symptoms = [item for item in disease_info["symptoms"] if item in symptoms_lower]
        if matching_symptoms:
            match_percentage = (len(matching_symptoms) / len(disease_info["symptoms"])) * 100
            matches.append(
                {
                    "disease_code": disease_code,
                    "disease_name": disease_info["name"],
                    "match_percentage": round(match_percentage, 1),
                    "severity": disease_info["severity"],
                    "treatment": disease_info["treatment"],
                    "matching_symptoms": matching_symptoms,
                }
            )

    matches.sort(key=lambda value: value["match_percentage"], reverse=True)

    return {
        "species": normalize_species(req.species),
        "symptoms_analyzed": symptoms_lower,
        "potential_diseases": matches[:3],
        "disclaimer": "This tool is informational only. Always consult a certified veterinarian.",
    }


@app.get("/api/species")
async def get_species():
    return {"species": [{"code": code, "name": info["name"]} for code, info in SPECIES_DATA.items()]}


@app.get("/api/diseases")
async def get_diseases():
    return {
        "diseases": [
            {
                "code": code,
                "name": info["name"],
                "symptoms": info["symptoms"],
                "severity": info["severity"],
            }
            for code, info in DISEASES.items()
        ]
    }
