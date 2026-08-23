// ==================== CORE.JS: ЧАСТЬ 1 ИЗ 2 ====================
// Объединяем три части меню в единую базу данных
const DISH_DATABASE = [...DISH_DATABASE_P1, ...DISH_DATABASE_P2, ...DISH_DATABASE_P3];

window.onload = function() {
    initMenuCheckboxes();
    switchBusinessLogic(); // Настройка под выбранную логику
    loadFromLocalStorage(); // Автозагрузка остатков с ПК
};

// Исправленная сборка: сохраняет галочку в память СРАЗУ при клике на неё
function initMenuCheckboxes() {
    const container = document.getElementById("menu_checkboxes");
    if (!container) return;
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
        header.innerText = CATEGORY_NAMES[cat];
        container.appendChild(header);

        grouped[cat].forEach(item => {
            const label = document.createElement("label");
            label.className = "menu-item";
            // Мгновенная фиксация в LocalStorage при изменении состояния
            label.innerHTML = `<input type="checkbox" id="dish_${item.index}" onchange="localStorage.setItem('dish_${item.index}', this.checked); rebuildReadyStockTable();"> ${item.dish.name}`;
            container.appendChild(label);
        });
    }
}

function switchBusinessLogic() {
    const logic = document.getElementById("business_logic").value;
    
    const trkLimit = document.getElementById("group_truck_limit");
    const carLimit = document.getElementById("group_car_limit");
    const rvStorage = document.getElementById("group_rv_storage");
    const rvCabinet = document.getElementById("group_rv_cabinet");
    
    const thRaw1 = document.getElementById("th_raw_stock_name");
    const thRaw2 = document.getElementById("th_raw_stock_name_2");
    const b3Title = document.getElementById("title_block3");
    const b4Title = document.getElementById("title_block4");

    if (logic === "1") {
        if(trkLimit) trkLimit.style.display = "flex";
        if(carLimit) carLimit.style.display = "none";
        if(rvStorage) rvStorage.style.display = "none";
        if(rvCabinet) rvCabinet.style.display = "none";
        
        if(thRaw1) thRaw1.innerText = "Остаток в Траке";
        if(thRaw2) thRaw2.innerText = "Остаток в Траке";
        if(b3Title) b3Title.innerHTML = "🥣 2. Текущие остатки готовых заготовок в Фудтраке (в порциях):";
        if(b4Title) b4Title.innerHTML = "📦 3. Текущие остатки сырья в Фудтраке / Инвентаре (в штуках):";
    } 
    else if (logic === "2") {
        if(trkLimit) trkLimit.style.display = "flex";
        if(carLimit) carLimit.style.display = "flex";
        if(rvStorage) rvStorage.style.display = "none";
        if(rvCabinet) rvCabinet.style.display = "none";
        
        if(thRaw1) thRaw1.innerText = "Остаток в Траке / Авто";
        if(thRaw2) thRaw2.innerText = "Остаток в Траке / Авто";
        if(b3Title) b3Title.innerHTML = "🥣 2. Текущие остатки готовых заготовок в Фудтраке (в порциях):";
        if(b4Title) b4Title.innerHTML = "📦 3. Текущие остатки сырья в Авто / Траке (в штуках):";
    } 
    else if (logic === "3") {
        if(trkLimit) trkLimit.style.display = "flex";
        if(carLimit) carLimit.style.display = "flex";
        if(rvStorage) rvStorage.style.display = "flex";
        if(rvCabinet) rvCabinet.style.display = "flex";
        
        if(thRaw1) thRaw1.innerText = "В шкафу Автодома";
        if(thRaw2) thRaw2.innerText = "В шкафу Автодома";
        if(b3Title) b3Title.innerHTML = "🥣 2. Текущие остатки чистых заготовок в Траке / Автодоме (в порциях):";
        if(b4Title) b4Title.innerHTML = "📦 3. Текущие остатки сырья в шкафу Автодома (в штуках):";
    }
    rebuildReadyStockTable();
}
// ==================== CORE.JS: ЧАСТЬ 2 ИЗ 2 ====================
function rebuildReadyStockTable() {
    const logic = document.getElementById("business_logic").value;
    let requiredComponents = new Set();

    DISH_DATABASE.forEach((dish, index) => {
        if (document.getElementById(`dish_${index}`) && document.getElementById(`dish_${index}`).checked) {
            for (let component in dish.recipe) {
                requiredComponents.add(component);
                if (["картофельное_пюре", "котлета", "рыбная_котлета"].includes(component)) {
                    requiredComponents.add("масло");
                }
            }
        }
    });

    const thead = document.getElementById("thead_ready_stock");
    if (thead) {
        thead.innerHTML = (logic === "3")
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
        let name1 = COMPONENT_NAMES[c1] || c1;
        let td1 = (logic === "3")
            ? `<td>${name1}</td><td><input type="number" class="ready-input" id="ready_${c1}_трак" value="${localStorage.getItem('ready_'+c1+'_трак') || 0}"></td><td><input type="number" class="ready-input" id="ready_${c1}_авд" value="${localStorage.getItem('ready_'+c1+'_авд') || 0}"></td>`
            : `<td>${name1}</td><td><input type="number" class="ready-input" id="ready_${c1}_трак" value="${localStorage.getItem('ready_'+c1+'_трак') || 0}"></td>`;
        
        let td2 = (logic === "3") 
            ? `<td style="border:none;"></td><td style="border:none;"></td><td style="border:none;"></td>` 
            : `<td style="border:none;"></td><td style="border:none;"></td>`;
            
        if (i + 1 < compArray.length) {
            let c2 = compArray[i + 1];
            let name2 = COMPONENT_NAMES[c2] || c2;
            td2 = (logic === "3")
                ? `<td>${name2}</td><td><input type="number" class="ready-input" id="ready_${c2}_трак" value="${localStorage.getItem('ready_'+c2+'_трак') || 0}"></td><td><input type="number" class="ready-input" id="ready_${c2}_авд" value="${localStorage.getItem('ready_'+c2+'_авд') || 0}"></td>`
                : `<td>${name2}</td><td><input type="number" class="ready-input" id="ready_${c2}_трак" value="${localStorage.getItem('ready_'+c2+'_трак') || 0}"></td>`;
        }
        
        tr.innerHTML = td1 + td2;
        tbody.appendChild(tr);
    }
}

