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
            if (k === "хлеб" || k === "макароны") { f["мука"] += dish.recipe[k]; f["яйцо"] += dish.recipe[k]; }
            if (k === "стейк_заг") { f["мясо"] += dish.recipe[k]; f["фрукты"] += dish.recipe[k]; f["сахар"] += dish.recipe[k]; }
            if (k === "рыба_фрукт_заг") { f["рыба"] += dish.recipe[k]; f["фрукты"] += dish.recipe[k]; f["сахар"] += dish.recipe[k]; }
            if (k === "картофельное_пюре") { f["овощи"] += dish.recipe[k]; f["молоко"] += dish.recipe[k] * 2; }
            
            if (k === "котлета") { f["мясо"] += dish.recipe[k]; f["масло"] = (f["масло"] || 0) + dish.recipe[k]; }
            if (k === "рыбная_котлета") { f["рыба"] += dish.recipe[k]; f["масло"] = (f["масло"] || 0) + dish.recipe[k]; }
            if (k === "рыбный_фарш") f["рыба"] += dish.recipe[k];
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
        if (k === "хлеб" || k === "макароны") { rawR["мука"] += qty; rawR["яйцо"] += qty; }
        if (k === "стейк_заг") { rawR["мясо"] += qty; rawR["фрукты"] += qty; rawR["сахар"] += qty; }
        if (k === "рыба_фрукт_заг") { rawR["рыба"] += qty; rawR["фрукты"] += qty; rawR["сахар"] += qty; }
        if (k === "картофельное_пюре") { rawR["овощи"] += qty; rawR["молоко"] += qty * 2; }
        
        if (k === "котлета") { rawR["мясо"] += qty; rawR["масло"] = (rawR["масло"] || 0) + qty; }
        if (k === "рыбная_котлета") { rawR["рыба"] += qty; rawR["масло"] = (rawR["масло"] || 0) + qty; }
        if (k === "рыбный_фарш") rawR["рыба"] += qty;
        
        if (k === "сыр" || k === "масло") rawR["молоко"] += qty;
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
        // Добавляем информацию о полной цепочке
    let chainInfo = `<p style="background: #fff3cd; padding: 10px; border-radius: 4px; border-left: 4px solid #ffc107; margin-top: 15px;">`;
    chainInfo += `<strong>🔗 Полная цепочка:</strong> Для приготовления <strong>${g} порций</strong> каждого блюда потребуется:`;
    chainInfo += `<ul style="margin: 5px 0; padding-left: 20px;">`;
    chainInfo += `<li> <strong>${Object.values(trk).reduce((a, b) => a + b, 0)} заготовок</strong> (общее количество)</li>`;
    chainInfo += `<li>⚖️ <strong>${(Object.values(trk).reduce((a, b) => a + b, 0) * 0.2).toFixed(1)} кг</strong> готовых заготовок</li>`;
    chainInfo += `<li>🏭 <strong>${s.length * g} порций</strong> суммарно (${s.length} блюд × ${g} порций)</li>`;
    chainInfo += `</ul></p>`;
    
    eHtml = eHtml.replace('</ul>', chainInfo + '</ul>');
}

