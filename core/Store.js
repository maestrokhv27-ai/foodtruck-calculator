// ==================== ЕДИНОЕ ХРАНИЛИЩЕ СОСТОЯНИЯ ====================

const Store = {
    state: {
        // Настройки
        businessLogic: '1',
        truckFridge: 100,
        carTrunk: 245,
        rvStorage: 260,
        rvCabinet: 300,
        marginPercent: 40,
        fishPrice: 400,
        
        // Меню
        selectedDishes: {},
        
        // Склад
        rawStock: {},
        prepStock: { truck: {}, rvStorage: {}, rvCabinet: {} },
        
        // Смена
        shift: { revenue: 0, profit: 0, orders: 0 },
        waste: { total: 0, items: [] },
        currentOrder: {},
        
        // Расчёты
        calculatedPrices: {},
        calculatedCosts: {}
    },
    
    init() {
        // Загружаем из localStorage
        const keys = ['businessLogic', 'truckFridge', 'carTrunk', 'rvStorage', 
                      'rvCabinet', 'marginPercent', 'fishPrice', 'selectedDishes',
                      'rawStock', 'prepStock', 'shift', 'waste', 'currentOrder'];
        
        keys.forEach(key => {
            const value = Storage.get(key);
            if (value !== null) {
                this.state[key] = value;
            }
        });
        
        console.log('✅ Store инициализирован');
        EventBus.emit('store:ready');
    },
    
    get(key) {
        return this.state[key];
    },
    
    set(key, value, persist = true) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        if (persist) {
            Storage.set(key, value);
        }
        
        EventBus.emit(`state:${key}:changed`, { key, value, oldValue });
        EventBus.emit('state:changed', { key, value, oldValue });
    },
    
    reset() {
        Storage.clear();
        this.state = {
            businessLogic: '1',
            truckFridge: 100,
            carTrunk: 245,
            rvStorage: 260,
            rvCabinet: 300,
            marginPercent: 40,
            fishPrice: 400,
            selectedDishes: {},
            rawStock: {},
            prepStock: { truck: {}, rvStorage: {}, rvCabinet: {} },
            shift: { revenue: 0, profit: 0, orders: 0 },
            waste: { total: 0, items: [] },
            currentOrder: {},
            calculatedPrices: {},
            calculatedCosts: {}
        };
        EventBus.emit('state:reset');
    }
};

window.Store = Store;
