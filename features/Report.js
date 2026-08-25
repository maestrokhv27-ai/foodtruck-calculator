// ==================== ОТЧЁТ ПО СМЕНЕ ====================

const Report = {
    init() {
        this.cacheElements();
        this.bindEvents();
        this.render();
    },
    
    cacheElements() {
        this.reportContent = document.getElementById('shift_report_content');
        this.exportBtn = document.querySelector('[onclick="exportShiftReport"]');
    },
    
    bindEvents() {
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportReport());
        }
        
        EventBus.on('state:shift:changed', () => this.render());
        EventBus.on('state:waste:changed', () => this.render());
    },
    
    render() {
        if (!this.reportContent) return;
        
        const shift = Store.get('shift');
        const waste = Store.get('waste');
        
        if (shift.orders === 0 && waste.items.length === 0) {
            this.reportContent.innerHTML = '<p style="text-align: center; opacity: 0.8;">Проведите заказы в кассе на вкладке "Станция", чтобы сформировать отчёт.</p>';
            return;
        }
        
        const netProfit = shift.profit - waste.total;
        
        let html = `<div style="margin-bottom: 15px;"><div style="font-size: 14px; opacity: 0.9;">📅 Смена активна</div></div>`;
        html += `<div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px; margin-bottom: 15px;">`;
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Заказов:</span><strong>${shift.orders}</strong></div>`;
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Выручка:</span><strong>$${shift.revenue.toLocaleString()}</strong></div>`;
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Прибыль:</span><strong>$${shift.profit.toLocaleString()}</strong></div>`;
        
        if (waste.items.length > 0) {
            html += `<hr style="border-color: rgba(255,255,255,0.3); margin: 10px 0;">`;
            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #ff6b6b;"><span>🗑️ Убыток от брака:</span><strong>-$${waste.total.toLocaleString()}</strong></div>`;
            html += `<div style="display: flex; justify-content: space-between; font-size: 20px;"><span>💵 ЧИСТАЯ ПРИБЫЛЬ:</span><strong>$${netProfit.toLocaleString()}</strong></div>`;
        } else {
            html += `<hr style="border-color: rgba(255,255,255,0.3); margin: 10px 0;">`;
            html += `<div style="display: flex; justify-content: space-between; font-size: 20px;"><span>💰 Прибыль:</span><strong>$${shift.profit.toLocaleString()}</strong></div>`;
        }
        
        html += `</div>`;
        
        if (waste.items.length > 0) {
            html += `<div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px;">`;
            html += `<h4 style="margin: 0 0 10px 0;">🗑️ Списание брака:</h4>`;
            waste.items.forEach(item => {
                html += `<div style="font-size: 13px; margin-bottom: 5px; opacity: 0.9;">• ${item.name}: ${item.qty} шт. (${item.time}) — $${item.cost}</div>`;
            });
            html += `</div>`;
        }
        
        this.reportContent.innerHTML = html;
    },
    
    exportReport() {
        const shift = Store.get('shift');
        const waste = Store.get('waste');
        
        if (shift.orders === 0 && waste.items.length === 0) {
            alert('Нет данных о заказах или списаниях!');
            return;
        }
        
        const date = new Date().toLocaleString('ru-RU');
        const netProfit = shift.profit - waste.total;
        
        let text = `📊 ОТЧЁТ ПО СМЕНЕ\n📅 Дата: ${date}\n━━━━━━━━━━━━━━━━━━━━\n`;
        text += `Заказов: ${shift.orders}\n`;
        text += `Выручка: $${shift.revenue.toLocaleString()}\n`;
        text += `💰 ПРИБЫЛЬ: $${shift.profit.toLocaleString()}\n`;
        
        if (waste.items.length > 0) {
            text += `\n🗑️ СПИСАНИЕ БРАКА:\n`;
            waste.items.forEach(item => {
                text += `• ${item.name} x${item.qty} (${item.time}) — $${item.cost}\n`;
            });
            text += `Убыток от брака: $${waste.total}\n`;
            text += `💵 ЧИСТАЯ ПРИБЫЛЬ: $${netProfit.toLocaleString()}\n`;
        }
        
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        
        // Показываем в модалке
        const modal = document.getElementById('sync_modal');
        const titleEl = document.getElementById('sync_modal_title');
        const contentEl = document.getElementById('sync_modal_content');
        
        if (modal && titleEl && contentEl) {
            titleEl.innerText = '📤 Отчёт по смене';
            contentEl.innerHTML = `
                <textarea id="export_code" readonly style="width: 100%; height: 250px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: monospace; font-size: 13px; resize: vertical;">${text}</textarea>
                <div style="margin-top: 10px; text-align: center;">
                    <button id="copy_report_btn" style="background: #27ae60; color: white; border: none; padding: 10px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;">📋 Скопировать</button>
                </div>
                <p id="copy_status" style="color: #27ae60; font-size: 13px; margin-top: 10px; display: none;">✅ Скопировано!</p>
            `;
            modal.style.display = 'flex';
            
            setTimeout(() => {
                const copyBtn = document.getElementById('copy_report_btn');
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
};

window.Report = Report;
