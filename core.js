// ==================== CORE.JS ====================

// Объединяем части меню в единую базу данных (если они еще не объединены в menu_database.js)
if (typeof DISH_DATABASE === 'undefined') {
    const p1 = typeof DISH_DATABASE_P1 !== 'undefined' ? DISH_DATABASE_P1 : [];
    const p2 = typeof DISH_DATABASE_P2 !== 'undefined' ? DISH_DATABASE_P2 : [];
    const p3 = typeof DISH_DATABASE_P3 !== 'undefined' ? DISH_DATABASE_P3 : [];
    const DISH_DATABASE = [...p1, ...p2, ...p3];
}

// ==================== УПРАВЛЕНИЕ ВКЛАДКАМИ ====================
function openTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.style.display = 'block';
        setTimeout(() => activeTab.classList.add('active'), 10);
    }
    if (btnElement) {
        btnElement.classList.add('active');
    }
    
    if (tabId === 'tab-workstation') {
        if (typeof initPOS === 'function') initPOS();
        if (typeof showCurrentStock === 'function') showCurrentStock();
        if (typeof updatePOSAvailability === 'function') updatePOSAvailability();
    }
}

window.onload = function() {
    initMenuCheckboxes();
    switchBusinessLogic();
    loadFromLocalStorage();
    
    // Инициализация системы учёта остатков
    if (typeof initStockFromInventory === 'function') {
        initStockFromInventory();
    }
    
    // Загружаем статистику смены
    const savedShift = localStorage.getItem("shift_stats");
    if (savedShift && typeof shiftStats !== 'undefined') {
        shiftStats = JSON.parse(savedShift);
        if (typeof updateShiftDisplay === 'function') updateShiftDisplay();
    }
    
    // Загружаем статистику брака
    if (typeof loadWasteStats === 'function') {
        loadWasteStats();
    }
};

function initMenuCheckboxes() {
    const container = document.getElementById("menu_checkboxes");
    if (!container) return;
    
    if (typeof DISH_DATABASE === 'undefined' || DISH_DATABASE.length === 0) {
        container.innerHTML = '<p style="color: red; grid-column: 1/-1;">⚠️ ОШИБКА: База блюд пуста! Проверьте загрузку menu_database.js</p>';
        return;
    }
    
    container.innerHTML = "";

    const grouped = {};
    for (let key in CATEGORY_NAMES) grouped[key] = [];
    DISH_DATABASE.forEach((dish, index) => {
        if (grouped[dish.cat]) grouped[dish.cat].push({ dish, index });
    });

    for (let cat in grouped) {
        if (grouped[cat].length === 0) continue;
        
        const header = document.createElement("div");
        header.style = "grid-column: 1 / -1; margin: 15px 0 5px 0; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 3px;";
        header.innerText = CATEGORY_NAMES[cat] || cat;
        container.appendChild(header);

        grouped[cat].forEach(item => {
            const label = document.createElement("label");
            label.className = "menu-item";
            label.innerHTML = `<input type="checkbox" id="dish_${item.index}" onchange="localStorage.setItem('dish_${item.index}', this.checked); rebuildReadyStockTable();"> ${item.dish.name}`;
            container.appendChild(label);
        });
    }
}

function switchBusinessLogic() {
    const logic = document.getElementById("business_logic") ? document.getElementById("business_logic").value : "1";
    
    const trkLimit = document.getElementById("group_truck_limit");
    const carLimit = document.getElementById("group_car_limit");
    const rvStorage = document.getElementById("group_rv_storage");
    const rvCabinet = document.getElementById("group_rv_cabinet");

    if(trkLimit) trkLimit.style.display = "none";
    if(carLimit) carLimit.style.display = "none";
    if(rvStorage) rvStorage.style.display = "none";
    if(rvCabinet) rvCabinet.style.display = "none";

    if (logic === "1") {
        if(trkLimit) trkLimit.style.display = "flex";
    } 
    else if (logic === "2") {
        if(trkLimit) trkLimit.style.display = "flex";
        if(carLimit) carLimit.style.display = "flex";
    } 
    else if (logic === "3") {
        if(trkLimit) trkLimit.style.display = "flex";
        if(carLimit) carLimit.style.display = "flex";
        if(rvStorage) rvStorage.style.display = "flex";
        if(rvCabinet) rvCabinet.style.display = "flex";
    }
    else if (logic === "4") {
        if(trkLimit) trkLimit.style.display = "flex";
        if(rvStorage) rvStorage.style.display = "flex";
        if(rvCabinet) rvCabinet.style.display = "flex";
    }
    rebuildReadyStockTable();
}

