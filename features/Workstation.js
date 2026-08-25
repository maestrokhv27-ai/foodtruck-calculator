// ==================== РАБОЧАЯ СТАНЦИЯ (POS + РЕЦЕПТЫ + СКЛАД) ====================

const Workstation = {
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadFromStore();
    },
    
    cacheElements() {
        this.posGrid = document.getElementById('pos_menu_grid');
        this.orderBlock = document.getElementById('pos_active_order_block');
        this.orderItems = document.getElementById('pos_current_items');
        this.orderTotal = document.getElementById('pos_current_total');
        this.kitchenTicket = document.getElementById('pos_kitchen_ticket');
        this.stockDisplay = document.getElementById('current_stock_display');
        this.revenueEl = document.getElementById('pos_shift_revenue');
        this.profitEl = document.getElementById('pos_shift_profit');
        this.ordersEl = document.getElementById('pos_shift_orders');
        this.completeBtn = document.querySelector('[onclick="completeCurrentOrder"]');
        this.resetBtn = document.querySelector('[onclick="resetShiftData"]');
        this.loadStockBtn = document.querySelector('[onclick*="initStockFromInventory"]');
        this.restockBtn = document.querySelector('[onclick*="openRestockModal"]');
        this.prepareBtn = document.querySelector('[onclick*="openPrepareModal"]');
        this.wasteBtn = document.querySelector('[onclick*="openWasteModal"]');
    },
    
    bindEvents() {
        if (this.completeBtn) {
            this.completeBtn.addEventListener('click', () => this.completeOrder());
        }
        
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetShift());
        }
        
        if (this.loadStockBtn) {
            this.loadStockBtn.addEventListener('click', () => this.loadStockFromInventory());
        }
        
        if (this.restockBtn) {
            this.restockBtn.addEventListener('click', () => this.openRestockModal());
        }
        
        if (this.prepareBtn) {
            this.prepareBtn.addEventListener('click', () => this.openPrepareModal());
        }
        
        if (this.wasteBtn) {
            this.wasteBtn.addEventListener('click', () => this.openWasteModal());
        }
        
        EventBus.on('store:ready', () => this.loadFromStore());
        EventBus.on('state:currentOrder:changed', () => this.renderOrder());
        EventBus.on('state:shift:changed', () => this.updateShiftDisplay());
        EventBus.on('state:waste:changed', () => this.updateShiftDisplay());
    },
    
    loadFromStore() {
        this.renderPOS();
        this.renderOrder();
        this.updateShiftDisplay();
        this.showCurrentStock();
    },
    
    renderPOS() {
        if (!this.posGrid || !window.DISH_DATABASE) return;
        
        this.posGrid.innerHTML = '';
        
        const selectedDishes = Store.get('selectedDishes');
        const prices = Store.get('calculatedPrices');
        const selected = DISH_DATABASE.filter((_, idx) => selectedDishes[idx]);
        
        if (selected.length === 0) {
            this.posGrid.innerHTML = '<p style="grid-column: 1/-1; color: #7f8c8d; text-align: center;">Выберите блюда во вкладке "Настройки"</p>';
            return;
        }
        
        selected.forEach((dish) => {
            const idx = DISH_DATABASE.indexOf(dish);
            const price = prices[idx] || dish.price;
            const currentOrder = Store.get('currentOrder');
            const qty = currentOrder[idx] || 0;
            
            const btn = document.createElement('div');
            btn.className = 'pos-item';
            btn.dataset.index = idx;
            btn.innerHTML = `
                <div style="font-size: 13px; font-weight: bold; text-align: center; line-height: 1.2;">${dish.name}</div>
                <div style="font-size: 12px; color: #27ae60; font-weight: bold;">$${price}</div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                    <button class="pos-btn-minus" data-index="${idx}" style="background: #e74c3c; color: white; border: none; width: 28px; height: 28px; border-radius: 50%; font-weight: bold; cursor: pointer; font-size: 16px;">-</button>
                    <span class="pos-qty" data-index="${idx}" style="font-weight: bold; font-size: 16px; min-width: 20px; text-align: center;">${qty}</span>
                    <button class="pos-btn-plus" data-index="${idx}" style="background: #27ae60; color: white; border: none; width: 28px; height: 28px; border-radius: 50%; font-weight: bold; cursor: pointer; font-size: 16px;">+</button>
                </div>
            `;
            this.posGrid.appendChild(btn);
        });
        
        this.posGrid.querySelectorAll('.pos-btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => this.addToOrder(parseInt(e.target.dataset.index), 1));
        });
        
        this.posGrid.querySelectorAll('.pos-btn-minus').forEach(btn => {
            btn.addEventListener('click', (e) => this.addToOrder(parseInt(e.target.dataset.index), -1));
        });
        
        this.updatePOSAvailability();
    },
    
    addToOrder(idx, change) {
        const currentOrder = Store.get('currentOrder');
        currentOrder[idx] = (currentOrder[idx] || 0) + change;
        if (currentOrder[idx] <= 0) delete currentOrder[idx];
        Store.set('currentOrder', currentOrder);
    },
    
    renderOrder() {
        const currentOrder = Store.get('currentOrder');
        const indices = Object.keys(currentOrder);
        
        if (indices.length === 0) {
            if (this.orderBlock) this.orderBlock.style.display = 'none';
            return;
        }
        
        if (this.orderBlock) this.orderBlock.style.display = 'block';
        
        let itemsHtml = '';
        let total = 0;
        const prices = Store.get('calculatedPrices');
        
        indices.forEach(idxStr => {
            const idx = parseInt(idxStr);
            const qty = currentOrder[idx];
            const dish = DISH_DATABASE[idx];
            const price = prices[idx] || dish.price;
            itemsHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>${dish.name} x${qty}</span><strong>$${(price * qty).toLocaleString()}</strong></div>`;
            total += price * qty;
        });
        
        if (this.orderItems) this.orderItems.innerHTML = itemsHtml;
        if (this.orderTotal) this.orderTotal.innerText = '$' + total.toLocaleString();
        
        this.renderKitchenTicket(indices);

        // === 🔥 ДОБАВЛЕНА КНОПКА ОЧИСТКИ ЗАКАЗА 🔥 ===
        let clearBtn = this.orderBlock.querySelector('.btn-clear-order');
        if (!clearBtn) {
            clearBtn = document.createElement('button');
            clearBtn.className = 'btn-clear-order';
            clearBtn.innerText = '🗑️ Очистить текущий заказ';
            clearBtn.style.cssText = 'width: 100%; background: #e74c3c; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; margin-top: 15px; font-weight: bold; font-size: 14px;';
            clearBtn.onclick = () => {
                Store.set('currentOrder', {});
                EventBus.emit('state:currentOrder:changed');
            };
            this.orderBlock.appendChild(clearBtn);
        }
    },
    
    renderKitchenTicket(indices) {
        if (!this.kitchenTicket) return;
        
        const currentOrder = Store.get('currentOrder');
        
        let html = '<div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #f39c12; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);">';
        html += '<div style="font-size: 20px; font-weight: bold; color: #d35400; margin-bottom: 15px; text-align: center;">🧾 ЧЕК КУХНИ</div>';
        
        indices.forEach(idxStr => {
            const idx = parseInt(idxStr);
            const qty = currentOrder[idx];
            const dish = DISH_DATABASE[idx];
            
            html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: white; border-radius: 6px; border-left: 4px solid #e67e22;">`;
            html += `<div style="font-size: 18px; font-weight: bold; color: #2c3e50;">${dish.name}</div>`;
            html += `<div style="font-size: 24px; font-weight: bold; color: #e67e22; background: #fff3cd; padding: 5px 15px; border-radius: 20px; min-width: 40px; text-align: center;">x${qty}</div>`;
            html += `</div>`;
        });
        html += '</div>';
        
        html += '<div style="background: #f8f9fa; border: 2px solid #8e44ad; border-radius: 8px; padding: 15px;">';
        html += '<div style="font-size: 18px; font-weight: bold; color: #8e44ad; margin-bottom: 15px; text-align: center;">📖 Рецепты для этого заказа</div>';
        
        indices.forEach(idxStr => {
            const idx = parseInt(idxStr);
            const dish = DISH_DATABASE[idx];
            
            html += `<div style="background: white; border-top: 4px solid #27ae60; border: 1px solid #e0e0e0; padding: 12px; margin-bottom: 12px; border-radius: 4px;">`;
            html += `<h4 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 16px;">${dish.name}</h4>`;
            html += `<div style="font-size: 12px; color: #7f8c8d; margin-bottom: 10px; font-style: italic;">${dish.craft}</div>`;
            html += `<div style="margin-left: 10px;">`;
            html += `<strong style="color: #27ae60; font-size: 13px;">🧪 Компоненты:</strong>`;
            html += `<ol style="margin: 8px 0; padding-left: 20px; line-height: 1.6; font-size: 14px;">`;
            
            for (let component in dish.recipe) {
                const qty = dish.recipe[component];
                const compName = COMPONENT_NAMES[component] || component;
                html += `<li style="margin-bottom: 6px;"><strong>${compName}</strong> — ${qty} шт.`;
                html += this.renderComponentChain(component, qty);
                html += `</li>`;
            }
            html += `</ol></div></div>`;
        });
        html += '</div>';
        
        this.kitchenTicket.innerHTML = html;
    },
    
    renderComponentChain(component, qty) {
        const recipe = CRAFT_RECIPES[component];
        if (!recipe) return '';
        
        let html = `<ol style="margin: 5px 0 5px 20px; padding-left: 20px; line-height: 1.7;">`;
        
        for (let subComp in recipe) {
            if (subComp === 'инструменты') continue;
            const subQty = recipe[subComp] * qty;
            const subName = COMPONENT_NAMES[subComp] || subComp;
            
            if (BASE_INGREDIENTS.includes(subComp)) {
                html += `<li><strong>${subName}</strong> — ${subQty} шт. <span style="color: #27ae60;">(базовый)</span></li>`;
            } else {
                html += `<li><strong>${subName}</strong> — ${subQty} шт.`;
                html += this.renderComponentChain(subComp, subQty);
                html += `</li>`;
            }
        }
        
        if (recipe.инструменты) {
            const toolsHtml = recipe.инструменты.map(t => {
                const icon = TOOL_ICONS[t.toLowerCase()] || '🔧';
                return `<span style="display: inline-flex; align-items: center; margin: 2px 5px; padding: 3px 8px; background: #fff3cd; border-radius: 4px; font-size: 14px;">${icon} ${t}</span>`;
            }).join(' ');
            html += `<li style="margin-top: 5px; color: #555;">Инструменты: ${toolsHtml}</li>`;
        }
        
        html += `</ol>`;
        return html;
    },
    
    completeOrder() {
        const currentOrder = Store.get('currentOrder');
        const indices = Object.keys(currentOrder);
        if (indices.length === 0) return;
        
        const prepStock = Store.get('prepStock');
        for (let idxStr of indices) {
            const idx = parseInt(idxStr);
            const dish = DISH_DATABASE[idx];
            for (let comp in dish.recipe) {
                const needed = dish.recipe[comp] * currentOrder[idx];
                if (!prepStock.truck[comp] || prepStock.truck[comp] < needed) {
                    alert(`❌ Недостаточно: ${COMPONENT_NAMES[comp] || comp} для: ${dish.name}`);
                    return;
                }
            }
        }
        
        const prices = Store.get('calculatedPrices');
        const costs = Store.get('calculatedCosts');
        const shift = Store.get('shift');
        
        let revenue = 0;
        let cost = 0;
        
        indices.forEach(idxStr => {
            const idx = parseInt(idxStr);
            const qty = currentOrder[idx];
            const price = prices[idx] || DISH_DATABASE[idx].price;
            const c = costs[idx] || 0;
            revenue += price * qty;
            cost += c * qty;
        });
        
        shift.revenue += revenue;
        shift.profit += (revenue - cost);
        shift.orders += 1;
        Store.set('shift', shift);
        
        for (let idxStr of indices) {
            const idx = parseInt(idxStr);
            const dish = DISH_DATABASE[idx];
            for (let comp in dish.recipe) {
                const needed = dish.recipe[comp] * currentOrder[idx];
                prepStock.truck[comp] = (prepStock.truck[comp] || 0) - needed;
                if (prepStock.truck[comp] < 0) prepStock.truck[comp] = 0;
            }
        }
        Store.set('prepStock', prepStock);
        
        Store.set('currentOrder', {});
        
        this.showStockNotifications(prepStock);
        this.renderPOS();
        this.showCurrentStock();
        
        alert(`✅ Заказ проведён! Выручка: $${revenue.toLocaleString()}`);
    },
    
    showStockNotifications(prepStock) {
        const warnings = [];
        const critical = [];
        
        for (let comp in prepStock.truck) {
            const qty = prepStock.truck[comp];
            if (qty === 0) critical.push(comp);
            else if (qty <= 5) warnings.push(comp);
        }
        
        if (warnings.length === 0 && critical.length === 0) return;
        
        let html = '<div style="background: #fff3cd; border-left: 4px solid #f39c12; padding: 12px; border-radius: 6px; margin-top: 15px;">';
        html += '<strong style="color: #d35400;">⚠️ Внимание к остаткам:</strong><ul style="margin: 8px 0 0 20px; padding: 0;">';
        
        critical.forEach(comp => {
            html += `<li style="color: #e74c3c; font-weight: bold;">🔴 ${COMPONENT_NAMES[comp] || comp} закончился!</li>`;
        });
        
        warnings.forEach(comp => {
            html += `<li style="color: #e67e22;">⚠️ ${COMPONENT_NAMES[comp] || comp}: осталось ${prepStock.truck[comp]} шт.</li>`;
        });
        
        html += '</ul></div>';
        
        const posBlock = document.getElementById('cash_register_block');
        if (posBlock) {
            const existing = posBlock.querySelector('.stock-notifications');
            if (existing) existing.remove();
            const div = document.createElement('div');
            div.className = 'stock-notifications';
            div.innerHTML = html;
            posBlock.appendChild(div);
        }
    },
    
    updatePOSAvailability() {
        const prepStock = Store.get('prepStock');
        
        this.posGrid.querySelectorAll('.pos-item').forEach(item => {
            const idx = parseInt(item.dataset.index);
            const dish = DISH_DATABASE[idx];
            let available = true;
            
            for (let comp in dish.recipe) {
                const needed = dish.recipe[comp];
                if (!prepStock.truck[comp] || prepStock.truck[comp] < needed) {
                    available = false;
                    break;
                }
            }
            
            item.style.opacity = available ? '1' : '0.4';
            item.style.pointerEvents = available ? 'auto' : 'none';
        });
    },
    
    showCurrentStock() {
        if (!this.stockDisplay) return;
        
        const prepStock = Store.get('prepStock');
        
        let html = '<div style="background: #e8f4f8; border-left: 4px solid #2980b9; padding: 12px; border-radius: 6px; margin-bottom: 15px;">';
        html += '<strong style="color: #2c3e50;">📦 Остатки в фудтраке:</strong>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 10px;">';
        
        for (let comp in prepStock.truck) {
            const name = COMPONENT_NAMES[comp] || comp;
            const qty = prepStock.truck[comp];
            let color = '#27ae60';
            if (qty <= 5) color = '#e67e22';
            if (qty === 0) color = '#e74c3c';
            
            html += `<div style="background: white; padding: 6px 10px; border-radius: 4px; font-size: 13px;">`;
            html += `<span style="color: ${color}; font-weight: bold;">${qty}</span> ${name}`;
            html += `</div>`;
        }
        
        html += '</div></div>';
        this.stockDisplay.innerHTML = html;
    },
    
    updateShiftDisplay() {
        const shift = Store.get('shift');
        const waste = Store.get('waste');
        
        if (this.revenueEl) this.revenueEl.innerText = '$' + shift.revenue.toLocaleString();
        if (this.profitEl) this.profitEl.innerText = '$' + (shift.profit - waste.total).toLocaleString();
        if (this.ordersEl) this.ordersEl.innerText = shift.orders;
    },
    
    loadStockFromInventory() {
        const logic = Store.get('businessLogic');
        const rawStock = Store.get('rawStock');
        const prepStock = Store.get('prepStock');
        
        prepStock.truck = {};
        prepStock.rvStorage = {};
        prepStock.rvCabinet = {};
        
        const readyComponents = new Set();
        for (let item in prepStock.truck) {
            if (prepStock.truck[item] > 0) readyComponents.add(item);
        }
        
        BASE_INGREDIENTS.forEach(id => {
            const val = rawStock[id] || 0;
            if (readyComponents.has(id)) return;
            
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
    
    openRestockModal() {
        const prepStock = Store.get('prepStock');
        const logic = Store.get('businessLogic');
        
        let html = '<div style="max-height: 60vh; overflow-y: auto;">';
        html += '<p style="color: #7f8c8d; font-size: 14px;">Выберите компоненты для догрузки в фудтрак:</p>';
        
        const sources = [];
        if (logic === '2' || logic === '3' || logic === '4') sources.push({ key: 'rvStorage', name: 'Багажник' });
        if (logic === '3' || logic === '4') sources.push({ key: 'rvCabinet', name: 'Шкаф' });
        
        if (sources.length === 0) {
            html += '<p style="color: #e74c3c;">Нет хранилищ для догрузки.</p>';
        } else {
            sources.forEach(src => {
                const items = Object.keys(prepStock[src.key]).filter(k => prepStock[src.key][k] > 0);
                if (items.length === 0) return;
                
                html += `<h4 style="margin: 15px 0 8px 0; color: #2c3e50;">${src.name}:</h4>`;
                items.forEach(comp => {
                    const name = COMPONENT_NAMES[comp] || comp;
                    html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px;">`;
                    html += `<span>${name} (${prepStock[src.key][comp]} шт.)</span>`;
                    html += `<div style="display: flex; gap: 5px;">`;
                    html += `<input type="number" id="restock_${src.key}_${comp}" value="10" min="1" max="${prepStock[src.key][comp]}" style="width: 60px; padding: 4px;">`;
                    html += `<button class="restock-btn" data-comp="${comp}" data-source="${src.key}" style="background: #27ae60; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">+</button>`;
                    html += `</div></div>`;
                });
            });
        }
        
        html += '</div>';
        
        this.showModal('🔄 Догрузить в фудтрак', html);
        
        setTimeout(() => {
            document.querySelectorAll('.restock-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const comp = btn.dataset.comp;
                    const source = btn.dataset.source;
                    const input = document.getElementById(`restock_${source}_${comp}`);
                    const qty = parseInt(input.value) || 0;
                    
                    if (qty > 0 && prepStock[source][comp] >= qty) {
                        prepStock[source][comp] -= qty;
                        prepStock.truck[comp] = (prepStock.truck[comp] || 0) + qty;
                        Store.set('prepStock', prepStock);
                        this.showCurrentStock();
                        this.renderPOS();
                        this.openRestockModal();
                        alert(`✅ Догружено: ${COMPONENT_NAMES[comp]} x${qty}`);
                    }
                });
            });
        }, 100);
    },
    
    openPrepareModal() {
        const prepStock = Store.get('prepStock');
        
        let html = '<div style="max-height: 60vh; overflow-y: auto;">';
        html += '<p style="color: #7f8c8d; font-size: 14px;">Выберите что приготовить:</p>';
        
        PREP_ITEMS.forEach(comp => {
            const name = COMPONENT_NAMES[comp] || comp;
            const recipe = PREP_RECIPES[comp];
            if (!recipe) return;
            
            html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px;">`;
            html += `<span>${name} (сейчас: ${prepStock.truck[comp] || 0})</span>`;
            html += `<div style="display: flex; gap: 5px;">`;
            html += `<input type="number" id="prepare_${comp}" value="10" min="1" style="width: 60px; padding: 4px;">`;
            html += `<button class="prepare-btn" data-comp="${comp}" style="background: #8e44ad; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">👨‍🍳</button>`;
            html += `</div></div>`;
        });
        
        html += '</div>';
        
        this.showModal('👨‍🍳 Приготовить заготовки', html);
        
        setTimeout(() => {
            document.querySelectorAll('.prepare-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const comp = btn.dataset.comp;
                    const input = document.getElementById(`prepare_${comp}`);
                    const qty = parseInt(input.value) || 0;
                    
                    if (qty > 0 && this.prepareComponent(comp, qty)) {
                        alert(`✅ Приготовлено: ${COMPONENT_NAMES[comp]} x${qty}`);
                        this.openPrepareModal();
                    }
                });
            });
        }, 100);
    },
    
    prepareComponent(comp, qty) {
        const recipe = PREP_RECIPES[comp];
        if (!recipe) {
            alert('Этот компонент нельзя приготовить!');
            return false;
        }
        
        const prepStock = Store.get('prepStock');
        
        for (let raw in recipe) {
            const needed = recipe[raw] * qty;
            const available = (prepStock.truck[raw] || 0) + (prepStock.rvCabinet[raw] || 0) + (prepStock.rvStorage[raw] || 0);
            if (available < needed) {
                alert(`❌ Недостаточно ${COMPONENT_NAMES[raw] || raw}! Нужно: ${needed}, есть: ${available}`);
                return false;
            }
        }
        
        for (let raw in recipe) {
            let needed = recipe[raw] * qty;
            const sources = ['truck', 'rvCabinet', 'rvStorage'];
            for (let src of sources) {
                if (needed <= 0) break;
                const available = prepStock[src][raw] || 0;
                const take = Math.min(available, needed);
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
    
    openWasteModal() {
        const prepStock = Store.get('prepStock');
        const waste = Store.get('waste');
        
        let html = '<div style="max-height: 60vh; overflow-y: auto;">';
        html += '<p style="color: #7f8c8d; font-size: 14px;">Выберите что списать:</p>';
        
        const rawItems = Object.keys(prepStock.truck).filter(k => BASE_INGREDIENTS.includes(k));
        if (rawItems.length > 0) {
            html += '<h4 style="margin: 15px 0 8px 0; color: #e74c3c;">🥩 Сырьё:</h4>';
            rawItems.forEach(comp => {
                const qty = prepStock.truck[comp] || 0;
                if (qty <= 0) return;
                const price = RAW_PRICES[comp] || 0;
                html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #fdf2f2; border-radius: 4px; margin-bottom: 5px;">`;
                html += `<span>${COMPONENT_NAMES[comp]} (${qty} шт.) — $${price}/шт</span>`;
                html += `<div style="display: flex; gap: 5px;">`;
                html += `<input type="number" id="waste_${comp}" value="1" min="1" max="${qty}" style="width: 60px; padding: 4px;">`;
                html += `<button class="waste-btn" data-comp="${comp}" data-price="${price}" style="background: #e74c3c; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>`;
                html += `</div></div>`;
            });
        }
        
        const prepItems = Object.keys(prepStock.truck).filter(k => !BASE_INGREDIENTS.includes(k));
        if (prepItems.length > 0) {
            html += '<h4 style="margin: 15px 0 8px 0; color: #e67e22;">🍳 Заготовки:</h4>';
            prepItems.forEach(comp => {
                const qty = prepStock.truck[comp] || 0;
                if (qty <= 0) return;
                const price = PREP_PRICES[comp] || 0;
                html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #fff3cd; border-radius: 4px; margin-bottom: 5px;">`;
                html += `<span>${COMPONENT_NAMES[comp]} (${qty} шт.) — $${price}/шт</span>`;
                html += `<div style="display: flex; gap: 5px;">`;
                html += `<input type="number" id="waste_${comp}" value="1" min="1" max="${qty}" style="width: 60px; padding: 4px;">`;
                html += `<button class="waste-btn" data-comp="${comp}" data-price="${price}" style="background: #e74c3c; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>`;
                html += `</div></div>`;
            });
        }
        
        if (waste.items.length > 0) {
            html += '<hr style="margin: 15px 0;">';
            html += '<h4 style="margin: 0 0 8px 0; color: #7f8c8d;">📊 Списание за смену:</h4>';
            html += '<div style="background: #f8f9fa; padding: 10px; border-radius: 4px;">';
            waste.items.forEach(item => {
                html += `<div style="font-size: 13px; margin-bottom: 3px;">• ${item.name}: ${item.qty} шт. (${item.time}) — $${item.cost}</div>`;
            });
            html += `<div style="font-weight: bold; margin-top: 8px; color: #e74c3c;">Итого убыток: $${waste.total}</div>`;
            html += '</div>';
        }
        
        html += '</div>';
        
        this.showModal('🗑️ Списать брак/отходы', html);
        
        setTimeout(() => {
            document.querySelectorAll('.waste-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const comp = btn.dataset.comp;
                    const price = parseInt(btn.dataset.price);
                    const input = document.getElementById(`waste_${comp}`);
                    const qty = parseInt(input.value) || 0;
                    
                    if (qty > 0 && prepStock.truck[comp] >= qty) {
                        prepStock.truck[comp] -= qty;
                        Store.set('prepStock', prepStock);
                        
                        const waste = Store.get('waste');
                        waste.items.push({ name: COMPONENT_NAMES[comp], qty, cost: qty * price, time: new Date().toLocaleTimeString() });
                        waste.total += qty * price;
                        Store.set('waste', waste);
                        
                        this.showCurrentStock();
                        this.renderPOS();
                        this.updateShiftDisplay();
                        this.openWasteModal();
                        
                        alert(`🗑️ Списано: ${COMPONENT_NAMES[comp]} x${qty} (убыток: $${qty * price})`);
                    }
                });
            });
        }, 100);
    },
    
    resetShift() {
        if (!confirm('⚠️ Завершить смену и обнулить кассу?')) return;
        
        Store.set('shift', { revenue: 0, profit: 0, orders: 0 });
        Store.set('waste', { total: 0, items: [] });
        Store.set('currentOrder', {});
        
        this.updateShiftDisplay();
        this.renderPOS();
        this.renderOrder();
        
        alert('✅ Смена завершена!');
    },
    
    showModal(title, content) {
        const modal = document.getElementById('sync_modal');
        const titleEl = document.getElementById('sync_modal_title');
        const contentEl = document.getElementById('sync_modal_content');
        
        if (modal && titleEl && contentEl) {
            titleEl.innerText = title;
            contentEl.innerHTML = content;
            modal.style.display = 'flex';
        }
    }
};

window.Workstation = Workstation;
