// ==================== РАБОЧАЯ СТАНЦИЯ ====================

const Workstation = {
    init: function() {
        this.cacheElements();
        this.bindEvents();
        this.loadFromStore();
    },
    
    cacheElements: function() {
        this.posGrid = document.getElementById('pos_menu_grid');
        this.orderBlock = document.getElementById('pos_active_order_block');
        this.orderItems = document.getElementById('pos_current_items');
        this.orderTotal = document.getElementById('pos_current_total');
        this.kitchenTicket = document.getElementById('pos_kitchen_ticket');
        this.stockDisplay = document.getElementById('current_stock_display');
        this.revenueEl = document.getElementById('pos_shift_revenue');
        this.profitEl = document.getElementById('pos_shift_profit');
        this.ordersEl = document.getElementById('pos_shift_orders');
        
        // ✅ ПРАВИЛЬНЫЕ ID (с дефисами, как в HTML)
        this.completeBtn = document.getElementById('btn-complete-order') || 
                           document.querySelector('.btn-complete') ||
                           document.querySelector('[onclick*="complete"]');
        this.resetBtn = document.getElementById('btn-reset-shift') ||
                        document.querySelector('.btn-reset') ||
                        document.querySelector('[onclick*="reset"]');
        this.loadStockBtn = document.getElementById('btn-load-stock') ||
                            document.querySelector('.btn-load-stock') ||
                            document.querySelector('[onclick*="initStock"]');
        this.restockBtn = document.getElementById('btn-restock') ||
                          document.querySelector('.btn-restock') ||
                          document.querySelector('[onclick*="openRestock"]');
        this.prepareBtn = document.getElementById('btn-prepare') ||
                          document.querySelector('.btn-prepare') ||
                          document.querySelector('[onclick*="openPrepare"]');
        this.wasteBtn = document.getElementById('btn-waste') ||
                        document.querySelector('.btn-waste') ||
                        document.querySelector('[onclick*="openWaste"]');
    },
    
    bindEvents: function() {
        var self = this;
        
        if (this.completeBtn) {
            this.completeBtn.addEventListener('click', function() { self.completeOrder(); });
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', function() { self.resetShift(); });
        }
        if (this.loadStockBtn) {
            this.loadStockBtn.addEventListener('click', function() { self.loadStockFromInventory(); });
        }
        if (this.restockBtn) {
            this.restockBtn.addEventListener('click', function() { self.openRestockModal(); });
        }
        if (this.prepareBtn) {
            this.prepareBtn.addEventListener('click', function() { self.openPrepareModal(); });
        }
        if (this.wasteBtn) {
            this.wasteBtn.addEventListener('click', function() { self.openWasteModal(); });
        }
        
        // Делегирование на document для кнопок + и -
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('pos-btn-plus')) {
                e.preventDefault();
                e.stopPropagation();
                var idx = parseInt(e.target.getAttribute('data-index'));
                if (!isNaN(idx)) {
                    self.addToOrder(idx, 1);
                }
                return;
            }
            if (e.target.classList.contains('pos-btn-minus')) {
                e.preventDefault();
                e.stopPropagation();
                var idx = parseInt(e.target.getAttribute('data-index'));
                if (!isNaN(idx)) {
                    self.addToOrder(idx, -1);
                }
                return;
            }
        });
        
        // Слушатели событий
        EventBus.on('store:ready', function() { self.loadFromStore(); });
        
        // 🔥 Обновляет кассу после расчёта закупки ИЛИ изменения настроек срочности
        EventBus.on('procurement:calculated', function() { 
            self.renderPOS(); 
            self.renderOrder(); 
        });
        
        EventBus.on('state:currentOrder:changed', function() { self.renderOrder(); });
        EventBus.on('state:shift:changed', function() { self.updateShiftDisplay(); });
        EventBus.on('state:waste:changed', function() { self.updateShiftDisplay(); });
    },
    
    loadFromStore: function() {
        this.renderPOS();
        this.renderOrder();
        this.updateShiftDisplay();
        this.showCurrentStock();
    },
    
    renderPOS: function() {
        if (!this.posGrid || !window.DISH_DATABASE) return;
        
        this.posGrid.innerHTML = '';
        
        var selectedDishes = Store.get('selectedDishes');
        var prices = Store.get('calculatedPrices');
        var urgentPercent = Store.get('urgentMarkup') || 0;
        var isUrgent = Store.get('isCurrentOrderUrgent') || false;
        var selected = DISH_DATABASE.filter(function(_, idx) { return selectedDishes[idx]; });
        
        if (selected.length === 0) {
            this.posGrid.innerHTML = '<p style="grid-column: 1/-1; color: #7f8c8d; text-align: center;">Выберите блюда во вкладке "Настройки"</p>';
            return;
        }
        
        var self = this;
        selected.forEach(function(dish) {
            var idx = DISH_DATABASE.indexOf(dish);
            
            // 1. Берем базовую цену (уже с обычной наценкой из закупок)
            var basePrice = prices[idx] || dish.price;
            
            // 2. Считаем финальную цену с учетом срочности
            var finalPrice = basePrice;
            if (isUrgent && urgentPercent > 0) {
                finalPrice = Math.round(basePrice * (1 + urgentPercent / 100) / 5) * 5;
            }
            
            var currentOrder = Store.get('currentOrder');
            var qty = currentOrder[idx] || 0;
            
            // 3. Формируем лейбл срочности
            var urgentLabel = '';
            if (isUrgent && urgentPercent > 0) {
                urgentLabel = '<div style="font-size: 10px; color: #e67e22; font-weight: bold; margin-bottom: 2px;">⚡ СРОЧНО +' + urgentPercent + '%</div>';
            }
            
            var btn = document.createElement('div');
            btn.className = 'pos-item';
            btn.setAttribute('data-index', idx);
            
            btn.innerHTML = 
                '<div style="font-size: 13px; font-weight: bold; text-align: center; line-height: 1.2;">' + dish.name + '</div>' +
                urgentLabel +
                '<div style="font-size: 14px; color: #27ae60; font-weight: bold; margin-top: 2px;">$' + finalPrice + '</div>' +
                '<div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">' +
                    '<button class="pos-btn-minus" data-index="' + idx + '" style="background: #e74c3c; color: white; border: none; width: 28px; height: 28px; border-radius: 50%; font-weight: bold; cursor: pointer; font-size: 16px;">-</button>' +
                    '<span class="pos-qty" data-index="' + idx + '" style="font-weight: bold; font-size: 16px; min-width: 20px; text-align: center;">' + qty + '</span>' +
                    '<button class="pos-btn-plus" data-index="' + idx + '" style="background: #27ae60; color: white; border: none; width: 28px; height: 28px; border-radius: 50%; font-weight: bold; cursor: pointer; font-size: 16px;">+</button>' +
                '</div>';
                
            self.posGrid.appendChild(btn);
        });
        
        this.updatePOSAvailability();
    },
    
    addToOrder: function(idx, change) {
        var currentOrder = Store.get('currentOrder');
        currentOrder[idx] = (currentOrder[idx] || 0) + change;
        if (currentOrder[idx] <= 0) delete currentOrder[idx];
        Store.set('currentOrder', currentOrder);
        this.renderPOS();
        this.renderOrder();
    },
    
    renderOrder: function() {
        var currentOrder = Store.get('currentOrder');
        var indices = Object.keys(currentOrder);
        
        if (indices.length === 0) {
            if (this.orderBlock) this.orderBlock.style.display = 'none';
            return;
        }
        
        if (this.orderBlock) this.orderBlock.style.display = 'block';
        
        var itemsHtml = '';
        var total = 0;
        var prices = Store.get('calculatedPrices');
        var urgentPercent = Store.get('urgentMarkup') || 0;
        var isUrgent = Store.get('isCurrentOrderUrgent') || false;
        
        var self = this;
        indices.forEach(function(idxStr) {
            var idx = parseInt(idxStr);
            var qty = currentOrder[idx];
            var dish = DISH_DATABASE[idx];
            
            // Расчет цены с учетом срочности
            var basePrice = prices[idx] || dish.price;
            var finalPrice = basePrice;
            if (isUrgent && urgentPercent > 0) {
                finalPrice = Math.round(basePrice * (1 + urgentPercent / 100) / 5) * 5;
            }
            
            itemsHtml += '<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>' + dish.name + ' x' + qty + '</span><strong>$' + (finalPrice * qty).toLocaleString() + '</strong></div>';
            total += finalPrice * qty;
        });
        
        if (this.orderItems) this.orderItems.innerHTML = itemsHtml;
        if (this.orderTotal) this.orderTotal.innerText = '$' + total.toLocaleString();
        
    // 🔥 ДОБАВЛЯЕМ ПЕРЕКЛЮЧАТЕЛЬ СРОЧНОСТИ
    var oldToggle = this.orderBlock.querySelector('.urgent-toggle-container');
    if (oldToggle) oldToggle.remove();
    
    if (urgentPercent > 0) {
        var toggleContainer = document.createElement('div');
        toggleContainer.className = 'urgent-toggle-container';
        toggleContainer.style.cssText = 'margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #f39c12;';
        
        var label = document.createElement('label');
        label.style.cssText = 'font-weight: bold; color: #d35400; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%;';
        // ИСПРАВЛЕНО: используем конкатенацию вместо template literals
        label.innerHTML = '<span style="font-size: 18px;">⚡</span> Срочный заказ (+' + urgentPercent + '%)';
        
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isUrgent;
        checkbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: #e67e22;';
        checkbox.id = 'urgent-order-checkbox';
        
        label.prepend(checkbox);
        
        var self = this;
        checkbox.addEventListener('change', function(e) {
            Store.set('isCurrentOrderUrgent', e.target.checked);
            self.renderOrder();
            self.renderPOS();
        });
        
        toggleContainer.appendChild(label);
        this.orderBlock.appendChild(toggleContainer);
    }
        
        this.renderKitchenTicket(indices);
        
        // Кнопка очистки
        var existingClearBtn = this.orderBlock.querySelector('.btn-clear-order');
        if (existingClearBtn) existingClearBtn.remove();
        
        var clearBtn = document.createElement('button');
        clearBtn.className = 'btn-clear-order';
        clearBtn.innerText = '🗑️ Очистить текущий заказ';
        clearBtn.style.cssText = 'width: 100%; background: #e74c3c; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; margin-top: 15px; font-weight: bold; font-size: 14px;';
        clearBtn.onclick = function() {
            Store.set('currentOrder', {});
            Store.set('isCurrentOrderUrgent', false); // Сбрасываем срочность
            EventBus.emit('state:currentOrder:changed');
        };
        this.orderBlock.appendChild(clearBtn);
    },
    
    renderKitchenTicket: function(indices) {
        if (!this.kitchenTicket) return;
        
        var currentOrder = Store.get('currentOrder');
        var isUrgent = Store.get('isCurrentOrderUrgent') || false;
        
        var html = '<div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #f39c12; border-radius: 8px; padding: 15px; margin-bottom: 15px;">';
        html += '<div style="font-size: 20px; font-weight: bold; color: #d35400; margin-bottom: 15px; text-align: center;">🧾 ЧЕК КУХНИ</div>';
        
        var self = this;
        indices.forEach(function(idxStr) {
            var idx = parseInt(idxStr);
            var qty = currentOrder[idx];
            var dish = DISH_DATABASE[idx];
            
            // Добавляем красную метку "СРОЧНО" в чек кухни
            var kitchenBadge = '';
            if (isUrgent) {
                kitchenBadge = '<span style="background: #e74c3c; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 10px;">⚡ СРОЧНО</span>';
            }

            html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: white; border-radius: 6px; border-left: 4px solid #e67e22;">';
            html += '<div style="font-size: 18px; font-weight: bold; color: #2c3e50;">' + dish.name + kitchenBadge + '</div>';
            html += '<div style="font-size: 24px; font-weight: bold; color: #e67e22; background: #fff3cd; padding: 5px 15px; border-radius: 20px; min-width: 40px; text-align: center;">x' + qty + '</div>';
            html += '</div>';
        });
        html += '</div>';
        
        html += '<div style="background: #f8f9fa; border: 2px solid #8e44ad; border-radius: 8px; padding: 15px;">';
        html += '<div style="font-size: 18px; font-weight: bold; color: #8e44ad; margin-bottom: 15px; text-align: center;">📖 Рецепты</div>';
        
        indices.forEach(function(idxStr) {
            var idx = parseInt(idxStr);
            var dish = DISH_DATABASE[idx];
            
            html += '<div style="background: white; border: 1px solid #e0e0e0; padding: 12px; margin-bottom: 12px; border-radius: 4px;">';
            html += '<h4 style="margin: 0 0 8px 0; color: #2c3e50;">' + dish.name + '</h4>';
            html += '<div style="font-size: 12px; color: #7f8c8d; margin-bottom: 10px; font-style: italic;">' + dish.craft + '</div>';
            html += '<strong style="color: #27ae60; font-size: 13px;">🧪 Компоненты:</strong>';
            html += '<ol style="margin: 8px 0; padding-left: 20px; line-height: 1.6; font-size: 14px;">';
            
            for (var component in dish.recipe) {
                var qty = dish.recipe[component];
                var compName = COMPONENT_NAMES[component] || component;
                html += '<li style="margin-bottom: 6px;"><strong>' + compName + '</strong> — ' + qty + ' шт.';
                html += self.renderComponentChain(component, qty);
                html += '</li>';
            }
            html += '</ol></div>';
        });
        html += '</div>';
        
        this.kitchenTicket.innerHTML = html;
    },
    
    renderComponentChain: function(component, qty) {
        var recipe = CRAFT_RECIPES[component];
        if (!recipe) return '';
        
        var html = '<ol style="margin: 5px 0 5px 20px; padding-left: 20px; line-height: 1.7;">';
        
        for (var subComp in recipe) {
            if (subComp === 'инструменты') continue;
            var subQty = recipe[subComp] * qty;
            var subName = COMPONENT_NAMES[subComp] || subComp;
            
            if (BASE_INGREDIENTS.indexOf(subComp) !== -1) {
                html += '<li><strong>' + subName + '</strong> — ' + subQty + ' шт. <span style="color: #27ae60;">(базовый)</span></li>';
            } else {
                html += '<li><strong>' + subName + '</strong> — ' + subQty + ' шт.';
                html += this.renderComponentChain(subComp, subQty);
                html += '</li>';
            }
        }
        
        if (recipe.инструменты) {
            var toolsHtml = recipe.инструменты.map(function(t) {
                var icon = TOOL_ICONS[t.toLowerCase()] || '🔧';
                return '<span style="display: inline-flex; align-items: center; margin: 2px 5px; padding: 3px 8px; background: #fff3cd; border-radius: 4px; font-size: 14px;">' + icon + ' ' + t + '</span>';
            }).join(' ');
            html += '<li style="margin-top: 5px; color: #555;">Инструменты: ' + toolsHtml + '</li>';
        }
        
        html += '</ol>';
        return html;
    },
    
    completeOrder: function() {
        var currentOrder = Store.get('currentOrder');
        var indices = Object.keys(currentOrder);
        if (indices.length === 0) return;
        
        var prepStock = Store.get('prepStock');
        var hasError = false;
        
        indices.forEach(function(idxStr) {
            if (hasError) return;
            var idx = parseInt(idxStr);
            var dish = DISH_DATABASE[idx];
            for (var comp in dish.recipe) {
                var needed = dish.recipe[comp] * currentOrder[idx];
                if (!prepStock.truck[comp] || prepStock.truck[comp] < needed) {
                    alert('❌ Недостаточно: ' + (COMPONENT_NAMES[comp] || comp) + ' для: ' + dish.name);
                    hasError = true;
                }
            }
        });
        
        if (hasError) return;
        
        var prices = Store.get('calculatedPrices');
        var costs = Store.get('calculatedCosts');
        var shift = Store.get('shift');
        var urgentPercent = Store.get('urgentMarkup') || 0;
        var isUrgent = Store.get('isCurrentOrderUrgent') || false;
        
        var revenue = 0;
        var cost = 0;
        
        indices.forEach(function(idxStr) {
            var idx = parseInt(idxStr);
            var qty = currentOrder[idx];
            
            // Расчет финальной цены для проведения заказа
            var basePrice = prices[idx] || DISH_DATABASE[idx].price;
            var finalPrice = basePrice;
            if (isUrgent && urgentPercent > 0) {
                finalPrice = Math.round(basePrice * (1 + urgentPercent / 100) / 5) * 5;
            }
            
            var c = costs[idx] || 0;
            revenue += finalPrice * qty;
            cost += c * qty;
        });
        
        shift.revenue += revenue;
        shift.profit += (revenue - cost);
        shift.orders += 1;
        Store.set('shift', shift);
        
        indices.forEach(function(idxStr) {
            var idx = parseInt(idxStr);
            var dish = DISH_DATABASE[idx];
            for (var comp in dish.recipe) {
                var needed = dish.recipe[comp] * currentOrder[idx];
                prepStock.truck[comp] = (prepStock.truck[comp] || 0) - needed;
                if (prepStock.truck[comp] < 0) prepStock.truck[comp] = 0;
            }
        });
        Store.set('prepStock', prepStock);
        Store.set('currentOrder', {});
        Store.set('isCurrentOrderUrgent', false); // Сбрасываем флаг срочности
        
        this.showStockNotifications(prepStock);
        this.renderPOS();
        this.showCurrentStock();
        
        alert('✅ Заказ проведён! Выручка: $' + revenue.toLocaleString());
    },
    
    showStockNotifications: function(prepStock) {
        var warnings = [];
        var critical = [];
        
        for (var comp in prepStock.truck) {
            var qty = prepStock.truck[comp];
            if (qty === 0) critical.push(comp);
            else if (qty <= 5) warnings.push(comp);
        }
        
        if (warnings.length === 0 && critical.length === 0) return;
        
        var html = '<div style="background: #fff3cd; border-left: 4px solid #f39c12; padding: 12px; border-radius: 6px; margin-top: 15px;">';
        html += '<strong style="color: #d35400;">⚠️ Внимание к остаткам:</strong><ul style="margin: 8px 0 0 20px; padding: 0;">';
        
        critical.forEach(function(comp) {
            html += '<li style="color: #e74c3c; font-weight: bold;">🔴 ' + (COMPONENT_NAMES[comp] || comp) + ' закончился!</li>';
        });
        
        warnings.forEach(function(comp) {
            html += '<li style="color: #e67e22;">⚠️ ' + (COMPONENT_NAMES[comp] || comp) + ': осталось ' + prepStock.truck[comp] + ' шт.</li>';
        });
        
        html += '</ul></div>';
        
        var posBlock = document.getElementById('cash_register_block');
        if (posBlock) {
            var existing = posBlock.querySelector('.stock-notifications');
            if (existing) existing.remove();
            var div = document.createElement('div');
            div.className = 'stock-notifications';
            div.innerHTML = html;
            posBlock.appendChild(div);
        }
    },
    
    updatePOSAvailability: function() {
        var prepStock = Store.get('prepStock');
        
        this.posGrid.querySelectorAll('.pos-item').forEach(function(item) {
            var idx = parseInt(item.getAttribute('data-index'));
            var dish = DISH_DATABASE[idx];
            var available = true;
            
            for (var comp in dish.recipe) {
                var needed = dish.recipe[comp];
                if (!prepStock.truck[comp] || prepStock.truck[comp] < needed) {
                    available = false;
                    break;
                }
            }
            
            item.style.opacity = available ? '1' : '0.4';
            item.style.pointerEvents = available ? 'auto' : 'none';
        });
    },
    
    showCurrentStock: function() {
        if (!this.stockDisplay) return;
        
        var prepStock = Store.get('prepStock');
        
        var html = '<div style="background: #e8f4f8; border-left: 4px solid #2980b9; padding: 12px; border-radius: 6px; margin-bottom: 15px;">';
        html += '<strong style="color: #2c3e50;">📦 Остатки в фудтраке:</strong>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 10px;">';
        
        for (var comp in prepStock.truck) {
            var name = COMPONENT_NAMES[comp] || comp;
            var qty = prepStock.truck[comp];
            var color = '#27ae60';
            if (qty <= 5) color = '#e67e22';
            if (qty === 0) color = '#e74c3c';
            
            html += '<div style="background: white; padding: 6px 10px; border-radius: 4px; font-size: 13px;">';
            html += '<span style="color: ' + color + '; font-weight: bold;">' + qty + '</span> ' + name;
            html += '</div>';
        }
        
        html += '</div></div>';
        this.stockDisplay.innerHTML = html;
    },
    
    updateShiftDisplay: function() {
        var shift = Store.get('shift');
        var waste = Store.get('waste');
        
        if (this.revenueEl) this.revenueEl.innerText = '$' + shift.revenue.toLocaleString();
        if (this.profitEl) this.profitEl.innerText = '$' + (shift.profit - waste.total).toLocaleString();
        if (this.ordersEl) this.ordersEl.innerText = shift.orders;
    },
    
    loadStockFromInventory: function() {
        var logic = Store.get('businessLogic');
        var rawStock = Store.get('rawStock');
        var prepStock = Store.get('prepStock');
        
        prepStock.truck = {};
        prepStock.rvStorage = {};
        prepStock.rvCabinet = {};
        
        BASE_INGREDIENTS.forEach(function(id) {
            var val = rawStock[id] || 0;
            if (logic === '1') {
                prepStock.truck[id] = val;
            } else if (logic === '2') {
                prepStock.rvStorage[id] = val;
            } else {
                prepStock.rvStorage[id] = Math.floor(val / 2);
                prepStock.rvCabinet[id] = val - Math.floor(val / 2);
            }
        });
        
        Store.set('prepStock', prepStock);
        this.showCurrentStock();
        this.renderPOS();
        
        alert('✅ Остатки загружены со склада!');
    },
    
    openRestockModal: function() {
        var prepStock = Store.get('prepStock');
        var logic = Store.get('businessLogic');
        var self = this;
        
        var html = '<div style="max-height: 60vh; overflow-y: auto;">';
        html += '<p style="color: #7f8c8d; font-size: 14px;">Выберите компоненты для догрузки в фудтрак:</p>';
        
        var sources = [];
        if (logic === '2' || logic === '3' || logic === '4') sources.push({ key: 'rvStorage', name: ' Багажник' });
        if (logic === '3' || logic === '4') sources.push({ key: 'rvCabinet', name: ' Шкаф' });
        
        if (sources.length === 0) {
            html += '<p style="color: #e74c3c;">Нет хранилищ для догрузки (выбрана логика "Только фудтрак").</p>';
        } else {
            sources.forEach(function(src) {
                var items = Object.keys(prepStock[src.key]).filter(function(k) { return prepStock[src.key][k] > 0; });
                if (items.length === 0) return;
                
                html += '<h4 style="margin: 15px 0 8px 0; color: #2c3e50;">' + src.name + ':</h4>';
                items.forEach(function(comp) {
                    var name = COMPONENT_NAMES[comp] || comp;
                    html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px;">';
                    html += '<span>' + name + ' (' + prepStock[src.key][comp] + ' шт.)</span>';
                    html += '<div style="display: flex; gap: 5px;">';
                    html += '<input type="number" id="restock_' + src.key + '_' + comp + '" value="10" min="1" max="' + prepStock[src.key][comp] + '" style="width: 60px; padding: 4px;">';
                    html += '<button class="restock-btn" data-comp="' + comp + '" data-source="' + src.key + '" style="background: #27ae60; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">+</button>';
                    html += '</div></div>';
                });
            });
        }
        html += '</div>';
        
        this.showModal('🔄 Догрузить в фудтрак', html);
        
        setTimeout(function() {
            document.querySelectorAll('.restock-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var comp = btn.getAttribute('data-comp');
                    var source = btn.getAttribute('data-source');
                    var input = document.getElementById('restock_' + source + '_' + comp);
                    var qty = parseInt(input.value) || 0;
                    
                    if (qty > 0 && prepStock[source][comp] >= qty) {
                        prepStock[source][comp] -= qty;
                        prepStock.truck[comp] = (prepStock.truck[comp] || 0) + qty;
                        Store.set('prepStock', prepStock);
                        self.showCurrentStock();
                        self.renderPOS();
                        self.openRestockModal();
                        alert('✅ Догружено: ' + (COMPONENT_NAMES[comp] || comp) + ' x' + qty);
                    }
                });
            });
        }, 100);
    },

    openPrepareModal: function() {
        var prepStock = Store.get('prepStock');
        var self = this;
        
        var html = '<div style="max-height: 60vh; overflow-y: auto;">';
        html += '<p style="color: #7f8c8d; font-size: 14px;">Выберите что приготовить из сырья:</p>';
        
        PREP_ITEMS.forEach(function(comp) {
            var name = COMPONENT_NAMES[comp] || comp;
            var recipe = PREP_RECIPES[comp];
            if (!recipe) return;
            
            html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px;">';
            html += '<span>' + name + ' (сейчас: ' + (prepStock.truck[comp] || 0) + ')</span>';
            html += '<div style="display: flex; gap: 5px;">';
            html += '<input type="number" id="prepare_' + comp + '" value="10" min="1" style="width: 60px; padding: 4px;">';
            html += '<button class="prepare-btn" data-comp="' + comp + '" style="background: #8e44ad; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">👨‍</button>';
            html += '</div></div>';
        });
        html += '</div>';
        
        this.showModal('👨‍🍳 Приготовить заготовки', html);
        
        setTimeout(function() {
            document.querySelectorAll('.prepare-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var comp = btn.getAttribute('data-comp');
                    var input = document.getElementById('prepare_' + comp);
                    var qty = parseInt(input.value) || 0;
                    
                    if (qty > 0 && self.prepareComponent(comp, qty)) {
                        alert('✅ Приготовлено: ' + (COMPONENT_NAMES[comp] || comp) + ' x' + qty);
                        self.openPrepareModal();
                    }
                });
            });
        }, 100);
    },

    prepareComponent: function(comp, qty) {
        var recipe = PREP_RECIPES[comp];
        if (!recipe) {
            alert('Этот компонент нельзя приготовить!');
            return false;
        }
        
        var prepStock = Store.get('prepStock');
        
        for (var raw in recipe) {
            if (raw === 'инструменты') continue;
            var needed = recipe[raw] * qty;
            var available = (prepStock.truck[raw] || 0) + (prepStock.rvCabinet[raw] || 0) + (prepStock.rvStorage[raw] || 0);
            if (available < needed) {
                alert('❌ Недостаточно ' + (COMPONENT_NAMES[raw] || raw) + '! Нужно: ' + needed + ', есть: ' + available);
                return false;
            }
        }
        
        for (var raw in recipe) {
            if (raw === 'инструменты') continue;
            var needed = recipe[raw] * qty;
            var sources = ['truck', 'rvCabinet', 'rvStorage'];
            for (var i = 0; i < sources.length; i++) {
                if (needed <= 0) break;
                var src = sources[i];
                var available = prepStock[src][raw] || 0;
                var take = Math.min(available, needed);
                prepStock[src][raw] -= take;
                needed -= take;
            }
        }
        
        prepStock.truck[comp] = (prepStock.truck[comp] || 0) + qty;
        Store.set('prepStock', prepStock);
        this.showCurrentStock();
        this.renderPOS();
        
        return true;
    },

    openWasteModal: function() {
        var prepStock = Store.get('prepStock');
        var waste = Store.get('waste');
        var self = this;
        
        var html = '<div style="max-height: 60vh; overflow-y: auto;">';
        html += '<p style="color: #7f8c8d; font-size: 14px;">Выберите что списать:</p>';
        
        var rawItems = Object.keys(prepStock.truck).filter(function(k) { return BASE_INGREDIENTS.indexOf(k) !== -1; });
        if (rawItems.length > 0) {
            html += '<h4 style="margin: 15px 0 8px 0; color: #e74c3c;">🥩 Сырьё:</h4>';
            rawItems.forEach(function(comp) {
                var qty = prepStock.truck[comp] || 0;
                if (qty <= 0) return;
                var price = RAW_PRICES[comp] || 0;
                html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #fdf2f2; border-radius: 4px; margin-bottom: 5px;">';
                html += '<span>' + (COMPONENT_NAMES[comp] || comp) + ' (' + qty + ' шт.) — $' + price + '/шт</span>';
                html += '<div style="display: flex; gap: 5px;">';
                html += '<input type="number" id="waste_' + comp + '" value="1" min="1" max="' + qty + '" style="width: 60px; padding: 4px;">';
                html += '<button class="waste-btn" data-comp="' + comp + '" data-price="' + price + '" style="background: #e74c3c; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">️</button>';
                html += '</div></div>';
            });
        }
        
        var prepItems = Object.keys(prepStock.truck).filter(function(k) { return BASE_INGREDIENTS.indexOf(k) === -1; });
        if (prepItems.length > 0) {
            html += '<h4 style="margin: 15px 0 8px 0; color: #e67e22;">🍳 Заготовки:</h4>';
            prepItems.forEach(function(comp) {
                var qty = prepStock.truck[comp] || 0;
                if (qty <= 0) return;
                var price = PREP_PRICES[comp] || 0;
                html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #fff3cd; border-radius: 4px; margin-bottom: 5px;">';
                html += '<span>' + (COMPONENT_NAMES[comp] || comp) + ' (' + qty + ' шт.) — $' + price + '/шт</span>';
                html += '<div style="display: flex; gap: 5px;">';
                html += '<input type="number" id="waste_' + comp + '" value="1" min="1" max="' + qty + '" style="width: 60px; padding: 4px;">';
                html += '<button class="waste-btn" data-comp="' + comp + '" data-price="' + price + '" style="background: #e74c3c; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>';
                html += '</div></div>';
            });
        }
        
        if (waste.items && waste.items.length > 0) {
            html += '<hr style="margin: 15px 0;"><h4 style="margin: 0 0 8px 0; color: #7f8c8d;"> Списание за смену:</h4>';
            html += '<div style="background: #f8f9fa; padding: 10px; border-radius: 4px;">';
            waste.items.forEach(function(item) {
                html += '<div style="font-size: 13px; margin-bottom: 3px;">• ' + item.name + ': ' + item.qty + ' шт. (' + item.time + ') — $' + item.cost + '</div>';
            });
            html += '<div style="font-weight: bold; margin-top: 8px; color: #e74c3c;">Итого убыток: $' + waste.total + '</div>';
            html += '</div>';
        }
        html += '</div>';
        
        this.showModal('🗑️ Списать брак/отходы', html);
        
        setTimeout(function() {
            document.querySelectorAll('.waste-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var comp = btn.getAttribute('data-comp');
                    var price = parseInt(btn.getAttribute('data-price'));
                    var input = document.getElementById('waste_' + comp);
                    var qty = parseInt(input.value) || 0;
                    
                    if (qty > 0 && prepStock.truck[comp] >= qty) {
                        prepStock.truck[comp] -= qty;
                        Store.set('prepStock', prepStock);
                        
                        var w = Store.get('waste');
                        if (!w.items) w.items = [];
                        w.items.push({ name: COMPONENT_NAMES[comp] || comp, qty: qty, cost: qty * price, time: new Date().toLocaleTimeString() });
                        w.total = (w.total || 0) + qty * price;
                        Store.set('waste', w);
                        
                        self.showCurrentStock();
                        self.renderPOS();
                        self.updateShiftDisplay();
                        self.openWasteModal();
                        
                        alert('🗑️ Списано: ' + (COMPONENT_NAMES[comp] || comp) + ' x' + qty + ' (убыток: $' + (qty * price) + ')');
                    }
                });
            });
        }, 100);
    },

    showModal: function(title, content) {
        var modal = document.getElementById('sync_modal');
        var titleEl = document.getElementById('sync_modal_title');
        var contentEl = document.getElementById('sync_modal_content');
        
        if (modal && titleEl && contentEl) {
            titleEl.innerText = title;
            contentEl.innerHTML = content;
            modal.style.display = 'flex';
        } else {
            var tempDiv = document.createElement('div');
            tempDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
            tempDiv.innerHTML = '<div style="background:white;padding:20px;border-radius:8px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;"><h3>' + title + '</h3>' + content + '<button onclick="this.parentElement.parentElement.remove()" style="margin-top:15px;width:100%;padding:10px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;">Закрыть</button></div>';
            document.body.appendChild(tempDiv);
        }
    },
    
    resetShift: function() {
        if (!confirm('⚠️ Завершить смену и обнулить кассу?')) return;
        
        Store.set('shift', { revenue: 0, profit: 0, orders: 0 });
        Store.set('waste', { total: 0, items: [] });
        Store.set('currentOrder', {});
        Store.set('isCurrentOrderUrgent', false); // Сброс при завершении смены
        
        this.updateShiftDisplay();
        this.renderPOS();
        this.renderOrder();
        
        alert('✅ Смена завершена!');
    }
};

window.Workstation = Workstation;
