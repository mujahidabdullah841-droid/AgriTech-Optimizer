document.addEventListener("DOMContentLoaded", () => {
    const STORAGE_KEY = "agritech_state_v1";
    const API_BASE = "";
    const DEFAULT_BANNER =
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80";

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
        selectedScheduleAnimal: "Cattle"
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
            selectedScheduleAnimal: state.selectedScheduleAnimal
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
            const response = await fetch(`${API_BASE}/api/diagnosis`, {
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
        rows.forEach((item) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${escapeHtml(item.task)}</td>
                <td>${escapeHtml(item.frequency)}</td>
                <td><span class="importance ${item.importance.toLowerCase()}">${escapeHtml(item.importance)}</span></td>
            `;
            scheduleTbody.appendChild(row);
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
        const query = params.toString();
        const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
        window.history.replaceState({}, document.title, nextUrl);
    }

    function consumeAuthQueryParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.get("auth_success") === "1") {
            const name = params.get("name") || "Farmer";
            const email = params.get("email") || "unknown@agritech.farm";
            login({ name, email });
            clearAuthQueryParams(params);
            return true;
        }

        const authError = params.get("auth_error");
        if (authError) {
            const readableError = authError.replaceAll("_", " ");
            window.alert(`Google sign-in failed: ${readableError}`);
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

    function updateUI() {
        updateGreeting();
        updateInventoryMetric();
        renderHerd();
        updateNutrition();
        renderScheduleTabs();
        renderScheduleTable();
        if (bannerImg) {
            bannerImg.src = DEFAULT_BANNER;
        }
    }

    loadState();
    buildSymptoms();
    renderScheduleTabs();
    renderScheduleTable();
    refreshNutritionHerdOptions();
    updateNutrition();

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
