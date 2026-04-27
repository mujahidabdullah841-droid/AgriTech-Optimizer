document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        user: null,
        herd: [],
        inventory: {
            hay: 500,
            silage: 200,
            vaccines: 10
        }
    };

    // --- Selectors ---
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const navLinks = document.querySelectorAll('.nav-links li');
    const tabs = document.querySelectorAll('.tab-content');
    
    // Forms
    const loginForm = document.getElementById('native-login-form');
    const bypassBtn = document.getElementById('bypass-login-btn');
    const addAnimalForm = document.getElementById('add-animal-form');
    
    // UI Elements
    const displayName = document.getElementById('display-name');
    const herdList = document.getElementById('herd-list');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Navigation Logic ---
    function showTab(targetId) {
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.id === `tab-${targetId}`) {
                tab.classList.add('active');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.target === targetId) {
                link.classList.add('active');
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            showTab(link.dataset.target);
        });
    });

    // --- Auth Logic ---
    function login(userData) {
        state.user = userData;
        displayName.textContent = userData.name;
        loginView.classList.remove('active');
        appView.classList.add('active');
        updateUI();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        login({ name: 'Admin Farmer', email: 'admin@agritech.farm' });
    });

    bypassBtn.addEventListener('click', () => {
        login({ name: 'Dev Farmer', email: 'dev@agritech.local' });
    });

    logoutBtn.addEventListener('click', () => {
        state.user = null;
        appView.classList.remove('active');
        loginView.classList.add('active');
    });

    // --- Herd Management ---
    function updateHerdUI() {
        herdList.innerHTML = '';
        state.herd.forEach((animal, index) => {
            const card = document.createElement('div');
            card.className = 'card glass-panel animal-card fade-in';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="color: var(--primary); margin-bottom: 5px;">${animal.name}</h4>
                        <p style="font-size: 0.9rem; color: var(--text-light);">${animal.type} | ${animal.weight}kg</p>
                        <p style="font-size: 0.8rem; color: #66bb6a; margin-top: 5px;">● Healthy</p>
                    </div>
                    <button class="btn-icon" onclick="removeAnimal(${index})"><i class="ph ph-trash"></i></button>
                </div>
            `;
            herdList.appendChild(card);
        });
        document.getElementById('metric-animals').textContent = state.herd.length;
    }

    window.removeAnimal = (index) => {
        state.herd.splice(index, 1);
        updateHerdUI();
    };

    addAnimalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('animal-name').value;
        const type = document.getElementById('animal-type').value;
        const weight = document.getElementById('animal-weight').value;
        
        state.herd.push({ name, type, weight });
        updateHerdUI();
        addAnimalForm.reset();
        document.getElementById('add-animal-form-container').classList.add('hidden');
    });

    document.getElementById('add-animal-toggle').addEventListener('click', () => {
        document.getElementById('add-animal-form-container').classList.toggle('hidden');
    });

    // --- Nutrition Logic ---
    const nutritionType = document.getElementById('nutrition-type-select');
    const nutritionWeight = document.getElementById('nutrition-weight');
    const nutritionStage = document.getElementById('nutrition-stage');
    
    function updateNutrition() {
        const weight = parseFloat(nutritionWeight.value) || 0;
        const stage = nutritionStage.value;
        const type = nutritionType.value;
        
        let multiplier = 0.025;
        if (stage === 'Growth') multiplier = 0.03;
        if (stage.includes('High Yield')) multiplier = 0.04;
        
        const dmi = weight * multiplier;
        const roughagePct = stage === 'Maintenance' ? 70 : 60;
        const concentratePct = 100 - roughagePct;
        
        document.getElementById('dmi-result').textContent = dmi.toFixed(2);
        document.getElementById('roughage-pct').textContent = roughagePct;
        document.getElementById('concentrate-pct').textContent = concentratePct;
        document.getElementById('roughage-kg').textContent = (dmi * roughagePct / 100).toFixed(2) + ' kg';
        document.getElementById('concentrate-kg').textContent = (dmi * concentratePct / 100).toFixed(2) + ' kg';
        
        document.getElementById('roughage-bar').style.width = roughagePct + '%';
        document.getElementById('concentrate-bar').style.width = concentratePct + '%';
    }

    [nutritionType, nutritionWeight, nutritionStage].forEach(el => {
        el.addEventListener('change', updateNutrition);
        el.addEventListener('input', updateNutrition);
    });

    // --- Diagnostics Logic ---
    const symptoms = [
        "High Fever", "Dark/Red Urine", "Ticks Present", "Pale Gums", 
        "Blisters on Mouth/Feet", "Excessive Salivation", "Limping"
    ];
    
    const symptomsContainer = document.getElementById('symptoms-container');
    symptoms.forEach(s => {
        const label = document.createElement('label');
        label.className = 'checkbox-container';
        label.innerHTML = `${s}<input type="checkbox" value="${s}"><span class="checkmark"></span>`;
        symptomsContainer.appendChild(label);
    });

    document.getElementById('run-diagnostic').addEventListener('click', () => {
        const selected = Array.from(symptomsContainer.querySelectorAll('input:checked')).map(i => i.value);
        const resultsDiv = document.getElementById('diagnostic-results');
        
        if (selected.length === 0) {
            resultsDiv.innerHTML = '<p class="placeholder-text">Please select symptoms.</p>';
            return;
        }

        resultsDiv.innerHTML = '<div class="animal-card" style="border-left-color: #ffa000;"><h4>Analyzing symptoms...</h4><p>Contacting AI engine.</p></div>';
        
        // Mock API call
        setTimeout(() => {
            if (selected.includes('High Fever') && selected.includes('Dark/Red Urine')) {
                resultsDiv.innerHTML = `
                    <div class="animal-card" style="border-left-color: #ff4b4b;">
                        <h4 style="color: #ff4b4b;">Babesiosis (Redwater)</h4>
                        <p><strong>Severity:</strong> High</p>
                        <p><strong>Action:</strong> Administer diminazene aceturate and contact vet.</p>
                    </div>
                `;
            } else {
                resultsDiv.innerHTML = '<div class="animal-card" style="border-left-color: #2e7d32;"><h4>Condition Stable</h4><p>No critical diseases matched. Continue monitoring.</p></div>';
            }
        }, 800);
    });

    // --- Initial Setup ---
    function updateUI() {
        updateHerdUI();
        updateNutrition();
        document.getElementById('metric-supplies').textContent = state.inventory.hay + state.inventory.silage;
        
        // Load a banner placeholder
        document.getElementById('banner-img').src = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80";
    }
});