function saveToLocalStorage() {
    const configs = ["business_logic", "cfg_truck_fridge", "cfg_car_trunk", "cfg_rv_storage", "cfg_rv_cabinet", "cfg_margin_percent", "cfg_fish_price"];
    configs.forEach(id => { if(document.getElementById(id)) localStorage.setItem(id, document.getElementById(id).value); });
    
    DISH_DATABASE.forEach((dish, idx) => { if(document.getElementById(`dish_${idx}`)) localStorage.setItem(`dish_${idx}`, document.getElementById(`dish_${idx}`).checked); });
    
    const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба"];
    rawIds.forEach(id => { if(document.getElementById(`stock_${id}`)) localStorage.setItem(`stock_${id}`, document.getElementById(`stock_${id}`).value); });
    
    document.querySelectorAll(".ready-input").forEach(el => { localStorage.setItem(el.id, el.value); });
    alert("💾 Данные переучета успешно сохранены на ПК!");
}

function loadFromLocalStorage() {
    const configs = ["business_logic", "cfg_truck_fridge", "cfg_car_trunk", "cfg_rv_storage", "cfg_rv_cabinet", "cfg_margin_percent", "cfg_fish_price"];
    configs.forEach(id => { if(localStorage.getItem(id) !== null && document.getElementById(id)) document.getElementById(id).value = localStorage.getItem(id); });
    
    switchBusinessLogic();

    DISH_DATABASE.forEach((dish, idx) => { 
        if(document.getElementById(`dish_${idx}`)) {
            const savedValue = localStorage.getItem(`dish_${idx}`);
            if (savedValue !== null) {
                document.getElementById(`dish_${idx}`).checked = (savedValue === 'true'); 
            } else {
                document.getElementById(`dish_${idx}`).checked = false;
            }
        }
    });
    
    const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба"];
    rawIds.forEach(id => { if(localStorage.getItem(`stock_${id}`) !== null && document.getElementById(`stock_${id}`)) document.getElementById(`stock_${id}`).value = localStorage.getItem(`stock_${id}`); });
    
    rebuildReadyStockTable();
}

function resetAllFields() {
    if(confirm("🧹 Полностью обнулить все склады и заготовки в калькуляторе?")) {
        localStorage.clear();
        const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба"];
        rawIds.forEach(id => { if(document.getElementById(`stock_${id}`)) document.getElementById(`stock_${id}`).value = 0; });
        DISH_DATABASE.forEach((dish, idx) => { if(document.getElementById(`dish_${idx}`)) document.getElementById(`dish_${idx}`).checked = false; });
        rebuildReadyStockTable();
    }
} // <--- ВОТ ЭТОЙ СКОБКИ НЕ ХВАТАЛО! ТЕПЕРЬ ВСЁ РАБОТАЕТ

