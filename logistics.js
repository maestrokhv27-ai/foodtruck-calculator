// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let lastCalculatedPrices = {};
let lastCalculatedCosts = {};
let currentOrder = {};
let shiftStats = { revenue: 0, profit: 0, orders: 0 };

// ==================== ОСНОВНОЙ РАСЧЁТ ====================
function calculateLogisticsCore() {
    const getVal = (id, def) => {
        const el = document.getElementById(id);
        return el ? (parseFloat(el.value) || def) : def;
    };
    const getEl = (id) => document.getElementById(id);

    const l = getEl("business_logic") ? getEl("business_logic").value : "1";
    const t = getVal("cfg_truck_fridge", 100);
    const c = getVal("cfg_car_trunk", 245);
    const e = getVal("cfg_rv_storage", 260);
    const a = getVal("cfg_rv_cabinet", 300);
    const m = getVal("cfg_margin_percent", 40);
    const o = getVal("cfg_fish_price", 400);

    const fishLabel = getEl("label_fish_price");
    if (fishLabel) fishLabel.innerText = "$" + o;

    let s = [];
    DISH_DATABASE.forEach((dish, idx) => {
        const el = getEl(`dish_${idx}`);
        if (el && el.checked) s.push(dish);
    });

    if (s.length === 0) {
        alert("Выберите хотя бы одно блюдо!");
        return;
    }

    let totalComponentsPerServing = 0;
    s.forEach(dish => {
        for (let k in dish.recipe) totalComponentsPerServing += dish.recipe[k];
    });

    // Лимит транспорта для закупки
    let r = (l === "1") ? t : (l === "4" ? e : c);
    let n = (l === "3" || l === "4") ? e : t;
    let i = Math.floor(n / 0.2);
    let g = Math.floor(i / totalComponentsPerServing);
    let d = Math.floor(t / 0.2);
    let p = Math.floor(d / totalComponentsPerServing);

    const pr = { 
    "овощи": 55, "рис": 45, "мясо": 500, "фрукты": 55, 
    "сахар": 45, "мука": 45, "молоко": 55, "яйцо": 45, "рыба": o,
    "лёд": 45, "пиво": 60, "вино": 350
    };
    
    let rawR = { "овощи": 0, "рис": 0, "мясо": 0, "фрукты": 0, "сахар": 0, "мука": 0, "молоко": 0, "яйцо": 0, "рыба": 0, "лёд": 0, "пиво": 0, "вино": 0 };
    let req = {};
    let trk = {};
    let rev = 0;
    let cog = 0;
    let htmlPrices = "<strong>📋 ЦЕННИКИ ДЛЯ ВИТРИНЫ ФУДТРАКА:</strong><ul style='list-style-type:none;padding-left:0;'>";

    s.forEach(dish => {
        let f = { "овощи": 0, "рис": 0, "мясо": 0, "фрукты": 0, "сахар": 0, "мука": 0, "молоко": 0, "яйцо": 0, "рыба": 0, "масло": 0, "тесто": 0 };
        for (let k in dish.recipe) {
            let q = dish.recipe[k] * g;
            req[k] = (req[k] || 0) + q;
            let qT = dish.recipe[k] * p;
            trk[k] = (trk[k] || 0) + qT;

            if (k === "вареный_рис") f["рис"] += dish.recipe[k];
            if (k === "мясной_фарш") f["мясо"] += dish.recipe[k];
            if (k === "сыр") f["молоко"] += dish.recipe[k];
            if (k === "хлеб" || k === "макароны") f["тесто"] = (f["тесто"] || 0) + dish.recipe[k];
            if (k === "стейк_заг") { f["мясо"] += dish.recipe[k]; f["фрукты"] += dish.recipe[k]; f["сахар"] += dish.recipe[k]; }
            if (k === "рыба_фрукт_заг") { f["рыба"] += dish.recipe[k]; f["фрукты"] += dish.recipe[k]; f["сахар"] += dish.recipe[k]; }
            if (k === "картофельное_пюре") { f["овощи"] += dish.recipe[k]; f["масло"] = (f["масло"] || 0) + dish.recipe[k]; f["молоко"] += dish.recipe[k]; }
            if (k === "котлета") { f["мясо"] += dish.recipe[k]; f["масло"] = (f["масло"] || 0) + dish.recipe[k]; }
            if (k === "рыбная_котлета") { f["рыба"] += dish.recipe[k]; f["масло"] = (f["масло"] || 0) + dish.recipe[k]; }
            if (k === "рыбный_фарш") f["рыба"] += dish.recipe[k];
            if (k === "тесто") { f["мука"] += dish.recipe[k]; f["яйцо"] += dish.recipe[k]; }
            if (k === "карамель") f["сахар"] += dish.recipe[k];
        }
        
        let cp = 0;
        for (let rKey in f) {
            if (f[rKey] === 0) continue;
            if (rKey === "масло") {
                cp += f[rKey] * pr["молоко"]; // Масло делается из молока (55$)
            } else if (rKey === "тесто") {
                cp += f[rKey] * (pr["мука"] + pr["яйцо"]); // Тесто = мука(45) + яйцо(45) = 90$
            } else {
                if (pr[rKey]) cp += f[rKey] * pr[rKey];
            }
        }
        
        let sp = Math.round(cp * (1 + m / 100));
        cog += g * cp;
        rev += g * sp;
        
        const originalIdx = DISH_DATABASE.indexOf(dish);
        lastCalculatedPrices[originalIdx] = sp;
        lastCalculatedCosts[originalIdx] = cp;
        
        htmlPrices += `<li style='margin-bottom:8px;padding:8px;background:#fff;border-radius:4px;border-left:4px solid #2980b9;'>💵 <b>${dish.name}</b>  Цена: <strong style="color:#2980b9;">$${sp}</strong> <small>(себес: $${cp})</small> | Смена: <b>${g} порц.</b></li>`;
    });
    htmlPrices += "</ul>";

    let orig = JSON.parse(JSON.stringify(req));
    for (let k in req) {
        let tQ = getEl(`ready_${k}_трак`) ? parseFloat(getEl(`ready_${k}_трак`).value) || 0 : 0;
        let rQ = getEl(`ready_${k}_авд`) ? parseFloat(getEl(`ready_${k}_авд`).value) || 0 : 0;
        req[k] = Math.max(0, req[k] - ((l === "3" || l === "4") ? (tQ + rQ) : tQ));
    }

    for (let k in req) {
        let qty = req[k];
        if (qty <= 0) continue;
        
        // Базовые заготовки сразу разбиваем на сырьё
        if (k === "вареный_рис") rawR["рис"] += qty;
        if (k === "мясной_фарш") rawR["мясо"] += qty;
        if (k === "рыбный_фарш") rawR["рыба"] += qty;
        if (k === "сыр") rawR["молоко"] += qty;
        
        // Хлеб и макароны делаем из муки и яиц (тесто НЕ закупаем!)
        if (k === "хлеб" || k === "макароны") {
            rawR["мука"] = (rawR["мука"] || 0) + qty;
            rawR["яйцо"] = (rawR["яйцо"] || 0) + qty;
        }
        
        // Стейк и рыба с соусом
        if (k === "стейк_заг") { rawR["мясо"] += qty; rawR["фрукты"] += qty; rawR["сахар"] += qty; }
        if (k === "рыба_фрукт_заг") { rawR["рыба"] += qty; rawR["фрукты"] += qty; rawR["сахар"] += qty; }
        
        // Пюре и котлеты требуют масло, а масло мы делаем из молока!
        if (k === "картофельное_пюре") {
            rawR["овощи"] += qty;
            rawR["молоко"] += qty * 2; // 1 молоко для пюре + 1 молоко вместо масла
        }
        if (k === "котлета") {
            rawR["мясо"] += qty;
            rawR["молоко"] += qty; // вместо масла
        }
        if (k === "рыбная_котлета") {
            rawR["рыба"] += qty;
            rawR["молоко"] += qty; // вместо масла
        }
        
        // Карамель и мороженое
        if (k === "карамель") rawR["сахар"] += qty;
        if (k === "мороженое") {
            rawR["молоко"] += qty * 2;
            rawR["сахар"] += qty;
            rawR["яйцо"] += qty;
        }
        
        // Новое сырьё (если вдруг запросилось напрямую)
        if (k === "лёд") rawR["лёд"] += qty;
        if (k === "пиво") rawR["пиво"] += qty;
        if (k === "вино") rawR["вино"] += qty;
    }

    let w = 0, bc = 0, fc = 0, htmlShop = "<ul>", hasDef = false;
    for (let k in rawR) {
        const stockEl = getEl(`stock_${k}`);
        let st = stockEl ? (parseFloat(stockEl.value) || 0) : 0;
        let df = Math.max(0, rawR[k] - st);
        if (df > 0) {
            hasDef = true;
            if (k === "мясо" || k === "рыба") {
                let pcs = Math.ceil(df);
                if (k === "мясо") bc += pcs * pr[k]; else fc += pcs * pr[k];
                w += pcs * 0.1;
                htmlShop += `<li><strong>${k.toUpperCase()}:</strong> ${pcs} шт. — $${(pcs * pr[k]).toLocaleString()}</li>`;
            } else {
                let bx = Math.ceil(df / 10);
                bc += bx * 10 * pr[k];
                w += bx * 2.0;
                htmlShop += `<li><strong>${k.toUpperCase()}:</strong> ${bx} кор. (${bx * 10} порц.) — $${(bx * 10 * pr[k]).toLocaleString()}</li>`;
            }
        }
    }
    htmlShop += "</ul>";

    const errorBox = getEl("error_box");
    const resultBox = getEl("result_box");
    const noCalcMsg = getEl("no_calc_msg");

    if (errorBox) errorBox.style.display = "none";
    if (resultBox) resultBox.style.display = "block";
    if (noCalcMsg) noCalcMsg.style.display = "none";

    let inf = `<p>Выбранных позиций: <strong>${s.length}</strong>. На позицию: <strong>${g} порц.</strong> (заготовок на порцию: ${totalComponentsPerServing})</p>`;
    inf += `<p>🏪 Бюджет на оптовую базу: <b>$${bc.toLocaleString()}</b> | 🎣 Наличка на скупку рыбы: <b style="color:#e67e22;">$${fc.toLocaleString()}</b></p>`;
    inf += `<p><strong>🔥 ОБЩИЙ РАСХОД:</strong> <span style="color:#2980b9;font-weight:bold;">$${(bc + fc).toLocaleString()}</span></p>${hasDef ? htmlShop : "<p>✅ ЗАПАСОВ СЫРЬЯ ХВАТАЕТ!</p>"}`;
    
    const shoppingList = getEl("res_shopping_list");
    if (shoppingList) shoppingList.innerHTML = inf;

    let trips = Math.ceil(w / r);
    let tHtml = `<p>️ Вес сырья для закупки: <strong>${w.toFixed(1)} кг</strong> (Лимит транспорта: ${r} кг).</p>`;
    
    if (l === "1" && w > r) {
        if (errorBox) {
            errorBox.style.display = "block";
            errorBox.innerHTML = "⚠️ ПЕРЕГРУЗ! Вес закупки превышает лимит.";
        }
        if (resultBox) resultBox.style.display = "none";
        return;
    } else if (w > r) {
        tHtml += `<p style="color:#c0392b;font-weight:bold;">⚠️ Потребуется: ${trips} рейса(ов).</p>`;
    } else if (w > 0) {
        tHtml += `<p style="color:#27ae60;font-weight:bold;">✅ Доставится за 1 рейс!</p>`;
    }
    
    const transportPlan = getEl("res_transport_plan");
    if (transportPlan) transportPlan.innerHTML = tHtml;
    
    const walkStats = getEl("walk_stats");
    if (walkStats) {
        walkStats.innerHTML = (w > 0 && l === "2") ? `<p>🏃 Перетаскивание: <strong>${Math.ceil(w / 10)} ходок</strong> (по ~10 кг).</p>` : `<p>✅ Разгрузка не требуется.</p>`;
    }

    let lHtml = `<p><small>*Переложите из хранилища в холодильник фудтрака:</small></p>`;
    let totalPrepWeight = 0;
    let prepItems = [];
    
    for (let k in trk) {
        let cN = COMPONENT_NAMES[k] || k;
        let qT = trk[k];
        let tQ = orig[k] || qT;
        let rvR = (l === "3" || l === "4") ? Math.max(0, tQ - qT) : 0;
        let itemWeight = qT * 0.2;
        totalPrepWeight += itemWeight;
        let storageLabel = (l === "3" || l === "4") ? `| 🏠 в резерв Кемпера: <span style="color:#e67e22;">${Math.round(rvR)} шт.</span>` : '';
        prepItems.push(`<li><b>${cN}:</b> 🚚 в Фудтрак: <strong style="color:#27ae60;">${qT} шт.</strong> (${itemWeight.toFixed(1)} кг) ${storageLabel}</li>`);
    }
    
    let truckLimit = t;
    let tripsToTruck = Math.ceil(totalPrepWeight / truckLimit);
    
    lHtml += `<p style="background: #e8f4f8; padding: 10px; border-radius: 4px; margin: 10px 0;"><strong>⚖️ Общий вес заготовок: ${totalPrepWeight.toFixed(1)} кг</strong> (Лимит: ${truckLimit} кг)`;
    if (totalPrepWeight > truckLimit) {
        lHtml += `<br><span style="color: #e67e22;">⚠️ Потребуется ${tripsToTruck} рейса(ов)</span>`;
    } else {
        lHtml += `<br><span style="color: #27ae60;">✅ Вмещается за 1 рейс</span>`;
    }
    lHtml += `</p><ul>${prepItems.join('')}</ul>`;
    
    const truckLoading = getEl("res_truck_loading");
    if (truckLoading) truckLoading.innerHTML = lHtml;

    let prof = rev - cog;
    let eHtml = `${htmlPrices}<hr><p>Себес: <strong>$${cog.toLocaleString()}</strong> | Выручка: <strong>$${rev.toLocaleString()}</strong></p><p style="font-size:16px;">💰 <b>Прибыль:</b> <span style="color:#27ae60;font-weight:bold;">$${prof.toLocaleString()}</span></p>`;
    const economyBlock = getEl("res_economy_block");
    if (economyBlock) economyBlock.innerHTML = eHtml;

    if (typeof initPOS === 'function') initPOS();
    
    setTimeout(() => {
        document.querySelectorAll('.tab-content').forEach(tab => { tab.classList.remove('active'); tab.style.display = 'none'; });
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const procurementTab = document.getElementById('tab-procurement');
        if (procurementTab) {
            procurementTab.style.display = 'block';
            setTimeout(() => procurementTab.classList.add('active'), 10);
        }
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.innerText.includes('Закупка')) btn.classList.add('active');
        });
    }, 100);
}

