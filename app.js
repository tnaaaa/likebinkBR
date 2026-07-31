// State
let sessions = JSON.parse(localStorage.getItem('bink_sessions')) || [];
let currency = localStorage.getItem('bink_currency') || 'USD';
let chartInstance = null;

// Currency Formatter
const formatMoney = (amount) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    let formatted = '';
    
    if (currency === 'USD') formatted = `$${absAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (currency === 'JPY') formatted = `¥${absAmount.toLocaleString('ja-JP')}`;
    if (currency === 'KRW') formatted = `₩${absAmount.toLocaleString('ko-KR')}`;
    
    return isNegative ? `-${formatted}` : formatted;
};

// Navigation Logic
document.querySelectorAll('.nav-item').forEach(nav => {
    nav.addEventListener('click', (e) => {
        e.preventDefault();
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        nav.classList.add('active');
        
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const targetId = nav.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        
        document.getElementById('header-title').textContent = nav.querySelector('span:last-child').textContent;
        
        if(targetId === 'view-dashboard') updateDashboard();
        if(targetId === 'view-history') renderHistory();
    });
});

// Calculate Duration from Time inputs
const calculateDuration = (start, end) => {
    const [sHours, sMins] = start.split(':').map(Number);
    const [eHours, eMins] = end.split(':').map(Number);
    let diff = (eHours * 60 + eMins) - (sHours * 60 + sMins);
    if (diff < 0) diff += 24 * 60; // Cross midnight
    return diff / 60;
};

// Add Session
document.getElementById('add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const date = document.getElementById('input-date').value;
    const start = document.getElementById('input-start').value;
    const end = document.getElementById('input-end').value;
    const buyin = parseFloat(document.getElementById('input-buyin').value);
    const cashout = parseFloat(document.getElementById('input-cashout').value);
    
    const profit = cashout - buyin;
    const duration = calculateDuration(start, end);
    
    const session = {
        id: Date.now().toString(),
        date,
        start,
        end,
        duration,
        buyin,
        cashout,
        profit,
        gameType: document.getElementById('input-game').value,
        stakes: document.getElementById('input-stakes').value,
        location: document.getElementById('input-location').value,
        tags: document.getElementById('input-tags').value.split(',').map(t => t.trim()).filter(t => t),
        notes: document.getElementById('input-notes').value
    };
    
    sessions.push(session);
    sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveData();
    
    alert('Session saved successfully!');
    e.target.reset();
    document.getElementById('input-date').valueAsDate = new Date();
    document.querySelector('.nav-item[data-target="view-dashboard"]').click();
});

// Update Dashboard & Chart
function updateDashboard() {
    let totalProfit = 0;
    let totalBuyin = 0;
    let totalHours = 0;
    let winCount = 0;
    
    sessions.forEach(s => {
        totalProfit += s.profit;
        totalBuyin += s.buyin;
        totalHours += s.duration;
        if (s.profit > 0) winCount++;
    });
    
    const hourly = totalHours > 0 ? (totalProfit / totalHours) : 0;
    const roi = totalBuyin > 0 ? ((totalProfit / totalBuyin) * 100) : 0;
    const winRate = sessions.length > 0 ? ((winCount / sessions.length) * 100) : 0;
    
    const profitEl = document.getElementById('total-profit');
    profitEl.textContent = formatMoney(totalProfit);
    profitEl.className = `val ${totalProfit > 0 ? 'positive' : totalProfit < 0 ? 'negative' : 'neutral'}`;
    
    document.getElementById('hourly-rate').textContent = `${formatMoney(hourly)}/h`;
    document.getElementById('total-roi').textContent = `${roi.toFixed(1)}%`;
    document.getElementById('win-rate').textContent = `${winRate.toFixed(1)}%`;
    document.getElementById('total-hours').textContent = `${totalHours.toFixed(1)}h`;
    
    renderChart();
}

function renderChart() {
    const ctx = document.getElementById('profitChart').getContext('2d');
    let cumulative = 0;
    const labels = sessions.map(s => s.date.substring(5)); // MM-DD
    const data = sessions.map(s => {
        cumulative += s.profit;
        return cumulative;
    });
    
    if (chartInstance) chartInstance.destroy();
    
    Chart.defaults.color = '#8e8e93';
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Bankroll',
                data: data,
                borderColor: '#34c759',
                backgroundColor: 'rgba(52, 199, 89, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#2c2c2e' } }
            }
        }
    });
}

// Render History
function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    if (sessions.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#8e8e93;">No sessions recorded yet.</p>';
        return;
    }
    
    [...sessions].reverse().forEach(s => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const pClass = s.profit > 0 ? 'positive' : s.profit < 0 ? 'negative' : 'neutral';
        const sign = s.profit > 0 ? '+' : '';
        
        let tagsHtml = s.tags.map(t => `<span class="tag">${t}</span>`).join('');
        
        div.innerHTML = `
            <div class="history-header">
                <span class="history-date">${s.date} <small>(${s.duration.toFixed(1)}h)</small></span>
                <span class="history-profit ${pClass}">${sign}${formatMoney(s.profit)}</span>
            </div>
            <div class="history-details">
                <span>${s.location || 'Unknown'}</span> | 
                <span>${s.gameType} ${s.stakes ? `(${s.stakes})` : ''}</span>
            </div>
            ${tagsHtml ? `<div class="history-details" style="margin-top:5px;">${tagsHtml}</div>` : ''}
            <button class="btn-delete" onclick="deleteSession('${s.id}')">×</button>
        `;
        list.appendChild(div);
    });
}

// Global Delete Function
window.deleteSession = (id) => {
    if (confirm('Are you sure you want to delete this session?')) {
        sessions = sessions.filter(s => s.id !== id);
        saveData();
        renderHistory();
    }
};

function saveData() {
    localStorage.setItem('bink_sessions', JSON.stringify(sessions));
}

// Settings
document.getElementById('setting-currency').value = currency;
document.getElementById('setting-currency').addEventListener('change', (e) => {
    currency = e.target.value;
    localStorage.setItem('bink_currency', currency);
    updateDashboard();
    renderHistory();
});

document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (confirm('WARNING: This will delete ALL your data. Are you sure?')) {
        sessions = [];
        saveData();
        updateDashboard();
        renderHistory();
        alert('Data cleared.');
    }
});

// Init
document.getElementById('input-date').valueAsDate = new Date();
updateDashboard();

// Service Worker with Force Update
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm('New update available! Reload to apply changes?')) {
                            window.location.reload();
                        }
                    }
                });
            });
        });
    });
}
