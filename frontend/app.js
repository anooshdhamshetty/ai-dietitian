(function () {
    "use strict";

    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    let currentTheme = localStorage.getItem("theme") || "aurora";

    function applyTheme(theme) {
        document.body.className = "theme-" + theme;
        localStorage.setItem("theme", theme);
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            currentTheme = (currentTheme === "aurora") ? "food" : "aurora";
            applyTheme(currentTheme);
        });
    }

    // Initial Apply
    applyTheme(currentTheme);

    const API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:8000" : "";
    const IST_TIME_ZONE = "Asia/Kolkata";

    function getISTDateKey(dateLike = new Date()) {
        const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
        if (Number.isNaN(date.getTime())) return "";

        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: IST_TIME_ZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(date);

        const year = parts.find((p) => p.type === "year")?.value;
        const month = parts.find((p) => p.type === "month")?.value;
        const day = parts.find((p) => p.type === "day")?.value;
        return `${year}-${month}-${day}`;
    }

    function formatISTDateTime(dateLike) {
        const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
        if (Number.isNaN(date.getTime())) return { dateStr: "", timeStr: "" };

        return {
            dateStr: date.toLocaleDateString("en-US", {
                timeZone: IST_TIME_ZONE,
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric"
            }),
            timeStr: date.toLocaleTimeString("en-US", {
                timeZone: IST_TIME_ZONE,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            })
        };
    }

    function getISTDateRangeKeys(days) {
        const keys = [];
        const anchor = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const shifted = new Date(anchor.getTime());
            shifted.setDate(anchor.getDate() - i);
            keys.push(getISTDateKey(shifted));
        }

        return keys;
    }

    // DOM References
    const uploadArea = document.getElementById("upload-area");
    const uploadPlaceholder = document.getElementById("upload-placeholder");
    const previewContainer = document.getElementById("preview-container");
    const previewCanvas = document.getElementById("preview-canvas");
    const fileInput = document.getElementById("file-input");
    const removeBtn = document.getElementById("remove-btn");
    const analyzeBtn = document.getElementById("analyze-btn");
    const btnLabel = analyzeBtn.querySelector(".btn-label");
    const btnLoader = document.getElementById("btn-loader");
    const resultsPanel = document.getElementById("results-panel");
    const resultsCards = document.getElementById("results-cards");
    const resultsTotal = document.getElementById("results-total");
    const saveBtn = document.getElementById("save-btn");

    const portionPreset = document.getElementById("portion-preset");
    const portionSlider = document.getElementById("portion-slider");
    const portionValue = document.getElementById("portion-value");

    const totalCalories = document.getElementById("total-calories");
    const totalProtein = document.getElementById("total-protein");
    const totalCarbs = document.getElementById("total-carbs");
    const totalFats = document.getElementById("total-fats");
    const barCalories = document.getElementById("bar-calories");
    const barProtein = document.getElementById("bar-protein");
    const barCarbs = document.getElementById("bar-carbs");
    const barFats = document.getElementById("bar-fats");
    const mealsList = document.getElementById("meals-list");
    const historyList = document.getElementById("history-list");
    const foodData = {
        apple: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, displayName: "Fresh Apple", note: "High in fiber and Vitamin C" },
        banana: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, displayName: "Banana", note: "Good source of potassium" },
        orange: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, displayName: "Orange", note: "Excellent Vitamin C source" },
        rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, displayName: "Steamed Rice", note: "Basmati or Jasmine white rice" },
        roti: { calories: 120, protein: 3, carbs: 20, fat: 3, displayName: "Roti / Chapati", note: "Whole wheat flatbread" },
        bread: { calories: 265, protein: 9, carbs: 49, fat: 3.2, displayName: "Bread Slice", note: "White or brown bread" },
        egg: { calories: 155, protein: 13, carbs: 1.1, fat: 11, displayName: "Egg", note: "Hard-boiled or poached" },
        chicken: { calories: 239, protein: 27, carbs: 0, fat: 14, displayName: "Chicken", note: "Grilled or roasted breast" },
        paneer: { calories: 265, protein: 18, carbs: 1.2, fat: 21, displayName: "Paneer", note: "Indian cottage cheese" },
        milk: { calories: 60, protein: 3.2, carbs: 5, fat: 3.3, displayName: "Milk", note: "Whole cow's milk" },
        dal: { calories: 116, protein: 9, carbs: 20, fat: 0.4, displayName: "Dal / Lentils", note: "Cooked yellow or red lentils" },
        potato: { calories: 77, protein: 2, carbs: 17, fat: 0.1, displayName: "Potato", note: "Boiled or baked" },
        tomato: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, displayName: "Tomato", note: "Fresh garden tomato" },
        onion: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, displayName: "Onion", note: "Raw or sautéed" },
        burger: { calories: 295, protein: 17, carbs: 30, fat: 12, displayName: "Burger", note: "Standard fast-food burger" },
        pizza: { calories: 266, protein: 11, carbs: 33, fat: 10, displayName: "Pizza Slice", note: "Cheese or vegetable pizza" },
        fries: { calories: 312, protein: 3.4, carbs: 41, fat: 15, displayName: "French Fries", note: "Deep fried potato strips" },
        noodles: { calories: 138, protein: 4.5, carbs: 25, fat: 2.1, displayName: "Noodles", note: "Wheat or instant noodles" },
        dosa: { calories: 168, protein: 3.7, carbs: 27, fat: 3.7, displayName: "Dosa", note: "Fermented rice pancake" },
        idli: { calories: 58, protein: 2, carbs: 12, fat: 0.4, displayName: "Idli", note: "Steamed rice cakes" },
        grapes: { calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, displayName: "Grapes", note: "Sweet seedless grapes" },
        black_grapes: { calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, displayName: "Black Grapes", note: "Sweet black grapes" },
        blue_grapes: { calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, displayName: "Blue Grapes", note: "Concord-style grapes" }
    };

    // --- RAG-lite Layer for Food Name Resolution ---
    const aliases = {
        burger: ["cheeseburger", "veg burger", "hamburger", "chicken burger", "whopper"],
        fries: ["french fries", "chips", "potato wedges", "finger chips"],
        rice: ["white rice", "basmati rice", "pulao", "steamed rice", "boiled rice"],
        chicken: ["grilled chicken", "fried chicken", "chicken breast", "roasted chicken", "tandoori"],
        bread: ["white bread", "brown bread", "whole wheat bread", "toast", "multigrain"],
        noodles: ["chow mein", "ramen", "maggi", "pasta", "spaghetti"],
        pizza: ["margherita", "pepperoni pizza", "veg pizza", "cheese pizza"],
        egg: ["boiled egg", "scrambled egg", "poached egg", "omelette"]
    };

    function getSimilarity(a, b) {
        a = a.toLowerCase(); b = b.toLowerCase();
        if (a === b) return 1.0;
        if (a.length < 2 || b.length < 2) return 0;
        const getBigrams = (s) => {
            const b = new Set();
            for (let i = 0; i < s.length - 1; i++) b.add(s.substring(i, i + 2));
            return b;
        };
        const bA = getBigrams(a), bB = getBigrams(b);
        let intersect = 0;
        for (const bi of bA) if (bB.has(bi)) intersect++;
        return (2.0 * intersect) / (bA.size + bB.size);
    }

    function resolveFood(label) {
        if (!label) return "Mixed Food";
        const low = String(label).toLowerCase();
        if (low === "_default" || low === "default" || low === "mixed food") return "Mixed Food";
        if (label === "Non-Edible" || label === "non-edible") return "non-edible";
        const clean = label.toLowerCase().trim().replace(/_/g, " ");

        // 1. Exact match
        if (foodData[clean]) return clean;

        // 2. Alias match
        for (const [key, list] of Object.entries(aliases)) {
            if (list.some(a => a === clean || clean.includes(a))) return key;
        }

        // 3. Fuzzy match (>= 0.6)
        let best = null, high = 0;
        for (const key of Object.keys(foodData)) {
            const s = getSimilarity(clean, key);
            if (s > high) { high = s; best = key; }
        }
        if (high >= 0.6) return best;

        return clean;
    }

    let selectedFile = null;
    let lastResults = null;
    let dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    let DAILY_TARGETS = { calories: 2500, protein: 100, carbs: 300, fat: 80 };
    let allHistoryLogs = [];
    let weeklyChartInstance = null;
    let portionEstimationMode = 'ai';
    let rawAnalysisResults = null;

    const SWAP_SUGGESTIONS = {
        "burger": { alt: "Grilled Chicken + Salad", calSave: 250, proGain: 10 },
        "pizza": { alt: "Whole Wheat Wrap", calSave: 200, proGain: 5 },
        "fries": { alt: "Roasted Sweet Potatoes", calSave: 150, proGain: 2 },
        "fried rice": { alt: "Quinoa Bowl", calSave: 180, proGain: 8 },
        "noodles": { alt: "Zucchini Noodles", calSave: 220, proGain: 3 },
        "soda": { alt: "Fresh Fruit Juice", calSave: 120, proGain: 1 },
        "chips": { alt: "Air-Popped Popcorn", calSave: 100, proGain: 2 },
        "samosa": { alt: "Baked Veggie Roll", calSave: 80, proGain: 1 },
        "biryani": { alt: "Brown Rice Veggie Pulao", calSave: 150, proGain: 5 },
        "pasta": { alt: "Lentil Pasta", calSave: 120, proGain: 12 },
        "rice": { alt: "Cauliflower Rice", calSave: 100, proGain: 2 }
    };



    /**
     * Format food names. Cleans up "banana (x3)" from backend to "Banana"
     * and appends count if provided, eg: "Banana (3)"
     */
    function formatFoodName(name, count) {
        if (!name) return "Mixed Food";
        const low = String(name).toLowerCase();
        if (low === "_default" || low === "default" || low === "mixed food") return "Mixed Food";
        if (name === "Non-Edible" || name.toLowerCase() === "non-edible") return "Non-Edible";
        // Remove trailing (xN) from backend string just in case
        let cleanName = name.replace(/\s*\(x\d+\)/i, "");
        cleanName = cleanName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

        if (count && count > 1) {
            return `${cleanName} (${count})`;
        }
        return cleanName;
    }

    // Navbar highlighting & DOM routing
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            if (link.id === "nav-logout") return;
            e.preventDefault();
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            // Close mobile menu
            const navToggle = document.getElementById("nav-toggle");
            if (navToggle) navToggle.checked = false;

            const targetId = link.getAttribute("href").substring(1);
            if (targetId) {
                document.getElementById("analyze").style.display = "none";
                document.getElementById("dashboard").style.display = "none";
                document.getElementById("history").style.display = "none";
                document.getElementById("profile").style.display = "none";
                document.getElementById(targetId).style.display = "block";
            }
        });
    });

    // Portion Slider Sync
    portionPreset.addEventListener("change", () => {
        portionSlider.value = portionPreset.value;
        portionValue.textContent = portionSlider.value + "g";
    });
    portionSlider.addEventListener("input", () => {
        portionValue.textContent = portionSlider.value + "g";
    });

    // Handle Mode Switching
    document.querySelectorAll('#portion-mode-toggle .mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#portion-mode-toggle .mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            portionEstimationMode = btn.dataset.mode;

            // UI feedback
            const autoLabel = document.getElementById("auto-estimate-label");
            if (portionEstimationMode === 'ai') {
                autoLabel.style.display = "block";
                portionSlider.disabled = true;
                portionPreset.disabled = true;
                portionSlider.style.opacity = "0.5";
                portionPreset.style.opacity = "0.5";
            } else {
                autoLabel.style.display = "none";
                portionSlider.disabled = false;
                portionPreset.disabled = false;
                portionSlider.style.opacity = "1";
                portionPreset.style.opacity = "1";
            }

            if (lastResults && rawAnalysisResults) {
                // Re-render using stored raw results to apply mode change
                renderResults(JSON.parse(JSON.stringify(rawAnalysisResults)));
            }
        });
    });

    function getPortionWeight() { return parseInt(portionSlider.value, 10) || 250; }

    // Upload & Drag-Drop
    uploadArea.addEventListener("click", () => { if (!selectedFile) fileInput.click(); });
    fileInput.addEventListener("change", e => { if (e.target.files.length) handleFile(e.target.files[0]); });
    uploadArea.addEventListener("dragover", e => { e.preventDefault(); uploadArea.classList.add("dragover"); });
    uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("dragover"));
    uploadArea.addEventListener("drop", e => {
        e.preventDefault(); uploadArea.classList.remove("dragover");
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
        if (!file.type.startsWith("image/")) return;
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const ctx = previewCanvas.getContext("2d");
                previewCanvas.width = img.width;
                previewCanvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        uploadPlaceholder.style.display = "none";
        previewContainer.style.display = "flex";
        analyzeBtn.disabled = false;
        resultsPanel.style.display = "none";
    }

    removeBtn.addEventListener("click", e => { e.stopPropagation(); resetUpload(); });
    function resetUpload() {
        selectedFile = null; lastResults = null; fileInput.value = "";
        uploadPlaceholder.style.display = "block"; previewContainer.style.display = "none";
        analyzeBtn.disabled = true; resultsPanel.style.display = "none";
    }

    // Analyze Request
    analyzeBtn.addEventListener("click", async () => {
        if (!selectedFile) return;

        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please login");
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("portion_weight", getPortionWeight());

        try {
            const res = await fetch(API_BASE + "/api/analyze", {
                method: "POST",
                body: formData,
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || `Status ${res.status}`);
            }
            const text = await res.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                alert("Server error: " + text);
                return;
            }

            rawAnalysisResults = JSON.parse(text);
            lastResults = data;

            renderResults(data);
            drawBoundingBoxes(data.items);
        } catch (error) {
            alert("⚠️ Unable to analyze: " + error.message);
        } finally {
            setLoading(false);
        }
    });

    function setLoading(on) {
        btnLabel.textContent = on ? "Analyzing your food..." : "Analyze Food";
        btnLoader.style.display = on ? "inline-block" : "none";
        analyzeBtn.disabled = on;

        const analysisLoader = document.getElementById("analysis-loader");
        if (on) {
            resultsPanel.style.display = "block";
            if (analysisLoader) analysisLoader.style.display = "flex";
            resultsCards.style.display = "none";
            resultsTotal.style.display = "none";
        } else {
            if (analysisLoader) analysisLoader.style.display = "none";
            resultsCards.style.display = "flex";
            resultsTotal.style.display = "flex";
        }
    }

    // --- Automatic Portion Estimation Logic ---
    const PORTION_RULES = [
        { keywords: ["fried rice", "noodles"], weight: 300 },
        { keywords: ["rice", "biryani", "pulao"], weight: 250 },
        { keywords: ["apple", "orange", "guava"], weight: 150 },
        { keywords: ["banana"], weight: 120 },
        { keywords: ["grapes"], weight: 100 },
        { keywords: ["watermelon"], weight: 200 },
        { keywords: ["burger"], weight: 300 },
        { keywords: ["pizza"], weight: 250 },
        { keywords: ["sandwich"], weight: 200 },
        { keywords: ["fries"], weight: 150 },
        { keywords: ["roti", "chapati"], weight: 50 },
        { keywords: ["dosa"], weight: 120 },
        { keywords: ["idli"], weight: 60 },
        { keywords: ["curry"], weight: 200 },
        { keywords: ["dal"], weight: 180 },
        { keywords: ["chips"], weight: 100 },
        { keywords: ["biscuits"], weight: 80 },
        { keywords: ["samosa"], weight: 120 },
        { keywords: ["pakoda"], weight: 150 },
        { keywords: ["omelette"], weight: 120 },
        { keywords: ["egg", "boiled egg"], weight: 60 },
        { keywords: ["chicken"], weight: 200 },
        { keywords: ["paneer"], weight: 150 },
        { keywords: ["milk"], weight: 200 },
        { keywords: ["juice"], weight: 250 },
        { keywords: ["soda"], weight: 300 },
    ];

    function getAutoWeight(foodName) {
        if (!foodName) return 200;
        const lowerName = foodName.toLowerCase();
        for (const rule of PORTION_RULES) {
            if (rule.keywords.some(k => lowerName.includes(k))) {
                return rule.weight;
            }
        }
        return 200; // Fallback
    }

    function isNonEdibleItem(item) {
        if (!item) return false;
        return Boolean(item.is_non_edible) || item.food_name === "Non-Edible" || item.food_name === "non-edible" || (item.message && item.message.toLowerCase().includes("non-edible"));
    }

    function isAllNonEdible(data) {
        return Array.isArray(data?.items) && data.items.length > 0 && data.items.every(isNonEdibleItem);
    }

    // Render Results
    function renderResults(data) {
        resultsCards.innerHTML = "";

        // Group identical foods
        const groupedItemsMap = {};
        data.items.forEach(item => {
            if (isNonEdibleItem(item)) {
                item.food_name = "Non-Edible";
                item.display_name = "Non-Edible";
                item.note = item.message || "Detected object is non-edible and cannot be analyzed for nutrition.";
                item.weight = 0;
                item.calories = 0;
                item.protein = 0;
                item.carbs = 0;
                item.fat = 0;
                item._per100 = { calories: 0, protein: 0, carbs: 0, fat: 0 };

                if (!groupedItemsMap["Non-Edible"]) {
                    groupedItemsMap["Non-Edible"] = {
                        food_name: "Non-Edible",
                        display_name: "Non-Edible",
                        note: item.note,
                        count: 0,
                        weight: 0,
                        calories: 0,
                        protein: 0,
                        carbs: 0,
                        fat: 0,
                        bboxes: []
                    };
                }
                const nonEdibleGroup = groupedItemsMap["Non-Edible"];
                nonEdibleGroup.count += 1;
                if (item.bboxes) nonEdibleGroup.bboxes = nonEdibleGroup.bboxes.concat(item.bboxes);
                else if (item.bbox) nonEdibleGroup.bboxes.push(item.bbox);
                return;
            }

            // RAG-lite Resolution Layer
            const resolvedKey = resolveFood(item.food_name);
            const localNutrition = foodData[resolvedKey];

            if (localNutrition) {
                // If matched locally, prioritize local nutrition data
                const currentWeight = (portionEstimationMode === 'ai') ? getAutoWeight(resolvedKey) : item.weight;
                const factor = currentWeight / 100;

                item.food_name = resolvedKey; // Use canonical key for grouping
                item.display_name = localNutrition.displayName || resolvedKey;
                item.weight = currentWeight;
                item.calories = localNutrition.calories * factor;
                item.protein = localNutrition.protein * factor;
                item.carbs = localNutrition.carbs * factor;
                item.fat = localNutrition.fat * factor;
                item.note = localNutrition.note;
            } else if (portionEstimationMode === 'ai') {
                // Fallback to generic AI scaling if no local match
                const originalWeight = item.weight || 150;
                const estimatedWeight = getAutoWeight(item.food_name);
                const scale = estimatedWeight / originalWeight;
                item.weight = estimatedWeight;
                item.calories = (item.calories || 0) * scale;
                item.protein = (item.protein || 0) * scale;
                item.carbs = (item.carbs || 0) * scale;
                item.fat = (item.fat || 0) * scale;
            }

            const name = item.food_name;
            if (!groupedItemsMap[name]) {
                groupedItemsMap[name] = {
                    food_name: name,
                    display_name: item.display_name || null,
                    note: item.note || null,
                    count: 0,
                    weight: 0,
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    bboxes: []
                };
            }
            const g = groupedItemsMap[name];
            g.count += 1;
            g.weight += item.weight;
            g.calories += item.calories;
            g.protein += item.protein;
            g.carbs += item.carbs;
            g.fat += item.fat;
            if (item.bboxes) g.bboxes = g.bboxes.concat(item.bboxes);
            else if (item.bbox) g.bboxes.push(item.bbox);
        });

        // Convert back to array
        data.items = Object.values(groupedItemsMap);

        // Pre-calculate per-100g ratios for sliders
        data.items.forEach(item => {
            const w = item.weight || 150;
            item._per100 = {
                calories: (item.calories / w) * 100,
                protein: (item.protein / w) * 100,
                carbs: (item.carbs / w) * 100,
                fat: (item.fat / w) * 100,
            };
        });

        data.items.forEach((item, i) => {
            const card = document.createElement("div");
            card.className = "result-card";
            card.style.animationDelay = (i * 0.08) + "s";
            card.setAttribute("data-index", i);

            // Format title text using canonical formatter (handles _default and non-edible)
            let titleText = formatFoodName(item.display_name || item.food_name, item.count);

            if (isNonEdibleItem(item)) {
                card.classList.add("non-edible-result-card");
                card.innerHTML = `
                    <div class="result-card-header">
                        <span class="result-food-name" style="color: #fcc419; font-size: 1.15rem; font-weight: 800;">${titleText}</span>
                        <span class="result-weight" id="rw-${i}" style="background: rgba(252, 196, 25, 0.14); color: #fcc419;">Non-Edible</span>
                    </div>
                    <div class="result-note" style="margin-top: 0.5rem; color: var(--clr-text-main);">
                        ${item.note || "Detected object is non-edible and cannot be analyzed for nutrition."}
                    </div>
                    <div class="result-macros" id="rm-${i}" style="margin-top: 0.85rem;">
                        <span class="macro-pill clr-cal">🔥 0 kcal</span>
                        <span class="macro-pill clr-pro">🥩 0.0g pro</span>
                        <span class="macro-pill clr-carb">🍞 0.0g carb</span>
                        <span class="macro-pill clr-fat">🧈 0.0g fat</span>
                    </div>`;
                resultsCards.appendChild(card);
                return;
            }

            const weightIndicator = portionEstimationMode === 'ai' ? '✨' : '≈';
            const sliderDisabledAttr = portionEstimationMode === 'ai' ? 'disabled' : '';
            const sliderRowStyle = portionEstimationMode === 'ai' ? 'opacity: 0.5; pointer-events: none;' : '';

            const noteHtml = item.note ? `<div class="result-note">💡 ${item.note}</div>` : '';

            card.innerHTML =
                `<div class="result-card-header">
                    <span class="result-food-name">${titleText}</span>
                    <span class="result-weight" id="rw-${i}">${weightIndicator} ${Math.round(item.weight)}g</span>
                </div>
                ${noteHtml}
                <div class="result-slider-row" style="${sliderRowStyle}">
                    <label class="portion-label">Adjust weight</label>
                    <input type="range" class="portion-slider item-slider" min="0" max="600" step="10" value="${Math.round(item.weight)}" data-index="${i}" ${sliderDisabledAttr} />
                </div>
                <div class="result-macros" id="rm-${i}">
                    <span class="macro-pill clr-cal">🔥 ${Math.round(item.calories)} kcal</span>
                    <span class="macro-pill clr-pro">🥩 ${item.protein.toFixed(1)}g pro</span>
                    <span class="macro-pill clr-carb">🍞 ${item.carbs.toFixed(1)}g carb</span>
                    <span class="macro-pill clr-fat">🧈 ${item.fat.toFixed(1)}g fat</span>
                </div>`;
            resultsCards.appendChild(card);
        });

        resultsCards.querySelectorAll(".item-slider").forEach(slider => {
            slider.addEventListener("input", () => {
                recalcItem(data, parseInt(slider.getAttribute("data-index"), 10), parseInt(slider.value, 10));
            });
        });

        updateTotalsBar(data);
        resultsPanel.style.display = "block";

        // Scroll into view
        setTimeout(() => resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
    window.logout = function () {
        localStorage.removeItem("token");
        location.reload();
    };

    function recalcItem(data, idx, newWeight) {
        const item = data.items[idx];
        const p = item._per100;

        item.weight = newWeight;
        item.calories = p.calories * newWeight / 100;
        item.protein = p.protein * newWeight / 100;
        item.carbs = p.carbs * newWeight / 100;
        item.fat = p.fat * newWeight / 100;

        const weightEl = document.getElementById("rw-" + idx);
        const macrosEl = document.getElementById("rm-" + idx);

        if (weightEl) {
            if (newWeight === 0) {
                weightEl.textContent = "0g (not included)";
            } else {
                weightEl.textContent = `≈ ${newWeight}g`;
            }
        }
        if (macrosEl) {
            macrosEl.innerHTML =
                `<span class="macro-pill clr-cal">🔥 ${Math.round(item.calories)} kcal</span>
                 <span class="macro-pill clr-pro">🥩 ${item.protein.toFixed(1)}g pro</span>
                 <span class="macro-pill clr-carb">🍞 ${item.carbs.toFixed(1)}g carb</span>
                 <span class="macro-pill clr-fat">🧈 ${item.fat.toFixed(1)}g fat</span>`;
        }

        updateTotalsBar(data);
        lastResults = data;
    }

    function updateTotalsBar(data) {
        const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        data.items.forEach(i => { t.calories += i.calories; t.protein += i.protein; t.carbs += i.carbs; t.fat += i.fat; });
        data.totals = t;

        resultsTotal.innerHTML =
            `<span class="clr-cal">🔥 ${Math.round(t.calories)} kcal</span>
             <span class="macro-pill clr-pro">🥩 ${t.protein.toFixed(1)}g pro</span>
             <span class="macro-pill clr-carb">🍞 ${t.carbs.toFixed(1)}g carb</span>
             <span class="macro-pill clr-fat">🧈 ${t.fat.toFixed(1)}g fat</span>`;

        // Update Calorie Meter & Feedback
        const feedbackEl = document.getElementById("calorie-feedback");
        const meterContainer = document.getElementById("calorie-meter-container");
        const meterFill = document.getElementById("calorie-meter-fill");

        if (feedbackEl && meterContainer && meterFill) {
            if (isAllNonEdible(data)) {
                feedbackEl.style.display = "none";
                meterContainer.style.display = "none";
                meterFill.style.width = "0%";
                return;
            }

            meterContainer.style.display = "block";

            // Animate width based on 1000 kcal max reference
            let widthPct = Math.min((t.calories / 1000) * 100, 100);
            meterFill.style.width = widthPct + "%";

            // Feedback Messages
            let message = "🍽️ Balanced Meal";
            if (t.calories < 300) {
                message = "🥗 Light meal detected";
            }
            if (t.calories > 800) {
                message = "🔥 Bulking mode activated";
            }
            if (t.protein > 30) {
                message = "💪 Protein power meal!";
            }

            feedbackEl.textContent = message;
            feedbackEl.style.display = "block";
        }
    }

    // Canvas Bounding Boxes
    function drawBoundingBoxes(items) {
        const ctx = previewCanvas.getContext("2d");
        const colors = ["#8b5cf6", "#38bdf8", "#51cf66", "#fcc419", "#ff6b6b", "#f06595"];

        items.forEach((item, i) => {
            const boxes = item.bboxes && item.bboxes.length > 0 ? item.bboxes : (item.bbox ? [item.bbox] : []);
            const color = colors[i % colors.length];

            boxes.forEach(box => {
                if (!box || box.length < 4) return;
                const [x1, y1, x2, y2] = box;

                // Box shadow glow
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                ctx.shadowBlur = 0; // reset

                const labelTxt = formatFoodName(item.food_name, item.count);
                ctx.font = "bold 15px Inter, sans-serif";
                const textW = ctx.measureText(labelTxt).width + 16;

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(x1, Math.max(0, y1 - 32), textW, 28, 6);
                ctx.fill();

                ctx.fillStyle = "#ffffff";
                ctx.fillText(labelTxt, x1 + 8, Math.max(0, y1 - 32) + 19);
            });
        });
    }

    // Dashboard Saving
    saveBtn.addEventListener("click", async () => {
        if (!lastResults) return;

        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please login");
            return;
        }

        try {
            const res = await fetch(API_BASE + "/api/log", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(lastResults)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    localStorage.removeItem("token");
                    updateAuthUI();
                    alert("⚠️ Your session has expired. Please login again.");
                    window.location.hash = "#auth";
                    return;
                }
                throw new Error(errData.detail || "Failed to save meal");
            }

            updateDashboard(lastResults);
            await loadTodaySummary();
            await loadHistory();
            resetUpload();
            document.querySelector('.nav-link[href="#dashboard"]').click();
        } catch (err) {
            alert("⚠️ Could not save: " + err.message);
        }
    });

    function updateDashboard(data) {
        if (data && data.totals) {
            const t = data.totals;
            dailyTotals.calories += t.calories; dailyTotals.protein += t.protein;
            dailyTotals.carbs += t.carbs; dailyTotals.fat += t.fat;
        }

        totalCalories.textContent = Math.round(dailyTotals.calories) + " / " + DAILY_TARGETS.calories;
        totalProtein.textContent = dailyTotals.protein.toFixed(1) + " / " + DAILY_TARGETS.protein + "g";
        totalCarbs.textContent = dailyTotals.carbs.toFixed(1) + " / " + DAILY_TARGETS.carbs + "g";
        totalFats.textContent = dailyTotals.fat.toFixed(1) + " / " + DAILY_TARGETS.fat + "g";

        const remCal = DAILY_TARGETS.calories - Math.round(dailyTotals.calories);
        const remPro = DAILY_TARGETS.protein - Math.round(dailyTotals.protein);
        const remCalEl = document.getElementById("rem-calories");
        const remProEl = document.getElementById("rem-protein");

        const getStatusBadge = (current, goal) => {
            const pct = (current / goal) * 100;
            if (pct > 100) return '<span class="status-badge status-over">Over Goal ⚠️</span>';
            if (pct > 80) return '<span class="status-badge status-track">On Track ✅</span>';
            return '<span class="status-badge status-below">Below Goal 📉</span>';
        };

        if (remCalEl) {
            remCalEl.innerHTML = (remCal > 0 ? `${remCal} kcal remaining` : `${Math.abs(remCal)} kcal over`) + getStatusBadge(dailyTotals.calories, DAILY_TARGETS.calories);
        }
        if (remProEl) {
            remProEl.innerHTML = (remPro > 0 ? `${remPro}g remaining` : `${Math.abs(remPro)}g over`) + getStatusBadge(dailyTotals.protein, DAILY_TARGETS.protein);
        }

        const setBar = (el, current, goal) => {
            const pct = Math.min(100, (current / goal) * 100);
            el.style.width = pct + "%";
            if (current > goal) el.classList.add("overflow");
            else el.classList.remove("overflow");
        };

        setBar(barCalories, dailyTotals.calories, DAILY_TARGETS.calories);
        setBar(barProtein, dailyTotals.protein, DAILY_TARGETS.protein);
        setBar(barCarbs, dailyTotals.carbs, DAILY_TARGETS.carbs);
        setBar(barFats, dailyTotals.fat, DAILY_TARGETS.fat);

        updateGamifiedWidget();
        updateForecastWidget();
    }



    async function loadFeedback() {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(API_BASE + "/api/feedback", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const container = document.getElementById("ai-feedback-container");
                const calFeedback = document.getElementById("ai-feedback-calories");
                const proFeedback = document.getElementById("ai-feedback-protein");

                if (container && calFeedback && proFeedback) {
                    container.style.display = "block";

                    const styleMessage = (msg) => {
                        if (msg.includes("Eat more") || msg.includes("Low protein")) return `<span style="color: #fcc419;">${msg}</span>`; // yellow
                        if (msg.includes("Good") || msg.includes("Decent") || msg.includes("Great")) return `<span style="color: #51cf66;">${msg}</span>`; // green
                        if (msg.includes("High calorie")) return `<span style="color: #ff6b6b;">${msg}</span>`; // red
                        return msg;
                    };

                    calFeedback.innerHTML = styleMessage(data.calorie_feedback);
                    proFeedback.innerHTML = styleMessage(data.protein_feedback);
                }
            }
        } catch (e) { console.error("Feedback error:", e); }
    }

    async function loadTodaySummary() {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(API_BASE + "/api/today-summary", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                dailyTotals.calories = data.calories || 0;
                dailyTotals.protein = data.protein || 0;
                dailyTotals.carbs = data.carbs || 0;
                dailyTotals.fat = data.fat || 0;
                updateDashboard({ totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
                await loadFeedback();
            }
        } catch (e) { }
    }

    async function loadUserGoals() {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(API_BASE + "/api/get-goal", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                DAILY_TARGETS.calories = data.calorie_goal || 2500;
                DAILY_TARGETS.protein = data.protein_goal || 100;
                // Redraw bars
                updateDashboard({ totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
                await loadFeedback();
            }
        } catch (e) { }
    }

    function updateBMIWidget(weight, height) {
        const bmiContent = document.getElementById("bmi-content");
        if (!bmiContent) return;

        const w = parseFloat(weight);
        const h = parseFloat(height);

        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
            bmiContent.innerHTML = '<div class="empty-state" style="padding: 0.5rem 0;">Complete your profile to calculate BMI.</div>';
            return;
        }

        const bmi = w / ((h / 100) * (h / 100));
        const bmiRounded = bmi.toFixed(1);

        let badgeText = "";
        let badgeClass = "";
        let messageText = "";

        if (bmi < 18.5) {
            badgeText = "⚠️ Underweight";
            badgeClass = "bmi-badge-underweight";
            messageText = "You are below the recommended weight range.<br>Consider increasing calorie and protein intake.";
        } else if (bmi < 25) {
            badgeText = "✅ Healthy Weight";
            badgeClass = "bmi-badge-healthy";
            messageText = "Great job! Your BMI falls within the healthy range.<br>Keep maintaining your current lifestyle.";
        } else if (bmi < 30) {
            badgeText = "⚠️ Overweight";
            badgeClass = "bmi-badge-overweight";
            messageText = "Your BMI is above the recommended range.<br>Consider reducing excess calories and increasing physical activity.";
        } else {
            badgeText = "🚨 Obesity Risk";
            badgeClass = "bmi-badge-obesity";
            messageText = "Your BMI is significantly above the healthy range.<br>Focus on gradual weight management and healthy eating habits.";
        }

        const minWeight = Math.round(18.5 * (h / 100) * (h / 100));
        const maxWeight = Math.round(24.9 * (h / 100) * (h / 100));

        bmiContent.innerHTML = `
            <div style="font-size: 1.1rem; font-weight: 500; display: flex; flex-direction: column; gap: 0.75rem;">
                <div>
                    BMI: <span style="font-size: 1.25rem; font-weight: 800; color: var(--clr-primary);">${bmiRounded}</span>
                </div>
                <div>
                    <span class="bmi-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div style="font-size: 0.85rem; line-height: 1.4; color: var(--clr-text-main);">
                    ${messageText}
                </div>
                <div style="margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--clr-border);">
                    <span style="font-size: 0.85rem; font-weight: 700; color: var(--clr-text-muted); display: block; margin-bottom: 0.25rem;">
                        🎯 Ideal Weight Range:
                    </span>
                    <span style="font-size: 1.05rem; font-weight: 800; color: var(--clr-text-main);">
                        ${minWeight}kg - ${maxWeight}kg
                    </span>
                </div>
            </div>
        `;
    }

    let currentUserEmail = "";

    const BADGES = [
        { name: "🥄 Beginner", minLevel: 1 },
        { name: "🥗 Healthy Eater", minLevel: 3 },
        { name: "🍎 Nutrition Explorer", minLevel: 6 },
        { name: "🥩 Protein Master", minLevel: 9 },
        { name: "🔥 Macro Expert", minLevel: 12 },
        { name: "🏆 Nutrition Champion", minLevel: 15 },
        { name: "👑 Elite Dietitian", minLevel: 18 }
    ];

    function calculateStreakFromHistory(logs) {
        if (!logs || logs.length === 0) return 0;
        
        const uniqueDates = Array.from(new Set(logs.map(log => getISTDateKey(log.timestamp))))
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a));
            
        if (uniqueDates.length === 0) return 0;
        
        const todayStr = getISTDateKey();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getISTDateKey(yesterday);
        
        const mostRecentDate = uniqueDates[0];
        
        if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
            return 0;
        }
        
        let streak = 0;
        let checkDate = new Date(mostRecentDate);
        
        for (let i = 0; i < 365; i++) {
            const checkStr = getISTDateKey(checkDate);
            if (uniqueDates.includes(checkStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }

    function saveStreakToStorage(streak) {
        if (!currentUserEmail) return;
        localStorage.setItem(`streak_count_${currentUserEmail}`, streak);
        localStorage.setItem(`streak_last_date_${currentUserEmail}`, getISTDateKey());
    }

    function getBadgeDetails(level, xp) {
        let currentBadge = BADGES[0].name;
        let nextBadgeObj = BADGES[1];
        
        for (let i = 0; i < BADGES.length; i++) {
            if (level >= BADGES[i].minLevel) {
                currentBadge = BADGES[i].name;
                nextBadgeObj = BADGES[i+1] || null;
            }
        }
        
        let xpRemaining = 0;
        if (nextBadgeObj) {
            const totalNeeded = (nextBadgeObj.minLevel - 1) * 1000;
            xpRemaining = Math.max(0, totalNeeded - xp);
        }
        
        return {
            currentBadge,
            nextBadge: nextBadgeObj ? nextBadgeObj.name : "Max Badge Reached! 👑",
            xpRemaining
        };
    }

    function getNextChallenge() {
        const proteinGoal = DAILY_TARGETS.protein || 100;
        const calorieGoal = DAILY_TARGETS.calories || 2500;
        
        const currentProtein = dailyTotals.protein || 0;
        const currentCalories = dailyTotals.calories || 0;
        
        if (currentProtein < proteinGoal) {
            return {
                text: `Reach ${Math.round(proteinGoal)}g Protein Today`,
                reward: 25
            };
        } else if (currentCalories < calorieGoal * 0.8) {
            return {
                text: "Log One More Healthy Meal",
                reward: 20
            };
        } else {
            return {
                text: "Maintain Your Healthy Streak",
                reward: 15
            };
        }
    }

    function updateGamifiedWidget() {
        const journeyContent = document.getElementById("journey-content");
        if (!journeyContent) return;

        const defaultHTML = `
            <div class="journey-header">
                <div class="journey-level-row">
                    <span>Level 1 Beginner</span>
                    <span>•</span>
                    <span class="journey-streak-text">🔥 0 Day Streak</span>
                </div>
            </div>
            <div class="journey-progress-section">
                <div class="journey-xp-row">
                    <span>0 / 1000 XP</span>
                    <span>0%</span>
                </div>
                <div class="journey-progress-track">
                    <div class="journey-progress-fill" style="width: 0%"></div>
                </div>
                <div class="journey-remaining-row">
                    <span>✨ 2000 XP Remaining</span>
                </div>
            </div>
            <div class="journey-challenge-row">
                <div class="journey-challenge-title-line">
                    <span>🎯</span>
                    <span>Next Challenge Log a healthy meal today</span>
                </div>
                <span class="journey-challenge-reward-line">+15 XP Reward</span>
            </div>
            <div class="journey-badge-row">
                <span>🏆 Next Badge: 🥗 <span class="journey-badge-highlight">Healthy Eater</span></span>
            </div>
        `;

        if (!allHistoryLogs) {
            journeyContent.innerHTML = defaultHTML;
            return;
        }

        const streak = calculateStreakFromHistory(allHistoryLogs);
        if (currentUserEmail) {
            saveStreakToStorage(streak);
        }

        const baseXP = allHistoryLogs.length * 100;
        const streakXP = streak * 50;
        const challengeBonusXP = currentUserEmail ? (parseInt(localStorage.getItem(`challenge_bonus_xp_${currentUserEmail}`)) || 0) : 0;
        const xp = baseXP + streakXP + challengeBonusXP;

        const level = Math.floor(xp / 1000) + 1;
        const xpInLevel = xp % 1000;
        const pct = Math.floor((xpInLevel / 1000) * 100);

        const levelTitles = ["Beginner", "Beginner", "Explorer", "Explorer", "Practitioner", "Practitioner", "Nutritionist", "Nutritionist", "Specialist", "Specialist", "Expert", "Expert", "Elite Dietitian"];
        const getLevelTitle = (lvl) => levelTitles[Math.min(lvl, levelTitles.length) - 1] || "Master Dietitian";
        const title = getLevelTitle(level);

        const badgeDetails = getBadgeDetails(level, xp);
        
        const challenge = getNextChallenge();
        const todayStr = getISTDateKey();
        const isChallengeCompleted = currentUserEmail ? (localStorage.getItem(`challenge_completed_date_${currentUserEmail}`) === todayStr) : false;

        if (currentUserEmail && !isChallengeCompleted) {
            let met = false;
            if (challenge.text.includes("Protein") && dailyTotals.protein >= (DAILY_TARGETS.protein || 100)) {
                met = true;
            } else if (challenge.text.includes("Meal") && allHistoryLogs.filter(log => getISTDateKey(log.timestamp) === todayStr).length > 0) {
                met = true;
            } else if (challenge.text.includes("Streak") && streak > 0) {
                met = true;
            }

            if (met) {
                localStorage.setItem(`challenge_completed_date_${currentUserEmail}`, todayStr);
                let bonusXP = parseInt(localStorage.getItem(`challenge_bonus_xp_${currentUserEmail}`)) || 0;
                bonusXP += challenge.reward;
                localStorage.setItem(`challenge_bonus_xp_${currentUserEmail}`, bonusXP);
                
                setTimeout(updateGamifiedWidget, 100);
                return;
            }
        }

        const challengeHTML = isChallengeCompleted ? `
            <div class="journey-challenge-row">
                <div class="journey-challenge-title-line">
                    <span>🎯</span>
                    <span>Next Challenge ${challenge.text}</span>
                </div>
                <span class="journey-challenge-reward-line" style="color: #34d399;">+${challenge.reward} XP Claimed ✓</span>
            </div>
        ` : `
            <div class="journey-challenge-row">
                <div class="journey-challenge-title-line">
                    <span>🎯</span>
                    <span>Next Challenge ${challenge.text}</span>
                </div>
                <span class="journey-challenge-reward-line">+${challenge.reward} XP Reward</span>
            </div>
        `;

        const nextBadgeStr = badgeDetails.nextBadge || "";
        const spaceIdx = nextBadgeStr.indexOf(" ");
        const badgeEmoji = spaceIdx !== -1 ? nextBadgeStr.substring(0, spaceIdx) : "";
        const badgeName = spaceIdx !== -1 ? nextBadgeStr.substring(spaceIdx + 1) : nextBadgeStr;

        journeyContent.innerHTML = `
            <div class="journey-header">
                <div class="journey-level-row">
                    <span>Level ${level} ${title}</span>
                    <span>•</span>
                    <span class="journey-streak-text">🔥 ${streak} Day Streak</span>
                </div>
            </div>
            <div class="journey-progress-section">
                <div class="journey-xp-row">
                    <span>${xpInLevel} / 1000 XP</span>
                    <span>${pct}%</span>
                </div>
                <div class="journey-progress-track">
                    <div class="journey-progress-fill" style="width: ${pct}%"></div>
                </div>
                <div class="journey-remaining-row">
                    <span>✨ ${badgeDetails.xpRemaining} XP Remaining</span>
                </div>
            </div>
            ${challengeHTML}
            <div class="journey-badge-row">
                <span>🏆 Next Badge: ${badgeEmoji} <span class="journey-badge-highlight">${badgeName}</span></span>
            </div>
        `;
    }

    function updateForecastWidget() {
        const forecastContent = document.getElementById("forecast-content");
        if (!forecastContent) return;

        const defaultHTML = `
            <div class="empty-state" style="padding: 0.5rem 0;">Log a meal to see your AI Forecast.</div>
        `;

        if (!allHistoryLogs || allHistoryLogs.length === 0) {
            forecastContent.innerHTML = defaultHTML;
            return;
        }

        // Get IST dates for the last 7 days (including today)
        const last7Days = getISTDateRangeKeys(7);
        const dailySummaries = {};
        last7Days.forEach(date => {
            dailySummaries[date] = { calories: 0, protein: 0 };
        });

        // Sum up logs by date
        allHistoryLogs.forEach(log => {
            const dateKey = getISTDateKey(new Date(log.timestamp));
            if (dailySummaries.hasOwnProperty(dateKey)) {
                dailySummaries[dateKey].calories += log.calories || 0;
                dailySummaries[dateKey].protein += log.protein || 0;
            }
        });

        // Fallback for today's summary to include any active unsaved/in-memory totals
        const todayStr = getISTDateKey();
        if (dailySummaries[todayStr]) {
            dailySummaries[todayStr].calories = Math.max(dailySummaries[todayStr].calories, dailyTotals.calories || 0);
            dailySummaries[todayStr].protein = Math.max(dailySummaries[todayStr].protein, dailyTotals.protein || 0);
        }

        // Calculate compliance and total logged days in the last 7 days
        let compliantDays = 0;
        let totalLoggedDays = 0;
        let totalCaloriesSum = 0;
        const calorieGoal = DAILY_TARGETS.calories || 2500;
        const proteinGoal = DAILY_TARGETS.protein || 100;

        last7Days.forEach(date => {
            const day = dailySummaries[date];
            if (day.calories > 0 || day.protein > 0) {
                totalLoggedDays++;
                totalCaloriesSum += day.calories;
                const isCalCompliant = (day.calories >= calorieGoal * 0.8 && day.calories <= calorieGoal * 1.15);
                const isProCompliant = (day.protein >= proteinGoal * 0.8);
                if (isCalCompliant && isProCompliant) {
                    compliantDays++;
                }
            }
        });

        // If no logged days at all, show default empty/fallback state
        if (totalLoggedDays === 0) {
            forecastContent.innerHTML = defaultHTML;
            return;
        }

        // Determine trend
        let trend = "Stable";
        let trendClass = "trend-stable";
        let trendText = "Stable Trend";
        let trendIcon = "📈";

        if (totalLoggedDays <= 1) {
            trend = "Stable";
            trendClass = "trend-stable";
            trendText = "Stable Trend";
            trendIcon = "📈";
        } else {
            const complianceRate = compliantDays / totalLoggedDays;
            if (complianceRate >= 0.6) {
                trend = "Improving";
                trendClass = "trend-improving";
                trendText = "Improving Trend";
                trendIcon = "📈";
            } else if (complianceRate >= 0.3) {
                trend = "Stable";
                trendClass = "trend-stable";
                trendText = "Stable Trend";
                trendIcon = "📈";
            } else {
                trend = "Declining";
                trendClass = "trend-declining";
                trendText = "Declining Trend";
                trendIcon = "📉";
            }
        }

        // Calculate predicted change based on average daily calorie deficit/surplus
        const averageDailyCal = totalLoggedDays > 0 ? (totalCaloriesSum / totalLoggedDays) : calorieGoal;
        const diff = averageDailyCal - calorieGoal;
        let predictedChangeStr = "0.0 kg/week";

        const change = diff / 1100;
        if (Math.abs(change) >= 0.05) {
            const prefix = change > 0 ? "+" : "";
            predictedChangeStr = `${prefix}${change.toFixed(1)}kg/week`;
        }

        // Calculate Success Probability
        const streak = calculateStreakFromHistory(allHistoryLogs);
        let prob = 50; // Base probability

        // Add streak weight (up to 25%)
        prob += Math.min(25, streak * 5);

        // Add compliance weight (up to 20%)
        if (totalLoggedDays > 0) {
            const complianceRate = compliantDays / totalLoggedDays;
            prob += Math.min(20, Math.round(complianceRate * 20));
        }

        // Add today logging consistency
        const loggedToday = dailySummaries[todayStr] && dailySummaries[todayStr].calories > 0;
        if (loggedToday) prob += 10;

        if (totalLoggedDays >= 3) prob += 10;
        if (totalLoggedDays >= 5) prob += 5;

        // Cap success probability realistically
        prob = Math.max(15, Math.min(98, prob));

        // Generate Insights
        let insightText = "";
        let subInsightText = "";

        if (trend === "Improving") {
            insightText = "Maintain your current eating pattern.";
            if (dailyTotals.protein >= proteinGoal) {
                subInsightText = "Your high protein compliance is supporting lean mass and active recovery.";
            } else {
                subInsightText = "Your calorie consistency is supporting steady, predictable progress.";
            }
        } else if (trend === "Stable") {
            insightText = "Your habits are currently steady.";
            if (streak > 0) {
                subInsightText = "Keep building on your streak to lock in more long-term health improvements.";
            } else {
                subInsightText = "Try aiming for closer alignment with your daily protein goal to boost success probability.";
            }
        } else {
            insightText = "Let's focus on consistency.";
            subInsightText = "A few missed goals recently. Focus on meeting your protein target today to rebound.";
        }

        // Render layout
        forecastContent.innerHTML = `
            <div class="forecast-trend-row">
                <span class="trend-badge ${trendClass}">
                    <span class="pulse-animation">${trendIcon}</span> ${trendText}
                </span>
                <span>•</span>
                <span style="font-weight: 800; color: var(--clr-text-main);">⚖️ ${predictedChangeStr}</span>
            </div>

            <div class="forecast-prob-row" style="display:flex; justify-content:space-between; align-items:center; font-weight:700; margin-top:0.2rem;">
                <span>🎯 Success Probability</span>
                <span id="forecast-prob-value" class="forecast-prob-val" data-value="0">0%</span>
            </div>
            <div class="forecast-progress-track">
                <div id="forecast-progress-fill" class="forecast-progress-fill" style="width: 0%"></div>
            </div>

            <div class="forecast-insight-box">
                <div class="forecast-insight-title">💡 AI Insight</div>
                <div class="forecast-insight-text">
                    <strong>${insightText}</strong><br>
                    <span class="forecast-insight-sub">${subInsightText}</span>
                </div>
            </div>

            <div class="forecast-footer">
                <span>✨ Keep going!</span>
            </div>
        `;

        // Animate progress bar and counter
        const fillEl = document.getElementById("forecast-progress-fill");
        const probEl = document.getElementById("forecast-prob-value");

        if (fillEl) {
            // Trigger reflow to ensure animation runs
            fillEl.getBoundingClientRect();
            fillEl.style.width = prob + "%";
        }

        if (probEl) {
            const startVal = 0;
            const duration = 800; // ms
            let startTimestamp = null;

            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const currentVal = Math.floor(progress * (prob - startVal) + startVal);
                probEl.innerHTML = currentVal + "%";
                probEl.setAttribute("data-value", currentVal);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    probEl.innerHTML = prob + "%";
                    probEl.setAttribute("data-value", prob);
                }
            };
            window.requestAnimationFrame(step);
        }
    }

    async function loadProfile() {
        const token = localStorage.getItem("token");
        if (!token) return;

        const resolveApiAssetUrl = (url) => {
            if (!url) return "";
            if (/^https?:\/\//i.test(url)) return url;
            return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
        };

        try {
            const res = await fetch(API_BASE + "/api/profile", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const profileEmail = document.getElementById("profile-email");
                const profileCal = document.getElementById("profile-calories-input");
                const profilePro = document.getElementById("profile-protein-input");
                const profileGreeting = document.getElementById("profile-greeting");
                const profileName = document.getElementById("profile-name");
                const profileWeight = document.getElementById("profile-weight");
                const profileHeight = document.getElementById("profile-height");

                if (profileEmail) profileEmail.value = data.email || "";
                if (profileCal) profileCal.value = data.calorie_goal || 2500;
                if (profilePro) profilePro.value = data.protein_goal || 100;
                if (profileName) profileName.value = data.name || "";
                if (profileWeight) profileWeight.value = data.weight || "";
                if (profileHeight) profileHeight.value = data.height || "";

                if (profileGreeting) {
                    const displayName = data.name || data.email || "";
                    if (displayName) {
                        profileGreeting.innerHTML = `Welcome, <a href="mailto:${data.email}" style="color: var(--clr-primary); text-decoration: none;">${displayName}</a>`;
                    }
                }

                // Update Profile Images
                const profileImg = document.getElementById("profile-pic-img");
                const navImg = document.getElementById("nav-profile-pic");
                const defaultPic = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.email || "User")}&background=random&color=fff&size=128`;
                const picUrl = data.profile_pic ? resolveApiAssetUrl(data.profile_pic) : defaultPic;

                if (profileImg) profileImg.src = picUrl;
                if (navImg) navImg.src = picUrl;

                // Update BMI widget
                updateBMIWidget(data.weight, data.height);
                currentUserEmail = data.email || "";
                updateGamifiedWidget();
                updateForecastWidget();
            }
        } catch (e) { }
    }

    const uploadPicBtn = document.getElementById("upload-pic-btn");
    const profilePicInput = document.getElementById("profile-pic-input");

    if (uploadPicBtn && profilePicInput) {
        uploadPicBtn.addEventListener("click", () => profilePicInput.click());
        profilePicInput.addEventListener("change", async (e) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];
            const token = localStorage.getItem("token");
            if (!token) return;

            const formData = new FormData();
            formData.append("file", file);

            try {
                const res = await fetch(API_BASE + "/api/upload-profile-pic", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    const resolvedPicUrl = /^https?:\/\//i.test(data.profile_pic)
                        ? data.profile_pic
                        : `${API_BASE}${data.profile_pic.startsWith("/") ? "" : "/"}${data.profile_pic}`;
                    // Instant refresh
                    const profileImg = document.getElementById("profile-pic-img");
                    const navImg = document.getElementById("nav-profile-pic");
                    if (profileImg) profileImg.src = resolvedPicUrl;
                    if (navImg) navImg.src = resolvedPicUrl;
                } else {
                    const err = await res.json();
                    alert("Upload failed: " + (err.detail || "Unknown error"));
                }
            } catch (err) {
                alert("Error uploading: " + err.message);
            }
        });
    }

    const profileSaveGoalsBtn = document.getElementById("profile-save-goals-btn");
    if (profileSaveGoalsBtn) {
        profileSaveGoalsBtn.addEventListener("click", async () => {
            const token = localStorage.getItem("token");
            if (!token) { alert("Please login"); return; }

            const caloriesInput = document.getElementById("profile-calories-input");
            const proteinInput = document.getElementById("profile-protein-input");
            const profileNameInput = document.getElementById("profile-name");
            const profileWeightInput = document.getElementById("profile-weight");
            const profileHeightInput = document.getElementById("profile-height");

            const cal = parseInt(caloriesInput.value, 10) || 2500;
            const pro = parseInt(proteinInput.value, 10) || 100;
            const name = profileNameInput ? profileNameInput.value.trim() : "";
            const weight = profileWeightInput ? parseFloat(profileWeightInput.value) || 0 : 0;
            const height = profileHeightInput ? parseFloat(profileHeightInput.value) || 0 : 0;

            profileSaveGoalsBtn.disabled = true;
            profileSaveGoalsBtn.textContent = "Saving...";

            try {
                const res = await fetch(API_BASE + "/api/update-profile", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, weight, height, calorie_goal: cal, protein_goal: pro })
                });

                if (!res.ok) throw new Error("Failed to save profile");

                DAILY_TARGETS.calories = cal;
                DAILY_TARGETS.protein = pro;
                updateDashboard({ totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
                await loadFeedback();

                // Update BMI widget
                updateBMIWidget(weight, height);

                if (caloriesInput) caloriesInput.value = cal;
                if (proteinInput) proteinInput.value = pro;

                // Update greeting with new name
                const profileGreeting = document.getElementById("profile-greeting");
                const profileEmail = document.getElementById("profile-email");
                if (profileGreeting) {
                    const displayName = name || (profileEmail ? profileEmail.value : "");
                    profileGreeting.innerHTML = `Welcome, <a href="mailto:${profileEmail ? profileEmail.value : ""}" style="color: var(--clr-primary); text-decoration: none;">${displayName}</a>`;
                }

                profileSaveGoalsBtn.textContent = "Saved ✓";
                setTimeout(() => {
                    profileSaveGoalsBtn.disabled = false;
                    profileSaveGoalsBtn.textContent = "Save Profile";
                }, 2000);
            } catch (e) {
                alert("⚠️ " + e.message);
                profileSaveGoalsBtn.disabled = false;
                profileSaveGoalsBtn.textContent = "Save Profile";
            }
        });
    }

    const changePwBtn = document.getElementById("profile-change-pw-btn");
    if (changePwBtn) {
        changePwBtn.addEventListener("click", async () => {
            const token = localStorage.getItem("token");
            if (!token) { alert("Please login"); return; }

            const oldPw = document.getElementById("profile-old-password");
            const newPw = document.getElementById("profile-new-password");
            const msgEl = document.getElementById("password-msg");

            if (!oldPw.value || !newPw.value) {
                msgEl.style.display = "block";
                msgEl.style.background = "rgba(255, 107, 107, 0.15)";
                msgEl.style.color = "#ff6b6b";
                msgEl.textContent = "Please fill in both fields";
                return;
            }

            changePwBtn.disabled = true;
            changePwBtn.textContent = "Changing...";
            msgEl.style.display = "none";

            try {
                const res = await fetch(API_BASE + "/api/change-password", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ old_password: oldPw.value, new_password: newPw.value })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.detail || "Failed to change password");
                }

                msgEl.style.display = "block";
                msgEl.style.background = "rgba(81, 207, 102, 0.15)";
                msgEl.style.color = "#51cf66";
                msgEl.textContent = "✓ Password changed successfully";
                oldPw.value = "";
                newPw.value = "";

                changePwBtn.textContent = "Changed ✓";
                setTimeout(() => {
                    changePwBtn.disabled = false;
                    changePwBtn.textContent = "Change Password";
                }, 2000);
            } catch (e) {
                msgEl.style.display = "block";
                msgEl.style.background = "rgba(255, 107, 107, 0.15)";
                msgEl.style.color = "#ff6b6b";
                msgEl.textContent = "⚠️ " + e.message;
                changePwBtn.disabled = false;
                changePwBtn.textContent = "Change Password";
            }
        });
    }

    const profileLogoutBtn = document.getElementById("profile-logout-btn");
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof window.logout === "function") {
                window.logout();
            } else {
                localStorage.removeItem("token");
                location.reload();
            }
        });
    }



    function addMealEntry(data) {
        const empty = mealsList.querySelector(".empty-state");
        if (empty) empty.remove();
        const names = data.items.map(i => formatFoodName(i.food_name, i.count)).join(", ");
        const entry = document.createElement("div"); entry.className = "meal-entry";
        entry.innerHTML = `<span class="fw-bold">${names}</span>
            <div style="font-size:0.85rem; display:flex; gap:0.5rem">
                <span class="clr-cal">🔥 ${Math.round(data.totals.calories)} kcal</span>
                <span class="clr-pro">🥩 ${data.totals.protein.toFixed(1)}g</span>
            </div>`;
        mealsList.prepend(entry);
    }

    // Initial History Load
    async function loadHistory() {
        const token = localStorage.getItem("token");
        if (!token) {
            historyList.innerHTML = '<div class="empty-state">Please login to view history.</div>';
            return;
        }

        try {
            const res = await fetch(API_BASE + "/api/history", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.status === 401) {
                localStorage.removeItem("token");
                updateAuthUI();
                historyList.innerHTML = '<div class="empty-state">Session expired. Please login again.</div>';
                return;
            }

            if (res.ok) {
                allHistoryLogs = await res.json();
                applyHistoryFilters();
                updateWeeklyChart();

                // Populate dashboard meals list with today's logs
                const todayStr = getISTDateKey();
                const todayLogs = allHistoryLogs.filter(log => getISTDateKey(log.timestamp) === todayStr);

                if (mealsList) {
                    if (todayLogs.length === 0) {
                        mealsList.innerHTML = `
                            <div class="empty-dashboard-state">
                                <div class="empty-icon">🍽️</div>
                                <div class="empty-title">No meals logged yet</div>
                                <div class="empty-sub">Upload your first meal to get started</div>
                                <button class="btn-secondary btn-sm mt-4" onclick="document.querySelector('.nav-link[href=\\'#analyze\\']').click()">Analyze Food</button>
                            </div>
                        `;
                    } else {
                        mealsList.innerHTML = "";
                        todayLogs.forEach(log => {
                            const entry = document.createElement("div");
                            entry.className = "meal-entry";
                            entry.innerHTML = `<span class="fw-bold">${formatFoodName(log.food_name)}</span>
                                <div style="font-size:0.85rem; display:flex; gap:0.5rem">
                                    <span class="clr-cal">🔥 ${Math.round(log.calories)} kcal</span>
                                    <span class="clr-pro">🥩 ${log.protein.toFixed(1)}g</span>
                                </div>`;
                            mealsList.appendChild(entry);
                        });
                    }
                }
                updateSwapSuggestion(todayLogs);
                updateGamifiedWidget();
                updateForecastWidget();
            }
        } catch (_) { }
    }

    function updateSwapSuggestion(todayLogs) {
        const swapCard = document.getElementById("swap-suggestion-card");
        const swapContent = document.getElementById("swap-suggestion-content");
        if (!swapCard || !swapContent) return;

        const edibleLogs = (todayLogs || []).filter(log => !isNonEdibleItem(log));

        // 1. Calculate Diet Status
        const calOk = dailyTotals.calories <= DAILY_TARGETS.calories;
        const proOk = dailyTotals.protein >= DAILY_TARGETS.protein;

        let statusColor = "#ff6b6b"; // Red
        let statusText = "Needs Improvement";
        let statusBadge = "🔴";
        let smartMsg = "⚠️ Your diet needs improvement. Adjust food choices.";
        let tip = "💡 Add eggs, paneer or chicken";

        if (calOk && proOk) {
            statusColor = "#51cf66"; // Green
            statusText = "Good Diet";
            statusBadge = "🟢";
            smartMsg = "🔥 Great job! Your diet is balanced. Keep it up!";
            tip = "💡 Maintain this consistency";
        } else if (calOk || proOk) {
            statusColor = "#fcc419"; // Amber
            statusText = "Moderate";
            statusBadge = "🟡";
            smartMsg = "👍 You're doing okay. Small improvements needed.";
            if (!proOk) tip = "💡 Add eggs, paneer or chicken";
            else tip = "💡 Reduce fried or fast food";
        } else {
            if (dailyTotals.calories > DAILY_TARGETS.calories) tip = "💡 Reduce fried or fast food";
        }

        // 2. Identify Swap
        let bestItemToSwap = null;
        let maxCals = -1;

        if (edibleLogs.length > 0) {
            edibleLogs.forEach(log => {
                const name = log.food_name.toLowerCase().replace(/_/g, " ");
                const swapKey = Object.keys(SWAP_SUGGESTIONS).find(key => name.includes(key));

                if (swapKey && log.calories > maxCals) {
                    maxCals = log.calories;
                    bestItemToSwap = {
                        original: formatFoodName(log.food_name),
                        ...SWAP_SUGGESTIONS[swapKey]
                    };
                }
            });
        }

        // 3. Render
        let swapHtml = "";
        if (bestItemToSwap) {
            swapHtml = `
                <div style="margin: 0.5rem 0; padding: 0.6rem; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border-left: 3px solid var(--clr-primary);">
                    <p style="font-size: 0.75rem; margin-bottom: 0.3rem; color: var(--clr-text-muted); font-weight: 600; text-transform: uppercase;">🔁 Swap Suggestion</p>
                    <p style="font-size: 0.85rem; margin-bottom: 0.4rem; color: var(--clr-text-main); line-height: 1.3;">
                        Replace <span style="color: var(--clr-cal); font-weight: 700;">${bestItemToSwap.original}</span> ➔ 
                        <span style="color: var(--clr-pro); font-weight: 700;">${bestItemToSwap.alt}</span>
                    </p>
                    <div style="display: flex; gap: 0.4rem; font-size: 0.75rem; font-weight: 700;">
                        <span style="color: var(--clr-cal); background: rgba(255, 107, 107, 0.1); padding: 1px 5px; border-radius: 4px;">-${bestItemToSwap.calSave} kcal</span>
                        <span style="color: var(--clr-pro); background: rgba(81, 207, 102, 0.1); padding: 1px 5px; border-radius: 4px;">+${bestItemToSwap.proGain.toFixed(1)}g pro</span>
                    </div>
                </div>
            `;
        } else if (edibleLogs.length > 0) {
            swapHtml = `
                <div style="text-align: center; padding: 0.5rem 0; opacity: 0.8; background: rgba(81, 207, 102, 0.05); border-radius: 8px; margin: 0.5rem 0;">
                    <p style="font-size: 0.8rem; font-weight: 700; color: #51cf66;">🥗 Eating Clean!</p>
                </div>
            `;
        } else {
            swapHtml = `<div class="empty-state" style="padding: 1rem 0;">Log a meal to see suggestions!</div>`;
        }

        // Update card title area to include status badge
        const titleEl = swapCard.querySelector(".dash-card-title");
        if (titleEl) {
            titleEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <span>🔁</span> Smart Suggestions
                    </div>
                    <span style="font-size: 0.65rem; background: ${statusColor}15; color: ${statusColor}; padding: 1px 6px; border-radius: 12px; border: 1px solid ${statusColor}40; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${statusBadge} ${statusText}
                    </span>
                </div>
            `;
        }

        swapContent.innerHTML = `
            ${swapHtml}
            <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--clr-border);">
                <p style="font-size: 0.85rem; font-weight: 700; color: var(--clr-text-main); margin-bottom: 0.2rem;">${smartMsg}</p>
                <p style="font-size: 0.75rem; color: var(--clr-text-muted); font-style: italic; font-weight: 500;">${tip}</p>
            </div>
        `;

        swapCard.style.display = "block";
    }

    function updateWeeklyChart() {
        const canvas = document.getElementById("weekly-chart");
        if (!canvas) return;

        const last7Days = getISTDateRangeKeys(7);

        const dailyData = last7Days.map(dateStr => {
            const dayLogs = allHistoryLogs.filter(l => getISTDateKey(l.timestamp) === dateStr);
            return {
                date: dateStr,
                calories: dayLogs.reduce((sum, l) => sum + (l.calories || 0), 0),
                protein: dayLogs.reduce((sum, l) => sum + (l.protein || 0), 0)
            };
        });

        const labels = dailyData.map(d => {
            const dt = new Date(`${d.date}T00:00:00`);
            return dt.toLocaleDateString("en-US", { timeZone: IST_TIME_ZONE, weekday: "short", month: "short" });
        });

        const calData = dailyData.map(d => Math.round(d.calories));
        const proData = dailyData.map(d => Math.round(d.protein));

        if (weeklyChartInstance) {
            weeklyChartInstance.data.labels = labels;
            weeklyChartInstance.data.datasets[0].data = calData;
            weeklyChartInstance.data.datasets[1].data = proData;
            weeklyChartInstance.update();
        } else {
            const ctx = canvas.getContext("2d");

            // Create Gradients
            const calGradient = ctx.createLinearGradient(0, 0, 0, 300);
            calGradient.addColorStop(0, 'rgba(255, 107, 107, 0.3)');
            calGradient.addColorStop(1, 'rgba(255, 107, 107, 0)');

            const proGradient = ctx.createLinearGradient(0, 0, 0, 300);
            proGradient.addColorStop(0, 'rgba(81, 207, 102, 0.3)');
            proGradient.addColorStop(1, 'rgba(81, 207, 102, 0)');

            weeklyChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Calories',
                            data: calData,
                            borderColor: '#ff6b6b',
                            backgroundColor: calGradient,
                            borderWidth: 3,
                            pointBackgroundColor: '#ff6b6b',
                            pointBorderColor: 'rgba(255,255,255,0.8)',
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Protein (g)',
                            data: proData,
                            borderColor: '#51cf66',
                            backgroundColor: proGradient,
                            borderWidth: 3,
                            pointBackgroundColor: '#51cf66',
                            pointBorderColor: 'rgba(255,255,255,0.8)',
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#adb5bd', font: { weight: '600' } }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            ticks: { color: '#adb5bd', font: { weight: '600' } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#adb5bd', font: { weight: '600' } }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { color: '#f8f9fa', font: { family: 'Inter', weight: '700' }, usePointStyle: true, padding: 20 }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            titleFont: { size: 14, weight: 'bold', family: 'Inter' },
                            bodyFont: { size: 13, family: 'Inter' },
                            padding: 12,
                            cornerRadius: 10,
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            displayColors: true
                        }
                    }
                }
            });
        }
    }

    const historyRange = document.getElementById("history-filter-range");
    const historyDate = document.getElementById("history-filter-date");

    if (historyRange && historyDate) {
        historyRange.addEventListener("change", () => {
            historyDate.style.display = historyRange.value === "custom" ? "block" : "none";
            applyHistoryFilters();
        });
        historyDate.addEventListener("change", applyHistoryFilters);
    }

    function applyHistoryFilters() {
        const range = historyRange ? historyRange.value : "all";
        const selectedDateStr = historyDate ? historyDate.value : "";

        let filtered = allHistoryLogs;
        const todayStr = getISTDateKey();

        if (range === "today") {
            filtered = allHistoryLogs.filter(log => {
                return getISTDateKey(log.timestamp) === todayStr;
            });
        } else if (range === "7days") {
            const last7Days = new Set(getISTDateRangeKeys(7));
            filtered = allHistoryLogs.filter(log => last7Days.has(getISTDateKey(log.timestamp)));
        } else if (range === "custom" && selectedDateStr) {
            filtered = allHistoryLogs.filter(log => {
                return getISTDateKey(log.timestamp) === selectedDateStr;
            });
        }

        renderHistory(filtered);
    }

    function renderHistory(logs) {
        if (!logs.length) {
            historyList.innerHTML = '<div class="empty-state">No history recorded.</div>';
            return;
        }
        historyList.innerHTML = "";
        logs.forEach(log => {
            const entry = document.createElement("div"); 
            entry.className = "history-entry";
            
            // Force IST display for consistent timestamp rendering.
            const { dateStr, timeStr } = formatISTDateTime(log.timestamp);
            
            entry.innerHTML = `<span style="font-size:0.85rem; color:var(--clr-text-muted); font-weight: 600;">📅 ${dateStr} 🕐 ${timeStr}</span>
                <span class="fw-bold">${formatFoodName(log.food_name)}</span>
                <div style="font-size:0.85rem; display:flex; gap:0.5rem; align-items:center;">
                    <span class="clr-cal">🔥 ${Math.round(log.calories)} kcal</span>
                    <span class="clr-pro">🥩 ${log.protein.toFixed(1)}g</span>
                    <button class="delete-history-btn" data-id="${log.id}" style="background:none; border:none; font-size:1.1rem; cursor:pointer; color:inherit; padding:0; margin-left:0.5rem;" title="Delete item">🗑</button>
                </div>`;
            historyList.appendChild(entry);
        });

        document.querySelectorAll(".delete-history-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.currentTarget.getAttribute("data-id");
                if (confirm("Are you sure you want to delete this food log?")) {
                    await deleteHistoryItem(id);
                }
            });
        });
    }

    async function deleteHistoryItem(id) {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please login");
            return;
        }

        try {
            const res = await fetch(API_BASE + `/api/delete/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.status === 401) {
                localStorage.removeItem("token");
                updateAuthUI();
                alert("Session expired. Please login again.");
                return;
            }

            if (!res.ok) {
                throw new Error("Failed to delete item.");
            }

            await loadHistory();
            await loadTodaySummary();
        } catch (err) {
            alert("⚠️ " + err.message);
        }
    }

    loadHistory();

    // ==========================================
// Auth System
// ==========================================

const loginCard = document.getElementById("login-card");
const signupCard = document.getElementById("signup-card");

document.getElementById("show-signup").addEventListener("click", (e) => {
    e.preventDefault();
    loginCard.style.display = "none";
    signupCard.style.display = "block";
});

document.getElementById("show-login").addEventListener("click", (e) => {
    e.preventDefault();
    signupCard.style.display = "none";
    loginCard.style.display = "block";
});

function updateAuthUI() {
    const token = localStorage.getItem("token");

    const analyzeSec = document.getElementById("analyze");
    const dashSec = document.getElementById("dashboard");
    const histSec = document.getElementById("history");
    const profileSec = document.getElementById("profile");
    const authSec = document.getElementById("auth");
    const navbar = document.querySelector(".navbar");

    if (token) {
        navbar.style.display = "flex";

        analyzeSec.style.display = "block";
        dashSec.style.display = "none";
        histSec.style.display = "none";
        profileSec.style.display = "none";
        authSec.style.display = "none";

        document.querySelectorAll(".nav-link")
            .forEach(l => l.classList.remove("active"));

        document
            .querySelector('.nav-link[href="#analyze"]')
            .classList.add("active");

    } else {

        navbar.style.display = "none";

        analyzeSec.style.display = "none";
        dashSec.style.display = "none";
        histSec.style.display = "none";
        profileSec.style.display = "none";

        authSec.style.display = "block";
    }
}



// ==========================================
// SIGNUP
// ==========================================

document.getElementById("signup-form")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
        document.getElementById("signup-email").value;

    const password =
        document.getElementById("signup-password").value;

    try {

        const res = await fetch(
            API_BASE + "/api/auth/register",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(
                data.detail || "Signup failed"
            );
        }

        alert("✅ Signup successful!");

        document
            .getElementById("show-login")
            .click();

        document
            .getElementById("signup-form")
            .reset();

    } catch (error) {

        alert("⚠️ " + error.message);
    }
});



// ==========================================
// LOGIN
// ==========================================

document.getElementById("login-form")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
        document.getElementById("login-email").value;

    const password =
        document.getElementById("login-password").value;

    try {

        const formData = new URLSearchParams();

        formData.append("username", email);
        formData.append("password", password);

        const res = await fetch(
            API_BASE + "/api/auth/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: formData
            }
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(
                data.detail || "Login failed"
            );
        }

        if (!data.access_token) {
            throw new Error(
                "No token received from server"
            );
        }

        localStorage.setItem(
            "token",
            data.access_token
        );

        updateAuthUI();

        mealsList.innerHTML =
            '<div class="empty-state">No meals logged yet today.</div>';

        historyList.innerHTML =
            '<div class="empty-state">No history recorded.</div>';

        dailyTotals = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };

        DAILY_TARGETS = {
            calories: 2500,
            protein: 100,
            carbs: 300,
            fat: 80
        };

        updateDashboard({
            totals: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
            }
        });

        loadHistory();
        loadUserGoals();
        loadTodaySummary();
        loadProfile();

        document
            .querySelector('.nav-link[href="#analyze"]')
            .click();

        document
            .getElementById("login-form")
            .reset();

    } catch (error) {

        alert("⚠️ " + error.message);
    }
});



// ==========================================
// INITIAL LOAD
// ==========================================

loadHistory();
loadUserGoals();
loadTodaySummary();
loadProfile();
updateAuthUI();
})();