function rebuildReadyStockTable() {
    const logic = document.getElementById("business_logic") ? document.getElementById("business_logic").value : "1";
    let requiredComponents = new Set();

    if (typeof DISH_DATABASE !== 'undefined') {
        DISH_DATABASE.forEach((dish, index) => {
            const el = document.getElementById(`dish_${index}`);
            if (el && el.checked) {
                for (let component in dish.recipe) {
                    requiredComponents.add(component);
                    if (["картофельное_пюре", "котлета", "рыбная_котлета"].includes(component)) {
                        requiredComponents.add("масло");
                    }
                }
            }
        });
    }

    const thead = document.getElementById("thead_ready_stock");
    if (thead) {
        thead.innerHTML = (logic === "3" || logic === "4")
            ? `<th>Заготовка</th><th>В Траке</th><th>В Автодоме</th><th>Заготовка</th><th>В Траке</th><th>В Автодоме</th>`
            : `<th>Заготовка</th><th>В Траке</th><th>Заготовка</th><th>В Траке</th>`;
    }

    const tbody = document.querySelector("#table_ready_stock tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let compArray = Array.from(requiredComponents);
    for (let i = 0; i < compArray.length; i += 2) {
        let tr = document.createElement("tr");
        
        let c1 = compArray[i];
        let name1 = (typeof COMPONENT_NAMES !== 'undefined' && COMPONENT_NAMES[c1]) ? COMPONENT_NAMES[c1] : c1;
        let td1 = (logic === "3" || logic === "4")
            ? `<td>${name1}</td><td><input type="number" class="ready-input" id="ready_${c1}_трак" value="${localStorage.getItem('ready_'+c1+'_трак') || 0}"></td><td><input type="number" class="ready-input" id="ready_${c1}_авд" value="${localStorage.getItem('ready_'+c1+'_авд') || 0}"></td>`
            : `<td>${name1}</td><td><input type="number" class="ready-input" id="ready_${c1}_трак" value="${localStorage.getItem('ready_'+c1+'_трак') || 0}"></td>`;
        
        let td2 = (logic === "3" || logic === "4") 
            ? `<td style="border:none;"></td><td style="border:none;"></td><td style="border:none;"></td>` 
            : `<td style="border:none;"></td><td style="border:none;"></td>`;
            
        if (i + 1 < compArray.length) {
            let c2 = compArray[i + 1];
            let name2 = (typeof COMPONENT_NAMES !== 'undefined' && COMPONENT_NAMES[c2]) ? COMPONENT_NAMES[c2] : c2;
            td2 = (logic === "3" || logic === "4")
                ? `<td>${name2}</td><td><input type="number" class="ready-input" id="ready_${c2}_трак" value="${localStorage.getItem('ready_'+c2+'_трак') || 0}"></td><td><input type="number" class="ready-input" id="ready_${c2}_авд" value="${localStorage.getItem('ready_'+c2+'_авд') || 0}"></td>`
                : `<td>${name2}</td><td><input type="number" class="ready-input" id="ready_${c2}_трак" value="${localStorage.getItem('ready_'+c2+'_трак') || 0}"></td>`;
        }
        
        tr.innerHTML = td1 + td2;
        tbody.appendChild(tr);
    }
}

function saveToLocalStorage() {
    const configs = ["business_logic", "cfg_truck_fridge", "cfg_car_trunk", "cfg_rv_storage", "cfg_rv_cabinet", "cfg_margin_percent", "cfg_fish_price"];
    configs.forEach(id => { 
        const el = document.getElementById(id);
        if(el) localStorage.setItem(id, el.value); 
    });
    
    if (typeof DISH_DATABASE !== 'undefined') {
        DISH_DATABASE.forEach((dish, idx) => { 
            const el = document.getElementById(`dish_${idx}`);
            if(el) localStorage.setItem(`dish_${idx}`, el.checked); 
        });
    }
    
    const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба", "лёд", "пиво", "вино"];
    rawIds.forEach(id => { 
        const el = document.getElementById(`stock_${id}`);
        if(el) localStorage.setItem(`stock_${id}`, el.value); 
    });
    
    document.querySelectorAll(".ready-input").forEach(el => { localStorage.setItem(el.id, el.value); });
    alert("💾 Данные переучета успешно сохранены!");
}

function loadFromLocalStorage() {
    const configs = ["business_logic", "cfg_truck_fridge", "cfg_car_trunk", "cfg_rv_storage", "cfg_rv_cabinet", "cfg_margin_percent", "cfg_fish_price"];
    configs.forEach(id => { 
        if(localStorage.getItem(id) !== null) {
            const el = document.getElementById(id);
            if(el) el.value = localStorage.getItem(id); 
        }
    });
    
    switchBusinessLogic();

    if (typeof DISH_DATABASE !== 'undefined') {
        DISH_DATABASE.forEach((dish, idx) => { 
            const el = document.getElementById(`dish_${idx}`);
            if(el) {
                const savedValue = localStorage.getItem(`dish_${idx}`);
                el.checked = savedValue === 'true'; 
            }
        });
    }
    
    const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба", "лёд", "пиво", "вино"];
    rawIds.forEach(id => { 
        if(localStorage.getItem(`stock_${id}`) !== null) {
            const el = document.getElementById(`stock_${id}`);
            if(el) el.value = localStorage.getItem(`stock_${id}`); 
        }
    });
    
    rebuildReadyStockTable();
}

function resetAllFields() {
    if(confirm("🧹 Полностью обнулить все склады и заготовки в калькуляторе?")) {
        localStorage.clear();
        const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба", "лёд", "пиво", "вино"];
        rawIds.forEach(id => { 
            const el = document.getElementById(`stock_${id}`);
            if(el) el.value = 0; 
        });
        if (typeof DISH_DATABASE !== 'undefined') {
            DISH_DATABASE.forEach((dish, idx) => { 
                const el = document.getElementById(`dish_${idx}`);
                if(el) el.checked = false; 
            });
        }
        rebuildReadyStockTable();
        if (typeof resetShiftData === 'function') resetShiftData();
        alert("✅ Все данные обнулены!");
    }
}

// ==================== ТЁМНАЯ ТЕМА ====================
function toggleTheme() {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    const btn = document.getElementById("theme_btn");
    if(btn) btn.innerText = isDark ? "☀️ Светлая" : "🌙 Тёмная";
}

(function() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
        setTimeout(() => {
            const btn = document.getElementById("theme_btn");
            if (btn) btn.innerText = "☀️ Светлая";
        }, 100);
    }
})();