// ==================== ПОКАЗ ПОЛНОЙ ЦЕПОЧКИ ПРИГОТОВЛЕНИЯ ====================
function showFullRecipeChain() {
    const selectedDishes = [];
    DISH_DATABASE.forEach((dish, idx) => {
        if (document.getElementById(`dish_${idx}`) && document.getElementById(`dish_${idx}`).checked) {
            selectedDishes.push(dish);
        }
    });

    if (selectedDishes.length === 0) {
        alert("Выберите хотя бы одно блюдо из меню!");
        return;
    }

    const box = document.getElementById("recipe_chain_box");
    const content = document.getElementById("recipe_chain_content");
    
    let html = "";
    
    selectedDishes.forEach(dish => {
        html += `<div style="background: white; border-left: 4px solid #27ae60; padding: 15px; margin-bottom: 15px; border-radius: 4px;">`;
        html += `<h4 style="margin: 0 0 10px 0; color: #2c3e50;">${dish.name}</h4>`;
        html += `<div style="font-size: 13px; color: #7f8c8d; margin-bottom: 10px;">${dish.craft}</div>`;
        html += `<div style="margin-left: 15px;">`;
        html += `<strong>🧪 Необходимые компоненты:</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
        
        for (let component in dish.recipe) {
            const qty = dish.recipe[component];
            const compName = COMPONENT_NAMES[component] || component;
            html += `<li><strong>${compName}</strong> — ${qty} шт.`;
            html += showComponentChain(component, qty, 1);
            html += `</li>`;
        }
        
        html += `</ul></div>`;
        html += `</div>`;
    });
    
    content.innerHTML = html;
    box.style.display = "block";
    box.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showComponentChain(component, qty, level) {
    let html = "";
    const indent = "  ".repeat(level);
    
    const recipes = {
        "овощи_заг": { "овощи": 1 },
        "вареный_рис": { "рис": 1 },
        "картофельное_пюре": { "овощи": 1, "молоко": 2 },
        "мясной_фарш": { "мясо": 1 },
        "рыбный_фарш": { "рыба": 1 },
        "хлеб": { "мука": 1, "яйцо": 1 },
        "макароны": { "мука": 1, "яйцо": 1 },
        "сыр": { "молоко": 1 },
        "котлета": { "мясо": 1, "масло": 1 },
        "рыбная_котлета": { "рыба": 1, "масло": 1 },
        "стейк_заг": { "мясо": 1, "фрукты": 1, "сахар": 1 },
        "рыба_фрукт_заг": { "рыба": 1, "фрукты": 1, "сахар": 1 },
        "масло": { "молоко": 1 }
    };
    
    const baseIngredients = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба"];
    const subComponents = recipes[component] || {};
    
    if (subComponents && Object.keys(subComponents).length > 0) {
        html += `<ul style="margin: 5px 0; padding-left: 20px; color: #34495e;">`;
        for (let subComp in subComponents) {
            const subQty = subComponents[subComp] * qty;
            const subName = COMPONENT_NAMES[subComp] || subComp;
            
            if (baseIngredients.includes(subComp)) {
                html += `<li>${indent}↳ <strong>${subName}</strong> — ${subQty} шт. <span style="color: #27ae60;">(базовый ингредиент)</span></li>`;
            } else {
                html += `<li>${indent}↳ <strong>${subName}</strong> — ${subQty} шт.`;
                html += showComponentChain(subComp, subQty, level + 1);
                html += `</li>`;
            }
        }
        html += `</ul>`;
    } else {
        const compName = COMPONENT_NAMES[component] || component;
        html += ` <span style="color: #27ae60;">(базовый ингредиент)</span>`;
    }
    
    return html;
}
// ==================== ТЁМНАЯ ТЕМА ====================
function toggleTheme() {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    document.getElementById("theme_btn").innerText = isDark ? "☀️ Светлая тема" : "🌙 Тёмная тема";
}

// Автозагрузка темы при старте
(function() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
        // Кнопка обновится после загрузки страницы
        setTimeout(() => {
            const btn = document.getElementById("theme_btn");
            if (btn) btn.innerText = "☀️ Светлая тема";
        }, 100);
    }
})();
// ==================== ЭКСПОРТ / ИМПОРТ ДАННЫХ ====================
function exportData() {
    const data = {};
    const keys = [
        "business_logic", "cfg_truck_fridge", "cfg_car_trunk", 
        "cfg_rv_storage", "cfg_rv_cabinet", "cfg_margin_percent", "cfg_fish_price"
    ];
    keys.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });

    DISH_DATABASE.forEach((dish, idx) => {
        const el = document.getElementById(`dish_${idx}`);
        if (el) data[`dish_${idx}`] = el.checked;
    });

    const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба"];
    rawIds.forEach(id => {
        const el = document.getElementById(`stock_${id}`);
        if (el) data[`stock_${id}`] = el.value;
    });

    document.querySelectorAll(".ready-input").forEach(el => {
        data[el.id] = el.value;
    });

    const json = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    
    const modal = document.getElementById("sync_modal");
    document.getElementById("sync_modal_title").innerText = "📤 Экспорт данных";
    document.getElementById("sync_modal_content").innerHTML = `
        <p style="color: #7f8c8d; font-size: 14px;">Скопируйте этот код и отправьте себе в Telegram (в "Избранное"):</p>
        <textarea id="export_code" readonly style="width: 100%; height: 150px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 12px; resize: vertical;">${encoded}</textarea>
        <div style="margin-top: 10px; text-align: center;">
            <button onclick="copyExportCode()" style="background: #27ae60; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;"> Скопировать код</button>
        </div>
        <p id="copy_status" style="color: #27ae60; font-size: 13px; margin-top: 10px; display: none;">✅ Скопировано!</p>
    `;
    modal.style.display = "flex";
}

function copyExportCode() {
    const textarea = document.getElementById("export_code");
    textarea.select();
    document.execCommand("copy");
    document.getElementById("copy_status").style.display = "block";
    setTimeout(() => {
        document.getElementById("copy_status").style.display = "none";
    }, 2000);
}

function importData() {
    const modal = document.getElementById("sync_modal");
    document.getElementById("sync_modal_title").innerText = "📥 Импорт данных";
    document.getElementById("sync_modal_content").innerHTML = `
        <p style="color: #7f8c8d; font-size: 14px;">Вставьте код, который вы скопировали на другом устройстве:</p>
        <textarea id="import_code" placeholder="Вставьте код сюда..." style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
        <div style="margin-top: 10px; text-align: center;">
            <button onclick="applyImport()" style="background: #8e44ad; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;">✅ Применить импорт</button>
        </div>
        <p id="import_status" style="font-size: 13px; margin-top: 10px; display: none;"></p>
    `;
    modal.style.display = "flex";
}

function applyImport() {
    const code = document.getElementById("import_code").value.trim();
    const status = document.getElementById("import_status");
    
    if (!code) {
        status.innerText = "❌ Вставьте код!";
        status.style.color = "#e74c3c";
        status.style.display = "block";
        return;
    }

    try {
        const json = decodeURIComponent(escape(atob(code)));
        const data = JSON.parse(json);
        
        // Применяем настройки
        const configs = ["business_logic", "cfg_truck_fridge", "cfg_car_trunk", 
                         "cfg_rv_storage", "cfg_rv_cabinet", "cfg_margin_percent", "cfg_fish_price"];
        configs.forEach(id => {
            if (data[id] !== undefined) {
                localStorage.setItem(id, data[id]);
                const el = document.getElementById(id);
                if (el) el.value = data[id];
            }
        });

        // Применяем блюда
        DISH_DATABASE.forEach((dish, idx) => {
            if (data[`dish_${idx}`] !== undefined) {
                localStorage.setItem(`dish_${idx}`, data[`dish_${idx}`]);
                const el = document.getElementById(`dish_${idx}`);
                if (el) el.checked = data[`dish_${idx}`];
            }
        });

        // Применяем сырьё
        const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба"];
        rawIds.forEach(id => {
            if (data[`stock_${id}`] !== undefined) {
                localStorage.setItem(`stock_${id}`, data[`stock_${id}`]);
                const el = document.getElementById(`stock_${id}`);
                if (el) el.value = data[`stock_${id}`];
            }
        });

        // Применяем заготовки
        for (let key in data) {
            if (key.startsWith("ready_")) {
                localStorage.setItem(key, data[key]);
                const el = document.getElementById(key);
                if (el) el.value = data[key];
            }
        }

        // Обновляем интерфейс
        switchBusinessLogic();
        rebuildReadyStockTable();

        status.innerText = "✅ Данные успешно импортированы! Страница обновлена.";
        status.style.color = "#27ae60";
        status.style.display = "block";
        
        setTimeout(() => {
            closeSyncModal();
        }, 1500);
    } catch (e) {
        status.innerText = "❌ Ошибка: неверный код!";
        status.style.color = "#e74c3c";
        status.style.display = "block";
    }
}

function closeSyncModal() {
    document.getElementById("sync_modal").style.display = "none";
}
