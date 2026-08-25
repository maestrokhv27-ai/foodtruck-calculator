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
    
renderPrepStock() {
    if (!this.prepStockTable) return;
    
    const prepStock = Store.get('prepStock');
    const logic = Store.get('businessLogic');
    const showRV = logic === '3' || logic === '4';
    
    // Показываем ТОЛЬКО заготовки (не сырьё!)
    const items = PREP_ITEMS;
    
    // Создаём заголовок таблицы
    const thead = this.prepStockTable.querySelector('thead');
    if (thead && !thead.innerHTML.includes('В Траке')) {
        thead.innerHTML = `
            <tr>
                <th>Заготовка</th>
                <th>В Траке</th>
                ${showRV ? '<th>В Автодоме</th>' : ''}
                <th>Заготовка</th>
                <th>В Траке</th>
                ${showRV ? '<th>В Автодоме</th>' : ''}
            </tr>
        `;
    }
    
    const rows = [];
    
    for (let i = 0; i < items.length; i += 2) {
        const item1 = items[i];
        const item2 = items[i + 1];
        
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
    
renderPrepStock() {
    if (!this.prepStockTable) return;
    
    const prepStock = Store.get('prepStock');
    const logic = Store.get('businessLogic');
    const showRV = logic === '3' || logic === '4';
    
    const selectedDishes = Store.get('selectedDishes');
    const requiredComponents = new Set();
    
    // Собираем все компоненты из выбранных блюд
    if (window.DISH_DATABASE) {
        DISH_DATABASE.forEach((dish, index) => {
            if (selectedDishes[index]) {
                Object.keys(dish.recipe).forEach(comp => {
                    // Добавляем не только ингредиенты блюда, но и промежуточные заготовки
                    requiredComponents.add(comp);
                    if (comp === 'картофельное_пюре' || comp === 'котлета' || comp === 'рыбная_котлета') {
                        requiredComponents.add('масло');
                    }
                });
            }
        });
    }
    
    // Если ничего не выбрано — показываем все возможные заготовки
    if (requiredComponents.size === 0) {
        PREP_ITEMS.forEach(item => requiredComponents.add(item));
    }
    
    const rows = [];
    const items = Array.from(requiredComponents);
    
    for (let i = 0; i < items.length; i += 2) {
        const item1 = items[i];
        const item2 = items[i + 1];
        
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
    rows.forEach(row => this.prepStockTable.appendChild(row));
    
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
