# 🚜 AgriTech Optimizer | Livestock Health & Nutrition AI

AgriTech Optimizer is a comprehensive digital assistant designed to empower farmers with data-driven insights for livestock management. It combines veterinary knowledge with precision nutrition science to improve animal health and farm productivity.

## Vercel Deployment (Web + FastAPI)

This project can be deployed on Vercel as a static frontend (`index.html`, `app.js`, `style.css`) plus Python API Functions from `api/index.py`.

### Prerequisites

1. GitHub repo is connected to Vercel.
2. Root `requirements.txt` exists (used by Python runtime).
3. `google_credentials.json` stays local only (already ignored by `.gitignore`).

### First-time setup

1. Run a preview deploy:
   ```bash
   vercel
   ```
2. Set the production branch in Vercel Project Settings to `main`.
3. Keep build/output commands empty (default static + Python Functions flow).

### Verify checklist (preview and production)

Use your deployment URL below for checks:

- `GET /` -> dashboard HTML loads.
- `GET /app.js` -> returns JavaScript asset.
- `GET /style.css` -> returns stylesheet asset.
- `GET /api/species` -> `200` with a `species` array.
- `POST /api/diagnosis` -> `200` with `potential_diseases` array.

Sample diagnosis request:

```bash
curl -X POST "https://<your-deployment>.vercel.app/api/diagnosis" \
  -H "Content-Type: application/json" \
  -d "{\"species\":\"cattle\",\"symptoms\":[\"fever\",\"dark urine\"]}"
```

### Git auto-deploy workflow

1. Push feature branch -> Vercel creates Preview deployment.
2. Validate preview URL with the checklist above.
3. Merge to `main` (or promote validated preview) -> Production deployment.

### OAuth/Secrets guardrail

- Do not commit `google_credentials.json`.
- If OAuth is enabled in Vercel, store values as Vercel Environment Variables and read them at runtime.

## 🚀 Key Features

- **🩺 Interactive Health Diagnostic**: A rule-based wizard that analyzes symptoms (e.g., fever, salivation, gait) to identify critical diseases like FMD, Anthrax, and Babesiosis.
- **🌾 Smart Nutrition Planner**: Calculates the Required Daily Dry Matter Intake (DMI) for over 10 species, including Cattle, Sheep, Pigs, Poultry, and even Bees.
- **📅 Global Health Guide**: A centralized maintenance schedule for vaccinations, deworming, and essential farm tasks.
- **💻 Premium UI**: Built with Streamlit for a modern, responsive, and user-friendly experience.

## 🛠 Supported Species

- **Large Ruminants**: Cattle, Camels, Horses, Donkeys
- **Small Ruminants**: Sheep, Goats
- **Poultry**: Chickens (Broilers/Layers), Turkeys
- **Specialized**: Rabbits, Fish (Aquaculture), Bees (Apiculture)

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mujahidabdullah841-droid/AgriTech-Optimizer.git
   cd AgriTech-Optimizer
   ```

2. **Install dependencies**:
   ```bash
   pip install streamlit pandas
   ```

3. **Run the application**:
   ```bash
   streamlit run app.py
   ```

## 📖 Walkthrough
For a detailed explanation of the project's logic and step-by-step implementation, check out the [Jupyter Notebook](agritech_optimizer_walkthrough.ipynb) included in this repository.

---
*⚠️ Disclaimer: This tool is for informational purposes only. Always consult a certified veterinarian for definitive medical advice.*
