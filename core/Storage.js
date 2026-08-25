// ==================== БЕЗОПАСНЫЙ LOCALSTORAGE ====================

const Storage = {
get(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;
        
        // Пробуем распарсить как JSON
        try {
            return JSON.parse(item);
        } catch (e) {
            // Если не JSON, возвращаем как есть
            return item;
        }
    } catch (e) {
        console.error(`Ошибка чтения ${key}:`, e);
        return defaultValue;
    }
},
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Ошибка записи ${key}:`, e);
            return false;
        }
    },
    
    remove(key) {
        localStorage.removeItem(key);
    },
    
    clear() {
        localStorage.clear();
    }
};

window.Storage = Storage;
