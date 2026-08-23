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
}