// ==================== ЦЕПОЧКА ПРИГОТОВЛЕНИЯ ====================
function showFullRecipeChain() {
    console.log("showFullRecipeChain вызвана");
    const selectedDishes = [];
    DISH_DATABASE.forEach((dish, idx) => {
        const el = document.getElementById(`dish_${idx}`);
        if (el && el.checked) selectedDishes.push(dish);
    });

    if (selectedDishes.length === 0) {
        alert("Выберите хотя бы одно блюдо!");
        return;
    }

    const box = document.getElementById("recipe_chain_box");
    const content = document.getElementById("recipe_chain_content");
    if (!box || !content) {
        console.error("Блоки рецептов не найдены!");
        return;
    }
    
    let html = "";
    selectedDishes.forEach((dish) => {
        html += `<div class="recipe-card">`;
        html += `<h4>${dish.name}</h4>`;
        html += `<div style="font-size: 13px; color: #7f8c8d; margin-bottom: 15px; font-style: italic;">${dish.craft}</div>`;
        html += `<div style="margin-left: 10px;">`;
        html += `<strong style="color: #27ae60;">🧪 Компоненты:</strong>`;
        html += `<ol style="margin: 10px 0; padding-left: 25px; line-height: 1.8;">`;
        
        for (let component in dish.recipe) {
            const qty = dish.recipe[component];
            const compName = COMPONENT_NAMES[component] || component;
            html += `<li style="margin-bottom: 8px;"><strong>${compName}</strong> — ${qty} шт.`;
            html += showComponentChain(component, qty, 1);
            html += `</li>`;
        }
        html += `</ol></div></div>`;
    });
    
    content.innerHTML = html;
    box.style.display = "block";
    const noRecipeMsg = document.getElementById("no_recipe_msg");
    if (noRecipeMsg) noRecipeMsg.style.display = "none";
    box.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showComponentChain(component, qty, level) {
    let html = "";
    const recipes = {
        "вареный_рис": { "рис": 1, "вода": 1, "инструменты": ["огонь"] },
        "картофельное_пюре": { "овощи": 1, "масло": 1, "молоко": 1, "инструменты": ["венчик", "огонь"] },
        "мясной_фарш": { "мясо": 1, "инструменты": ["нож"] },
        "рыбный_фарш": { "рыба": 1, "инструменты": ["нож"] },
        "тесто": { "мука": 1, "вода": 1, "яйцо": 1, "инструменты": ["венчик"] },
        "хлеб": { "тесто": 1, "инструменты": ["огонь"] },
        "макароны": { "тесто": 1, "вода": 1, "инструменты": ["нож", "огонь"] },
        "сыр": { "молоко": 1, "инструменты": ["венчик", "огонь"] },
        "котлета": { "мясо": 1, "масло": 1, "инструменты": ["огонь"] },
        "рыбная_котлета": { "рыба": 1, "масло": 1, "инструменты": ["огонь"] },
        "стейк_заг": { "мясо": 1, "фрукты": 1, "сахар": 1, "инструменты": ["огонь"] },
        "рыба_фрукт_заг": { "рыба": 1, "фрукты": 1, "сахар": 1, "инструменты": ["огонь"] },
        "масло": { "молоко": 1, "инструменты": ["венчик"] },
        "карамель": { "сахар": 1, "инструменты": ["огонь"] },
        "мороженое": { "молоко": 2, "сахар": 1, "яйцо": 1, "инструменты": ["венчик"] }
    };
    
    const baseIngredients = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба", "вода"];
    const subComponents = recipes[component] || {};
    
    if (Object.keys(subComponents).length > 0) {
        html += `<ol style="margin: 5px 0 5px 20px; padding-left: 20px; line-height: 1.7;">`;
        for (let subComp in subComponents) {
            if (subComp === "инструменты") continue;
            const subQty = subComponents[subComp] * qty;
            const subName = COMPONENT_NAMES[subComp] || subComp;
            
            if (baseIngredients.includes(subComp)) {
                html += `<li><strong>${subName}</strong> — ${subQty} шт. <span style="color: #27ae60;">(базовый)</span></li>`;
            } else {
                html += `<li><strong>${subName}</strong> — ${subQty} шт.`;
                html += showComponentChain(subComp, subQty, level + 1);
                html += `</li>`;
            }
        }
        
        if (subComponents.инструменты) {
            const toolIcons = { "нож": "🔪", "венчик": "", "огонь": "🔥" };
            const toolsHtml = subComponents.инструменты.map(t => {
                const icon = toolIcons[t.toLowerCase()] || '🔧';
                return `<span style="display: inline-flex; align-items: center; margin: 2px 5px; padding: 3px 8px; background: #fff3cd; border-radius: 4px; font-size: 14px;">${icon} ${t}</span>`;
            }).join(' ');
            html += `<li style="margin-top: 5px; color: #555;">Инструменты: ${toolsHtml}</li>`;
        }
        html += `</ol>`;
    }
    return html;
}

// ==================== POS-ТЕРМИНАЛ ====================
function initPOS() {
    const savedShift = localStorage.getItem("shift_stats");
    if (savedShift) shiftStats = JSON.parse(savedShift);
    updateShiftDisplay();

    const grid = document.getElementById("pos_menu_grid");
    if (!grid) return;
    grid.innerHTML = "";

    const selectedDishes = [];
    DISH_DATABASE.forEach((dish, idx) => {
        const el = document.getElementById(`dish_${idx}`);
        if (el && el.checked) selectedDishes.push({ dish, idx });
    });

    if (selectedDishes.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color: #7f8c8d; text-align: center;">Выберите блюда во вкладке "Настройки"</p>';
        return;
    }

    selectedDishes.forEach(({ dish, idx }) => {
        const price = lastCalculatedPrices[idx] || dish.price;
        const btn = document.createElement("div");
        btn.className = "pos-item";
        btn.innerHTML = `
            <div style="font-size: 13px; font-weight: bold; text-align: center; line-height: 1.2;">${dish.name}</div>
            <div style="font-size: 12px; color: #27ae60; font-weight: bold;">$${price}</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <button onclick="addToOrder(${idx}, -1)" style="background: #e74c3c; color: white; border: none; width: 28px; height: 28px; border-radius: 50%; font-weight: bold; cursor: pointer; font-size: 16px;">-</button>
                <span id="pos_qty_${idx}" style="font-weight: bold; font-size: 16px; min-width: 20px; text-align: center;">${currentOrder[idx] || 0}</span>
                <button onclick="addToOrder(${idx}, 1)" style="background: #27ae60; color: white; border: none; width: 28px; height: 28px; border-radius: 50%; font-weight: bold; cursor: pointer; font-size: 16px;">+</button>
            </div>
        `;
        grid.appendChild(btn);
    });
    
    renderActiveOrder();
}

function addToOrder(idx, change) {
    if (!currentOrder[idx]) currentOrder[idx] = 0;
    currentOrder[idx] += change;
    if (currentOrder[idx] <= 0) delete currentOrder[idx];
    const qtyEl = document.getElementById(`pos_qty_${idx}`);
    if (qtyEl) qtyEl.innerText = currentOrder[idx] || 0;
    renderActiveOrder();
}

function renderActiveOrder() {
    const block = document.getElementById("pos_active_order_block");
    const itemsDiv = document.getElementById("pos_current_items");
    const ticketDiv = document.getElementById("pos_kitchen_ticket");
    const totalEl = document.getElementById("pos_current_total");
    
    const indices = Object.keys(currentOrder);
    if (indices.length === 0) {
        if (block) block.style.display = "none";
        return;
    }
    
    if (block) block.style.display = "block";
    let itemsHtml = "";
    let currentTotal = 0;

    indices.forEach(idxStr => {
        const idx = parseInt(idxStr);
        const qty = currentOrder[idx];
        const dish = DISH_DATABASE[idx];
        const price = lastCalculatedPrices[idx] || dish.price;
        itemsHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>${dish.name} x${qty}</span><strong>$${(price * qty).toLocaleString()}</strong></div>`;
        currentTotal += price * qty;
    });

    if (itemsDiv) itemsDiv.innerHTML = itemsHtml;
    if (totalEl) totalEl.innerText = "$" + currentTotal.toLocaleString();

    // ЧЕК КУХНИ
    let ticketHtml = '<div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #f39c12; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);">';
    ticketHtml += '<div style="font-size: 20px; font-weight: bold; color: #d35400; margin-bottom: 15px; text-align: center;">🍳 ЧЕК КУХНИ</div>';
    
    indices.forEach(idxStr => {
        const idx = parseInt(idxStr);
        const qty = currentOrder[idx];
        const dish = DISH_DATABASE[idx];
        
        ticketHtml += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: white; border-radius: 6px; border-left: 4px solid #e67e22;">`;
        ticketHtml += `<div style="font-size: 18px; font-weight: bold; color: #2c3e50;">${dish.name}</div>`;
        ticketHtml += `<div style="font-size: 24px; font-weight: bold; color: #e67e22; background: #fff3cd; padding: 5px 15px; border-radius: 20px; min-width: 40px; text-align: center;">x${qty}</div>`;
        ticketHtml += `</div>`;
    });
    
    ticketHtml += '</div>';

    // РЕЦЕПТЫ ТОЛЬКО ДЛЯ БЛЮД ИЗ ЧЕКА
    ticketHtml += '<div style="background: #f8f9fa; border: 2px solid #8e44ad; border-radius: 8px; padding: 15px;">';
    ticketHtml += '<div style="font-size: 18px; font-weight: bold; color: #8e44ad; margin-bottom: 15px; text-align: center;">📖 Рецепты для этого заказа</div>';
    
    indices.forEach(idxStr => {
        const idx = parseInt(idxStr);
        const dish = DISH_DATABASE[idx];
        
        ticketHtml += `<div style="background: white; border-top: 4px solid #27ae60; border: 1px solid #e0e0e0; padding: 12px; margin-bottom: 12px; border-radius: 4px;">`;
        ticketHtml += `<h4 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 16px;">${dish.name}</h4>`;
        ticketHtml += `<div style="font-size: 12px; color: #7f8c8d; margin-bottom: 10px; font-style: italic;">${dish.craft}</div>`;
        ticketHtml += `<div style="margin-left: 10px;">`;
        ticketHtml += `<strong style="color: #27ae60; font-size: 13px;">🧪 Компоненты:</strong>`;
        ticketHtml += `<ol style="margin: 8px 0; padding-left: 20px; line-height: 1.6; font-size: 14px;">`;
        
        for (let component in dish.recipe) {
            const qty = dish.recipe[component];
            const compName = COMPONENT_NAMES[component] || component;
            ticketHtml += `<li style="margin-bottom: 6px;"><strong>${compName}</strong> — ${qty} шт.`;
            ticketHtml += showComponentChain(component, qty, 1);
            ticketHtml += `</li>`;
        }
        ticketHtml += `</ol></div></div>`;
    });
    
    ticketHtml += '</div>';
    
    if (ticketDiv) ticketDiv.innerHTML = ticketHtml;
}

function completeCurrentOrder() {
    const indices = Object.keys(currentOrder);
    if (indices.length === 0) return;

    let orderRevenue = 0;
    let orderCost = 0;

    indices.forEach(idxStr => {
        const idx = parseInt(idxStr);
        const qty = currentOrder[idx];
        const price = lastCalculatedPrices[idx] || DISH_DATABASE[idx].price;
        const cost = lastCalculatedCosts[idx] || 0;
        orderRevenue += price * qty;
        orderCost += cost * qty;
    });

    shiftStats.revenue += orderRevenue;
    shiftStats.profit += (orderRevenue - orderCost);
    shiftStats.orders += 1;
    
    localStorage.setItem("shift_stats", JSON.stringify(shiftStats));
    updateShiftDisplay();
    updateShiftReport();

    currentOrder = {};
    DISH_DATABASE.forEach((dish, idx) => {
        const qtyEl = document.getElementById(`pos_qty_${idx}`);
        if (qtyEl) qtyEl.innerText = "0";
    });
    
    renderActiveOrder();
}

function updateShiftDisplay() {
    const revEl = document.getElementById("pos_shift_revenue");
    const profEl = document.getElementById("pos_shift_profit");
    const ordEl = document.getElementById("pos_shift_orders");
    if (revEl) revEl.innerText = "$" + shiftStats.revenue.toLocaleString();
    if (profEl) profEl.innerText = "$" + shiftStats.profit.toLocaleString();
    if (ordEl) ordEl.innerText = shiftStats.orders;
}

function updateShiftReport() {
    const reportContent = document.getElementById("shift_report_content");
    if (!reportContent) return;
    let html = `<div style="margin-bottom: 15px;"><div style="font-size: 14px; opacity: 0.9;">📅 Смена активна</div></div>`;
    html += `<div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px; margin-bottom: 15px;">`;
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Заказов:</span><strong>${shiftStats.orders}</strong></div>`;
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Выручка:</span><strong>$${shiftStats.revenue.toLocaleString()}</strong></div>`;
    html += `<hr style="border-color: rgba(255,255,255,0.3); margin: 10px 0;">`;
    html += `<div style="display: flex; justify-content: space-between; font-size: 20px;"><span> Прибыль:</span><strong>$${shiftStats.profit.toLocaleString()}</strong></div></div>`;
    reportContent.innerHTML = html;
}

function resetShiftData() {
    if (!confirm("️ Завершить смену и обнулить кассу?")) return;
    shiftStats = { revenue: 0, profit: 0, orders: 0 };
    currentOrder = {};
    localStorage.setItem("shift_stats", JSON.stringify(shiftStats));
    updateShiftDisplay();
    initPOS();
    const reportContent = document.getElementById("shift_report_content");
    if (reportContent) reportContent.innerHTML = '<p style="text-align: center; opacity: 0.8;">Проведите заказы в кассе.</p>';
}

function exportShiftReport() {
    if (shiftStats.orders === 0) {
        alert("Нет данных о заказах!");
        return;
    }
    const date = new Date().toLocaleString("ru-RU");
    let text = `📊 ОТЧЁТ ПО СМЕНЕ\n📅 Дата: ${date}\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Заказов: ${shiftStats.orders}\nВыручка: $${shiftStats.revenue.toLocaleString()}\n`;
    text += `💰 ПРИБЫЛЬ: $${shiftStats.profit.toLocaleString()}\n━━━━━━━━━━━━━━━━━━━━\n`;
    
    const modal = document.getElementById("sync_modal");
    const title = document.getElementById("sync_modal_title");
    const content = document.getElementById("sync_modal_content");
    if (modal && title && content) {
        title.innerText = "📤 Отчёт по смене";
        content.innerHTML = `
            <textarea id="export_code" readonly style="width: 100%; height: 200px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 13px; resize: vertical;">${text}</textarea>
            <div style="margin-top: 10px; text-align: center;">
                <button onclick="copyExportCode()" style="background: #27ae60; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;">📋 Скопировать</button>
            </div>
            <p id="copy_status" style="color: #27ae60; font-size: 13px; margin-top: 10px; display: none;">✅ Скопировано!</p>
        `;
        modal.style.display = "flex";
    }
}
// ==================== УЧЁТ ОСТАТКОВ В РЕАЛЬНОМ ВРЕМЕНИ ====================

// Структура: { truck: {...}, rv_storage: {...}, rv_cabinet: {...} }
function getStockData() {
    const saved = localStorage.getItem("stock_data");
    if (saved) return JSON.parse(saved);
    return { truck: {}, rv_storage: {}, rv_cabinet: {} };
}

function saveStockData(data) {
    localStorage.setItem("stock_data", JSON.stringify(data));
}

// Инициализация остатков из вкладки "Склад"
// Инициализация остатков из вкладки "Склад"
// Инициализация остатков из вкладки "Склад"
function initStockFromInventory() {
    const logic = document.getElementById("business_logic").value;
    const stock = getStockData();
    
    // Очищаем все остатки перед загрузкой
    stock.truck = {};
    stock.rv_storage = {};
    stock.rv_cabinet = {};
    
    // Список базового сырья (НЕ заготовки!)
    const rawIds = ["овощи", "рис", "мясо", "фрукты", "сахар", "мука", "молоко", "яйцо", "рыба", "лёд", "пиво", "вино"];
    
    // Список заготовок (готовые компоненты)
    const prepIds = ["вареный_рис", "картофельное_пюре", "мясной_фарш", "рыбный_фарш", "хлеб", "макароны", "сыр", "котлета", "рыбная_котлета", "стейк_заг", "рыба_фрукт_заг", "масло", "тесто", "карамель", "мороженое"];
    
    // 1. Распределяем СЫРЬЁ
    rawIds.forEach(id => {
        const el = document.getElementById(`stock_${id}`);
        if (!el) return;
        const val = parseInt(el.value) || 0;
        
        if (logic === "1") {
            // Режим 1: Только фудтрак → сырьё в фудтраке
            stock.truck[id] = val;
        } else if (logic === "2") {
            // Режим 2: Фудтрак + Легковое авто → сырьё в багажнике авто
            stock.rv_storage[id] = val;
        } else if (logic === "3" || logic === "4") {
            // Режим 3 и 4: С автодомом → сырьё в автодоме (шкаф + багажник)
            stock.rv_storage[id] = Math.floor(val / 2);
            stock.rv_cabinet[id] = val - Math.floor(val / 2);
        }
    });
    
    // 2. Распределяем ЗАГОТОВКИ из таблицы
    document.querySelectorAll(".ready-input").forEach(el => {
        const val = parseInt(el.value) || 0;
        if (val === 0) return;
        
        // Извлекаем ID компонента
        let id = el.id.replace("ready_", "");
        if (id.endsWith("_трак")) {
            id = id.replace("_трак", "");
            if (prepIds.includes(id)) {
                stock.truck[id] = (stock.truck[id] || 0) + val;
            }
        } else if (id.endsWith("_авд")) {
            id = id.replace("_авд", "");
            if (prepIds.includes(id)) {
                stock.rv_storage[id] = (stock.rv_storage[id] || 0) + val;
            }
        }
    });
    
    saveStockData(stock);
    showCurrentStock();
    updatePOSAvailability();
    return stock;
}

// Уменьшить остатки при продаже
function consumeStock(order) {
    const stock = getStockData();
    const warnings = [];
    const critical = [];
    
    for (let idxStr in order) {
        const idx = parseInt(idxStr);
        const qty = order[idxStr];
        const dish = DISH_DATABASE[idx];
        
        for (let comp in dish.recipe) {
            const needed = dish.recipe[comp] * qty;
            if (!stock.truck[comp]) stock.truck[comp] = 0;
            stock.truck[comp] -= needed;
            
            if (stock.truck[comp] < 0) stock.truck[comp] = 0;
            
            if (stock.truck[comp] === 0) {
                critical.push(comp);
            } else if (stock.truck[comp] <= 5) {
                warnings.push(comp);
            }
        }
    }
    
    saveStockData(stock);
    return { warnings: [...new Set(warnings)], critical: [...new Set(critical)] };
}

// Проверить доступность блюда
function isDishAvailable(dish) {
    const stock = getStockData();
    for (let comp in dish.recipe) {
        const needed = dish.recipe[comp];
        if (!stock.truck[comp] || stock.truck[comp] < needed) return false;
    }
    return true;
}

// Показать уведомления об остатках
function showStockNotifications(result) {
    if (result.warnings.length === 0 && result.critical.length === 0) return;
    
    let html = '<div style="background: #fff3cd; border-left: 4px solid #f39c12; padding: 12px; border-radius: 6px; margin-top: 15px;">';
    html += '<strong style="color: #d35400;">️ Внимание к остаткам:</strong><ul style="margin: 8px 0 0 20px; padding: 0;">';
    
    result.critical.forEach(comp => {
        const name = COMPONENT_NAMES[comp] || comp;
        html += `<li style="color: #e74c3c; font-weight: bold;"> ${name} закончился! Блюда с ним недоступны.</li>`;
    });
    
    result.warnings.forEach(comp => {
        const name = COMPONENT_NAMES[comp] || comp;
        const stock = getStockData();
        html += `<li style="color: #e67e22;">⚠️ ${name}: осталось ${stock.truck[comp]} шт. Догрузите или приготовьте.</li>`;
    });
    
    html += '</ul></div>';
    
    const posBlock = document.getElementById("cash_register_block");
    if (posBlock) {
        const existing = posBlock.querySelector(".stock-notifications");
        if (existing) existing.remove();
        const div = document.createElement("div");
        div.className = "stock-notifications";
        div.innerHTML = html;
        posBlock.appendChild(div);
    }
}

// Обновить POS-кнопки (заблокировать недоступные)
function updatePOSAvailability() {
    const stock = getStockData();
    DISH_DATABASE.forEach((dish, idx) => {
        const qtyEl = document.getElementById(`pos_qty_${idx}`);
        const parentBtn = qtyEl ? qtyEl.closest('.pos-item') : null;
        if (!parentBtn) return;
        
        const available = isDishAvailable(dish);
        if (!available) {
            parentBtn.style.opacity = "0.4";
            parentBtn.style.pointerEvents = "none";
            parentBtn.title = "Недостаточно компонентов";
        } else {
            parentBtn.style.opacity = "1";
            parentBtn.style.pointerEvents = "auto";
            parentBtn.title = "";
        }
    });
}

// Догрузить из хранилища
function restockFromStorage(component, qty, from) {
    const stock = getStockData();
    const source = from === "storage" ? "rv_storage" : "rv_cabinet";
    
    if (!stock[source][component] || stock[source][component] < qty) {
        alert(`❌ В хранилище недостаточно ${component}! Осталось: ${stock[source][component] || 0}`);
        return false;
    }
    
    stock[source][component] -= qty;
    if (!stock.truck[component]) stock.truck[component] = 0;
    stock.truck[component] += qty;
    
    saveStockData(stock);
    updatePOSAvailability();
    showCurrentStock();
    return true;
}

// Приготовить заготовки
function prepareComponent(component, qty) {
    const stock = getStockData();
    const recipes = {
        "овощи": { "овощи": 1 },
        "вареный_рис": { "рис": 1 },
        "картофельное_пюре": { "овощи": 1, "молоко": 1, "масло": 1 },
        "мясной_фарш": { "мясо": 1 },
        "рыбный_фарш": { "рыба": 1 },
        "хлеб": { "мука": 1, "яйцо": 1 },
        "макароны": { "мука": 1, "яйцо": 1 },
        "сыр": { "молоко": 1 },
        "котлета": { "мясо": 1, "масло": 1 },
        "рыбная_котлета": { "рыба": 1, "масло": 1 },
        "стейк_заг": { "мясо": 1, "фрукты": 1, "сахар": 1 },
        "рыба_фрукт_заг": { "рыба": 1, "фрукты": 1, "сахар": 1 },
        "масло": { "молоко": 1 },
        "тесто": { "мука": 1, "яйцо": 1 },
        "карамель": { "сахар": 1 }
    };
    
    const recipe = recipes[component];
    if (!recipe) {
        alert("Этот компонент нельзя приготовить!");
        return false;
    }
    
    // Проверяем наличие сырья
    for (let raw in recipe) {
        const needed = recipe[raw] * qty;
        const available = (stock.truck[raw] || 0) + (stock.rv_cabinet[raw] || 0) + (stock.rv_storage[raw] || 0);
        if (available < needed) {
            alert(`❌ Недостаточно сырья: ${COMPONENT_NAMES[raw] || raw}! Нужно: ${needed}, есть: ${available}`);
            return false;
        }
    }
    
    // Расходуем сырьё (сначала из truck, потом из cabinet, потом storage)
    for (let raw in recipe) {
        let needed = recipe[raw] * qty;
        const sources = ["truck", "rv_cabinet", "rv_storage"];
        for (let src of sources) {
            if (needed <= 0) break;
            const available = stock[src][raw] || 0;
            const take = Math.min(available, needed);
            stock[src][raw] -= take;
            needed -= take;
        }
    }
    
    // Добавляем готовое в truck
    if (!stock.truck[component]) stock.truck[component] = 0;
    stock.truck[component] += qty;
    
    saveStockData(stock);
    updatePOSAvailability();
    showCurrentStock();
    return true;
}

// Показать текущие остатки в фудтраке
function showCurrentStock() {
    const stock = getStockData();
    const container = document.getElementById("current_stock_display");
    if (!container) return;
    
    let html = '<div style="background: #e8f4f8; border-left: 4px solid #2980b9; padding: 12px; border-radius: 6px; margin-bottom: 15px;">';
    html += '<strong style="color: #2c3e50;">📦 Остатки в фудтраке:</strong>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 10px;">';
    
    for (let comp in stock.truck) {
        const name = COMPONENT_NAMES[comp] || comp;
        const qty = stock.truck[comp];
        let color = "#27ae60";
        if (qty <= 5) color = "#e67e22";
        if (qty === 0) color = "#e74c3c";
        
        html += `<div style="background: white; padding: 6px 10px; border-radius: 4px; font-size: 13px;">`;
        html += `<span style="color: ${color}; font-weight: bold;">${qty}</span> ${name}`;
        html += `</div>`;
    }
    
    html += '</div></div>';
    container.innerHTML = html;
}

// Модальное окно догрузки
function openRestockModal() {
    const stock = getStockData();
    const logic = document.getElementById("business_logic").value;
    
    let html = '<div style="max-height: 60vh; overflow-y: auto;">';
    html += '<p style="color: #7f8c8d; font-size: 14px;">Выберите компоненты для догрузки в фудтрак:</p>';
    
    const sources = [];
    if (logic === "2" || logic === "3" || logic === "4") sources.push({ key: "rv_storage", name: "Багажник автодома" });
    if (logic === "3" || logic === "4") sources.push({ key: "rv_cabinet", name: "Шкаф автодома" });
    
    if (sources.length === 0) {
        html += '<p style="color: #e74c3c;">Нет хранилищ для догрузки (режим "Только фудтрак").</p>';
    } else {
        sources.forEach(src => {
            const items = Object.keys(stock[src]).filter(k => stock[src][k] > 0);
            if (items.length === 0) return;
            
            html += `<h4 style="margin: 15px 0 8px 0; color: #2c3e50;">${src.name}:</h4>`;
            items.forEach(comp => {
                const name = COMPONENT_NAMES[comp] || comp;
                html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px;">`;
                html += `<span>${name} (${stock[src][comp]} шт.)</span>`;
                html += `<div style="display: flex; gap: 5px;">`;
                html += `<input type="number" id="restock_${src.key}_${comp}" value="10" min="1" max="${stock[src][comp]}" style="width: 60px; padding: 4px;">`;
                html += `<button onclick="doRestock('${comp}', '${src.key}')" style="background: #27ae60; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">+</button>`;
                html += `</div></div>`;
            });
        });
    }
    
    html += '</div>';
    
    const modal = document.getElementById("sync_modal");
    document.getElementById("sync_modal_title").innerText = "🔄 Догрузить в фудтрак";
    document.getElementById("sync_modal_content").innerHTML = html;
    modal.style.display = "flex";
}

function doRestock(comp, sourceKey) {
    const input = document.getElementById(`restock_${sourceKey}_${comp}`);
    const qty = parseInt(input.value) || 0;
    if (qty <= 0) return;
    
    if (restockFromStorage(comp, qty, sourceKey)) {
        const name = COMPONENT_NAMES[comp] || comp;
        alert(`✅ Догружено: ${name} x${qty}`);
        openRestockModal(); // Обновить модалку
    }
}

// Модальное окно приготовления
function openPrepareModal() {
    const stock = getStockData();
    const prepareList = ["овощи", "вареный_рис", "картофельное_пюре", "мясной_фарш", "рыбный_фарш", "хлеб", "макароны", "сыр", "котлета", "рыбная_котлета", "стейк_заг", "рыба_фрукт_заг", "масло", "тесто", "карамель"];
    
    let html = '<div style="max-height: 60vh; overflow-y: auto;">';
    html += '<p style="color: #7f8c8d; font-size: 14px;">Выберите что приготовить (сырьё берётся из фудтрака/шкафа):</p>';
    
    prepareList.forEach(comp => {
        const name = COMPONENT_NAMES[comp] || comp;
        html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px;">`;
        html += `<span>${name} (сейчас: ${stock.truck[comp] || 0})</span>`;
        html += `<div style="display: flex; gap: 5px;">`;
        html += `<input type="number" id="prepare_${comp}" value="10" min="1" style="width: 60px; padding: 4px;">`;
        html += `<button onclick="doPrepare('${comp}')" style="background: #8e44ad; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">👨‍🍳</button>`;
        html += `</div></div>`;
    });
    
    html += '</div>';
    
    const modal = document.getElementById("sync_modal");
    document.getElementById("sync_modal_title").innerText = "👨‍🍳 Приготовить заготовки";
    document.getElementById("sync_modal_content").innerHTML = html;
    modal.style.display = "flex";
}

function doPrepare(comp) {
    const input = document.getElementById(`prepare_${comp}`);
    const qty = parseInt(input.value) || 0;
    if (qty <= 0) return;
    
    if (prepareComponent(comp, qty)) {
        const name = COMPONENT_NAMES[comp] || comp;
        alert(`✅ Приготовлено: ${name} x${qty}`);
        openPrepareModal();
    }
}

// Модифицируем completeCurrentOrder для учёта остатков
const originalCompleteOrder = completeCurrentOrder;
completeCurrentOrder = function() {
    const indices = Object.keys(currentOrder);
    if (indices.length === 0) return;
    
    // Проверяем доступность перед проведением
    for (let idxStr of indices) {
        const idx = parseInt(idxStr);
        const dish = DISH_DATABASE[idx];
        if (!isDishAvailable(dish)) {
            alert(`❌ Недостаточно компонентов для: ${dish.name}`);
            return;
        }
    }
    
    // Вызываем оригинальную функцию (деньги, статистика)
    originalCompleteOrder();
    
    // Уменьшаем остатки
    const result = consumeStock(currentOrder);
    
    // Показываем уведомления
    showStockNotifications(result);
    
    // Обновляем доступность кнопок
    updatePOSAvailability();
    
    // Обновляем отображение остатков
    showCurrentStock();
};
