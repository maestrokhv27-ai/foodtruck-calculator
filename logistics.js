// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ КАССЫ ====================
let lastCalculatedPrices = {};
let lastCalculatedCosts = {};

// ==================== ОСНОВНОЙ РАСЧЁТ ЛОГИСТИКИ ====================
function calculateLogisticsCore() {
    const l = document.getElementById("business_logic").value;
    const t = parseFloat(document.getElementById("cfg_truck_fridge").value) || 100;
    const c = parseFloat(document.getElementById("cfg_car_trunk").value) || 245;
    const e = parseFloat(document.getElementById("cfg_rv_storage").value) || 260;
    const a = parseFloat(document.getElementById("cfg_rv_cabinet").value) || 300;
    const m = parseFloat(document.getElementById("cfg_margin_percent").value) || 40;
    const o = parseFloat(document.getElementById("cfg_fish_price").value) || 400;

    if (document.getElementById("label_fish_price")) {
        document.getElementById("label_fish_price").innerText = "$" + o;
    }

    let s = [];
    DISH_DATABASE.forEach((dish, idx) => {
        if (document.getElementById(`dish_${idx}`) && document.getElementById(`dish_${idx}`).checked) {
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

    let r = (l === "1") ? t : (l === "2" ? c : (a + e));
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
        
        // ИСПРАВЛЕНО: получаем правильный индекс из общей базы
        const originalIdx = DISH_DATABASE.indexOf(dish);
        lastCalculatedPrices[originalIdx] = sp;
        lastCalculatedCosts[originalIdx] = cp;
        
        htmlPrices += `<li style='margin-bottom:8px;padding:8px;background:#fff;border-radius:4px;border-left:4px solid #2980b9;'>💵 <b>${dish.name}</b> ➜ Цена: <strong style="color:#2980b9;">$${sp}</strong> <small>(себес: $${cp})</small> | Смена: <b>${g} порц.</b></li>`;
    });
    htmlPrices += "</ul>";

    let orig = JSON.parse(JSON.stringify(req));
    for (let k in req) {
        let tQ = document.getElementById(`ready_${k}_трак`) ? parseFloat(document.getElementById(`ready_${k}_трак`).value) || 0 : 0;
        let rQ = document.getElementById(`ready_${k}_авд`) ? parseFloat(document.getElementById(`ready_${k}_авд`).value) || 0 : 0;
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
        let st = parseFloat(document.getElementById(`stock_${k}`).value) || 0;
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

    document.getElementById("error_box").style.display = "none";
    document.getElementById("result_box").style.display = "block";

    let inf = `<p>Выбранных позиций: <strong>${s.length}</strong>. На позицию: <strong>${g} порц.</strong> (заготовок на порцию: ${totalComponentsPerServing})</p>`;
    inf += `<p>🏪 Бюджет на оптовую базу: <b>$${bc.toLocaleString()}</b> | 🎣 Наличка на скупку рыбы: <b style="color:#e67e22;">$${fc.toLocaleString()}</b></p>`;
    inf += `<p><strong>🔥 ОБЩИЙ РАСХОД:</strong> <span style="color:#2980b9;font-weight:bold;">$${(bc + fc).toLocaleString()}</span></p>${hasDef ? htmlShop : "<p>✅ ЗАПАСОВ СЫРЬЯ ХВАТАЕТ!</p>"}`;
    
    document.getElementById("res_shopping_list").innerHTML = inf;

    let trips = Math.ceil(w / r);
    let tHtml = `<p>⚖️ Вес сырья для закупки: <strong>${w.toFixed(1)} кг</strong> (Лимит транспорта: ${r} кг).</p>`;
    tHtml += `<p style="font-size: 13px; color: #7f8c8d;"><small>*Это вес сырья с базы. Вес готовых заготовок будет рассчитан в блоке 3.</small></p>`;
    
    if (l === "1" && w > r) {
        document.getElementById("error_box").style.display = "block";
        document.getElementById("result_box").style.display = "none";
        document.getElementById("error_box").innerHTML = "⚠️ ПЕРЕГРУЗ ТРАКА! Вес закупки превышает лимит холодильника. Уменьшите меню или объем партии, чтобы избежать деспавна.";
        return;
    } else if (w > r) {
        tHtml += `<p style="color:#c0392b;font-weight:bold;">⚠️ Потребуется: ${trips} рейса(ов).</p>`;
    } else if (w > 0) {
        tHtml += `<p style="color:#27ae60;font-weight:bold;">✅ Доставится за 1 рейс!</p>`;
    }
    
    document.getElementById("res_transport_plan").innerHTML = tHtml;
    
    const walkStatsEl = document.getElementById("walk_stats");
    if (walkStatsEl) {
        walkStatsEl.innerHTML = (w > 0 && l === "2") ? `<p>🏃 Перетаскивание из багажника: <strong>${Math.ceil(w / 10)} ходок</strong> (по ~10 кг за раз).</p>` : `<p>✅ Разгрузка не требуется или выполняется иначе.</p>`;
    }

    let lHtml = `<p><small>*Переложите из багажника кемпера в холодильник фудтрака:</small></p>`;
    let totalPrepWeight = 0;
    let prepItems = [];
    
    for (let k in trk) {
        let cN = COMPONENT_NAMES[k] || k;
        let qT = trk[k];
        let tQ = orig[k] || qT;
        let rvR = (l === "3") ? Math.max(0, tQ - qT) : 0;
        
        let itemWeight = qT * 0.2;
        totalPrepWeight += itemWeight;
        
        prepItems.push(`<li><b>${cN}:</b> 🚚 загрузить в Фудтрак: <strong style="color:#27ae60;">${qT} шт.</strong> (${itemWeight.toFixed(1)} кг) ${l === "3" ? `| 🏠 в резерв Кемпера: <span style="color:#e67e22;">${Math.round(rvR)} шт.</span>` : ''}</li>`);
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
    
    document.getElementById("res_truck_loading").innerHTML = lHtml;

    let prof = rev - cog;
    let eHtml = `${htmlPrices}<hr><p>Полный себес: <strong>$${cog.toLocaleString()}</strong> | Выручка: <strong>$${rev.toLocaleString()}</strong></p><p style="font-size:16px;">💰 <b>Чистая прибыль:</b> <span style="color:#27ae60;font-weight:bold;">$${prof.toLocaleString()}</span></p>`;
    document.getElementById("res_economy_block").innerHTML = eHtml;

    // ИСПРАВЛЕНО: вызываем построение кассы один раз в самом конце
    buildCashRegister();
}

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
    
    selectedDishes.forEach((dish) => {
        html += `<div style="background: white; border-top: 4px solid #27ae60; border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 15px; border-radius: 4px;">`;
        html += `<h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 18px;">${dish.name}</h4>`;
        html += `<div style="font-size: 13px; color: #7f8c8d; margin-bottom: 15px; font-style: italic;">${dish.craft}</div>`;
        html += `<div style="margin-left: 10px;">`;
        html += `<strong style="color: #27ae60;">🧪 Необходимые компоненты:</strong>`;
        html += `<ol style="margin: 10px 0; padding-left: 25px; line-height: 1.8;">`;
        
        let compIndex = 0;
        for (let component in dish.recipe) {
            compIndex++;
            const qty = dish.recipe[component];
            const compName = COMPONENT_NAMES[component] || component;
            html += `<li style="margin-bottom: 8px;"><strong>${compName}</strong> — ${qty} шт.`;
            html += showComponentChain(component, qty, 1, compIndex);
            html += `</li>`;
        }
        html += `</ol></div></div>`;
    });
    
    content.innerHTML = html;
    box.style.display = "block";
    box.scrollIntoView({ behavior: "smooth", block: "center" });
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
        let subIndex = 0;
        for (let subComp in subComponents) {
            if (subComp === "инструменты") continue;
            subIndex++;
            const subQty = subComponents[subComp] * qty;
            const subName = COMPONENT_NAMES[subComp] || subComp;
            
            if (baseIngredients.includes(subComp)) {
                html += `<li><strong>${subName}</strong> — ${subQty} шт. <span style="color: #27ae60;">(базовый ингредиент)</span></li>`;
            } else {
                html += `<li><strong>${subName}</strong> — ${subQty} шт.`;
                html += showComponentChain(subComp, subQty, level + 1, subIndex);
                html += `</li>`;
            }
        }
        
        if (subComponents.инструменты) {
            const toolIcons = { "нож": "🔪", "венчик": "🥄", "огонь": "🔥" };
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

// ==================== КАССОВЫЙ АППАРАТ ====================
function buildCashRegister() {
    const container = document.getElementById("cash_register_table");
    if (!container) return;
    
    const selectedDishes = [];
    DISH_DATABASE.forEach((dish, idx) => {
        if (document.getElementById(`dish_${idx}`) && document.getElementById(`dish_${idx}`).checked) {
            selectedDishes.push({ dish, idx });
        }
    });
    
    if (selectedDishes.length === 0) {
        container.innerHTML = '<p style="color: #95a5a6;">Сначала выберите блюда в меню и нажмите "Рассчитать смену"</p>';
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    selectedDishes.forEach(({ dish, idx }) => {
        const price = lastCalculatedPrices[idx] || 0;
        const cost = lastCalculatedCosts[idx] || 0;
        const savedQty = localStorage.getItem(`cash_qty_${idx}`) || 0;
        
        html += `
            <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e0e0e0; flex-wrap: wrap;">
                <div style="flex: 2; min-width: 150px;">
                    <strong>${dish.name}</strong>
                    <div style="font-size: 12px; color: #7f8c8d;">Цена: $${price} | Себес: $${cost}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 13px;">Продано:</label>
                    <input type="number" id="cash_qty_${idx}" value="${savedQty}" min="0" 
                           oninput="updateCashRegister()" style="width: 70px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; text-align: center; font-size: 16px; font-weight: bold;">
                    <span style="font-size: 13px; color: #7f8c8d;">шт.</span>
                </div>
                <div style="flex: 1; text-align: right; min-width: 100px;">
                    <div style="font-size: 16px; font-weight: bold; color: #27ae60;" id="cash_line_${idx}">$${(savedQty * price).toLocaleString()}</div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    updateCashRegister();
}

function updateCashRegister() {
    let totalQty = 0, totalRevenue = 0, totalCost = 0;
    DISH_DATABASE.forEach((dish, idx) => {
        const qtyEl = document.getElementById(`cash_qty_${idx}`);
        if (!qtyEl) return;
        const qty = parseInt(qtyEl.value) || 0;
        const price = lastCalculatedPrices[idx] || 0;
        const cost = lastCalculatedCosts[idx] || 0;
        const lineTotal = qty * price;
        
        const lineEl = document.getElementById(`cash_line_${idx}`);
        if (lineEl) lineEl.innerText = '$' + lineTotal.toLocaleString();
        
        localStorage.setItem(`cash_qty_${idx}`, qty);
        totalQty += qty;
        totalRevenue += lineTotal;
        totalCost += qty * cost;
    });
    
    document.getElementById("cash_total_qty").innerText = totalQty;
    document.getElementById("cash_total_revenue").innerText = '$' + totalRevenue.toLocaleString();
    document.getElementById("cash_total_cost").innerText = '$' + totalCost.toLocaleString();
    document.getElementById("cash_total_profit").innerText = '$' + (totalRevenue - totalCost).toLocaleString();
}

function openCashRegister() {
    if (Object.keys(lastCalculatedPrices).length === 0) {
        calculateLogisticsCore();
    }
    const cashBlock = document.getElementById("cash_register_block");
    const resultBox = document.getElementById("result_box");
    if (cashBlock) {
        cashBlock.style.display = "block";
        if (resultBox) resultBox.style.display = "block";
        buildCashRegister();
        cashBlock.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function finishShift() {
    const totalQty = parseInt(document.getElementById("cash_total_qty").innerText) || 0;
    if (totalQty === 0) {
        alert("Вы не продали ни одной порции! Проверьте данные.");
        return;
    }
    
    const totalRevenue = parseInt(document.getElementById("cash_total_revenue").innerText.replace(/\D/g, '')) || 0;
    const totalCost = parseInt(document.getElementById("cash_total_cost").innerText.replace(/\D/g, '')) || 0;
    
    const shiftData = {
        date: new Date().toLocaleString("ru-RU"),
        totalQty, totalRevenue, totalCost,
        profit: totalRevenue - totalCost,
        dishes: []
    };
    
    DISH_DATABASE.forEach((dish, idx) => {
        const qty = parseInt(localStorage.getItem(`cash_qty_${idx}`)) || 0;
        if (qty > 0) {
            shiftData.dishes.push({
                name: dish.name, qty,
                price: lastCalculatedPrices[idx] || 0,
                total: qty * (lastCalculatedPrices[idx] || 0)
            });
        }
    });
    
    localStorage.setItem("last_shift", JSON.stringify(shiftData));
    
    let html = `<div style="margin-bottom: 15px;"><div style="font-size: 14px; opacity: 0.9;">📅 Дата: ${shiftData.date}</div></div>`;
    html += `<div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px; margin-bottom: 15px;">`;
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Продано порций:</span><strong>${shiftData.totalQty}</strong></div>`;
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Выручка:</span><strong>$${shiftData.totalRevenue.toLocaleString()}</strong></div>`;
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Себестоимость:</span><strong>$${shiftData.totalCost.toLocaleString()}</strong></div>`;
    html += `<hr style="border-color: rgba(255,255,255,0.3); margin: 10px 0;">`;
    html += `<div style="display: flex; justify-content: space-between; font-size: 20px;"><span>💰 Прибыль:</span><strong>$${shiftData.profit.toLocaleString()}</strong></div></div>`;
    html += `<div style="font-size: 14px; margin-bottom: 10px;"><strong>Детализация по блюдам:</strong></div>`;
    
    shiftData.dishes.forEach(d => {
        html += `<div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 5px; font-size: 14px;"><span>${d.name} × ${d.qty}</span><strong>$${d.total.toLocaleString()}</strong></div>`;
    });
    
    document.getElementById("shift_report_content").innerHTML = html;
    document.getElementById("shift_report_block").style.display = "block";
    document.getElementById("shift_report_block").scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetCashRegister() {
    if (!confirm("Обнулить все продажи в кассе?")) return;
    DISH_DATABASE.forEach((dish, idx) => {
        localStorage.removeItem(`cash_qty_${idx}`);
        const el = document.getElementById(`cash_qty_${idx}`);
        if (el) el.value = 0;
    });
    document.getElementById("shift_report_block").style.display = "none";
    updateCashRegister();
}

function exportShiftReport() {
    const shiftData = JSON.parse(localStorage.getItem("last_shift") || "{}");
    if (!shiftData.date) {
        alert("Нет данных о последней смене!");
        return;
    }
    
    let text = `📊 ОТЧЁТ ПО СМЕНЕ\n`;
    text += `📅 Дата: ${shiftData.date}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Продано порций: ${shiftData.totalQty}\n`;
    text += `Выручка: $${shiftData.totalRevenue.toLocaleString()}\n`;
    text += `Себестоимость: $${shiftData.totalCost.toLocaleString()}\n`;
    text += `💰 ПРИБЫЛЬ: $${shiftData.profit.toLocaleString()}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\nДетализация:\n`;
    
    shiftData.dishes.forEach(d => {
        text += `• ${d.name} × ${d.qty} = $${d.total.toLocaleString()}\n`;
    });
    
    const modal = document.getElementById("sync_modal");
    document.getElementById("sync_modal_title").innerText = "📤 Отчёт по смене";
    document.getElementById("sync_modal_content").innerHTML = `
        <textarea id="export_code" readonly style="width: 100%; height: 250px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 13px; resize: vertical;">${text}</textarea>
        <div style="margin-top: 10px; text-align: center;">
            <button onclick="copyExportCode()" style="background: #27ae60; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;">📋 Скопировать</button>
        </div>
        <p id="copy_status" style="color: #27ae60; font-size: 13px; margin-top: 10px; display: none;">✅ Скопировано!</p>
    `;
    modal.style.display = "flex";
}