// ==================== ЭКСПОРТ / ИМПОРТ ====================
function exportData() {
    const data = {};
    const keys = ["business_logic", "cfg_truck_fridge", "cfg_car_trunk", "cfg_rv_storage", "cfg_rv_cabinet", "cfg_margin_percent", "cfg_fish_price"];
    keys.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });

    if (typeof DISH_DATABASE !== 'undefined') {
        DISH_DATABASE.forEach((dish, idx) => {
            const el = document.getElementById(`dish_${idx}`);
            if (el) data[`dish_${idx}`] = el.checked;
        });
    }

    const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба", "лёд", "пиво", "вино"];
    rawIds.forEach(id => {
        const el = document.getElementById(`stock_${id}`);
        if (el) data[`stock_${id}`] = el.value;
    });

    document.querySelectorAll(".ready-input").forEach(el => {
        data[el.id] = el.value;
    });
    
    data["shift_stats"] = localStorage.getItem("shift_stats") || '{"revenue":0,"profit":0,"orders":0}';
    data["waste_stats"] = localStorage.getItem("waste_stats") || '{"total":0,"items":[]}';

    const json = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    
    const modal = document.getElementById("sync_modal");
    const title = document.getElementById("sync_modal_title");
    const content = document.getElementById("sync_modal_content");
    
    if (modal && title && content) {
        title.innerText = "📤 Экспорт данных";
        content.innerHTML = `
            <p style="color: #7f8c8d; font-size: 14px;">Скопируйте этот код и отправьте себе в Telegram (в "Избранное"):</p>
            <textarea id="export_code" readonly style="width: 100%; height: 150px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 12px; resize: vertical;">${encoded}</textarea>
            <div style="margin-top: 10px; text-align: center;">
                <button onclick="copyExportCode()" style="background: #27ae60; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;">📋 Скопировать код</button>
            </div>
            <p id="copy_status" style="color: #27ae60; font-size: 13px; margin-top: 10px; display: none;">✅ Скопировано!</p>
        `;
        modal.style.display = "flex";
    }
}

function copyExportCode() {
    const textarea = document.getElementById("export_code");
    if(textarea) {
        textarea.select();
        document.execCommand("copy");
        const status = document.getElementById("copy_status");
        if(status) {
            status.style.display = "block";
            setTimeout(() => { status.style.display = "none"; }, 2000);
        }
    }
}

