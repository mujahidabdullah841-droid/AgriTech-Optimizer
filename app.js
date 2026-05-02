// Redirect user to backend login route
function loginWithGoogle() {
  window.location.href = "/auth/google/login";
}

// Handle OAuth callback when user returns
function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  
  const token = urlParams.get("token");
  const user = urlParams.get("user");
  const error = urlParams.get("auth_error");

  if (error) {
    console.error("Auth error:", error);
    const readableError = error.replaceAll("_", " ");
    alert(`Login failed: ${readableError}`);
    return false;
  }

  if (token && user) {
    // Save session
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user_name", user);

    // Clean URL (important)
    window.history.replaceState({}, document.title, "/");

    console.log("User logged in successfully:", user);
    return true;
  } else if (token) {
    // Fallback for old format
    localStorage.setItem("auth_token", token);
    window.history.replaceState({}, document.title, "/");
    return true;
  }
  
  return false;
}

// Function to update login state in UI
function updateLoginState(isLoggedIn, userName) {
  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");

  if (isLoggedIn && loginView && appView) {
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");

    // Update greeting if element exists
    const greeting = document.getElementById("greeting");
    if (greeting) {
      greeting.textContent = `Welcome, ${userName}!`;
    }
  }
}

// Logout function
function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_name");

  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");

  if (loginView && appView) {
    appView.classList.add("hidden");
    loginView.classList.remove("hidden");
  }

  // Redirect to home
  window.location.href = "/";
}

