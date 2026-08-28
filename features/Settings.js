// ==================== НАСТРОЙКИ ====================

const Settings = {
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadFromStore();
    },
    
    cacheElements() {
        this.elements = {
            businessLogic: document.getElementById('business_logic'),
            truckFridge: document.getElementById('cfg_truck_fridge'),
            carTrunk: document.getElementById('cfg_car_trunk'),
            rvStorage: document.getElementById('cfg_rv_storage'),
            rvCabinet: document.getElementById('cfg_rv_cabinet'),
            marginPercent: document.getElementById('cfg_margin_percent'),
            fishPrice: document.getElementById('cfg_fish_price'),
            urgentMarkup: document.getElementById('cfg_urgent_markup'), // 🔥 НОВОЕ
            menuContainer: document.getElementById('menu_checkboxes'),
            calcButton: document.querySelector('.btn-calc')
        };
    },
    
    bindEvents() {
        var self = this;
        
        // Изменение логики
        if (this.elements.businessLogic) {
            this.elements.businessLogic.addEventListener('change', function(e) {
                Store.set('businessLogic', e.target.value);
                self.updateVisibility();
            });
        }
        
        // Изменение параметров
        var configInputs = ['truckFridge', 'carTrunk', 'rvStorage', 'rvCabinet', 'marginPercent', 'fishPrice', 'urgentMarkup']; // 🔥 ДОБАВИЛ urgentMarkup
        configInputs.forEach(function(key) {
            var el = self.elements[key];
            if (el) {
                el.addEventListener('input', function(e) {
                    Store.set(key, parseFloat(e.target.value) || 0);
                });
            }
        });
        
        // Кнопка расчёта
        if (this.elements.calcButton) {
            this.elements.calcButton.addEventListener('click', function() {
                EventBus.emit('procurement:calculate');
            });
        }
        
        // Подписка на изменения
        EventBus.on('store:ready', function() { self.loadFromStore(); });
    },
    
    loadFromStore() {
        if (this.elements.businessLogic) this.elements.businessLogic.value = Store.get('businessLogic');
        if (this.elements.truckFridge) this.elements.truckFridge.value = Store.get('truckFridge');
        if (this.elements.carTrunk) this.elements.carTrunk.value = Store.get('carTrunk');
        if (this.elements.rvStorage) this.elements.rvStorage.value = Store.get('rvStorage');
        if (this.elements.rvCabinet) this.elements.rvCabinet.value = Store.get('rvCabinet');
        if (this.elements.marginPercent) this.elements.marginPercent.value = Store.get('marginPercent');
        if (this.elements.fishPrice) this.elements.fishPrice.value = Store.get('fishPrice');
        if (this.elements.urgentMarkup) this.elements.urgentMarkup.value = Store.get('urgentMarkup') || 50; //  НОВОЕ
        
        this.updateVisibility();
        this.renderMenu();
    },
    
    updateVisibility() {
        var logic = Store.get('businessLogic');
        
        var groups = {
            'group_truck_limit': true,
            'group_car_limit': logic === '2' || logic === '3',
            'group_rv_storage': logic === '3' || logic === '4',
            'group_rv_cabinet': logic === '3' || logic === '4'
        };
        
        Object.keys(groups).forEach(function(id) {
            var show = groups[id];
            var el = document.getElementById(id);
            if (el) el.style.display = show ? 'flex' : 'none';
        });
    },
    
    renderMenu() {
        if (!this.elements.menuContainer || !window.DISH_DATABASE) return;
        
        this.elements.menuContainer.innerHTML = '';
        
        var grouped = {};
        DISH_DATABASE.forEach(function(dish, index) {
            if (!grouped[dish.cat]) grouped[dish.cat] = [];
            grouped[dish.cat].push({ dish: dish, index: index });
        });
        
        var selectedDishes = Store.get('selectedDishes');
        
        for (var cat in grouped) {
            var header = document.createElement('div');
            header.className = 'menu-category';
            header.textContent = CATEGORY_NAMES[cat] || cat;
            this.elements.menuContainer.appendChild(header);
            
            grouped[cat].forEach(function(item) {
                var dish = item.dish;
                var index = item.index;
                
                var label = document.createElement('label');
                label.className = 'menu-item';
                label.innerHTML = '<input type="checkbox" id="dish_' + index + '" data-index="' + index + '"' + 
                                  (selectedDishes[index] ? ' checked' : '') + '>' +
                                  '<span>' + dish.name + '</span>' +
                                  '<small>$' + dish.price + '</small>';
                this.elements.menuContainer.appendChild(label);
            }.bind(this));
        }
        
        // Подписка на изменения чекбоксов
        var self = this;
        this.elements.menuContainer.querySelectorAll('input[type="checkbox"]').forEach(function(checkbox) {
            checkbox.addEventListener('change', function(e) {
                var index = parseInt(e.target.dataset.index);
                var selected = Store.get('selectedDishes');
                selected[index] = e.target.checked;
                Store.set('selectedDishes', selected);
            });
        });
    }
};

window.Settings = Settings;
