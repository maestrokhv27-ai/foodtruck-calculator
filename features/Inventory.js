// ==================== СКЛАД И ЗАГОТОВКИ ====================

const Inventory = {
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadFromStore();
    },
    
    cacheElements() {
        this.rawStockTable = document.querySelector('#table_raw_stock tbody');
        this.prepStockTable = document.querySelector('#table_ready_stock tbody');
        this.saveButton = document.querySelector('.btn-save');
        this.resetButton = document.querySelector('.btn-reset');
        this.syncButton = document.querySelector('[onclick="syncStockToInventory"]');
    },
    
    bindEvents() {
        if (this.saveButton) {
            this.saveButton.addEventListener('click', () => this.save());
        }
        
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.reset());
        }
        
        if (this.syncButton) {
            this.syncButton.addEventListener('click', () => this.syncWithStation());
        }
        
        EventBus.on('store:ready', () => this.loadFromStore());
    },
    
    loadFromStore() {
        this.renderRawStock();
        this.renderPrepStock();
    },
    
    renderRawStock() {
        if (!this.rawStockTable) return;
        
        const rawStock = Store.get('rawStock');
        const rows = [];
        
        const items = [
            ['овощи', 55], ['рис', 45], ['мясо', 500], ['фрукты', 55],
            ['сахар', 45], ['мука', 45], ['молоко', 55], ['яйцо', 45],
            ['рыба', 400], ['лёд', 45], ['пиво', 60], ['вино', 350]
        ];
        
        for (let i = 0; i < items.length; i += 2) {
            const [item1, price1] = items[i];
            const [item2, price2] = items[i + 1] || ['', 0];
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${COMPONENT_NAMES[item1]}</td>
                <td>$${price1}</td>
                <td><input type="number" id="stock_${item1}" value="${rawStock[item1] || 0}" data-item="${item1}"></td>
                <td>${item2 ? COMPONENT_NAMES[item2] : ''}</td>
                <td>${item2 ? '$' + price2 : ''}</td>
                <td>${item2 ? `<input type="number" id="stock_${item2}" value="${rawStock[item2] || 0}" data-item="${item2}">` : ''}</td>
            `;
            rows.push(row);
        }
        
        this.rawStockTable.innerHTML = '';
        rows.forEach(row => this.rawStockTable.appendChild(row));
        
        // Подписка на изменения
        this.rawStockTable.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const item = e.target.dataset.item;
                const value = parseInt(e.target.value) || 0;
                const stock = Store.get('rawStock');
                stock[item] = value;
                Store.set('rawStock', stock);
            });
        });
    },
    
    // УМНАЯ функция: определяет что показывать в заготовках
    renderPrepStock() {
    if (!this.prepStockTable) return;
    
    const prepStock = Store.get('prepStock');
    const logic = Store.get('businessLogic');
    const showRV = logic === '3' || logic === '4';
    
    const selectedDishes = Store.get('selectedDishes');
    const itemsInTruck = new Set();
    const itemsInRV = new Set();
    
    // Собираем ВСЕ заготовки, которые нужны для выбранных блюд
    const allNeededPreps = new Set();
    const directBaseIngredients = new Set();
    
    if (window.DISH_DATABASE) {
        DISH_DATABASE.forEach((dish, index) => {
            if (!selectedDishes[index]) return;
            
            for (let comp in dish.recipe) {
                const isPrepItem = PREP_ITEMS.includes(comp);
                const isBaseIngredient = BASE_INGREDIENTS.includes(comp);
                
                if (isPrepItem) {
                    // Это заготовка → нужна в фудтраке
                    allNeededPreps.add(comp);
                } else if (isBaseIngredient) {
                    // Проверяем: это сырьё для заготовки или для блюда?
                    // Если comp используется напрямую в dish (а не для приготовления другой заготовки)
                    // → нужно в фудтраке
                    directBaseIngredients.add(comp);
                }
            }
        });
    }
    
    // Теперь определяем, какие базовые ингредиенты нужны именно в фудтраке
    // (а не для приготовления заготовок в автодоме)
    directBaseIngredients.forEach(comp => {
        // Проверяем: используется ли это сырьё для приготовления заготовок?
        let usedForPrep = false;
        for (let prep of allNeededPreps) {
            const prepRecipe = PREP_RECIPES[prep];
            if (prepRecipe && prepRecipe[comp]) {
                usedForPrep = true;
                break;
            }
        }
        
        // Если НЕ используется для заготовок → нужен в фудтраке
        if (!usedForPrep) {
            itemsInTruck.add(comp);
        } else {
            // Если используется для заготовок → нужен в автодоме
            itemsInRV.add(comp);
        }
    });
    
    // Добавляем все заготовки в фудтрак
    allNeededPreps.forEach(prep => itemsInTruck.add(prep));
    
    // Создаём заголовок таблицы
    const thead = this.prepStockTable.querySelector('thead');
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Компонент</th>
                <th>🚚 Фудтрак</th>
                ${showRV ? '<th>🏠 Автодом</th>' : ''}
                <th>Компонент</th>
                <th>🚚 Фудтрак</th>
                ${showRV ? '<th> Автодом</th>' : ''}
            </tr>
        `;
    }
    
    // Объединяем всё
    const allItems = new Set([...itemsInTruck, ...itemsInRV]);
    
    if (allItems.size === 0) {
        this.prepStockTable.innerHTML = '<tr><td colspan="' + (showRV ? '6' : '4') + '" style="text-align: center; color: #7f8c8d; padding: 20px;">Выберите блюда во вкладке "Настройки"</td></tr>';
        return;
    }
    
    // Создаём строки
    const rows = [];
    const itemsArray = Array.from(allItems).sort();
    
    for (let i = 0; i < itemsArray.length; i += 2) {
        const item1 = itemsArray[i];
        const item2 = itemsArray[i + 1];
        const inTruck1 = itemsInTruck.has(item1);
        const inRV1 = itemsInRV.has(item1);
        const inTruck2 = item2 ? itemsInTruck.has(item2) : false;
        const inRV2 = item2 ? itemsInRV.has(item2) : false;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${COMPONENT_NAMES[item1] || item1}</td>
            <td>${inTruck1 ? `<input type="number" class="prep-input" id="prep_${item1}_truck" value="${prepStock.truck[item1] || 0}" data-item="${item1}" data-location="truck">` : '<span style="color:#bdc3c7;">—</span>'}</td>
            ${showRV ? `<td>${inRV1 ? `<input type="number" class="prep-input" id="prep_${item1}_rv" value="${prepStock.rvStorage[item1] || 0}" data-item="${item1}" data-location="rvStorage">` : '<span style="color:#bdc3c7;">—</span>'}</td>` : ''}
            ${item2 ? `<td>${COMPONENT_NAMES[item2] || item2}</td>` : '<td></td>'}
            ${item2 ? `<td>${inTruck2 ? `<input type="number" class="prep-input" id="prep_${item2}_truck" value="${prepStock.truck[item2] || 0}" data-item="${item2}" data-location="truck">` : '<span style="color:#bdc3c7;">—</span>'}</td>` : '<td></td>'}
            ${item2 && showRV ? `<td>${inRV2 ? `<input type="number" class="prep-input" id="prep_${item2}_rv" value="${prepStock.rvStorage[item2] || 0}" data-item="${item2}" data-location="rvStorage">` : '<span style="color:#bdc3c7;">—</span>'}</td>` : '<td></td>'}
        `;
        rows.push(row);
    }
    
    // Отрисовка
    this.prepStockTable.innerHTML = '';
    if (thead) this.prepStockTable.appendChild(thead);
    
    const tbody = this.prepStockTable.querySelector('tbody') || document.createElement('tbody');
    rows.forEach(row => tbody.appendChild(row));
    this.prepStockTable.appendChild(tbody);
    
    // Подписка
    this.prepStockTable.querySelectorAll('.prep-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const item = e.target.dataset.item;
            const location = e.target.dataset.location;
            const value = parseInt(e.target.value) || 0;
            const prepStock = Store.get('prepStock');
            prepStock[location][item] = value;
            Store.set('prepStock', prepStock);
        });
    });
},
    
    save() {
        alert('💾 Данные сохранены!');
    },
    
    reset() {
        if (confirm('🧹 Полностью обнулить все склады и заготовки?')) {
            Store.reset();
            this.loadFromStore();
            EventBus.emit('state:reset');
        }
    },
    
    syncWithStation() {
        const prepStock = Store.get('prepStock');
        const rawStock = Store.get('rawStock');
        
        // Синхронизация заготовок
        Object.keys(prepStock.truck).forEach(item => {
            const input = document.getElementById(`prep_${item}_truck`);
            if (input) input.value = prepStock.truck[item];
        });
        
        Object.keys(prepStock.rvStorage).forEach(item => {
            const input = document.getElementById(`prep_${item}_rv`);
            if (input) input.value = prepStock.rvStorage[item];
        });
        
        // Синхронизация сырья
        Object.keys(rawStock).forEach(item => {
            const input = document.getElementById(`stock_${item}`);
            if (input) input.value = rawStock[item];
        });
        
        alert('✅ Склад синхронизирован со станцией!');
    }
};

window.Inventory = Inventory;
