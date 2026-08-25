// ==================== РАСЧЁТ ЗАКУПКИ ====================

const Procurement = {
    init() {
        this.cacheElements();
        this.bindEvents();
    },
    
    cacheElements() {
        this.errorBox = document.getElementById('error_box');
        this.resultBox = document.getElementById('result_box');
        this.noCalcMsg = document.getElementById('no_calc_msg');
        this.shoppingList = document.getElementById('res_shopping_list');
        this.transportPlan = document.getElementById('res_transport_plan');
        this.walkStats = document.getElementById('walk_stats');
        this.truckLoading = document.getElementById('res_truck_loading');
        this.economyBlock = document.getElementById('res_economy_block');
    },
    
    bindEvents() {
        EventBus.on('procurement:calculate', () => this.calculate());
    },
    
    calculate() {
        if (!DISH_DATABASE || DISH_DATABASE.length === 0) {
            alert('⚠️ База блюд не загружена!');
            return;
        }
        
        const logic = Store.get('businessLogic');
        const truckLimit = Store.get('truckFridge');
        const carLimit = Store.get('carTrunk');
        const rvLimit = Store.get('rvStorage');
        const margin = Store.get('marginPercent');
        const fishPrice = Store.get('fishPrice');
        const selectedDishes = Store.get('selectedDishes');
        const rawStock = Store.get('rawStock');
        const prepStock = Store.get('prepStock');
        
        // Собираем выбранные блюда
        const selected = DISH_DATABASE.filter((_, idx) => selectedDishes[idx]);
        
        if (selected.length === 0) {
            alert('Выберите хотя бы одно блюдо!');
            return;
        }
        
        // Считаем компоненты на порцию
        let totalComponentsPerServing = 0;
        selected.forEach(dish => {
            for (let k in dish.recipe) totalComponentsPerServing += dish.recipe[k];
        });
        
        // Лимиты
        const transportLimit = (logic === '1') ? truckLimit : (logic === '4' ? rvLimit : carLimit);
        const storageLimit = (logic === '3' || logic === '4') ? rvLimit : truckLimit;
        
        const maxItems = Math.floor(storageLimit / 0.2);
        const servingsPerDish = Math.floor(maxItems / totalComponentsPerServing);
        const truckItems = Math.floor(truckLimit / 0.2);
        const truckServings = Math.floor(truckItems / totalComponentsPerServing);
        
        // Расчёт
        let rawRequired = {};
        let truckLoad = {};
        let totalRevenue = 0;
        let totalCost = 0;
        let pricesHtml = '<strong>📋 ЦЕННИКИ ДЛЯ ВИТРИНЫ ФУДТРАКА:</strong><ul style="list-style-type:none;padding-left:0;">';
        
        const prices = { ...RAW_PRICES, "рыба": fishPrice };
        
        selected.forEach(dish => {
            let components = {};
            
            for (let k in dish.recipe) {
                const qty = dish.recipe[k] * servingsPerDish;
                rawRequired[k] = (rawRequired[k] || 0) + qty;
                
                const truckQty = dish.recipe[k] * truckServings;
                truckLoad[k] = (truckLoad[k] || 0) + truckQty;
                
                // Разбиваем заготовки на сырьё
                if (k === 'вареный_рис') components['рис'] = (components['рис'] || 0) + dish.recipe[k];
                else if (k === 'мясной_фарш') components['мясо'] = (components['мясо'] || 0) + dish.recipe[k];
                else if (k === 'сыр') components['молоко'] = (components['молоко'] || 0) + dish.recipe[k];
                else if (k === 'хлеб' || k === 'макароны') {
                    components['мука'] = (components['мука'] || 0) + dish.recipe[k];
                    components['яйцо'] = (components['яйцо'] || 0) + dish.recipe[k];
                }
                else if (k === 'стейк_заг') {
                    components['мясо'] = (components['мясо'] || 0) + dish.recipe[k];
                    components['фрукты'] = (components['фрукты'] || 0) + dish.recipe[k];
                    components['сахар'] = (components['сахар'] || 0) + dish.recipe[k];
                }
                else if (k === 'рыба_фрукт_заг') {
                    components['рыба'] = (components['рыба'] || 0) + dish.recipe[k];
                    components['фрукты'] = (components['фрукты'] || 0) + dish.recipe[k];
                    components['сахар'] = (components['сахар'] || 0) + dish.recipe[k];
                }
                else if (k === 'картофельное_пюре') {
                    components['овощи'] = (components['овощи'] || 0) + dish.recipe[k];
                    components['молоко'] = (components['молоко'] || 0) + dish.recipe[k] * 2;
                }
                else if (k === 'котлета') {
                    components['мясо'] = (components['мясо'] || 0) + dish.recipe[k];
                    components['молоко'] = (components['молоко'] || 0) + dish.recipe[k];
                }
                else if (k === 'рыбная_котлета') {
                    components['рыба'] = (components['рыба'] || 0) + dish.recipe[k];
                    components['молоко'] = (components['молоко'] || 0) + dish.recipe[k];
                }
                else if (k === 'рыбный_фарш') components['рыба'] = (components['рыба'] || 0) + dish.recipe[k];
                else if (k === 'тесто') {
                    components['мука'] = (components['мука'] || 0) + dish.recipe[k];
                    components['яйцо'] = (components['яйцо'] || 0) + dish.recipe[k];
                }
