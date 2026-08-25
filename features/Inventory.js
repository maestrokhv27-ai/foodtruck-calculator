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
            const item1 = items[i][0];
            const price1 = items[i][1];
            const item2 = items[i + 1] ? items[i + 1][0] : '';
            const price2 = items[i + 1] ? items[i + 1][1] : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = '<td>' + COMPONENT_NAMES[item1] + '</td>' +
                '<td>$' + price1 + '</td>' +
                '<td><input type="number" id="stock_' + item1 + '" value="' + (rawStock[item1] || 0) + '" data-item="' + item1 + '"></td>' +
                '<td>' + (item2 ? COMPONENT_NAMES[item2] : '') + '</td>' +
                '<td>' + (item2 ? '$' + price2 : '') + '</td>' +
                '<td>' + (item2 ? '<input type="number" id="stock_' + item2 + '" value="' + (rawStock[item2] || 0) + '" data-item="' + item2 + '">' : '') + '</td>';
            rows.push(row);
        }
        
        this.rawStockTable.innerHTML = '';
        rows.forEach(row => this.rawStockTable.appendChild(row));
        
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
        
        // Чистое сырьё (никогда не показываем в заготовках)
        const PURE_RAW = ['мясо', 'рыба', 'лосось', 'тунец', 'такифугу', 'мальма', 'мука', 'молоко', 'яйцо', 'лёд', 'пиво', 'вино'];
        
        // Сырьё двойного использования
        const DUAL_USE = ['овощи', 'фрукты', 'сахар', 'рис'];
        
        // Только заготовки
        const PREP_ONLY = PREP_ITEMS.filter(function(item) {
            return PURE_RAW.indexOf(item) === -1;
        });
        
        // Все возможные компоненты для таблицы заготовок
        const allPossibleItems = PREP_ONLY.concat(DUAL_USE).sort();
        
        // Заголовок
        const thead = this.prepStockTable.querySelector('thead');
        if (thead) {
            let headerHtml = '<tr><th>Компонент</th><th>🚚 Фудтрак</th>';
            if (showRV) headerHtml += '<th>🏠 Автодом</th>';
            headerHtml += '<th>Компонент</th><th>🚚 Фудтрак</th>';
            if (showRV) headerHtml += '<th>🏠 Автодом</th>';
            headerHtml += '</tr>';
            thead.innerHTML = headerHtml;
        }
        
        // Создаём строки
        const rows = [];
        
        for (let i = 0; i < allPossibleItems.length; i += 2) {
            const item1 = allPossibleItems[i];
            const item2 = allPossibleItems[i + 1];
            
            let rowHtml = '<td>' + (COMPONENT_NAMES[item1] || item1) + '</td>';
            rowHtml += '<td><input type="number" class="prep-input" id="prep_' + item1 + '_truck" value="' + (prepStock.truck[item1] || 0) + '" data-item="' + item1 + '" data-location="truck"></td>';
            
            if (showRV) {
                rowHtml += '<td><input type="number" class="prep-input" id="prep_' + item1 + '_rv" value="' + (prepStock.rvStorage[item1] || 0) + '" data-item="' + item1 + '" data-location="rvStorage"></td>';
            }
            
            if (item2) {
                rowHtml += '<td>' + (COMPONENT_NAMES[item2] || item2) + '</td>';
                rowHtml += '<td><input type="number" class="prep-input" id="prep_' + item2 + '_truck" value="' + (prepStock.truck[item2] || 0) + '" data-item="' + item2 + '" data-location="truck"></td>';
                
                if (showRV) {
                    rowHtml += '<td><input type="number" class="prep-input" id="prep_' + item2 + '_rv" value="' + (prepStock.rvStorage[item2] || 0) + '" data-item="' + item2 + '" data-location="rvStorage"></td>';
                }
            } else {
                rowHtml += '<td></td><td></td>';
                if (showRV) rowHtml += '<td></td>';
            }
            
            const row = document.createElement('tr');
            row.innerHTML = rowHtml;
            rows.push(row);
        }
        
        // Отрисовка
        this.prepStockTable.innerHTML = '';
        if (thead) this.prepStockTable.appendChild(thead);
        
        const tbody = this.prepStockTable.querySelector('tbody') || document.createElement('tbody');
        rows.forEach(function(row) {
            tbody.appendChild(row);
        });
        this.prepStockTable.appendChild(tbody);
        
        // Подписка на изменения
        this.prepStockTable.querySelectorAll('.prep-input').forEach(function(input) {
            input.addEventListener('input', function(e) {
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
        
        Object.keys(prepStock.truck).forEach(function(item) {
            const input = document.getElementById('prep_' + item + '_truck');
            if (input) input.value = prepStock.truck[item];
        });
        
        Object.keys(prepStock.rvStorage).forEach(function(item) {
            const input = document.getElementById('prep_' + item + '_rv');
            if (input) input.value = prepStock.rvStorage[item];
        });
        
        Object.keys(rawStock).forEach(function(item) {
            const input = document.getElementById('stock_' + item);
            if (input) input.value = rawStock[item];
        });
        
        alert('✅ Склад синхронизирован со станцией!');
    }
};

window.Inventory = Inventory;
