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
        
        this.completeBtn = document.getElementById('btn_complete_order') || 
                           document.querySelector('.btn-complete') ||
                           document.querySelector('[onclick*="complete"]');
        this.resetBtn = document.querySelector('[onclick*="reset"]') ||
                        document.getElementById('btn_reset_shift');
        this.loadStockBtn = document.querySelector('[onclick*="initStock"]') ||
                            document.getElementById('btn_load_stock');
        this.restockBtn = document.querySelector('[onclick*="openRestock"]') ||
                          document.getElementById('btn_restock');
        this.prepareBtn = document.querySelector('[onclick*="openPrepare"]') ||
                          document.getElementById('btn_prepare');
        this.wasteBtn = document.querySelector('[onclick*="openWaste"]') ||
                        document.getElementById('btn_waste');
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
    
    // 🔥 ВОТ ЭТА СТРОКА БЫЛА ПРОПУЩЕНА! Она обновляет кассу после расчёта закупки:
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
        var selected = DISH_DATABASE.filter(function(_, idx) { return selectedDishes[idx]; });
        
        if (selected.length === 0) {
            this.posGrid.innerHTML = '<p style="grid-column: 1/-1; color: #7f8c8d; text-align: center;">Выберите блюда во вкладке "Настройки"</p>';
            return;
        }
        
        var self = this;
        selected.forEach(function(dish) {
            var idx = DISH_DATABASE.indexOf(dish);
            var price = prices[idx] || dish.price;
            var currentOrder = Store.get('currentOrder');
            var qty = currentOrder[idx] || 0;
            
            var btn = document.createElement('div');
            btn.className = 'pos-item';
            btn.setAttribute('data-index', idx);
            btn.innerHTML = '<div style="font-size: 13px; font-weight: bold; text-align: center; line-height: 1.2;">' + dish.name + '</div>' +
                '<div style="font-size: 12px; color: #27ae60; font-weight: bold;">$' + price + '</div>' +
                '<div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">' +
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
        
        var self = this;
        indices.forEach(function(idxStr) {
            var idx = parseInt(idxStr);
            var qty = currentOrder[idx];
            var dish = DISH_DATABASE[idx];
            var price = prices[idx] || dish.price;
            itemsHtml += '<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>' + dish.name + ' x' + qty + '</span><strong>$' + (price * qty).toLocaleString() + '</strong></div>';
            total += price * qty;
        });
        
        if (this.orderItems) this.orderItems.innerHTML = itemsHtml;
        if (this.orderTotal) this.orderTotal.innerText = '$' + total.toLocaleString();
        
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
            EventBus.emit('state:currentOrder:changed');
        };
        this.orderBlock.appendChild(clearBtn);
    },
    
    renderKitchenTicket: function(indices) {
        if (!this.kitchenTicket) return;
        
        var currentOrder = Store.get('currentOrder');
        var html = '<div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #f39c12; border-radius: 8px; padding: 15px; margin-bottom: 15px;">';
        html += '<div style="font-size: 20px; font-weight: bold; color: #d35400; margin-bottom: 15px; text-align: center;">🧾 ЧЕК КУХНИ</div>';
        
        var self = this;
        indices.forEach(function(idxStr) {
            var idx = parseInt(idxStr);
            var qty = currentOrder[idx];
            var dish = DISH_DATABASE[idx];
            
            html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: white; border-radius: 6px; border-left: 4px solid #e67e22;">';
            html += '<div style="font-size: 18px; font-weight: bold; color: #2c3e50;">' + dish.name + '</div>';
            html += '<div style="font-size: 24px; font-weight: bold; color: #e67e22; background: #fff3cd; padding: 5px 15px; border-radius: 20px;">x' + qty + '</div>';
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
        
        var revenue = 0;
        var cost = 0;
        
        indices.forEach(function(idxStr) {
            var idx = parseInt(idxStr);
            var qty = currentOrder[idx];
            var price = prices[idx] || DISH_DATABASE[idx].price;
            var c = costs[idx] || 0;
            revenue += price * qty;
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
        alert('Функция догрузки в разработке');
    },
    
    openPrepareModal: function() {
        alert('Функция приготовления в разработке');
    },
    
    openWasteModal: function() {
        alert('Функция списания в разработке');
    },
    
    resetShift: function() {
        if (!confirm('⚠️ Завершить смену и обнулить кассу?')) return;
        
        Store.set('shift', { revenue: 0, profit: 0, orders: 0 });
        Store.set('waste', { total: 0, items: [] });
        Store.set('currentOrder', {});
        
        this.updateShiftDisplay();
        this.renderPOS();
        this.renderOrder();
        
        alert('✅ Смена завершена!');
    }
};

window.Workstation = Workstation;
