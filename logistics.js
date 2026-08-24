// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let lastCalculatedPrices = {};
let lastCalculatedCosts = {};
let currentOrder = {};
let shiftStats = { revenue: 0, profit: 0, orders: 0 };

// ==================== ОСНОВНОЙ РАСЧЁТ ====================
function calculateLogisticsCore() {
    // Безопасное получение элементов с проверками
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
        if (el && el.checked) {
            s.push(dish);
        }
    });

    if (s.length === 0) {
        alert("Пожалуйста, выберите хотя бы одно блюдо для меню продажи!");
        return;
    }

    let totalComponentsPerServing = 0;
    s.forEach(dish => {
        for (let k in dish.recipe) {
            totalComponentsPerServing += dish.recipe[k];
        }
    });

    // Лимит транспорта для закупки:
    // Режим 1: закупаем прямо в фудтрак (t)
    // Режим 2 и 3: закупаем на легковом авто (c), потом перекладываем
    let r = (l === "1") ? t : (l === "4" ? e : c);
    let n = (l === "3") ? e : t;
    let i = Math.floor(n / 0.2);
    let g = Math.floor(i / totalComponentsPerServing);
    let d = Math.floor(t / 0.2);
    let p = Math.floor(d / totalComponentsPerServing);

    const pr = { "овощи": 55, "рис": 45, "мясо": 500, "фрукты": 55, "сахар": 45, "мука": 45, "молоко": 55, "яйцо": 45, "рыба": o };
    
    let rawR = { "овощи": 0, "рис": 0, "мясо": 0, "фрукты": 0, "сахар": 0, "мука": 0, "молоко": 0, "яйцо": 0, "рыба": 0, "масло": 0, "тесто": 0 };
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
            if (k === "хлеб" || k === "макароны") { f["тесто"] = (f["тесто"] || 0) + dish.recipe[k]; }
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
            let priceKey = (rKey === "масло") ? "молоко" : rKey;
            if (pr[priceKey]) cp += f[rKey] * pr[priceKey];
        }
        
        let sp = Math.round(cp * (1 + m / 100));
        cog += g * cp;
        rev += g * sp;
        
        const originalIdx = DISH_DATABASE.indexOf(dish);
        lastCalculatedPrices[originalIdx] = sp;
        lastCalculatedCosts[originalIdx] = cp;
        
        htmlPrices += `<li style='margin-bottom:8px;padding:8px;background:#fff;border-radius:4px;border-left:4px solid #2980b9;'>💵 <b>${dish.name}</b> ➜ Цена: <strong style="color:#2980b9;">$${sp}</strong> <small>(себес: $${cp})</small> | Смена: <b>${g} порц.</b></li>`;
    });
    htmlPrices += "</ul>";

    let orig = JSON.parse(JSON.stringify(req));
    for (let k in req) {
        let tQ = getEl(`ready_${k}_трак`) ? parseFloat(getEl(`ready_${k}_трак`).value) || 0 : 0;
        let rQ = getEl(`ready_${k}_авд`) ? parseFloat(getEl(`ready_${k}_авд`).value) || 0 : 0;
        req[k] = Math.max(0, req[k] - (l === "3" ? (tQ + rQ) : tQ));
    }

    for (let k in req) {
        let qty = req[k];
        if (qty <= 0) continue;
        
        if (k === "вареный_рис") rawR["рис"] += qty;
        if (k === "мясной_фарш") rawR["мясо"] += qty;
        if (k === "хлеб" || k === "макароны") { rawR["тесто"] = (rawR["тесто"] || 0) + qty; }
        if (k === "стейк_заг") { rawR["мясо"] += qty; rawR["фрукты"] += qty; rawR["сахар"] += qty; }
        if (k === "рыба_фрукт_заг") { rawR["рыба"] += qty; rawR["фрукты"] += qty; rawR["сахар"] += qty; }
        if (k === "картофельное_пюре") { rawR["овощи"] += qty; rawR["масло"] = (rawR["масло"] || 0) + qty; rawR["молоко"] += qty; }
        
        if (k === "котлета") { rawR["мясо"] += qty; rawR["масло"] = (rawR["масло"] || 0) + qty; }
        if (k === "рыбная_котлета") { rawR["рыба"] += qty; rawR["масло"] = (rawR["масло"] || 0) + qty; }
        if (k === "рыбный_фарш") rawR["рыба"] += qty;
        if (k === "тесто") { rawR["мука"] += qty; rawR["яйцо"] += qty; }
        if (k === "карамель") rawR["сахар"] += qty;
        
        if (k === "сыр") rawR["молоко"] += qty;
        if (k === "масло") rawR["молоко"] += qty;
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
                if (k === "мясо") bc += pcs * pr[k];
                else fc += pcs * pr[k];
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

    // Безопасное обновление UI
    const errorBox = getEl("error_box");
    const resultBox = getEl("result_box");
    const noCalcMsg = getEl("no_calc_msg");
    const shoppingList = getEl("res_shopping_list");
    const transportPlan = getEl("res_transport_plan");
    const walkStats = getEl("walk_stats");
    const truckLoading = getEl("res_truck_loading");
    const economyBlock = getEl("res_economy_block");

    if (errorBox) errorBox.style.display = "none";
    if (resultBox) resultBox.style.display = "block";
    if (noCalcMsg) noCalcMsg.style.display = "none";

    let inf = `<p>Выбранных позиций: <strong>${s.length}</strong>. На позицию: <strong>${g} порц.</strong> (заготовок на порцию: ${totalComponentsPerServing})</p>`;
    inf += `<p>🏪 Бюджет на оптовую базу: <b>$${bc.toLocaleString()}</b> | 🎣 Наличка на скупку рыбы: <b style="color:#e67e22;">$${fc.toLocaleString()}</b></p>`;
    inf += `<p><strong>🔥 ОБЩИЙ РАСХОД:</strong> <span style="color:#2980b9;font-weight:bold;">$${(bc + fc).toLocaleString()}</span></p>${hasDef ? htmlShop : "<p>✅ ЗАПАСОВ СЫРЬЯ ХВАТАЕТ!</p>"}`;
    
    if (shoppingList) shoppingList.innerHTML = inf;

    let trips = Math.ceil(w / r);
    let tHtml = `<p>⚖️ Вес сырья для закупки: <strong>${w.toFixed(1)} кг</strong> (Лимит транспорта: ${r} кг).</p>`;
    tHtml += `<p style="font-size: 13px; color: #7f8c8d;"><small>*Это вес сырья с базы. Вес готовых заготовок будет рассчитан в блоке 3.</small></p>`;
    
    if (l === "1" && w > r) {
        if (errorBox) {
            errorBox.style.display = "block";
            errorBox.innerHTML = "⚠️ ПЕРЕГРУЗ ТРАКА! Вес закупки превышает лимит холодильника. Уменьшите меню или объем партии, чтобы избежать деспавна.";
        }
        if (resultBox) resultBox.style.display = "none";
        return;
    } else if (w > r) {
        tHtml += `<p style="color:#c0392b;font-weight:bold;">⚠️ Потребуется: ${trips} рейса(ов).</p>`;
    } else if (w > 0) {
        tHtml += `<p style="color:#27ae60;font-weight:bold;">✅ Доставится за 1 рейс!</p>`;
    }
    
    if (transportPlan) transportPlan.innerHTML = tHtml;
    
    if (walkStats) {
        walkStats.innerHTML = (w > 0 && l === "2") ? `<p>🏃 Перетаскивание из багажника: <strong>${Math.ceil(w / 10)} ходок</strong> (по ~10 кг за раз).</p>` : `<p>✅ Разгрузка не требуется или выполняется иначе.</p>`;
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
        prepItems.push(`<li><b>${cN}:</b> 🚚 загрузить в Фудтрак: <strong style="color:#27ae60;">${qT} шт.</strong> (${itemWeight.toFixed(1)} кг) ${storageLabel}</li>`);    
    }
    
    let truckLimit = t;
    let tripsToTruck = Math.ceil(totalPrepWeight / truckLimit);
    
    lHtml += `<p style="background: #e8f4f8; padding: 10px; border-radius: 4px; margin: 10px 0;"><strong>⚖️ Общий вес заготовок для фудтрака: ${totalPrepWeight.toFixed(1)} кг</strong> (Лимит фудтрака: ${truckLimit} кг)`;
    if (totalPrepWeight > truckLimit) {
        lHtml += `<br><span style="color: #e67e22;">⚠️ Потребуется ${tripsToTruck} рейса(ов) из автодома в фудтрак</span>`;
    } else {
        lHtml += `<br><span style="color: #27ae60;">✅ Вмещается за 1 рейс</span>`;
    }
    lHtml += `</p><ul>${prepItems.join('')}</ul>`;
    
    if (truckLoading) truckLoading.innerHTML = lHtml;

    let prof = rev - cog;
    let eHtml = `${htmlPrices}<hr><p>Полный себес: <strong>$${cog.toLocaleString()}</strong> | Выручка: <strong>$${rev.toLocaleString()}</strong></p><p style="font-size:16px;">💰 <b>Чистая прибыль:</b> <span style="color:#27ae60;font-weight:bold;">$${prof.toLocaleString()}</span></p>`;
    if (economyBlock) economyBlock.innerHTML = eHtml;

    // Инициализируем POS и переключаем вкладку
    if (typeof initPOS === 'function') initPOS();
    
    // Надёжное переключение на вкладку закупки
    setTimeout(() => {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
            tab.style.display = 'none';
        });
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        const procurementTab = document.getElementById('tab-procurement');
        if (procurementTab) {
            procurementTab.style.display = 'block';
            setTimeout(() => procurementTab.classList.add('active'), 10);
        }
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.innerText.includes('Закупка')) {
                btn.classList.add('active');
            }
        });
    }, 100);
}

