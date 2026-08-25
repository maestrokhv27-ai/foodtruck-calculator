// ==================== РАСЧЁТ ЗАКУПКИ ====================

const Procurement = {
    init() {
        this.cacheElements();
        this.bindEvents();
    },
    
    cacheElements() {
        this.errorBox = document.getElementById('error_box');
        this.resultBox = document.getElementById('result_box');
        this.noCalcMsg = document.getElementById('no_calc_msg');
        this.shoppingList = document.getElementById('res_shopping_list');
        this.transportPlan = document.getElementById('res_transport_plan');
        this.walkStats = document.getElementById('walk_stats');
        this.truckLoading = document.getElementById('res_truck_loading');
        this.economyBlock = document.getElementById('res_economy_block');
    },
    
    bindEvents() {
        EventBus.on('procurement:calculate', () => this.calculate());
    },
    
    calculate() {
        if (!DISH_DATABASE || DISH_DATABASE.length === 0) {
            alert('⚠️ База блюд не загружена!');
            return;
        }
        
        const logic = Store.get('businessLogic');
        const truckLimit = Store.get('truckFridge');
        const carLimit = Store.get('carTrunk');
        const rvLimit = Store.get('rvStorage');
        const margin = Store.get('marginPercent');
        const fishPrice = Store.get('fishPrice');
        const selectedDishes = Store.get('selectedDishes');
        const rawStock = Store.get('rawStock');
        const prepStock = Store.get('prepStock');
        
        // Собираем выбранные блюда
        const selected = DISH_DATABASE.filter((_, idx) => selectedDishes[idx]);
        
        if (selected.length === 0) {
            alert('Выберите хотя бы одно блюдо!');
            return;
        }
        
        // Считаем компоненты на порцию
        let totalComponentsPerServing = 0;
        selected.forEach(dish => {
            for (let k in dish.recipe) totalComponentsPerServing += dish.recipe[k];
        });
        
        // Лимиты
        const transportLimit = (logic === '1') ? truckLimit : (logic === '4' ? rvLimit : carLimit);
        const storageLimit = (logic === '3' || logic === '4') ? rvLimit : truckLimit;
        
        const maxItems = Math.floor(storageLimit / 0.2);
        const servingsPerDish = Math.floor(maxItems / totalComponentsPerServing);
        const truckItems = Math.floor(truckLimit / 0.2);
        const truckServings = Math.floor(truckItems / totalComponentsPerServing);
        
        // Расчёт
        let rawRequired = {};
        let truckLoad = {};
        let totalRevenue = 0;
        let totalCost = 0;
        let pricesHtml = '<strong>📋 ЦЕННИКИ ДЛЯ ВИТРИНЫ ФУДТРАКА:</strong><ul style="list-style-type:none;padding-left:0;">';
        
        const prices = { ...RAW_PRICES, "рыба": fishPrice };
        
        selected.forEach(dish => {
            let components = {};
            
            for (let k in dish.recipe) {
                const qty = dish.recipe[k] * servingsPerDish;
                rawRequired[k] = (rawRequired[k] || 0) + qty;
                
                const truckQty = dish.recipe[k] * truckServings;
                truckLoad[k] = (truckLoad[k] || 0) + truckQty;
                
                // Разбиваем заготовки на сырьё
                if (k === 'вареный_рис') components['рис'] = (components['рис'] || 0) + dish.recipe[k];
                else if (k === 'мясной_фарш') components['мясо'] = (components['мясо'] || 0) + dish.recipe[k];
                else if (k === 'сыр') components['молоко'] = (components['молоко'] || 0) + dish.recipe[k];
                else if (k === 'хлеб' || k === 'макароны') {
                    components['мука'] = (components['мука'] || 0) + dish.recipe[k];
                    components['яйцо'] = (components['яйцо'] || 0) + dish.recipe[k];
                }
                else if (k === 'стейк_заг') {
                    components['мясо'] = (components['мясо'] || 0) + dish.recipe[k];
                    components['фрукты'] = (components['фрукты'] || 0) + dish.recipe[k];
                    components['сахар'] = (components['сахар'] || 0) + dish.recipe[k];
                }
                else if (k === 'рыба_фрукт_заг') {
                    components['рыба'] = (components['рыба'] || 0) + dish.recipe[k];
                    components['фрукты'] = (components['фрукты'] || 0) + dish.recipe[k];
                    components['сахар'] = (components['сахар'] || 0) + dish.recipe[k];
                }
                else if (k === 'картофельное_пюре') {
                    components['овощи'] = (components['овощи'] || 0) + dish.recipe[k];
                    components['молоко'] = (components['молоко'] || 0) + dish.recipe[k] * 2;
                }
                else if (k === 'котлета') {
                    components['мясо'] = (components['мясо'] || 0) + dish.recipe[k];
                    components['молоко'] = (components['молоко'] || 0) + dish.recipe[k];
                }
                else if (k === 'рыбная_котлета') {
                    components['рыба'] = (components['рыба'] || 0) + dish.recipe[k];
                    components['молоко'] = (components['молоко'] || 0) + dish.recipe[k];
                }
                else if (k === 'рыбный_фарш') components['рыба'] = (components['рыба'] || 0) + dish.recipe[k];
                else if (k === 'тесто') {
                    components['мука'] = (components['мука'] || 0) + dish.recipe[k];
                    components['яйцо'] = (components['яйцо'] || 0) + dish.recipe[k];
                }
                else if (k === 'карамель') components['сахар'] = (components['сахар'] || 0) + dish.recipe[k];
                else if (k === 'мороженое') {
                    components['молоко'] = (components['молоко'] || 0) + dish.recipe[k] * 2;
                    components['сахар'] = (components['сахар'] || 0) + dish.recipe[k];
                    components['яйцо'] = (components['яйцо'] || 0) + dish.recipe[k];
                }
                else if (BASE_INGREDIENTS.includes(k)) {
                    components[k] = (components[k] || 0) + dish.recipe[k];
                }
            }
            
            // Себестоимость
            let cost = 0;
            for (let rKey in components) {
                if (rKey === 'масло') cost += components[rKey] * prices['молоко'];
                else if (rKey === 'тесто') cost += components[rKey] * (prices['мука'] + prices['яйцо']);
                else if (prices[rKey]) cost += components[rKey] * prices[rKey];
            }
            
            const price = Math.round(cost * (1 + margin / 100));
            totalCost += servingsPerDish * cost;
            totalRevenue += servingsPerDish * price;
            
            pricesHtml += `<li style="margin-bottom:8px;padding:8px;background:#fff;border-radius:4px;border-left:4px solid #2980b9;">💵 <b>${dish.name}</b> ➜ Цена: <strong style="color:#2980b9;">$${price}</strong> <small>(себес: $${cost})</small> | Смена: <b>${servingsPerDish} порц.</b></li>`;
        });
        pricesHtml += '</ul>';
        
        // Сохраняем цены для POS
        Store.set('calculatedPrices', {});
        Store.set('calculatedCosts', {});
        
        // Вычитаем имеющиеся заготовки
        let finalRequired = { ...rawRequired };
        for (let k in finalRequired) {
            const truckQty = prepStock.truck[k] || 0;
            const rvQty = (logic === '3' || logic === '4') ? (prepStock.rvStorage[k] || 0) : 0;
            finalRequired[k] = Math.max(0, finalRequired[k] - truckQty - rvQty);
        }
        
        // Разбиваем заготовки на сырьё для закупки
        let rawToBuy = {};
        for (let k in finalRequired) {
            const qty = finalRequired[k];
            if (qty <= 0) continue;
            
            if (k === 'вареный_рис') rawToBuy['рис'] = (rawToBuy['рис'] || 0) + qty;
            else if (k === 'мясной_фарш') rawToBuy['мясо'] = (rawToBuy['мясо'] || 0) + qty;
            else if (k === 'рыбный_фарш') rawToBuy['рыба'] = (rawToBuy['рыба'] || 0) + qty;
            else if (k === 'сыр') rawToBuy['молоко'] = (rawToBuy['молоко'] || 0) + qty;
            else if (k === 'хлеб' || k === 'макароны') {
                rawToBuy['мука'] = (rawToBuy['мука'] || 0) + qty;
                rawToBuy['яйцо'] = (rawToBuy['яйцо'] || 0) + qty;
            }
            else if (k === 'стейк_заг') {
                rawToBuy['мясо'] = (rawToBuy['мясо'] || 0) + qty;
                rawToBuy['фрукты'] = (rawToBuy['фрукты'] || 0) + qty;
                rawToBuy['сахар'] = (rawToBuy['сахар'] || 0) + qty;
            }
            else if (k === 'рыба_фрукт_заг') {
                rawToBuy['рыба'] = (rawToBuy['рыба'] || 0) + qty;
                rawToBuy['фрукты'] = (rawToBuy['фрукты'] || 0) + qty;
                rawToBuy['сахар'] = (rawToBuy['сахар'] || 0) + qty;
            }
            else if (k === 'картофельное_пюре') {
                rawToBuy['овощи'] = (rawToBuy['овощи'] || 0) + qty;
                rawToBuy['молоко'] = (rawToBuy['молоко'] || 0) + qty * 2;
            }
            else if (k === 'котлета') {
                rawToBuy['мясо'] = (rawToBuy['мясо'] || 0) + qty;
                rawToBuy['молоко'] = (rawToBuy['молоко'] || 0) + qty;
            }
            else if (k === 'рыбная_котлета') {
                rawToBuy['рыба'] = (rawToBuy['рыба'] || 0) + qty;
                rawToBuy['молоко'] = (rawToBuy['молоко'] || 0) + qty;
            }
            else if (k === 'карамель') rawToBuy['сахар'] = (rawToBuy['сахар'] || 0) + qty;
            else if (k === 'мороженое') {
                rawToBuy['молоко'] = (rawToBuy['молоко'] || 0) + qty * 2;
                rawToBuy['сахар'] = (rawToBuy['сахар'] || 0) + qty;
                rawToBuy['яйцо'] = (rawToBuy['яйцо'] || 0) + qty;
            }
            else if (BASE_INGREDIENTS.includes(k)) {
                rawToBuy[k] = (rawToBuy[k] || 0) + qty;
            }
        }
        
        // Считаем закупку
        let totalWeight = 0;
        let baseCost = 0;
        let fishCost = 0;
        let shopHtml = '<ul>';
        let hasDeficit = false;
        
        for (let k in rawToBuy) {
            const stock = rawStock[k] || 0;
            const deficit = Math.max(0, rawToBuy[k] - stock);
            if (deficit <= 0) continue;
            
            hasDeficit = true;
            if (k === 'мясо' || k === 'рыба') {
                const pcs = Math.ceil(deficit);
                const cost = pcs * prices[k];
                if (k === 'мясо') baseCost += cost; else fishCost += cost;
                totalWeight += pcs * 0.1;
                shopHtml += `<li><strong>${COMPONENT_NAMES[k].toUpperCase()}:</strong> ${pcs} шт. — $${cost.toLocaleString()}</li>`;
            } else {
                const boxes = Math.ceil(deficit / 10);
                const cost = boxes * 10 * prices[k];
                baseCost += cost;
                totalWeight += boxes * 2.0;
                shopHtml += `<li><strong>${COMPONENT_NAMES[k].toUpperCase()}:</strong> ${boxes} кор. (${boxes * 10} порц.) — $${cost.toLocaleString()}</li>`;
            }
        }
        shopHtml += '</ul>';
        
        // Отображение
        if (this.errorBox) this.errorBox.style.display = 'none';
        if (this.resultBox) this.resultBox.style.display = 'block';
        if (this.noCalcMsg) this.noCalcMsg.style.display = 'none';
        
        const totalExpense = baseCost + fishCost;
        let info = `<p>Выбранных позиций: <strong>${selected.length}</strong>. На позицию: <strong>${servingsPerDish} порц.</strong> (компонентов на порцию: ${totalComponentsPerServing})</p>`;
        info += `<p>🏪 Бюджет на оптовую базу: <b>$${baseCost.toLocaleString()}</b> |  Наличка на скупку рыбы: <b style="color:#e67e22;">$${fishCost.toLocaleString()}</b></p>`;
        info += `<p><strong>🔥 ОБЩИЙ РАСХОД:</strong> <span style="color:#2980b9;font-weight:bold;">$${totalExpense.toLocaleString()}</span></p>${hasDeficit ? shopHtml : '<p>✅ ЗАПАСОВ СЫРЬЯ ХВАТАЕТ!</p>'}`;
        
        if (this.shoppingList) this.shoppingList.innerHTML = info;
        
        // Транспорт
        const trips = Math.ceil(totalWeight / transportLimit);
        let transportHtml = `<p>⚖️ Вес сырья для закупки: <strong>${totalWeight.toFixed(1)} кг</strong> (Лимит транспорта: ${transportLimit} кг).</p>`;
        
        if (logic === '1' && totalWeight > transportLimit) {
            if (this.errorBox) {
                this.errorBox.style.display = 'block';
                this.errorBox.innerHTML = '⚠️ ПЕРЕГРУЗ! Вес закупки превышает лимит.';
            }
            if (this.resultBox) this.resultBox.style.display = 'none';
            return;
        } else if (totalWeight > transportLimit) {
            transportHtml += `<p style="color:#c0392b;font-weight:bold;">⚠️ Потребуется: ${trips} рейса(ов).</p>`;
        } else if (totalWeight > 0) {
            transportHtml += `<p style="color:#27ae60;font-weight:bold;">✅ Доставится за 1 рейс!</p>`;
        }
        
        if (this.transportPlan) this.transportPlan.innerHTML = transportHtml;
        
        if (this.walkStats) {
            this.walkStats.innerHTML = (totalWeight > 0 && logic === '2') 
                ? `<p>🏃 Перетаскивание: <strong>${Math.ceil(totalWeight / 10)} ходок</strong> (по ~10 кг).</p>` 
                : `<p>✅ Разгрузка не требуется.</p>`;
        }
        
        // Загрузка фудтрака
        let totalPrepWeight = 0;
        let prepItems = [];
        
        for (let k in truckLoad) {
            const name = COMPONENT_NAMES[k] || k;
            const qty = truckLoad[k];
            const weight = qty * 0.2;
            totalPrepWeight += weight;
            
            let storageLabel = '';
            if (logic === '3' || logic === '4') {
                const origQty = rawRequired[k] || qty;
                const rvReserve = Math.max(0, origQty - qty);
                if (rvReserve > 0) storageLabel = ` | 🏠 в резерв Кемпера: <span style="color:#e67e22;">${Math.round(rvReserve)} шт.</span>`;
            }
            
            prepItems.push(`<li><b>${name}:</b>  в Фудтрак: <strong style="color:#27ae60;">${qty} шт.</strong> (${weight.toFixed(1)} кг)${storageLabel}</li>`);
        }
        
        const truckTrips = Math.ceil(totalPrepWeight / truckLimit);
        let truckHtml = `<p><small>*Переложите из хранилища в холодильник фудтрака:</small></p>`;
        truckHtml += `<p style="background: #e8f4f8; padding: 10px; border-radius: 4px; margin: 10px 0;"><strong>⚖️ Общий вес заготовок: ${totalPrepWeight.toFixed(1)} кг</strong> (Лимит: ${truckLimit} кг)`;
        truckHtml += totalPrepWeight > truckLimit 
            ? `<br><span style="color: #e67e22;">⚠️ Потребуется ${truckTrips} рейса(ов)</span>` 
            : `<br><span style="color: #27ae60;">✅ Вмещается за 1 рейс</span>`;
        truckHtml += `</p><ul>${prepItems.join('')}</ul>`;
        
        if (this.truckLoading) this.truckLoading.innerHTML = truckHtml;
        
        // Экономика
        const profit = totalRevenue - totalCost;
        const economyHtml = `${pricesHtml}<hr><p>Себес: <strong>$${totalCost.toLocaleString()}</strong> | Выручка: <strong>$${totalRevenue.toLocaleString()}</strong></p><p style="font-size:16px;">💰 <b>Прибыль:</b> <span style="color:#27ae60;font-weight:bold;">$${profit.toLocaleString()}</span></p>`;
        
        if (this.economyBlock) this.economyBlock.innerHTML = economyHtml;
        
        // Уведомляем POS
        EventBus.emit('procurement:calculated', { selected, prices: Store.get('calculatedPrices'), costs: Store.get('calculatedCosts') });
    }
};

window.Procurement = Procurement;
