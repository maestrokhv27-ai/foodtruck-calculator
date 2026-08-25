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
            menuContainer: document.getElementById('menu_checkboxes'),
            calcButton: document.querySelector('.btn-calc')
        };
    },
    
    bindEvents() {
        // Изменение логики
        if (this.elements.businessLogic) {
            this.elements.businessLogic.addEventListener('change', (e) => {
                Store.set('businessLogic', e.target.value);
                this.updateVisibility();
            });
        }
        
        // Изменение параметров
        const configInputs = ['truckFridge', 'carTrunk', 'rvStorage', 'rvCabinet', 'marginPercent', 'fishPrice'];
        configInputs.forEach(key => {
            const el = this.elements[key];
            if (el) {
                el.addEventListener('input', (e) => {
                    Store.set(key, parseFloat(e.target.value) || 0);
                });
            }
        });
        
        // Кнопка расчёта
        if (this.elements.calcButton) {
            this.elements.calcButton.addEventListener('click', () => {
                EventBus.emit('procurement:calculate');
            });
        }
        
        // Подписка на изменения
        EventBus.on('store:ready', () => this.loadFromStore());
    },
    
    loadFromStore() {
        if (this.elements.businessLogic) this.elements.businessLogic.value = Store.get('businessLogic');
        if (this.elements.truckFridge) this.elements.truckFridge.value = Store.get('truckFridge');
        if (this.elements.carTrunk) this.elements.carTrunk.value = Store.get('carTrunk');
        if (this.elements.rvStorage) this.elements.rvStorage.value = Store.get('rvStorage');
        if (this.elements.rvCabinet) this.elements.rvCabinet.value = Store.get('rvCabinet');
        if (this.elements.marginPercent) this.elements.marginPercent.value = Store.get('marginPercent');
        if (this.elements.fishPrice) this.elements.fishPrice.value = Store.get('fishPrice');
        
        this.updateVisibility();
        this.renderMenu();
    },
    
    updateVisibility() {
        const logic = Store.get('businessLogic');
        
        const groups = {
            'group_truck_limit': true,
            'group_car_limit': logic === '2' || logic === '3',
            'group_rv_storage': logic === '3' || logic === '4',
            'group_rv_cabinet': logic === '3' || logic === '4'
        };
        
        Object.entries(groups).forEach(([id, show]) => {
            const el = document.getElementById(id);
            if (el) el.style.display = show ? 'flex' : 'none';
        });
    },
    
    renderMenu() {
        if (!this.elements.menuContainer || !window.DISH_DATABASE) return;
        
        this.elements.menuContainer.innerHTML = '';
        
        const grouped = {};
        DISH_DATABASE.forEach((dish, index) => {
            if (!grouped[dish.cat]) grouped[dish.cat] = [];
            grouped[dish.cat].push({ dish, index });
        });
        
        const selectedDishes = Store.get('selectedDishes');
        
        for (let cat in grouped) {
            const header = document.createElement('div');
            header.className = 'menu-category';
            header.textContent = CATEGORY_NAMES[cat] || cat;
            this.elements.menuContainer.appendChild(header);
            
            grouped[cat].forEach(({ dish, index }) => {
                const label = document.createElement('label');
                label.className = 'menu-item';
                label.innerHTML = `
                    <input type="checkbox" 
                           id="dish_${index}" 
                           data-index="${index}"
                           ${selectedDishes[index] ? 'checked' : ''}>
                    <span>${dish.name}</span>
                    <small>$${dish.price}</small>
                `;
                this.elements.menuContainer.appendChild(label);
            });
        }
        
        // Подписка на изменения чекбоксов
        this.elements.menuContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const selected = Store.get('selectedDishes');
                selected[index] = e.target.checked;
                Store.set('selectedDishes', selected);
            });
        });
    }
};

window.Settings = Settings;