// Check if user is already logged in on page load
document.addEventListener("DOMContentLoaded", () => {
    const SPECIES_MULTIPLIERS = {
        cattle: 0.025,
        sheep: 0.04,
        goat: 0.03,
        "pigs": 0.035,
        "poultry (broilers/layers)": 0.05,
        rabbit: 0.045,
        horse: 0.02,
        donkey: 0.02,
        camel: 0.015,
        turkey: 0.045
    };

    const STAGE_FACTORS = {
        "Maintenance": 1,
        "Growth": 1.2,
        "Lactation (High Yield)": 1.35,
        "Lactation (Low Yield)": 1.15
    };

    const SYMPTOMS = [
        "High Fever",
        "Dark/Red Urine",
        "Ticks Present",
        "Pale Gums",
        "Blisters on Mouth/Feet",
        "Excessive Salivation",
        "Limping"
    ];

    const SYMPTOM_TO_API = {
        "High Fever": "fever",
        "Dark/Red Urine": "dark urine",
        "Ticks Present": "anemia",
        "Pale Gums": "anemia",
        "Blisters on Mouth/Feet": "udder lesions",
        "Excessive Salivation": "salivation",
        "Limping": "lameness"
    };

    // Beautiful farm images collection
    const FARM_IMAGES = [
        {
            url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80",
            name: "Green Pasture",
            description: "Lush green pasture with grazing cattle"
        },
        {
            url: "https://images.unsplash.com/photo-1574943320219-553eb2f72395?auto=format&fit=crop&w=1600&q=80",
            name: "Sunrise Farm",
            description: "Beautiful sunrise over agricultural fields"
        },
        {
            url: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1600&q=80",
            name: "Harvest Season",
            description: "Golden grain fields ready for harvest"
        },
        {
            url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80",
            name: "Livestock Grazing",
            description: "Healthy livestock on green pasture"
        },
        {
            url: "https://images.unsplash.com/photo-1368681281862-eaea21cacb0f?auto=format&fit=crop&w=1600&q=80",
            name: "Modern Farm",
            description: "Contemporary farming landscape"
        },
        {
            url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1600&q=80",
            name: "Country Field",
            description: "Vast open farming landscape"
        }
    ];

    const SCHEDULE_DATA = {
        Cattle: [
            { task: "FMD vaccine", frequency: "Every 6 months", importance: "High" },
            { task: "Deworming", frequency: "Every 3 months", importance: "High" },
            { task: "Tick control spray", frequency: "Monthly", importance: "Medium" },
            { task: "Hoof check", frequency: "Monthly", importance: "Medium" }
        ],
        Sheep: [
            { task: "PPR vaccine", frequency: "Yearly", importance: "High" },
            { task: "Deworming", frequency: "Every 2 months", importance: "High" },
            { task: "Body condition scoring", frequency: "Monthly", importance: "Medium" },
            { task: "Foot rot inspection", frequency: "Every 2 weeks", importance: "Medium" }
        ],
        Goat: [
            { task: "Clostridial vaccine", frequency: "Yearly", importance: "High" },
            { task: "Deworming", frequency: "Every 2 months", importance: "High" },
            { task: "Mineral block refill", frequency: "Weekly", importance: "Medium" },
            { task: "Hoof trimming", frequency: "Every 8 weeks", importance: "Medium" }
        ],
        Poultry: [
            { task: "Newcastle vaccine", frequency: "As local protocol", importance: "High" },
            { task: "Waterline sanitization", frequency: "Weekly", importance: "High" },
            { task: "Litter moisture check", frequency: "Daily", importance: "Medium" },
            { task: "Ventilation inspection", frequency: "Daily", importance: "Medium" }
        ]
    };

    const state = {
        user: null,
        herd: [],
        inventory: {
            hay: 500,
            silage: 200,
            vaccines: 10
        },
        selectedScheduleAnimal: "Cattle",
        customImages: [],
        currentImageIndex: 0,
        imageRotationInterval: null,
        completedTasks: {},
        productivity: {},
        production: {},
        expenses: [],
        income: []
    };

    const loginView = document.getElementById("login-view");
    const appView = document.getElementById("app-view");
    if (!loginView || !appView) {
        return;
    }

    const navLinks = document.querySelectorAll(".nav-links li");
    const tabs = document.querySelectorAll(".tab-content");

    const loginForm = document.getElementById("native-login-form");
    const bypassBtn = document.getElementById("bypass-login-btn");
    const googleLoginBtn = document.getElementById("google-login-btn");
    const addAnimalForm = document.getElementById("add-animal-form");
    const addAnimalToggle = document.getElementById("add-animal-toggle");

    const displayName = document.getElementById("display-name");
    const greeting = document.getElementById("greeting");
    const bannerImg = document.getElementById("banner-img");
    const herdList = document.getElementById("herd-list");
    const logoutBtn = document.getElementById("logout-btn");
    const metricAnimals = document.getElementById("metric-animals");
    const metricSupplies = document.getElementById("metric-supplies");

    const nutritionType = document.getElementById("nutrition-type-select");
    const nutritionWeight = document.getElementById("nutrition-weight");
    const nutritionStage = document.getElementById("nutrition-stage");
    const useHerdToggle = document.getElementById("use-herd-toggle");
    const herdSelectContainer = document.getElementById("herd-select-container");
    const nutritionHerdSelect = document.getElementById("nutrition-herd-select");
    const nutritionHerdInfo = document.getElementById("nutrition-herd-info");
    const manualSelectContainer = document.getElementById("manual-select-container");

    const dmiResult = document.getElementById("dmi-result");
    const roughagePct = document.getElementById("roughage-pct");
    const roughageKg = document.getElementById("roughage-kg");
    const roughageBar = document.getElementById("roughage-bar");
    const concentratePct = document.getElementById("concentrate-pct");
    const concentrateKg = document.getElementById("concentrate-kg");
    const concentrateBar = document.getElementById("concentrate-bar");

    const symptomsContainer = document.getElementById("symptoms-container");
    const runDiagnosticBtn = document.getElementById("run-diagnostic");
    const diagnosticResults = document.getElementById("diagnostic-results");

    const scheduleTabs = document.getElementById("schedule-tabs");
    const scheduleTbody = document.getElementById("schedule-tbody");

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function normalizeSpeciesLabel(value) {
        return String(value || "").trim().toLowerCase();
    }

    function toTitleCase(value) {
        return String(value || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
    }

    function serializeState() {
        return {
            user: state.user,
            herd: state.herd,
            inventory: state.inventory,
            selectedScheduleAnimal: state.selectedScheduleAnimal,
            customImages: state.customImages,
            currentImageIndex: state.currentImageIndex,
            completedTasks: state.completedTasks,
            productivity: state.productivity,
            expenses: state.expenses,
            income: state.income
        };
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
        } catch (error) {
            console.warn("Unable to save app state:", error);
        }
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                if (parsed.user && typeof parsed.user === "object") {
                    state.user = parsed.user;
                }
                if (Array.isArray(parsed.herd)) {
                    state.herd = parsed.herd
                        .map((animal) => ({
                            name: String(animal.name || "").trim(),
                            type: String(animal.type || "Cattle").trim(),
                            weight: Number(animal.weight)
                        }))
                        .filter((animal) => animal.name && Number.isFinite(animal.weight) && animal.weight > 0);
                }
                if (parsed.inventory && typeof parsed.inventory === "object") {
                    const hay = Number(parsed.inventory.hay);
                    const silage = Number(parsed.inventory.silage);
                    const vaccines = Number(parsed.inventory.vaccines);
                    state.inventory = {
                        hay: Number.isFinite(hay) ? hay : 500,
                        silage: Number.isFinite(silage) ? silage : 200,
                        vaccines: Number.isFinite(vaccines) ? vaccines : 10
                    };
                }
                if (typeof parsed.selectedScheduleAnimal === "string" && parsed.selectedScheduleAnimal.trim()) {
                    state.selectedScheduleAnimal = parsed.selectedScheduleAnimal.trim();
                }
                if (Array.isArray(parsed.customImages)) {
                    state.customImages = parsed.customImages.filter(img => typeof img === "string");
                }
                if (Number.isFinite(parsed.currentImageIndex)) {
                    state.currentImageIndex = parsed.currentImageIndex;
                }
                if (parsed.completedTasks && typeof parsed.completedTasks === "object") {
                    state.completedTasks = parsed.completedTasks;
                }
                if (parsed.productivity && typeof parsed.productivity === "object") {
                    state.productivity = parsed.productivity;
                }
                if (Array.isArray(parsed.expenses)) {
                    state.expenses = parsed.expenses;
                }
                if (Array.isArray(parsed.income)) {
                    state.income = parsed.income;
                }
            }
        } catch (error) {
            console.warn("Unable to load app state:", error);
        }
    }


    function showTab(targetId) {
        tabs.forEach((tab) => {
            tab.classList.toggle("active", tab.id === `tab-${targetId}`);
        });

        navLinks.forEach((link) => {
            link.classList.toggle("active", link.dataset.target === targetId);
        });
    }

    navLinks.forEach((link) => {
        link.addEventListener("click", () => showTab(link.dataset.target));
    });

    function showAppShell() {
        loginView.classList.remove("active");
        appView.classList.add("active");
    }

    function showLoginShell() {
        appView.classList.remove("active");
        loginView.classList.add("active");
    }

    function updateGreeting() {
        if (!greeting) {
            return;
        }
        const hour = new Date().getHours();
        let period = "Morning";
        if (hour >= 12 && hour < 17) {
            period = "Afternoon";
        } else if (hour >= 17) {
            period = "Evening";
        }
        const firstName = state.user?.name ? state.user.name.split(" ")[0] : "Farmer";
        greeting.textContent = `Good ${period}, ${firstName}!`;
    }

    function updateInventoryMetric() {
        if (!metricSupplies) {
            return;
        }
        const total = Number(state.inventory.hay) + Number(state.inventory.silage);
        metricSupplies.textContent = String(total);
    }

    function renderHerd() {
        if (!herdList) {
            return;
        }
        herdList.innerHTML = "";

        if (state.herd.length === 0) {
            herdList.innerHTML = `
                <div class="card glass-panel empty-state">
                    <h3>No animals yet</h3>
                    <p>Add your first animal to unlock herd-based nutrition and diagnostics.</p>
                </div>
            `;
        } else {
            state.herd.forEach((animal, index) => {
                const card = document.createElement("div");
                card.className = "card glass-panel animal-card fade-in";
                card.innerHTML = `
                    <div class="animal-row">
                        <div>
                            <h4>${escapeHtml(animal.name)}</h4>
                            <p>${escapeHtml(animal.type)} | ${Number(animal.weight).toFixed(1)} kg</p>
                            <span class="health-pill">Healthy</span>
                        </div>
                        <button class="btn-icon remove-animal-btn" data-remove-index="${index}" aria-label="Remove animal">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                `;
                herdList.appendChild(card);
            });
        }

        if (metricAnimals) {
            metricAnimals.textContent = String(state.herd.length);
        }

        refreshNutritionHerdOptions();
    }

    herdList?.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const button = target?.closest(".remove-animal-btn");
        if (!button) {
            return;
        }
        const index = Number(button.getAttribute("data-remove-index"));
        if (!Number.isInteger(index) || index < 0 || index >= state.herd.length) {
            return;
        }
        state.herd.splice(index, 1);
        renderHerd();
        updateNutrition();
        saveState();
    });

    addAnimalToggle?.addEventListener("click", () => {
        const container = document.getElementById("add-animal-form-container");
        container?.classList.toggle("hidden");
    });

    addAnimalForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const nameInput = document.getElementById("animal-name");
        const typeInput = document.getElementById("animal-type");
        const weightInput = document.getElementById("animal-weight");

        const rawName = nameInput?.value || "";
        const rawType = typeInput?.value || "Cattle";
        const rawWeight = Number(weightInput?.value);

        if (!rawName.trim() || !Number.isFinite(rawWeight) || rawWeight <= 0) {
            window.alert("Please enter a valid animal name and weight.");
            return;
        }

        state.herd.push({
            name: rawName.trim(),
            type: rawType,
            weight: Number(rawWeight.toFixed(1))
        });

        addAnimalForm.reset();
        const container = document.getElementById("add-animal-form-container");
        container?.classList.add("hidden");
        renderHerd();
        updateNutrition();
        saveState();
    });

    function getMultiplier(speciesLabel) {
        const key = normalizeSpeciesLabel(speciesLabel);
        return SPECIES_MULTIPLIERS[key] || 0.025;
    }

    function refreshNutritionHerdOptions() {
        if (!useHerdToggle || !nutritionHerdSelect || !herdSelectContainer || !manualSelectContainer) {
            return;
        }

        nutritionHerdSelect.innerHTML = "";
        state.herd.forEach((animal, index) => {
            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = `${animal.name} (${animal.type})`;
            nutritionHerdSelect.appendChild(option);
        });

        if (state.herd.length === 0) {
            useHerdToggle.checked = false;
            useHerdToggle.disabled = true;
            herdSelectContainer.classList.add("hidden");
            manualSelectContainer.classList.remove("hidden");
            if (nutritionHerdInfo) {
                nutritionHerdInfo.textContent = "Add animals in My Herd to use this mode.";
            }
        } else {
            useHerdToggle.disabled = false;
            if (useHerdToggle.checked) {
                herdSelectContainer.classList.remove("hidden");
                manualSelectContainer.classList.add("hidden");
            }
        }

        syncNutritionFromHerd();
    }

    function syncNutritionFromHerd() {
        if (!useHerdToggle?.checked || state.herd.length === 0) {
            return;
        }
        const selectedIndex = Number(nutritionHerdSelect?.value || 0);
        const selected = state.herd[selectedIndex] || state.herd[0];
        if (!selected) {
            return;
        }

        if (nutritionWeight) {
            nutritionWeight.value = String(selected.weight);
        }
        if (nutritionType) {
            const options = Array.from(nutritionType.options);
            const matched = options.find(
                (option) => normalizeSpeciesLabel(option.value) === normalizeSpeciesLabel(selected.type)
            );
            if (matched) {
                nutritionType.value = matched.value;
            }
        }
        if (nutritionHerdInfo) {
            nutritionHerdInfo.textContent = `Using ${selected.name} (${selected.type}, ${selected.weight.toFixed(1)} kg)`;
        }
    }

    function getNutritionInput() {
        if (useHerdToggle?.checked && state.herd.length > 0) {
            const selectedIndex = Number(nutritionHerdSelect?.value || 0);
            const selected = state.herd[selectedIndex] || state.herd[0];
            return selected
                ? {
                    type: selected.type,
                    weight: Number(selected.weight)
                }
                : null;
        }

        return {
            type: nutritionType?.value || "Cattle",
            weight: Number(nutritionWeight?.value || 0)
        };
    }

    function updateNutrition() {
        const input = getNutritionInput();
        if (!input || !Number.isFinite(input.weight) || input.weight <= 0) {
            return;
        }

        const stage = nutritionStage?.value || "Maintenance";
        const speciesMultiplier = getMultiplier(input.type);
        const stageFactor = STAGE_FACTORS[stage] || 1;
        const dmi = input.weight * speciesMultiplier * stageFactor;

        const roughageRatio = stage === "Maintenance" ? 0.7 : 0.6;
        const concentrateRatio = 1 - roughageRatio;

        dmiResult.textContent = dmi.toFixed(2);
        roughagePct.textContent = String(Math.round(roughageRatio * 100));
        concentratePct.textContent = String(Math.round(concentrateRatio * 100));
        roughageKg.textContent = `${(dmi * roughageRatio).toFixed(2)} kg`;
        concentrateKg.textContent = `${(dmi * concentrateRatio).toFixed(2)} kg`;
        roughageBar.style.width = `${Math.round(roughageRatio * 100)}%`;
        concentrateBar.style.width = `${Math.round(concentrateRatio * 100)}%`;
    }

    useHerdToggle?.addEventListener("change", () => {
        if (!herdSelectContainer || !manualSelectContainer) {
            return;
        }
        if (useHerdToggle.checked && state.herd.length > 0) {
            herdSelectContainer.classList.remove("hidden");
            manualSelectContainer.classList.add("hidden");
            syncNutritionFromHerd();
        } else {
            herdSelectContainer.classList.add("hidden");
            manualSelectContainer.classList.remove("hidden");
        }
        updateNutrition();
    });

    nutritionHerdSelect?.addEventListener("change", () => {
        syncNutritionFromHerd();
        updateNutrition();
    });

    [nutritionType, nutritionWeight, nutritionStage].forEach((element) => {
        element?.addEventListener("change", updateNutrition);
        element?.addEventListener("input", updateNutrition);
    });

    function getDiagnosisSpecies() {
        if (useHerdToggle?.checked && state.herd.length > 0) {
            const selectedIndex = Number(nutritionHerdSelect?.value || 0);
            const selected = state.herd[selectedIndex] || state.herd[0];
            if (selected?.type) {
                return selected.type;
            }
        }
        if (state.herd.length > 0 && state.herd[0].type) {
            return state.herd[0].type;
        }
        return nutritionType?.value || "Cattle";
    }

    function getSeverityClass(severity) {
        const key = String(severity || "").toLowerCase();
        if (key === "critical") {
            return "critical";
        }
        if (key === "high") {
            return "high";
        }
        return "medium";
    }

    function renderDiagnosisFromMatches(matches, sourceLabel) {
        if (!diagnosticResults) {
            return;
        }

        if (!Array.isArray(matches) || matches.length === 0) {
            diagnosticResults.innerHTML = `
                <div class="result-card safe-result">
                    <h4>Condition Stable</h4>
                    <p>No critical disease match found from the selected symptoms. Continue monitoring.</p>
                </div>
            `;
            return;
        }

        const cards = matches
            .map((item) => {
                const severityClass = getSeverityClass(item.severity);
                const score = Number(item.match_percentage || 0).toFixed(1);
                return `
                    <div class="result-card severity-${severityClass}">
                        <div class="result-header">
                            <h4>${escapeHtml(item.disease_name || "Potential condition")}</h4>
                            <span class="severity-badge ${severityClass}">${escapeHtml(item.severity || "medium")}</span>
                        </div>
                        <p><strong>Confidence:</strong> ${score}% match</p>
                        <p><strong>Recommended action:</strong> ${escapeHtml(item.treatment || "Consult a veterinarian.")}</p>
                    </div>
                `;
            })
            .join("");

        diagnosticResults.innerHTML = `
            <p class="result-meta">Analysis source: ${escapeHtml(sourceLabel)}</p>
            ${cards}
        `;
    }

    function runLocalDiagnosisFallback(selectedSymptoms) {
        const set = new Set(selectedSymptoms);
        const candidates = [];

        if (set.has("High Fever") && set.has("Dark/Red Urine")) {
            candidates.push({
                disease_name: "Babesiosis (Redwater)",
                severity: "high",
                match_percentage: 82.5,
                treatment: "Administer antiprotozoal treatment and contact a veterinarian."
            });
        }

        if (set.has("Excessive Salivation") && (set.has("Limping") || set.has("Blisters on Mouth/Feet"))) {
            candidates.push({
                disease_name: "Foot and Mouth Disease",
                severity: "high",
                match_percentage: 78.0,
                treatment: "Isolate affected animals and seek urgent veterinary support."
            });
        }

        renderDiagnosisFromMatches(candidates, "Local fallback rules");
    }

    async function runDiagnosis() {
        if (!symptomsContainer || !diagnosticResults) {
            return;
        }

        const selected = Array.from(symptomsContainer.querySelectorAll("input:checked")).map(
            (input) => input.value
        );
        if (selected.length === 0) {
            diagnosticResults.innerHTML = '<p class="placeholder-text">Please select at least one symptom.</p>';
            return;
        }

        diagnosticResults.innerHTML = `
            <div class="result-card loading-result">
                <h4>Analyzing symptoms</h4>
                <p>Contacting diagnosis service...</p>
            </div>
        `;

        const apiSymptoms = selected.map((label) => SYMPTOM_TO_API[label] || label.toLowerCase());
        const species = getDiagnosisSpecies();

        try {
            const response = await fetch(`/api/diagnosis`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    species,
                    symptoms: apiSymptoms
                })
            });

            if (!response.ok) {
                throw new Error(`Diagnosis request failed: ${response.status}`);
            }

            const payload = await response.json();
            renderDiagnosisFromMatches(payload.potential_diseases || [], "Live API");
        } catch (error) {
            console.warn("Using local diagnosis fallback:", error);
            runLocalDiagnosisFallback(selected);
        }
    }

    function buildSymptoms() {
        if (!symptomsContainer) {
            return;
        }
        symptomsContainer.innerHTML = "";
        SYMPTOMS.forEach((symptom) => {
            const label = document.createElement("label");
            label.className = "checkbox-container";
            label.innerHTML = `
                ${escapeHtml(symptom)}
                <input type="checkbox" value="${escapeHtml(symptom)}">
                <span class="checkmark"></span>
            `;
            symptomsContainer.appendChild(label);
        });
    }

    runDiagnosticBtn?.addEventListener("click", runDiagnosis);

    function renderScheduleTabs() {
        if (!scheduleTabs) {
            return;
        }
        const keys = Object.keys(SCHEDULE_DATA);
        if (!keys.includes(state.selectedScheduleAnimal)) {
            state.selectedScheduleAnimal = keys[0];
        }

        scheduleTabs.innerHTML = "";
        keys.forEach((animal) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `animal-tab ${state.selectedScheduleAnimal === animal ? "active" : ""}`;
            button.dataset.animal = animal;
            button.textContent = animal;
            scheduleTabs.appendChild(button);
        });
    }

    function renderScheduleTable() {
        if (!scheduleTbody) {
            return;
        }
        const rows = SCHEDULE_DATA[state.selectedScheduleAnimal] || [];
        scheduleTbody.innerHTML = "";
        rows.forEach((item, index) => {
            const taskKey = `${state.selectedScheduleAnimal}-${index}`;
            const isCompleted = state.completedTasks[taskKey] || false;
            const row = document.createElement("tr");
            row.className = isCompleted ? "task-completed" : "";
            row.innerHTML = `
                <td><input type="checkbox" class="task-checkbox" data-key="${escapeHtml(taskKey)}" ${isCompleted ? "checked" : ""}></td>
                <td><span class="task-name ${isCompleted ? "strikethrough" : ""}">${escapeHtml(item.task)}</span></td>
                <td>${escapeHtml(item.frequency)}</td>
                <td><span class="importance ${item.importance.toLowerCase()}">${escapeHtml(item.importance)}</span></td>
            `;
            scheduleTbody.appendChild(row);
        });
        
        // Add event listeners to checkboxes
        document.querySelectorAll(".task-checkbox").forEach(checkbox => {
            checkbox.addEventListener("change", (e) => {
                const key = e.target.getAttribute("data-key");
                state.completedTasks[key] = e.target.checked;
                saveState();
                renderScheduleTable();
            });
        });
    }

    scheduleTabs?.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target.closest(".animal-tab") : null;
        if (!target) {
            return;
        }
        const animal = target.getAttribute("data-animal");
        if (!animal) {
            return;
        }
        state.selectedScheduleAnimal = animal;
        renderScheduleTabs();
        renderScheduleTable();
        saveState();
    });

    function login(userData) {
        state.user = userData;
        if (displayName) {
            displayName.textContent = userData.name;
        }
        showAppShell();
        updateUI();
        saveState();
    }

    function clearAuthQueryParams(params) {
        params.delete("auth_success");
        params.delete("auth_error");
        params.delete("name");
        params.delete("email");
        params.delete("token");
        params.delete("user");
        const query = params.toString();
        const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
        window.history.replaceState({}, document.title, nextUrl);
    }

    function consumeAuthQueryParams() {
        const params = new URLSearchParams(window.location.search);
        
        // Handle OAuth callback from Google (token & user)
        const token = params.get("token");
        const user = params.get("user");
        
        if (token && user) {
            localStorage.setItem("auth_token", token);
            localStorage.setItem("user_name", user);
            login({ name: user, email: `${user}@agritech.farm` });
            clearAuthQueryParams(params);
            return true;
        }
        
        // Handle legacy auth_success format
        if (params.get("auth_success") === "1") {
            const name = params.get("name") || "Farmer";
            const email = params.get("email") || "unknown@agritech.farm";
            login({ name, email });
            clearAuthQueryParams(params);
            return true;
        }

        // Handle errors
        const authError = params.get("auth_error");
        if (authError) {
            const readableError = authError.replaceAll("_", " ");
            window.alert(`Login failed: ${readableError}`);
            clearAuthQueryParams(params);
        }
        return false;
    }

    loginForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");
        const username = String(usernameInput?.value || "").trim();
        const password = String(passwordInput?.value || "").trim();

        if (!username || !password) {
            window.alert("Enter both username and password to continue.");
            return;
        }

        const normalized = username.toLowerCase().replace(/\s+/g, "");
        login({
            name: toTitleCase(username),
            email: `${normalized}@agritech.farm`
        });
        loginForm.reset();
    });

    bypassBtn?.addEventListener("click", () => {
        login({
            name: "Dev Farmer",
            email: "dev@agritech.local"
        });
    });

    googleLoginBtn?.addEventListener("click", () => {
        const nextPath = window.location.pathname || "/";
        window.location.href = `/auth/google/login?next=${encodeURIComponent(nextPath)}`;
    });

    logoutBtn?.addEventListener("click", () => {
        state.user = null;
        saveState();
        showLoginShell();
    });

    function getCurrentBannerImage() {
        const allImages = [...FARM_IMAGES, ...state.customImages.map(dataUrl => ({
            url: dataUrl,
            name: "Your Farm Photo",
            description: "Custom farm image"
        }))];
        
        if (allImages.length === 0) return FARM_IMAGES[0];
        return allImages[state.currentImageIndex % allImages.length];
    }

    function rotateToNextImage() {
        const allImages = [...FARM_IMAGES, ...state.customImages.map(dataUrl => ({
            url: dataUrl,
            name: "Your Farm Photo",
            description: "Custom farm image"
        }))];
        
        if (allImages.length === 0) return;
        state.currentImageIndex = (state.currentImageIndex + 1) % allImages.length;
        updateBannerImage();
        saveState();
    }

    function updateBannerImage() {
        if (!bannerImg) return;
        const currentImage = getCurrentBannerImage();
        bannerImg.src = currentImage.url;
        const bannerCaption = document.getElementById("banner-caption");
        if (bannerCaption) {
            bannerCaption.textContent = currentImage.name;
        }
    }

    function startImageRotation() {
        if (state.imageRotationInterval) {
            clearInterval(state.imageRotationInterval);
        }
        state.imageRotationInterval = setInterval(rotateToNextImage, 8000); // Change image every 8 seconds
    }

    function handleImageUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        const file = files[0];
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("Image size should be less than 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            state.customImages.push(dataUrl);
            state.currentImageIndex = FARM_IMAGES.length + state.customImages.length - 1;
            updateBannerImage();
            saveState();
            alert("Farm photo added successfully!");
            event.target.value = ""; // Reset file input
        };
        reader.readAsDataURL(file);
    }

    function updateUI() {
        updateGreeting();
        updateInventoryMetric();
        renderHerd();
        updateNutrition();
        renderScheduleTabs();
        renderScheduleTable();
        updateBannerImage();
        startImageRotation();
    }



    // Image upload functionality
    const uploadBtn = document.getElementById("upload-farm-photo-btn");
    const farmPhotoInput = document.getElementById("farm-photo-input");

    if (uploadBtn && farmPhotoInput) {
        uploadBtn.addEventListener("click", () => {
            farmPhotoInput.click();
        });
        farmPhotoInput.addEventListener("change", handleImageUpload);
    }

    // Production tracking functions
    function recordMilkProduction() {
        const milkInput = document.getElementById("milk-input");
        const animalSelect = document.getElementById("milk-animal-select");
        const amount = parseFloat(milkInput.value);
        const animalId = animalSelect.value;

        if (!amount || amount <= 0 || !animalId) {
            alert("Please enter a valid amount and select an animal");
            return;
        }

        if (!state.production[animalId]) {
            state.production[animalId] = { milk: [], eggs: [], weight: [] };
        }

        state.production[animalId].milk.push({
            amount: amount,
            date: new Date().toISOString(),
            type: "milk"
        });

        milkInput.value = "";
        updateProductionStats();
        saveState();
        alert("Milk production recorded!");
    }

    function recordEggProduction() {
        const eggInput = document.getElementById("egg-input");
        const animalSelect = document.getElementById("egg-animal-select");
        const amount = parseInt(eggInput.value);
        const animalId = animalSelect.value;

        if (!amount || amount <= 0 || !animalId) {
            alert("Please enter a valid amount and select an animal");
            return;
        }

        if (!state.production[animalId]) {
            state.production[animalId] = { milk: [], eggs: [], weight: [] };
        }

        state.production[animalId].eggs.push({
            amount: amount,
            date: new Date().toISOString(),
            type: "eggs"
        });

        eggInput.value = "";
        updateProductionStats();
        saveState();
        alert("Egg production recorded!");
    }

    function recordWeightGain() {
        const weightInput = document.getElementById("weight-input");
        const animalSelect = document.getElementById("weight-animal-select");
        const amount = parseFloat(weightInput.value);
        const animalId = animalSelect.value;

        if (!amount || amount <= 0 || !animalId) {
            alert("Please enter a valid amount and select an animal");
            return;
        }

        if (!state.production[animalId]) {
            state.production[animalId] = { milk: [], eggs: [], weight: [] };
        }

        state.production[animalId].weight.push({
            amount: amount,
            date: new Date().toISOString(),
            type: "weight"
        });

        weightInput.value = "";
        updateProductionStats();
        saveState();
        alert("Weight gain recorded!");
    }

    function updateProductionStats() {
        // Update milk stats
        let totalMilk = 0;
        let milkCount = 0;
        Object.values(state.production).forEach(animal => {
            if (animal.milk) {
                animal.milk.forEach(record => {
                    totalMilk += record.amount;
                    milkCount++;
                });
            }
        });
        const milkStats = document.getElementById("milk-stats");
        if (milkStats) {
            milkStats.textContent = `Total: ${totalMilk.toFixed(1)} L (${milkCount} records)`;
        }

        // Update egg stats
        let totalEggs = 0;
        let eggCount = 0;
        Object.values(state.production).forEach(animal => {
            if (animal.eggs) {
                animal.eggs.forEach(record => {
                    totalEggs += record.amount;
                    eggCount++;
                });
            }
        });
        const eggStats = document.getElementById("egg-stats");
        if (eggStats) {
            eggStats.textContent = `Total: ${totalEggs} eggs (${eggCount} records)`;
        }

        // Update weight stats
        let totalWeight = 0;
        let weightCount = 0;
        Object.values(state.production).forEach(animal => {
            if (animal.weight) {
                animal.weight.forEach(record => {
                    totalWeight += record.amount;
                    weightCount++;
                });
            }
        });
        const weightStats = document.getElementById("weight-stats");
        if (weightStats) {
            const avgWeight = weightCount > 0 ? (totalWeight / weightCount).toFixed(1) : 0;
            weightStats.textContent = `Average: ${avgWeight} kg (${weightCount} records)`;
        }

        updateProductionSummary();
    }

    function updateProductionSummary() {
        const summary = document.getElementById("production-summary");
        if (!summary) return;

        let totalMilk = 0, totalEggs = 0, totalWeight = 0;
        let milkAnimals = 0, eggAnimals = 0, weightAnimals = 0;

        Object.entries(state.production).forEach(([animalId, data]) => {
            if (data.milk && data.milk.length > 0) {
                milkAnimals++;
                data.milk.forEach(record => totalMilk += record.amount);
            }
            if (data.eggs && data.eggs.length > 0) {
                eggAnimals++;
                data.eggs.forEach(record => totalEggs += record.amount);
            }
            if (data.weight && data.weight.length > 0) {
                weightAnimals++;
                data.weight.forEach(record => totalWeight += record.amount);
            }
        });

        if (milkAnimals === 0 && eggAnimals === 0 && weightAnimals === 0) {
            summary.innerHTML = '<p class="placeholder-text">Add production records to see summary statistics.</p>';
            return;
        }

        summary.innerHTML = `
            <div class="summary-stats">
                <div class="stat-item">
                    <h4>${milkAnimals}</h4>
                    <p>Milk-producing animals</p>
                    <span class="stat-value">${totalMilk.toFixed(1)} L total</span>
                </div>
                <div class="stat-item">
                    <h4>${eggAnimals}</h4>
                    <p>Egg-laying animals</p>
                    <span class="stat-value">${totalEggs} eggs total</span>
                </div>
                <div class="stat-item">
                    <h4>${weightAnimals}</h4>
                    <p>Animals tracked</p>
                    <span class="stat-value">${totalWeight.toFixed(1)} kg gained</span>
                </div>
            </div>
        `;
    }

    // Finance functions
    function recordTransaction() {
        const type = document.getElementById("transaction-type").value;
        const category = document.getElementById("transaction-category").value;
        const amount = parseFloat(document.getElementById("transaction-amount").value);
        const description = document.getElementById("transaction-description").value.trim();

        if (!amount || amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        if (!description) {
            alert("Please enter a description");
            return;
        }

        const transaction = {
            id: Date.now().toString(),
            type: type,
            category: category,
            amount: amount,
            description: description,
            date: new Date().toISOString()
        };

        if (type === "expense") {
            state.expenses.push(transaction);
        } else {
            state.income.push(transaction);
        }

        // Clear form
        document.getElementById("transaction-amount").value = "";
        document.getElementById("transaction-description").value = "";

        updateFinanceStats();
        updateTransactionList();
        saveState();
        alert("Transaction recorded!");
    }

    function updateFinanceStats() {
        let totalIncome = 0;
        let totalExpenses = 0;

        state.income.forEach(transaction => {
            totalIncome += transaction.amount;
        });

        state.expenses.forEach(transaction => {
            totalExpenses += transaction.amount;
        });

        const netProfit = totalIncome - totalExpenses;

        document.getElementById("total-income").textContent = `$${totalIncome.toFixed(2)}`;
        document.getElementById("total-expenses").textContent = `$${totalExpenses.toFixed(2)}`;
        document.getElementById("net-profit").textContent = `$${netProfit.toFixed(2)}`;

        // Update profit box color based on value
        const profitBox = document.getElementById("net-profit").parentElement;
        profitBox.className = `summary-box ${netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;
    }

    function updateTransactionList() {
        const list = document.getElementById("transaction-list");
        if (!list) return;

        const allTransactions = [...state.income, ...state.expenses]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10); // Show last 10 transactions

        if (allTransactions.length === 0) {
            list.innerHTML = '<p class="placeholder-text">No transactions recorded yet.</p>';
            return;
        }

        list.innerHTML = allTransactions.map(transaction => `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-info">
                    <span class="transaction-description">${escapeHtml(transaction.description)}</span>
                    <span class="transaction-category">${escapeHtml(transaction.category)}</span>
                    <span class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</span>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                </div>
            </div>
        `).join("");
    }

    // Initialize production and finance selects
    function initializeProductionSelects() {
        const selects = ['milk-animal-select', 'egg-animal-select', 'weight-animal-select'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select Animal</option>';
                state.herd.forEach((animal, index) => {
                    const option = document.createElement("option");
                    option.value = index.toString();
                    option.textContent = `${animal.name} (${animal.type})`;
                    select.appendChild(option);
                });
            }
        });
    }

    loadState();
    buildSymptoms();
    renderScheduleTabs();
    renderScheduleTable();
    refreshNutritionHerdOptions();
    updateNutrition();
    initializeProductionSelects();
    updateProductionStats();
    updateFinanceStats();
    updateTransactionList();

    const handledOAuthCallback = consumeAuthQueryParams();
    if (handledOAuthCallback) {
        return;
    }

    if (state.user) {
        if (displayName) {
            displayName.textContent = state.user.name;
        }
        showAppShell();
        updateUI();
    } else {
        showLoginShell();
    }
});