function showComponentChain(component, qty, level, parentIndex) {
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
                html += `<li><strong>${subName}</strong> — ${subQty} шт. <span style="color: #27ae60;">(базовый ингредиент)</span></li>`;
            } else {
                html += `<li><strong>${subName}</strong> — ${subQty} шт.`;
                html += showComponentChain(subComp, subQty, level + 1);
                html += `</li>`;
            }
        }
        
        if (subComponents.инструменты) {
            const toolIcons = { "нож": "", "венчик": "🥄", "огонь": "🔥" };
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
        if (document.getElementById(`dish_${idx}`) && document.getElementById(`dish_${idx}`).checked) {
            selectedDishes.push({ dish, idx });
        }
    });

    if (selectedDishes.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; color: #7f8c8d; text-align: center;">Выберите блюда во вкладке "Настройки" и нажмите "Рассчитать смену"</p>';
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
        block.style.display = "none";
        return;
    }
    
    block.style.display = "block";
    let itemsHtml = "";
    let kitchenNeeds = {};
    let currentTotal = 0;

    indices.forEach(idxStr => {
        const idx = parseInt(idxStr);
        const qty = currentOrder[idx];
        const dish = DISH_DATABASE[idx];
        const price = lastCalculatedPrices[idx] || dish.price;
        
        itemsHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>${dish.name} x${qty}</span>
            <strong>$${(price * qty).toLocaleString()}</strong>
        </div>`;
        
        currentTotal += price * qty;

        for (let comp in dish.recipe) {
            const compQty = dish.recipe[comp] * qty;
            kitchenNeeds[comp] = (kitchenNeeds[comp] || 0) + compQty;
        }
    });

    itemsDiv.innerHTML = itemsHtml;
    totalEl.innerText = "$" + currentTotal.toLocaleString();

    let ticketHtml = "";
    for (let comp in kitchenNeeds) {
        const name = COMPONENT_NAMES[comp] || comp;
        ticketHtml += `<div>• ${name}: <strong>${kitchenNeeds[comp]} шт.</strong></div>`;
    }
    ticketDiv.innerHTML = ticketHtml || "Нет компонентов";
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
    
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "✅ ЗАКАЗ ПРОВЕДЕН!";
    btn.style.background = "#2ecc71";
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = "#27ae60";
    }, 1000);
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
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Продано заказов:</span><strong>${shiftStats.orders}</strong></div>`;
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Выручка:</span><strong>$${shiftStats.revenue.toLocaleString()}</strong></div>`;
    html += `<hr style="border-color: rgba(255,255,255,0.3); margin: 10px 0;">`;
    html += `<div style="display: flex; justify-content: space-between; font-size: 20px;"><span>💰 Прибыль:</span><strong>$${shiftStats.profit.toLocaleString()}</strong></div></div>`;
    
    reportContent.innerHTML = html;
}

function resetShiftData() {
    if (!confirm("⚠️ Завершить смену и обнулить всю кассу?")) return;
    shiftStats = { revenue: 0, profit: 0, orders: 0 };
    currentOrder = {};
    localStorage.setItem("shift_stats", JSON.stringify(shiftStats));
    updateShiftDisplay();
    initPOS();
    
    const reportContent = document.getElementById("shift_report_content");
    if (reportContent) {
        reportContent.innerHTML = '<p style="text-align: center; opacity: 0.8;">Проведите заказы в кассе, чтобы сформировать отчет.</p>';
    }
}

function exportShiftReport() {
    if (shiftStats.orders === 0) {
        alert("Нет данных о проведенных заказах!");
        return;
    }
    
    const date = new Date().toLocaleString("ru-RU");
    let text = `📊 ОТЧЁТ ПО СМЕНЕ\n`;
    text += `📅 Дата: ${date}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Проведено заказов: ${shiftStats.orders}\n`;
    text += `Выручка: $${shiftStats.revenue.toLocaleString()}\n`;
    text += `💰 ПРИБЫЛЬ: $${shiftStats.profit.toLocaleString()}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    
    const modal = document.getElementById("sync_modal");
    document.getElementById("sync_modal_title").innerText = "📤 Отчёт по смене";
    document.getElementById("sync_modal_content").innerHTML = `
        <textarea id="export_code" readonly style="width: 100%; height: 200px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 13px; resize: vertical;">${text}</textarea>
        <div style="margin-top: 10px; text-align: center;">
            <button onclick="copyExportCode()" style="background: #27ae60; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;">📋 Скопировать</button>
        </div>
        <p id="copy_status" style="color: #27ae60; font-size: 13px; margin-top: 10px; display: none;">✅ Скопировано!</p>
    `;
    modal.style.display = "flex";
}
