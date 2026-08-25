// ==================== ТОЧКА ВХОДА ====================
// Инициализирует все модули после загрузки DOM

document.addEventListener('DOMContentLoaded', () => {
    console.log(' ERP Фудтрака — запуск...');
    
    // 1. Инициализируем ядро
    Store.init();
    
    // 2. Инициализируем фичи
    if (window.Settings) Settings.init();
    if (window.Inventory) Inventory.init();
    if (window.Procurement) Procurement.init();
    if (window.Workstation) Workstation.init();
    if (window.Report) Report.init();
    
    console.log('✅ Все модули загружены');
});

// ==================== УТИЛИТЫ UI ====================

// Переключение вкладок
function openTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.style.display = 'block';
        setTimeout(() => activeTab.classList.add('active'), 10);
    }
    if (btnElement) {
        btnElement.classList.add('active');
    }
}

// Закрытие модалки
function closeSyncModal() {
    const modal = document.getElementById('sync_modal');
    if (modal) modal.style.display = 'none';
}

// Закрытие по клику на оверлей
document.addEventListener('click', (e) => {
    if (e.target.id === 'sync_modal') {
        closeSyncModal();
    }
});

// ==================== ТЁМНАЯ ТЕМА ====================
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    Storage.set('theme', isDark ? 'dark' : 'light');
    const btn = document.getElementById('theme_btn');
    if (btn) btn.innerText = isDark ? '☀️ Светлая' : '🌙 Тёмная';
}

(function() {
    const savedTheme = Storage.get('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        setTimeout(() => {
            const btn = document.getElementById('theme_btn');
            if (btn) btn.innerText = '☀️ Светлая';
        }, 100);
    }
})();

// ==================== ЭКСПОРТ / ИМПОРТ ====================

function exportData() {
    const data = {
        businessLogic: Store.get('businessLogic'),
        truckFridge: Store.get('truckFridge'),
        carTrunk: Store.get('carTrunk'),
        rvStorage: Store.get('rvStorage'),
        rvCabinet: Store.get('rvCabinet'),
        marginPercent: Store.get('marginPercent'),
        fishPrice: Store.get('fishPrice'),
        selectedDishes: Store.get('selectedDishes'),
        rawStock: Store.get('rawStock'),
        prepStock: Store.get('prepStock'),
        shift: Store.get('shift'),
        waste: Store.get('waste')
    };
    
    const json = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    
    const modal = document.getElementById('sync_modal');
    const title = document.getElementById('sync_modal_title');
    const content = document.getElementById('sync_modal_content');
    
    if (modal && title && content) {
        title.innerText = '📤 Экспорт данных';
        content.innerHTML = `
            <p style="color: #7f8c8d; font-size: 14px;">Скопируйте этот код и отправьте себе в Telegram (в "Избранное"):</p>
            <textarea id="export_code" readonly style="width: 100%; height: 150px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 12px; resize: vertical;">${encoded}</textarea>
            <div style="margin-top: 10px; text-align: center;">
                <button id="copy_export_btn" style="background: #27ae60; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;">📋 Скопировать код</button>
            </div>
            <p id="copy_status" style="color: #27ae60; font-size: 13px; margin-top: 10px; display: none;">✅ Скопировано!</p>
        `;
        modal.style.display = 'flex';
        
        setTimeout(() => {
            const copyBtn = document.getElementById('copy_export_btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    const textarea = document.getElementById('export_code');
                    textarea.select();
                    document.execCommand('copy');
                    const status = document.getElementById('copy_status');
                    if (status) {
                        status.style.display = 'block';
                        setTimeout(() => { status.style.display = 'none'; }, 2000);
                    }
                });
            }
        }, 100);
    }
}

function importData() {
    const modal = document.getElementById('sync_modal');
    const title = document.getElementById('sync_modal_title');
    const content = document.getElementById('sync_modal_content');
    
    if (modal && title && content) {
        title.innerText = '📥 Импорт данных';
        content.innerHTML = `
            <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
                <strong>Способ 1:</strong> Скопируйте код из чата и нажмите кнопку ниже<br>
                <strong>Способ 2:</strong> Вставьте код вручную в поле ниже
            </p>
            <div style="margin-bottom: 10px;">
                <button id="paste_from_clipboard" style="width: 100%; background: #3498db; color: white; border: none; padding: 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;">📋 Вставить из буфера обмена</button>
            </div>
            <textarea id="import_code" placeholder="Или вставьте код сюда..." style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
            <div style="margin-top: 10px; text-align: center;">
                <button id="apply_import" style="background: #8e44ad; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;">✅ Применить импорт</button>
            </div>
            <p id="import_status" style="font-size: 13px; margin-top: 10px; display: none;"></p>
        `;
        modal.style.display = 'flex';
        
        setTimeout(() => {
            const pasteBtn = document.getElementById('paste_from_clipboard');
            const applyBtn = document.getElementById('apply_import');
            
            if (pasteBtn) {
                pasteBtn.addEventListener('click', () => {
                    navigator.clipboard.readText().then(text => {
                        const textarea = document.getElementById('import_code');
                        if (textarea) textarea.value = text;
                        applyImport();
                    }).catch(() => {
                        alert('❌ Не удалось получить данные из буфера. Вставьте код вручную.');
                    });
                });
            }
            
            if (applyBtn) {
                applyBtn.addEventListener('click', () => applyImport());
            }
        }, 100);
    }
}

function applyImport() {
    const textarea = document.getElementById('import_code');
    const code = textarea ? textarea.value.trim() : '';
    const status = document.getElementById('import_status');
    
    if (!code) {
        if (status) {
            status.innerText = '❌ Вставьте код!';
            status.style.color = '#e74c3c';
            status.style.display = 'block';
        }
        return;
    }
    
    try {
        const json = decodeURIComponent(escape(atob(code)));
        const data = JSON.parse(json);
        
        const keys = ['businessLogic', 'truckFridge', 'carTrunk', 'rvStorage', 
                      'rvCabinet', 'marginPercent', 'fishPrice', 'selectedDishes',
                      'rawStock', 'prepStock', 'shift', 'waste'];
        
        keys.forEach(key => {
            if (data[key] !== undefined) {
                Store.set(key, data[key]);
            }
        });
        
        if (status) {
            status.innerText = '✅ Данные импортированы!';
            status.style.color = '#27ae60';
            status.style.display = 'block';
        }
        
        setTimeout(() => {
            closeSyncModal();
            location.reload(); // Перезагрузка для применения
        }, 1500);
    } catch (e) {
        if (status) {
            status.innerText = '❌ Ошибка: неверный код!';
            status.style.color = '#e74c3c';
            status.style.display = 'block';
        }
    }
}
