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
    
renderPrepStock() {
    if (!this.prepStockTable) return;
    
    const prepStock = Store.get('prepStock');
    const logic = Store.get('businessLogic');
    const showRV = logic === '3' || logic === '4';
    
    const selectedDishes = Store.get('selectedDishes');
    const requiredComponents = new Set();
    
    // Собираем ТОЛЬКО компоненты из ВЫБРАННЫХ блюд
    if (window.DISH_DATABASE) {
        DISH_DATABASE.forEach((dish, index) => {
            if (selectedDishes[index]) {
                Object.keys(dish.recipe).forEach(comp => {
                    // Добавляем все компоненты блюда
                    requiredComponents.add(comp);
                    // Добавляем промежуточные заготовки
                    if (comp === 'картофельное_пюре' || comp === 'котлета' || comp === 'рыбная_котлета') {
                        requiredComponents.add('масло');
                    }
                });
            }
        });
    }
    
    // Фильтруем — оставляем только заготовки (не сырьё!)
    const prepItemsNeeded = Array.from(requiredComponents).filter(item => 
        PREP_ITEMS.includes(item)
    );
    
    // Если ничего не выбрано — показываем пустую таблицу с сообщением
    if (prepItemsNeeded.length === 0) {
        this.prepStockTable.innerHTML = '<tr><td colspan="' + (showRV ? '6' : '4') + '" style="text-align: center; color: #7f8c8d; padding: 20px;"> Выберите блюда во вкладке "Настройки", чтобы увидеть нужные заготовки</td></tr>';
        return;
    }
    
    // Создаём заголовок таблицы
    const thead = this.prepStockTable.querySelector('thead');
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Заготовка</th>
                <th> Фудтрак</th>
                ${showRV ? '<th>🏠 Автодом</th>' : ''}
                <th>Заготовка</th>
                <th> Фудтрак</th>
                ${showRV ? '<th>🏠 Автодом</th>' : ''}
            </tr>
        `;
    }
    
    const rows = [];
    
    for (let i = 0; i < prepItemsNeeded.length; i += 2) {
        const item1 = prepItemsNeeded[i];
        const item2 = prepItemsNeeded[i + 1];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${COMPONENT_NAMES[item1] || item1}</td>
            <td><input type="number" class="prep-input" id="prep_${item1}_truck" 
                       value="${prepStock.truck[item1] || 0}" data-item="${item1}" data-location="truck"></td>
            ${showRV ? `<td><input type="number" class="prep-input" id="prep_${item1}_rv" 
                       value="${prepStock.rvStorage[item1] || 0}" data-item="${item1}" data-location="rvStorage"></td>` : ''}
            ${item2 ? `<td>${COMPONENT_NAMES[item2] || item2}</td>` : '<td></td>'}
            ${item2 ? `<td><input type="number" class="prep-input" id="prep_${item2}_truck" 
                       value="${prepStock.truck[item2] || 0}" data-item="${item2}" data-location="truck"></td>` : '<td></td>'}
            ${item2 && showRV ? `<td><input type="number" class="prep-input" id="prep_${item2}_rv" 
                       value="${prepStock.rvStorage[item2] || 0}" data-item="${item2}" data-location="rvStorage"></td>` : '<td></td>'}
        `;
        rows.push(row);
    }
    
    this.prepStockTable.innerHTML = '';
    if (thead) this.prepStockTable.appendChild(thead);
    
    const tbody = this.prepStockTable.querySelector('tbody') || document.createElement('tbody');
    rows.forEach(row => tbody.appendChild(row));
    this.prepStockTable.appendChild(tbody);
    
    // Подписка на изменения
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
