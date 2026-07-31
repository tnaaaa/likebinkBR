let sessions = JSON.parse(localStorage.getItem('bink_sessions')) || [];
let chartInstance = null;

document.getElementById('date').valueAsDate = new Date();

document.getElementById('session-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const date = document.getElementById('date').value;
    const buyin = parseFloat(document.getElementById('buyin').value);
    const cashout = parseFloat(document.getElementById('cashout').value);
    const duration = parseFloat(document.getElementById('duration').value);
    
    const profit = cashout - buyin;
    
    const session = {
        id: Date.now(),
        date,
        buyin,
        cashout,
        duration,
        profit
    };
    
    sessions.push(session);
    sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    localStorage.setItem('bink_sessions', JSON.stringify(sessions));
    
    this.reset();
    document.getElementById('date').valueAsDate = new Date();
    
    updateUI();
});

function updateUI() {
    updateDashboard();
    renderChart();
    renderHistory();
}

function updateDashboard() {
    let totalProfit = 0;
    let totalBuyin = 0;
    let totalHours = 0;
    
    sessions.forEach(s => {
        totalProfit += s.profit;
        totalBuyin += s.buyin;
        totalHours += s.duration;
    });
    
    const hourly = totalHours > 0 ? (totalProfit / totalHours).toFixed(2) : 0;
    const roi = totalBuyin > 0 ? ((totalProfit / totalBuyin) * 100).toFixed(2) : 0;
    
    const profitEl = document.getElementById('total-profit');
    profitEl.textContent = `$${totalProfit}`;
    profitEl.className = totalProfit >= 0 ? 'positive' : 'negative';
    
    document.getElementById('hourly-rate').textContent = `$${hourly}/h`;
    document.getElementById('total-roi').textContent = `${roi}%`;
}

function renderChart() {
    const ctx = document.getElementById('profitChart').getContext('2d');
    
    let cumulative = 0;
    const labels = sessions.map(s => s.date.substring(5)); // MM-DD
    const data = sessions.map(s => {
        cumulative += s.profit;
        return cumulative;
    });
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Bankroll Growth',
                data: data,
                borderColor: '#4ade80',
                backgroundColor: 'rgba(74, 222, 128, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#333' } }
            }
        }
    });
}

function renderHistory() {
    const list = document.getElementById('session-list');
    list.innerHTML = '';
    
    // Show newest first in history
    [...sessions].reverse().forEach(s => {
        const div = document.createElement('div');
        div.className = 'session-item';
        
        const profitClass = s.profit >= 0 ? 'positive' : 'negative';
        const sign = s.profit >= 0 ? '+' : '';
        
        div.innerHTML = `
            <div class="session-info">
                <span class="session-date">${s.date}</span>
                <span class="session-duration">${s.duration} hrs</span>
            </div>
            <div class="session-profit ${profitClass}">
                ${sign}$${s.profit}
            </div>
        `;
        list.appendChild(div);
    });
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registered!', reg))
            .catch(err => console.log('SW failed', err));
    });
}

// Initial render
updateUI();
