import base64
import hashlib
import hmac
import json
import os
import time
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import List

import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field

app = FastAPI()
ROOT_DIR = Path(__file__).resolve().parent.parent
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
STATE_TTL_SECONDS = 600

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


def _urlsafe_b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _urlsafe_b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("utf-8"))


def _auth_signing_secret() -> str:
    return (
        os.getenv("AUTH_SIGNING_SECRET")
        or os.getenv("GOOGLE_CLIENT_SECRET")
        or "change-me-auth-signing-secret"
    )


def _safe_next_path(next_path: str | None) -> str:
    if isinstance(next_path, str) and next_path.startswith("/") and not next_path.startswith("//"):
        return next_path
    return "/"


def _encode_state(payload: dict) -> str:
    payload_raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    signature = hmac.new(_auth_signing_secret().encode("utf-8"), payload_raw, hashlib.sha256).digest()
    return f"{_urlsafe_b64encode(payload_raw)}.{_urlsafe_b64encode(signature)}"


def _decode_state(token: str) -> dict:
    payload_part, signature_part = token.split(".", maxsplit=1)
    payload_raw = _urlsafe_b64decode(payload_part)
    signature_raw = _urlsafe_b64decode(signature_part)
    expected_signature = hmac.new(
        _auth_signing_secret().encode("utf-8"),
        payload_raw,
        hashlib.sha256,
    ).digest()
    if not hmac.compare_digest(signature_raw, expected_signature):
        raise ValueError("Invalid state signature")

    payload = json.loads(payload_raw.decode("utf-8"))
    issued_at = int(payload.get("ts", 0))
    if abs(int(time.time()) - issued_at) > STATE_TTL_SECONDS:
        raise ValueError("Expired state")
    return payload


@app.get("/auth/google/login")
async def google_login(request: Request, next: str = "/"):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        return RedirectResponse(url="/?auth_error=google_not_configured", status_code=302)

    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or str(request.url_for("google_callback"))
    next_path = _safe_next_path(next)
    state_token = _encode_state({"next": next_path, "ts": int(time.time())})

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state_token,
        "prompt": "select_account",
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=auth_url, status_code=302)


@app.get("/auth/google/callback", name="google_callback")
async def google_callback(request: Request, code: str | None = None, state: str | None = None, error: str | None = None):
    if error:
        return RedirectResponse(url=f"/?auth_error={urllib.parse.quote(error)}", status_code=302)

    if not code or not state:
        return RedirectResponse(url="/?auth_error=missing_code_or_state", status_code=302)

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        return RedirectResponse(url="/?auth_error=google_not_configured", status_code=302)

    try:
        state_payload = _decode_state(state)
    except Exception:
        return RedirectResponse(url="/?auth_error=invalid_state", status_code=302)

    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or str(request.url_for("google_callback"))
    token_payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    token_response = requests.post(GOOGLE_TOKEN_URL, data=token_payload, timeout=15)
    if token_response.status_code != 200:
        return RedirectResponse(url="/?auth_error=token_exchange_failed", status_code=302)

    access_token = token_response.json().get("access_token")
    if not access_token:
        return RedirectResponse(url="/?auth_error=missing_access_token", status_code=302)

    profile_response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    if profile_response.status_code != 200:
        return RedirectResponse(url="/?auth_error=userinfo_failed", status_code=302)

    profile = profile_response.json()
    name = urllib.parse.quote(profile.get("name", "Farmer"))
    email = urllib.parse.quote(profile.get("email", "unknown@agritech.farm"))
    next_path = _safe_next_path(state_payload.get("next", "/"))
    separator = "&" if "?" in next_path else "?"
    return RedirectResponse(
        url=f"{next_path}{separator}auth_success=1&name={name}&email={email}",
        status_code=302,
    )


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