function importData() {
    const modal = document.getElementById("sync_modal");
    const title = document.getElementById("sync_modal_title");
    const content = document.getElementById("sync_modal_content");
    
    if (modal && title && content) {
        title.innerText = "📥 Импорт данных";
        content.innerHTML = `
            <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
                <strong>Способ 1:</strong> Скопируйте код из чата и нажмите кнопку ниже<br>
                <strong>Способ 2:</strong> Вставьте код вручную в поле ниже
            </p>
            <div style="margin-bottom: 10px;">
                <button onclick="importFromClipboard()" style="width: 100%; background: #3498db; color: white; border: none; padding: 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;">📋 Вставить из буфера обмена</button>
            </div>
            <textarea id="import_code" placeholder="Или вставьте код сюда..." style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
            <div style="margin-top: 10px; text-align: center;">
                <button onclick="applyImport()" style="background: #8e44ad; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;">✅ Применить импорт</button>
            </div>
            <p id="import_status" style="font-size: 13px; margin-top: 10px; display: none;"></p>
        `;
        modal.style.display = "flex";
    }
}

function importFromClipboard() {
    navigator.clipboard.readText().then(text => {
        const textarea = document.getElementById("import_code");
        if(textarea) textarea.value = text;
        applyImport();
    }).catch(() => {
        alert("❌ Не удалось получить данные из буфера обмена. Вставьте код вручную.");
    });
}

function applyImport() {
    const textarea = document.getElementById("import_code");
    const code = textarea ? textarea.value.trim() : "";
    const status = document.getElementById("import_status");
    
    if (!code) {
        if(status) {
            status.innerText = "❌ Вставьте код!";
            status.style.color = "#e74c3c";
            status.style.display = "block";
        }
        return;
    }

    try {
        const json = decodeURIComponent(escape(atob(code)));
        const data = JSON.parse(json);
        
        const configs = ["business_logic", "cfg_truck_fridge", "cfg_car_trunk", "cfg_rv_storage", "cfg_rv_cabinet", "cfg_margin_percent", "cfg_fish_price"];
        configs.forEach(id => {
            if (data[id] !== undefined) {
                localStorage.setItem(id, data[id]);
                const el = document.getElementById(id);
                if (el) el.value = data[id];
            }
        });

        if (typeof DISH_DATABASE !== 'undefined') {
            DISH_DATABASE.forEach((dish, idx) => {
                if (data[`dish_${idx}`] !== undefined) {
                    localStorage.setItem(`dish_${idx}`, data[`dish_${idx}`]);
                    const el = document.getElementById(`dish_${idx}`);
                    if (el) el.checked = data[`dish_${idx}`];
                }
            });
        }

        const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба", "лёд", "пиво", "вино"];
        rawIds.forEach(id => {
            if (data[`stock_${id}`] !== undefined) {
                localStorage.setItem(`stock_${id}`, data[`stock_${id}`]);
                const el = document.getElementById(`stock_${id}`);
                if (el) el.value = data[`stock_${id}`];
            }
        });

        for (let key in data) {
            if (key.startsWith("ready_")) {
                localStorage.setItem(key, data[key]);
                const el = document.getElementById(key);
                if (el) el.value = data[key];
            }
        }
        
        if (data["shift_stats"]) {
            localStorage.setItem("shift_stats", data["shift_stats"]);
            if (typeof shiftStats !== 'undefined') {
                shiftStats = JSON.parse(data["shift_stats"]);
                if (typeof updateShiftDisplay === 'function') updateShiftDisplay();
            }
        }
        
        if (data["waste_stats"]) {
            localStorage.setItem("waste_stats", data["waste_stats"]);
            if (typeof wasteStats !== 'undefined') {
                wasteStats = JSON.parse(data["waste_stats"]);
            }
        }

        switchBusinessLogic();
        rebuildReadyStockTable();

        if(status) {
            status.innerText = "✅ Данные успешно импортированы!";
            status.style.color = "#27ae60";
            status.style.display = "block";
        }
        
        setTimeout(() => {
            closeSyncModal();
        }, 1500);
    } catch (e) {
        if(status) {
            status.innerText = "❌ Ошибка: неверный код!";
            status.style.color = "#e74c3c";
            status.style.display = "block";
        }
    }
}

function closeSyncModal() {
    const modal = document.getElementById("sync_modal");
    if(modal) modal.style.display = "none";
}
