// ==================== СОБЫТИЙНАЯ ШИНА ====================
// Модули общаются через события, не зная друг о друге

const EventBus = {
    handlers: {},
    
    on(event, fn) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(fn);
        return fn;
    },
    
    off(event, fn) {
        if (!this.handlers[event]) return;
        this.handlers[event] = this.handlers[event].filter(h => h !== fn);
    },
    
    emit(event, data) {
        if (!this.handlers[event]) return;
        this.handlers[event].forEach(fn => {
            try {
                fn(data);
            } catch (e) {
                console.error(`Ошибка в обработчике события ${event}:`, e);
            }
        });
    },
    
    once(event, fn) {
        const wrapper = (data) => {
            fn(data);
            this.off(event, wrapper);
        };
        return this.on(event, wrapper);
    }
};

window.EventBus = EventBus;
