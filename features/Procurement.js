// ==================== РАСЧЁТ ЗАКУПКИ ====================

const Procurement = {
    init: function() {
        this.cacheElements();
        this.bindEvents();
    },
    
    cacheElements: function() {
        this.errorBox = document.getElementById('error_box');
        this.resultBox = document.getElementById('result_box');
        this.noCalcMsg = document.getElementById('no_calc_msg');
        this.shoppingList = document.getElementById('res_shopping_list');
        this.transportPlan = document.getElementById('res_transport_plan');
        this.walkStats = document.getElementById('walk_stats');
        this.truckLoading = document.getElementById('res_truck_loading');
        this.economyBlock = document.getElementById('res_economy_block');
    },
    
    bindEvents: function() {
        var self = this;
        EventBus.on('procurement:calculate', function() { self.calculate(); });
    },
    
    calculate: function() {
        if (!window.DISH_DATABASE || DISH_DATABASE.length === 0) {
            alert('️ База блюд не загружена!');
            return;
        }
        
        var logic = Store.get('businessLogic');
        var truckLimit = Store.get('truckFridge');
        var carLimit = Store.get('carTrunk');
        var rvLimit = Store.get('rvStorage');
        var margin = Store.get('marginPercent');
        var fishPrice = Store.get('fishPrice');
        var selectedDishes = Store.get('selectedDishes');
        var rawStock = Store.get('rawStock');
        var prepStock = Store.get('prepStock');
        
        var selected = DISH_DATABASE.filter(function(_, idx) { return selectedDishes[idx]; });
        
        if (selected.length === 0) {
            alert('Выберите хотя бы одно блюдо!');
            return;
        }
        
        var totalComponentsPerServing = 0;
        selected.forEach(function(dish) {
            for (var k in dish.recipe) totalComponentsPerServing += dish.recipe[comp];
        });
        
        var transportLimit = (logic === '1') ? truckLimit : (logic === '4' ? rvLimit : carLimit);
        var storageLimit = (logic === '3' || logic === '4') ? rvLimit : truckLimit;
        
        var maxItems = Math.floor(storageLimit / 0.2);
        var servingsPerDish = Math.floor(maxItems / totalComponentsPerServing);
        var truckItems = Math.floor(truckLimit / 0.2);
        var truckServings = Math.floor(truckItems / totalComponentsPerServing);
        
        var rawRequired = {};
        var truckLoad = {};
        var totalRevenue = 0;
        var totalCost = 0;
        var pricesHtml = '<strong>📋 ЦЕННИКИ ДЛЯ ВИТРИНЫ ФУДТРАКА:</strong><ul style="list-style-type:none;padding-left:0;">';
        var calcPrices = {};
        var calcCosts = {};
        
        var prices = {};
        for (var key in RAW_PRICES) { prices[key] = RAW_PRICES[key]; }
        prices['рыба'] = fishPrice;
        
        selected.forEach(function(dish) {
            var dishIdx = DISH_DATABASE.indexOf(dish);
            var cost = 0;
            
            for (var comp in dish.recipe) {
                var qtyPerServing = dish.recipe[comp];
                var totalQty = qtyPerServing * servingsPerDish;
                var tQty = qtyPerServing * truckServings;
                
                rawRequired[comp] = (rawRequired[comp] || 0) + totalQty;
                
                var isPrep = PREP_ITEMS.indexOf(comp) !== -1;
                var isBase = BASE_INGREDIENTS.indexOf(comp) !== -1;
                
                if (isPrep) {
                    truckLoad[comp] = (truckLoad[comp] || 0) + tQty;
                } else if (isBase) {
                    var usedForPrep = false;
                    for (var prep in PREP_RECIPES) {
                        if (PREP_RECIPES[prep] && PREP_RECIPES[prep][comp] && dish.recipe[prep]) {
                            usedForPrep = true;
                            break;
                        }
                    }
                    if (!usedForPrep || (logic !== '3' && logic !== '4')) {
                        truckLoad[comp] = (truckLoad[comp] || 0) + tQty;
                    }
                }
                
                if (comp === 'масло') cost += qtyPerServing * prices['молоко'];
                else if (comp === 'тесто') cost += qtyPerServing * (prices['мука'] + prices['яйцо']);
                else if (prices[comp]) cost += qtyPerServing * prices[comp];
                else if (PREP_PRICES[comp]) cost += qtyPerServing * PREP_PRICES[comp];
            }
            
            var price = Math.round(cost * (1 + margin / 100) / 5) * 5;
            calcPrices[dishIdx] = price;
            calcCosts[dishIdx] = cost;
            
            totalCost += servingsPerDish * cost;
            totalRevenue += servingsPerDish * price;
            
            pricesHtml += '<li style="margin-bottom:8px;padding:8px;background:#fff;border-radius:4px;border-left:4px solid #2980b9;">💵 <b>' + dish.name + '</b> ➜ Цена: <strong style="color:#2980b9;">$' + price + '</strong> <small>(себес: $' + cost + ')</small> | Смена: <b>' + servingsPerDish + ' порц.</b></li>';
        });
        pricesHtml += '</ul>';
        
        Store.set('calculatedPrices', calcPrices);
        Store.set('calculatedCosts', calcCosts);
        
        var finalRequired = {};
        for (var k in rawRequired) {
            var truckQty = prepStock.truck[k] || 0;
            var rvQty = (logic === '3' || logic === '4') ? (prepStock.rvStorage[k] || 0) : 0;
            finalRequired[k] = Math.max(0, rawRequired[k] - truckQty - rvQty);
        }
        
        var rawToBuy = {};
        for (var k in finalRequired) {
            var qty = finalRequired[k];
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
            }
            else if (k === 'стейк_фр_заг') {
                rawToBuy['мясо'] = (rawToBuy['мясо'] || 0) + qty;
                rawToBuy['фрукты'] = (rawToBuy['фрукты'] || 0) + qty;
                rawToBuy['сахар'] = (rawToBuy['сахар'] || 0) + qty;
            }
            else if (k === 'рыба_фр_заг') {
                rawToBuy['рыба'] = (rawToBuy['рыба'] || 0) + qty;
                rawToBuy['фрукты'] = (rawToBuy['фрукты'] || 0) + qty;
                rawToBuy['сахар'] = (rawToBuy['сахар'] || 0) + qty;
            }
            else if (k === 'картофельное_пюре') {
                rawToBuy['овощи'] = (rawToBuy['овощи'] || 0) + qty;
                rawToBuy['молоко'] = (rawToBuy['молоко'] || 0) + qty * 2;
            }
            else if (k === 'котлета' || k === 'сухая_котлета') {
                rawToBuy['мясо'] = (rawToBuy['мясо'] || 0) + qty;
            }
            else if (k === 'рыбная_котлета' || k === 'сухая_рыбная_котлета') {
                rawToBuy['рыба'] = (rawToBuy['рыба'] || 0) + qty;
            }
            else if (k === 'карамель') rawToBuy['сахар'] = (rawToBuy['сахар'] || 0) + qty;
            else if (k === 'мороженое') {
                rawToBuy['молоко'] = (rawToBuy['молоко'] || 0) + qty * 2;
                rawToBuy['сахар'] = (rawToBuy['сахар'] || 0) + qty;
                rawToBuy['яйцо'] = (rawToBuy['яйцо'] || 0) + qty;
            }
            else if (BASE_INGREDIENTS.indexOf(k) !== -1) {
                rawToBuy[k] = (rawToBuy[k] || 0) + qty;
            }
        }
        
        var totalWeight = 0;
        var baseCost = 0;
        var fishCost = 0;
        var shopHtml = '<ul>';
        var hasDeficit = false;
        
        for (var k in rawToBuy) {
            var stock = rawStock[k] || 0;
            var deficit = Math.max(0, rawToBuy[k] - stock);
            if (deficit <= 0) continue;
            
            hasDeficit = true;
            if (k === 'мясо' || k === 'рыба' || k === 'лосось' || k === 'тунец' || k === 'такифугу' || k === 'мальма') {
                var pcs = Math.ceil(deficit);
                var cost = pcs * prices[k];
                if (k === 'мясо') baseCost += cost; else fishCost += cost;
                totalWeight += pcs * 0.1;
                shopHtml += '<li><strong>' + (COMPONENT_NAMES[k] || k).toUpperCase() + ':</strong> ' + pcs + ' шт. — $' + cost.toLocaleString() + '</li>';
            } else {
                var boxes = Math.ceil(deficit / 10);
                var cost = boxes * 10 * prices[k];
                baseCost += cost;
                totalWeight += boxes * 2.0;
                shopHtml += '<li><strong>' + (COMPONENT_NAMES[k] || k).toUpperCase() + ':</strong> ' + boxes + ' кор. (' + (boxes * 10) + ' порц.) — $' + cost.toLocaleString() + '</li>';
            }
        }
        shopHtml += '</ul>';
        
        if (this.errorBox) this.errorBox.style.display = 'none';
        if (this.resultBox) this.resultBox.style.display = 'block';
        if (this.noCalcMsg) this.noCalcMsg.style.display = 'none';
        
        var totalExpense = baseCost + fishCost;
        var info = '<p>Выбранных позиций: <strong>' + selected.length + '</strong>. На позицию: <strong>' + servingsPerDish + ' порц.</strong> (компонентов на порцию: ' + totalComponentsPerServing + ')</p>';
        info += '<p>🏪 Бюджет на оптовую базу: <b>$' + baseCost.toLocaleString() + '</b> | 🎣 Наличка на скупку рыбы: <b style="color:#e67e22;">$' + fishCost.toLocaleString() + '</b></p>';
        info += '<p><strong>🔥 ОБЩИЙ РАСХОД:</strong> <span style="color:#2980b9;font-weight:bold;">$' + totalExpense.toLocaleString() + '</span></p>' + (hasDeficit ? shopHtml : '<p>✅ ЗАПАСОВ СЫРЬЯ ХВАТАЕТ!</p>');
        
        if (this.shoppingList) this.shoppingList.innerHTML = info;
        
        var trips = Math.ceil(totalWeight / transportLimit);
        var transportHtml = '<p>⚖️ Вес сырья для закупки: <strong>' + totalWeight.toFixed(1) + ' кг</strong> (Лимит транспорта: ' + transportLimit + ' кг).</p>';
        
        if (logic === '1' && totalWeight > transportLimit) {
            if (this.errorBox) {
                this.errorBox.style.display = 'block';
                this.errorBox.innerHTML = '⚠️ ПЕРЕГРУЗ! Вес закупки превышает лимит.';
            }
            if (this.resultBox) this.resultBox.style.display = 'none';
            return;
        } else if (totalWeight > transportLimit) {
            transportHtml += '<p style="color:#c0392b;font-weight:bold;">⚠️ Потребуется: ' + trips + ' рейса(ов).</p>';
        } else if (totalWeight > 0) {
            transportHtml += '<p style="color:#27ae60;font-weight:bold;">✅ Доставится за 1 рейс!</p>';
        }
        
        if (this.transportPlan) this.transportPlan.innerHTML = transportHtml;
        
        if (this.walkStats) {
            this.walkStats.innerHTML = (totalWeight > 0 && logic === '2') 
                ? '<p>🏃 Перетаскивание: <strong>' + Math.ceil(totalWeight / 10) + ' ходок</strong> (по ~10 кг).</p>' 
                : '<p>✅ Разгрузка не требуется.</p>';
        }
        
        var totalPrepWeight = 0;
        var prepItems = [];
        
        for (var k in truckLoad) {
            var name = COMPONENT_NAMES[k] || k;
            var qty = truckLoad[k];
            var weight = qty * 0.2;
            totalPrepWeight += weight;
            
            var storageLabel = '';
            if (logic === '3' || logic === '4') {
                var origQty = rawRequired[k] || qty;
                var rvReserve = Math.max(0, origQty - qty);
                if (rvReserve > 0) storageLabel = ' | 🏠 в резерв Кемпера: <span style="color:#e67e22;">' + Math.round(rvReserve) + ' шт.</span>';
            }
            
            prepItems.push('<li><b>' + name + ':</b> 🚚 в Фудтрак: <strong style="color:#27ae60;">' + qty + ' шт.</strong> (' + weight.toFixed(1) + ' кг)' + storageLabel + '</li>');
        }
        
        var truckTrips = Math.ceil(totalPrepWeight / truckLimit);
        var truckHtml = '<p><small>*Переложите из хранилища в холодильник фудтрака:</small></p>';
        truckHtml += '<p style="background: #e8f4f8; padding: 10px; border-radius: 4px; margin: 10px 0;"><strong>⚖️ Общий вес заготовок: ' + totalPrepWeight.toFixed(1) + ' кг</strong> (Лимит: ' + truckLimit + ' кг)';
        truckHtml += totalPrepWeight > truckLimit 
            ? '<br><span style="color: #e67e22;">⚠️ Потребуется ' + truckTrips + ' рейса(ов)</span>' 
            : '<br><span style="color: #27ae60;">✅ Вмещается за 1 рейс</span>';
        truckHtml += '</p><ul>' + prepItems.join('') + '</ul>';
        
        if (this.truckLoading) this.truckLoading.innerHTML = truckHtml;
        
        var profit = totalRevenue - totalCost;
        var economyHtml = pricesHtml + '<hr><p>Себес: <strong>$' + totalCost.toLocaleString() + '</strong> | Выручка: <strong>$' + totalRevenue.toLocaleString() + '</strong></p><p style="font-size:16px;">💰 <b>Прибыль:</b> <span style="color:#27ae60;font-weight:bold;">$' + profit.toLocaleString() + '</span></p>';
        
        if (this.economyBlock) this.economyBlock.innerHTML = economyHtml;
        
        EventBus.emit('procurement:calculated', { selected: selected, prices: calcPrices, costs: calcCosts });
    }
};

window.Procurement = Procurement;
