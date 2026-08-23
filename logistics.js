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

    // Считаем общее количество заготовок на 1 порцию каждого блюда
    let totalComponentsPerServing = 0;
    s.forEach(dish => {
        for (let k in dish.recipe) {
            totalComponentsPerServing += dish.recipe[k];
        }
    });

    // Лимиты и объемы партии
    let r = (l === "1") ? t : (l === "2" ? c : (a + e));
    let n = (l === "3") ? e : t;
    let i = Math.floor(n / 0.2); // всего заготовок в лимите
    let g = Math.floor(i / totalComponentsPerServing); // порций на блюдо для закупки
    let d = Math.floor(t / 0.2); // заготовок в фудтраке
    let p = Math.floor(d / totalComponentsPerServing); // порций на блюдо для фудтрака

    const pr = { "овощи": 55, "рис": 45, "мясо": 500, "фрукты": 55, "сахар": 45, "мука": 45, "молоко": 55, "яйцо": 45, "рыба": o };
    
    let rawR = { "овощи": 0, "рис": 0, "мясо": 0, "фрукты": 0, "сахар": 0, "мука": 0, "молоко": 0, "яйцо": 0, "рыба": 0 };
    let req = {};
    let trk = {};
    let rev = 0;
    let cog = 0;
    let htmlPrices = "<strong>📋 ЦЕННИКИ ДЛЯ ВИТРИНЫ ФУДТРАКА:</strong><ul style='list-style-type:none;padding-left:0;'>";

    s.forEach(dish => {
        let f = { "овощи": 0, "рис": 0, "мясо": 0, "фрукты": 0, "сахар": 0, "мука": 0, "молоко": 0, "яйцо": 0, "рыба": 0, "масло": 0 };
        for (let k in dish.recipe) {
            let q = dish.recipe[k] * g;
            req[k] = (req[k] || 0) + q;
            let qT = dish.recipe[k] * p;
            trk[k] = (trk[k] || 0) + qT;

            if (k === "овощи_заг") f["овощи"] += dish.recipe[k];
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
        
        if (k === "овощи_заг") rawR["овощи"] += qty;
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
        
        html += `</ul>`;
        
        // Добавляем информацию об инструментах
        html += `<div style="margin-top: 12px; padding: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 6px; color: white;">`;
        html += `<strong style="font-size: 15px;">🔧 Инструменты:</strong> `;
        if (dish.tool) {
            const tools = Array.isArray(dish.tool) ? dish.tool : [dish.tool];
            const toolIcons = {
                "нож": "",
                "венчик": "🥄",
                "огонь": "🔥"
            };
            html += tools.map(t => {
                const icon = toolIcons[t.toLowerCase()] || '🔧';
                return `<span style="display: inline-flex; align-items: center; margin: 5px; padding: 5px 12px; background: rgba(255,255,255,0.2); border-radius: 6px; font-size: 18px; font-weight: bold;">${icon} <span style="font-size: 14px; margin-left: 5px;">${t}</span></span>`;
            }).join(' ');
        } else {
            html += '<span style="color: rgba(255,255,255,0.7);">Не требуется</span>';
        }
        html += `</div>`;
    });
    
    content.innerHTML = html;
    box.style.display = "block";
    box.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showComponentChain(component, qty, level) {
    let html = "";
    
    const recipes = {
        "овощи_заг": { "овощи": 1, "инструменты": ["нож"] },
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
        html += `<ul style="margin: 5px 0; padding-left: 20px; color: #34495e;">`;
        for (let subComp in subComponents) {
            if (subComp === "инструменты") continue;
            
            const subQty = subComponents[subComp] * qty;
            const subName = COMPONENT_NAMES[subComp] || subComp;
            
            if (baseIngredients.includes(subComp)) {
                html += `<li>↳ <strong>${subName}</strong> — ${subQty} шт. <span style="color: #27ae60;">(базовый ингредиент)</span></li>`;
            } else {
                html += `<li>↳ <strong>${subName}</strong> — ${subQty} шт.`;
                html += showComponentChain(subComp, subQty, level + 1);
                html += `</li>`;
            }
        }
        
        // Показываем инструменты для этого компонента
        if (subComponents.инструменты) {
            const toolIcons = {
                "нож": "🔪",
                "венчик": "🥄",
                "огонь": "🔥"
            };
            const toolsHtml = subComponents.инструменты.map(t => {
                const icon = toolIcons[t.toLowerCase()] || '🔧';
                return `<span style="display: inline-flex; align-items: center; margin: 2px 5px; padding: 3px 8px; background: #fff3cd; border-radius: 4px; font-size: 16px; font-weight: bold;">${icon} <span style="font-size: 13px; margin-left: 3px;">${t}</span></span>`;
            }).join(' ');
            html += `<li style="margin-top: 8px;">${toolsHtml}</li>`;
        }
        
        html += `</ul>`;
    } else {
        html += ` <span style="color: #27ae60;">(базовый ингредиент)</span>`;
    }
    
    return html;
}
