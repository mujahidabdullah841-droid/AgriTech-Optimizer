import streamlit as st
import pandas as pd
from streamlit_google_auth import Authenticate

# Page Config
st.set_page_config(
    page_title="AgriTech Optimizer | Livestock AI",
    page_icon="🚜",
    layout="wide"
)

# --- GOOGLE AUTH SETUP ---
import json
import os

# Dynamically create the credentials JSON from Streamlit Secrets
# This allows the app to work in the cloud without keeping secrets on GitHub
if not os.path.exists("google_credentials.json"):
    creds_dict = {
        "web": {
            "client_id": st.secrets["google"]["client_id"],
            "client_secret": st.secrets["google"]["client_secret"],
            "project_id": st.secrets["google"]["project_id"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "redirect_uris": ["https://mujahidabdullah841-droid-agritech-optimizer-app.streamlit.app", "http://localhost:8503"]
        }
    }
    with open("google_credentials.json", "w") as f:
        json.dump(creds_dict, f)

# Initialize Google Authenticator
authenticator = Authenticate(
    secret_credentials_path='google_credentials.json',
    cookie_name="agritech_auth_cookie",
    cookie_key="agritech_secret_key_2026",
    redirect_uri="https://mujahidabdullah841-droid-agritech-optimizer-app.streamlit.app",
)

# Initialize Session State
if "logged_in" not in st.session_state:
    st.session_state["logged_in"] = False
if "herd" not in st.session_state:
    st.session_state["herd"] = [] # List of dicts: {"name", "type", "weight", "status"}
if "inventory" not in st.session_state:
    st.session_state["inventory"] = {"Hay (kg)": 500, "Silage (kg)": 200, "Vaccines (doses)": 10}

# Custom CSS for Login & Native App Feel
st.markdown("""
    <style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .block-container { padding-top: 1rem; max-width: 600px; }
    .app-card { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee; }
    .stButton>button { width: 100%; border-radius: 12px; height: 50px; font-weight: 600; background-color: #2e7d32; color: white; border: none; }
    .animal-card { border-left: 5px solid #2e7d32; padding: 15px; background: #f9f9f9; border-radius: 10px; margin-bottom: 10px; }
    </style>
""", unsafe_allow_html=True)

# --- LOGIN SCREEN ---
# Check if user is already authenticated via Cookie or Login
authenticator.check_authenticity()

if not st.session_state.get("connected"):
    st.markdown('<div style="text-align: center; padding: 30px 0;">', unsafe_allow_html=True)
    st.image("https://cdn-icons-png.flaticon.com/512/2991/2991148.png", width=60)
    st.title("AgriTech Optimizer")
    st.markdown("### Secure Real-World Login")
    st.write("Please sign in with your official Google account.")
    
    # Official Google Sign-In Button
    authenticator.login()
    
    st.markdown('<p style="font-size: 0.8rem; color: #888; margin-top: 50px;">Verified by Google OAuth 2.0</p>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    st.stop()

# Set logged_in for compat with rest of app
st.session_state["logged_in"] = True
user_info = st.session_state.get("user_info", {})
user_name = user_info.get("name", "Farmer")

# --- MAIN APP UI ---
# Logout
head_col1, head_col2 = st.columns([4, 1])
with head_col2:
    authenticator.logout()

st.markdown(f'<div class="app-header" style="text-align: center; padding: 10px 0;"><h1>🚜 AgriTech AI</h1><p>Welcome, {user_name}</p></div>', unsafe_allow_html=True)

# Navigation using Tabs (App Menu)
tab_home, tab_herd, tab1, tab2, tab3 = st.tabs(["🏠 Home", "🐄 My Herd", "🩺 Health", "🌾 Nutrition", "📅 Schedule"])

# --- TAB: HOME / DASHBOARD ---
with tab_home:
    # Banner Image
    st.image(r"C:\Users\Mujahid Abdullah\.gemini\antigravity\brain\1cc07623-af7a-457d-bf69-1aa01fa7490a\agritech_dashboard_banner_1777028429086.png", use_container_width=True)
    
    st.markdown(f"## 👋 Good Morning, Farmer!")
    st.write("Here is the live status of your virtual farm.")
    
    # Vibrant Metric Cards (Linked to Session State)
    m_col1, m_col2, m_col3 = st.columns(3)
    with m_col1:
        st.markdown(f"""
            <div style="background: linear-gradient(135deg, #66bb6a, #43a047); padding: 20px; border-radius: 15px; color: white; text-align: center;">
                <h2 style="margin:0; color:white;">{len(st.session_state['herd'])}</h2>
                <p style="margin:0; font-size: 0.8rem;">Animals</p>
            </div>
        """, unsafe_allow_html=True)
    with m_col2:
        total_inv = sum(st.session_state['inventory'].values())
        st.markdown(f"""
            <div style="background: linear-gradient(135deg, #ffa726, #fb8c00); padding: 20px; border-radius: 15px; color: white; text-align: center;">
                <h2 style="margin:0; color:white;">{total_inv}</h2>
                <p style="margin:0; font-size: 0.8rem;">Supplies (kg)</p>
            </div>
        """, unsafe_allow_html=True)
    with m_col3:
        st.markdown("""
            <div style="background: linear-gradient(135deg, #29b6f6, #039be5); padding: 20px; border-radius: 15px; color: white; text-align: center;">
                <h2 style="margin:0; color:white;">5</h2>
                <p style="margin:0; font-size: 0.8rem;">Next Vacc.</p>
            </div>
        """, unsafe_allow_html=True)

    st.markdown("### 📈 Performance Trends")
    chart_data = pd.DataFrame({
        'Day': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        'Milk Yield (L)': [45, 48, 47, 52, 50, 55, 58],
        'Feed Efficiency (%)': [85, 86, 84, 88, 87, 89, 91]
    })
    st.line_chart(chart_data.set_index('Day'))

# --- TAB: MANAGE HERD ---
with tab_herd:
    st.header("🐄 My Digital Herd")
    
    with st.expander("➕ Add New Animal to Farm"):
        with st.form("add_animal_form"):
            a_name = st.text_input("Animal Name/ID", placeholder="e.g. Bessie")
            a_type = st.selectbox("Species", ["Cattle", "Sheep", "Goat", "Pig", "Rabbit", "Horse"])
            a_weight = st.number_input("Weight (kg)", min_value=1.0, value=50.0)
            submitted = st.form_submit_button("Add to My Herd")
            
            if submitted:
                if a_name:
                    st.session_state['herd'].append({
                        "name": a_name,
                        "type": a_type,
                        "weight": a_weight,
                        "status": "Healthy"
                    })
                    st.success(f"Added {a_name} the {a_type} to your farm!")
                    st.rerun()
                else:
                    st.error("Please enter a name.")

    st.write("#### Your Animals")
    if not st.session_state['herd']:
        st.info("Your farm is empty. Add your first animal above!")
    else:
        for i, animal in enumerate(st.session_state['herd']):
            st.markdown(f"""
                <div class="animal-card">
                    <h4 style="margin:0; color:#2e7d32;">{animal['name']}</h4>
                    <p style="margin:0; font-size:0.9rem;"><b>Type:</b> {animal['type']} | <b>Weight:</b> {animal['weight']} kg</p>
                    <p style="margin:0; font-size:0.8rem; color:#66bb6a;">● Status: {animal['status']}</p>
                </div>
            """, unsafe_allow_html=True)
            if st.button(f"Remove {animal['name']}", key=f"rem_{i}"):
                st.session_state['herd'].pop(i)
                st.rerun()

# --- TAB 1: HEALTH DIAGNOSTIC ---
with tab1:
    
    st.markdown("### 📦 Inventory & Supplies")
    inv_col1, inv_col2, inv_col3 = st.columns(3)
    for i, (item, qty) in enumerate(st.session_state['inventory'].items()):
        cols = [inv_col1, inv_col2, inv_col3]
        cols[i % 3].metric(item, f"{qty}")

    st.markdown("### 📋 Today's Checklist")
    st.checkbox("Check water levels in the north pasture", value=True)
    st.checkbox("Administer FMD vaccine to new calves", value=False)
    st.checkbox("Review monthly fodder inventory", value=False)
    
    st.markdown("### 🚀 Quick Actions")
    q_col1, q_col2 = st.columns(2)
    with q_col1:
        if st.button("🩺 Run Health Check", key="q_diag"):
            st.info("Navigate to Health tab")
    with q_col2:
        if st.button("🥣 Feed Herd (-10kg Hay)", key="q_feed"):
            if st.session_state['inventory']['Hay (kg)'] >= 10:
                st.session_state['inventory']['Hay (kg)'] -= 10
                st.success("Herd fed! Inventory updated.")
                st.rerun()
            else:
                st.error("Not enough Hay!")

    st.markdown("### 📜 Recent Farm Activity")
    st.write("● New animal added to the herd")
    st.write("● Weekly health index updated")
    st.write("● Rain alert received for tomorrow")

    st.markdown("""
        <div class="app-card" style="margin-top:20px; border-left: 5px solid #2e7d32;">
            <h4>💡 Farming Tip</h4>
            <p>Rotating your grazing pastures every 3 days can improve soil health and reduce parasite loads in your livestock.</p>
        </div>
    """, unsafe_allow_html=True)

# --- TAB 1: HEALTH DIAGNOSTIC ---
with tab1:
    st.header("🩺 Interactive Health Diagnostic Wizard")
    st.info("Select observed symptoms below to get an AI-driven health assessment.")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        symptoms = st.multiselect(
            "What symptoms are you observing?",
            [
                "High Fever", "Dark/Red Urine", "Ticks Present", "Pale Gums", 
                "Blisters on Mouth/Feet", "Excessive Salivation", "Limping",
                "Coughing", "Nasal Discharge", "Sudden Death", "Blood from Orifices",
                "Swollen Udder", "Clotted Milk", "Loss of Appetite"
            ],
            help="Select all that apply to the affected animal."
        )
        
        analyze_btn = st.button("Run Diagnostic Analysis", type="primary")

    with col2:
        st.write("### Diagnostic Result")
        if analyze_btn:
            if not symptoms:
                st.warning("Please select at least one symptom.")
            else:
                # Logic Engine
                findings = []
                
                if "High Fever" in symptoms and "Dark/Red Urine" in symptoms:
                    findings.append({
                        "disease": "Babesiosis (Redwater)",
                        "severity": "High",
                        "action": "Administer diminazene aceturate and contact vet."
                    })
                
                if "Blisters on Mouth/Feet" in symptoms or "Excessive Salivation" in symptoms:
                    findings.append({
                        "disease": "Foot and Mouth Disease (FMD)",
                        "severity": "Critical",
                        "action": "Quarantine animal immediately. Report to local authorities."
                    })
                
                if "Sudden Death" in symptoms or "Blood from Orifices" in symptoms:
                    findings.append({
                        "disease": "Anthrax",
                        "severity": "Extreme",
                        "action": "DO NOT TOUCH CARCASS. Report to health officials immediately."
                    })

                if "Coughing" in symptoms and "Nasal Discharge" in symptoms:
                    findings.append({
                        "disease": "Pneumonia / Respiratory Infection",
                        "severity": "Medium",
                        "action": "Keep in a dry, ventilated area. Check for antibiotics with a vet."
                    })

                if "Swollen Udder" in symptoms or "Clotted Milk" in symptoms:
                    findings.append({
                        "disease": "Mastitis",
                        "severity": "Medium",
                        "action": "Strip milk frequently. Use intramammary antibiotics."
                    })

                if findings:
                    for f in findings:
                        color = "#ff4b4b" if f['severity'] in ["Critical", "Extreme"] else "#ffa500"
                        st.markdown(f"""
                            <div style="border-left: 5px solid {color}; padding: 10px; background: white; margin-bottom: 10px; border-radius: 5px; box-shadow: 2px 2px 5px rgba(0,0,0,0.1);">
                                <h4 style="margin:0; color:{color};">{f['disease']}</h4>
                                <p style="margin:5px 0;"><b>Severity:</b> {f['severity']}</p>
                                <p style="margin:0;"><b>Next Step:</b> {f['action']}</p>
                            </div>
                        """, unsafe_allow_html=True)
                else:
                    st.success("No specific critical disease match found. Continue monitoring.")
        else:
            st.write("Results will appear here after analysis...")

# --- TAB 2: NUTRITION PLANNER ---
with tab2:
    st.header("🌾 Smart Nutrition & Fodder Calculator")
    
    col_input, col_result = st.columns([1, 1])
    
    with col_input:
        use_herd = st.checkbox("Select Animal from My Herd", value=False)
        
        if use_herd and st.session_state['herd']:
            selected_a = st.selectbox("Choose Animal:", [a['name'] for a in st.session_state['herd']])
            animal_data = next(item for item in st.session_state['herd'] if item["name"] == selected_a)
            animal_type = animal_data['type']
            weight_kg = animal_data['weight']
            st.info(f"Selected: {animal_type} | Weight: {weight_kg} kg")
        else:
            if use_herd: st.warning("Your herd is empty! Add animals in the 'My Herd' tab.")
            animal_type = st.selectbox("Select Animal Type:", ["Cattle", "Sheep", "Goat", "Rabbit", "Horse", "Pigs", "Poultry (Broilers/Layers)", "Donkey", "Camel", "Turkey"])
            
            # Adjust default weights
            weights = {
                "Cattle": 450.0, "Sheep": 50.0, "Goat": 50.0, "Rabbit": 3.0, 
                "Horse": 500.0, "Pigs": 100.0, "Poultry (Broilers/Layers)": 2.0,
                "Donkey": 200.0, "Camel": 600.0, "Turkey": 8.0
            }
            default_weight = weights.get(animal_type, 50.0)
            weight_kg = st.number_input("Animal Weight (kg):", min_value=0.1, value=default_weight)

        life_stage = st.selectbox("Select Life Stage:", ["Maintenance", "Growth", "Lactation (High Yield)", "Lactation (Low Yield)"])
        
        # DMI calculation logic
        dmi_multiplier = 0.025
        if animal_type == "Rabbit":
            dmi_multiplier = 0.05 if life_stage == "Lactation (High Yield)" else 0.035
        elif animal_type == "Poultry (Broilers/Layers)":
            dmi_multiplier = 0.10 if life_stage == "Growth" else 0.06
        elif animal_type == "Pigs":
            dmi_multiplier = 0.04 if life_stage == "Growth" else 0.03
        elif animal_type == "Donkey":
            dmi_multiplier = 0.02
        else:
            if life_stage == "Lactation (High Yield)": dmi_multiplier = 0.04
            elif life_stage == "Growth": dmi_multiplier = 0.03
            elif life_stage == "Maintenance": dmi_multiplier = 0.02
            
        dmi = weight_kg * dmi_multiplier
    
    with col_result:
        st.metric("Total Dry Matter Intake (DMI)", f"{dmi:.2f} kg / day")
        
        st.write("### Recommended Feed Breakdown")
        
        # Roughage vs Concentrate Ratio based on life stage
        r_ratio = 0.7 if life_stage == "Maintenance" else 0.6 if life_stage == "Growth" else 0.5
        c_ratio = 1.0 - r_ratio
        
        r_kg = dmi * r_ratio
        c_kg = dmi * c_ratio
        
        st.write(f"**Roughage ({r_ratio*100:.0f}%):** {r_kg:.2f} kg")
        st.progress(r_ratio)
        st.caption("Hay, Grass, Pellets (for Rabbits), Silage, Crop residues")
        
        st.write(f"**Concentrate ({c_ratio*100:.0f}%):** {c_kg:.2f} kg")
        st.progress(c_ratio)
        st.caption("Grains, Dairy Meal, Protein Cakes, Minerals")

# --- TAB 3: HEALTH & MAINTENANCE GUIDE ---
with tab3:
    st.header("📅 Essential Health & Maintenance Schedule")
    st.write("Follow this general guide to keep your diverse livestock healthy.")
    
    vaccine_data = {
        "Cattle": [
            {"Task": "FMD Vaccine", "Frequency": "Every 6 Months", "Importance": "High"},
            {"Task": "Anthrax & Black Quarter", "Frequency": "Annual", "Importance": "Critical"},
            {"Task": "Brucellosis (Heifers)", "Frequency": "Once (4-8 months old)", "Importance": "High"},
            {"Task": "Lumpy Skin Disease", "Frequency": "Annual", "Importance": "High"},
            {"Task": "Deworming", "Frequency": "Every 3-4 Months", "Importance": "Essential"},
            {"Task": "Tick Control (Spraying/Dipping)", "Frequency": "Weekly/Bi-weekly", "Importance": "Essential"}
        ],
        "Sheep/Goats": [
            {"Task": "PPR Vaccine", "Frequency": "Annual", "Importance": "Critical"},
            {"Task": "CCPP (Goats)", "Frequency": "Annual", "Importance": "High"},
            {"Task": "Enterotoxemia", "Frequency": "Twice a Year", "Importance": "High"},
            {"Task": "Orf (Sore Mouth)", "Frequency": "Annual", "Importance": "Medium"},
            {"Task": "Deworming", "Frequency": "Every 3 Months", "Importance": "Essential"},
            {"Task": "Hoof Trimming", "Frequency": "Every 2-3 Months", "Importance": "Essential"}
        ],
        "Poultry": [
            {"Task": "Marek's Disease", "Frequency": "Day 1 (Hatchery)", "Importance": "Critical"},
            {"Task": "Newcastle Disease (ND)", "Frequency": "Weeks 1, 3, 18", "Importance": "Critical"},
            {"Task": "Gumboro (IBD)", "Frequency": "Weeks 2, 4", "Importance": "High"},
            {"Task": "Fowl Pox", "Frequency": "Week 6-8", "Importance": "Essential"},
            {"Task": "Infectious Bronchitis (IB)", "Frequency": "Weeks 3, 18", "Importance": "High"},
            {"Task": "Coccidiosis Treatment", "Frequency": "As needed (preventative)", "Importance": "High"}
        ],
        "Pigs": [
            {"Task": "Swine Fever", "Frequency": "Annual", "Importance": "Critical"},
            {"Task": "FMD Vaccine", "Frequency": "Every 6 Months", "Importance": "High"},
            {"Task": "Parvovirus/Lepto/Erysipelas", "Frequency": "Every 6 Months", "Importance": "High"},
            {"Task": "Iron Injection (Piglets)", "Frequency": "Day 3 of life", "Importance": "Critical"},
            {"Task": "Deworming", "Frequency": "Every 4 Months", "Importance": "Essential"}
        ],
        "Rabbits": [
            {"Task": "Viral Hemorrhagic Disease", "Frequency": "Annual", "Importance": "Critical"},
            {"Task": "Myxomatosis", "Frequency": "Every 6-12 Months", "Importance": "High"},
            {"Task": "Coccidiosis Prevention", "Frequency": "Monthly in water", "Importance": "High"},
            {"Task": "Ear Mite Check/Treatment", "Frequency": "Monthly", "Importance": "Essential"},
            {"Task": "Deworming", "Frequency": "Every 3 Months", "Importance": "Medium"}
        ],
        "Horses": [
            {"Task": "Tetanus & Influenza", "Frequency": "Annual", "Importance": "Critical"},
            {"Task": "Rabies", "Frequency": "Annual", "Importance": "High"},
            {"Task": "West Nile Virus", "Frequency": "Annual", "Importance": "High"},
            {"Task": "Dental Floating", "Frequency": "Annual", "Importance": "Essential"},
            {"Task": "Hoof Trimming/Shoeing", "Frequency": "Every 6-8 Weeks", "Importance": "Essential"}
        ],
        "Fish (Aquaculture)": [
            {"Task": "Water Quality (pH/Oxygen)", "Frequency": "Daily", "Importance": "Critical"},
            {"Task": "Pond Liming/Fertilizing", "Frequency": "Monthly", "Importance": "High"},
            {"Task": "Sorting/Grading", "Frequency": "Every 4-6 Weeks", "Importance": "Essential"},
            {"Task": "Aerator Maintenance", "Frequency": "Weekly", "Importance": "High"}
        ],
        "Bees (Apiculture)": [
            {"Task": "Hive Inspection", "Frequency": "Weekly (Spring/Summer)", "Importance": "High"},
            {"Task": "Varroa Mite Treatment", "Frequency": "Spring & Autumn", "Importance": "Critical"},
            {"Task": "Queen Health Check", "Frequency": "Monthly", "Importance": "Essential"},
            {"Task": "Sugar Syrup Feeding", "Frequency": "During Dearth/Winter", "Importance": "Essential"}
        ]
    }
    
    selected_animal = st.radio("View Schedule For:", list(vaccine_data.keys()), horizontal=True)
    st.dataframe(pd.DataFrame(vaccine_data[selected_animal]), use_container_width=True)

st.markdown("---")
st.caption("⚠️ Disclaimer: This AI tool is for informational purposes only. Always consult a certified veterinarian for definitive medical advice.")