// js/monitor.js

let chartsInstances = {}; 

document.addEventListener('DOMContentLoaded', () => {
    initMonitor();
    
    // Actualización cada 2 segundos SIN recargar la página
    setInterval(() => {
        updateMonitor();
    }, 2000);
});

async function initMonitor() {
    await updateMonitor();
}

async function updateMonitor() {
    try {
        const reqOpts = { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' };
        const [devRes, telRes] = await Promise.all([ 
            fetch(`${API_URL}/devices`, reqOpts), 
            fetch(`${API_URL}/telemetry`, reqOpts) 
        ]);
        
        const devData = await devRes.json();
        const telData = await telRes.json();

        const devices = Array.isArray(devData) ? devData : [];
        const telemetry = Array.isArray(telData) ? telData : [];

        renderCharts(devices, telemetry);
        renderTableGrouped(devices, telemetry);
        
    } catch (error) { 
        console.error("Error API:", error); 
    }
}

function renderCharts(devices, telemetry) {
    const container = document.getElementById('chartsContainer');
    
    if (container && container.innerHTML.includes('Cargando')) {
        container.innerHTML = '';
    }
    
    if (devices.length === 0) {
        if (Object.keys(chartsInstances).length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-white">
                    <i class="bi bi-emoji-frown fs-1"></i>
                    <p>No hay dispositivos para monitorear.</p>
                </div>`;
        }
        return;
    }

    devices.forEach(device => {
        const hasVolume = ['Entretenimiento', 'Computo', 'Audio'].includes(device.type);
        const volumeValue = device.volume || 0; 
        
        const deviceLogs = telemetry
            .filter(t => t.deviceId == device.id)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        const statusLogs = deviceLogs.filter(t => t.type === 'status' || !t.type).slice(-20);
        
        const canvasStatusId = `chart-status-${device.id}`;

        // Crear tarjeta si no existe
        if (!document.getElementById(`card-${device.id}`)) {
            const volumeBadge = hasVolume 
                ? `<span class="badge bg-warning text-dark ms-2"><i class="bi bi-volume-up-fill"></i> ${volumeValue}%</span>` 
                : '';

            const cardHTML = `
                <div class="col-md-6 col-lg-4" id="card-${device.id}">
                    <div class="glass-card p-3 h-100">
                        <div class="d-flex align-items-center justify-content-between mb-2 border-bottom border-secondary pb-2">
                            <div class="d-flex align-items-center">
                                <i class="bi ${device.icon} fs-4 me-2 text-neon"></i>
                                <h5 class="text-white m-0">${device.name}</h5>
                            </div>
                            <div>
                                <span class="badge ${device.status ? 'bg-success' : 'bg-danger'}">${device.status ? 'ON' : 'OFF'}</span>
                                ${volumeBadge}
                            </div>
                        </div>
                        <h6 class="text-white-50 mt-2 mb-1 small">Estado de Energía</h6>
                        <canvas id="${canvasStatusId}"></canvas>
                    </div>
                </div>`;
            
            container.insertAdjacentHTML('beforeend', cardHTML);
        } else {
            // Actualizar tarjeta existente
            const card = document.getElementById(`card-${device.id}`);
            
            // Actualizar estado ON/OFF
            const statusBadge = card.querySelector('.bg-success, .bg-danger');
            if (statusBadge) {
                statusBadge.className = `badge ${device.status ? 'bg-success' : 'bg-danger'}`;
                statusBadge.innerText = device.status ? 'ON' : 'OFF';
            }
            
            // Actualizar volumen
            if (hasVolume) {
                let volumeBadge = card.querySelector('.bg-warning');
                if (volumeBadge) {
                    volumeBadge.innerHTML = `<i class="bi bi-volume-up-fill"></i> ${volumeValue}%`;
                }
            }
        }

        // Dibujar gráfica
        const ctxStatus = document.getElementById(canvasStatusId);
        if (ctxStatus) {
            const labels = statusLogs.map(d => {
                const date = new Date(d.createdAt);
                return isNaN(date.getTime()) ? '' : date.toLocaleTimeString();
            });
            const data = statusLogs.map(d => (d.value == 1) ? 1 : 0);

            if (chartsInstances[canvasStatusId]) {
                const chart = chartsInstances[canvasStatusId];
                const dataChanged = JSON.stringify(chart.data.datasets[0].data) !== JSON.stringify(data);
                
                if (dataChanged) {
                    chart.data.labels = labels;
                    chart.data.datasets[0].data = data;
                    chart.update('none');
                }
            } else {
                chartsInstances[canvasStatusId] = new Chart(ctxStatus, {
                    type: 'line',
                    data: { 
                        labels: labels, 
                        datasets: [{ 
                            label: 'Estado', 
                            data: data, 
                            borderColor: '#00ff88', 
                            backgroundColor: 'rgba(0, 255, 136, 0.1)', 
                            borderWidth: 2, 
                            tension: 0, 
                            stepped: true, 
                            fill: true 
                        }] 
                    },
                    options: { 
                        responsive: true, 
                        animation: false, 
                        scales: { 
                            y: { min: 0, max: 1.2, ticks: { color: 'white', stepSize: 1, callback: v => v===1?'ON':(v===0?'OFF':'') } }, 
                            x: { display: false } 
                        }, 
                        plugins: { legend: { display: false } } 
                    }
                });
            }
        }
    });
}

function renderTableGrouped(devices, telemetry) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    
    if (devices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin datos disponibles</td></tr>';
        return;
    }

    let allLogs = [];

    devices.forEach(device => {
        const hasVolume = ['Entretenimiento', 'Computo', 'Audio'].includes(device.type);
        
        telemetry
            .filter(t => t.deviceId == device.id)
            .forEach(log => {
                if (log.type === 'status' || !log.type || (log.type === 'volume' && hasVolume)) {
                    allLogs.push({ ...log, deviceName: device.name, deviceIcon: device.icon });
                }
            });
    });

    // Ordenar del más nuevo al más viejo
    allLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Mostrar hasta 100 eventos (antes solo 10)
    const recentLogs = allLogs.slice(0, 100); 
    
    let html = '';
    recentLogs.forEach(log => {
        const isVol = (log.type === 'volume');
        const isON = (log.value == 1);
        
        let timeString = 'Fecha desconocida';
        if (log.createdAt) {
            const d = new Date(log.createdAt);
            if (!isNaN(d.getTime())) timeString = d.toLocaleString();
        }

        let eventHtml = isVol 
            ? '<span class="text-warning"><i class="bi bi-volume-up"></i> Volumen</span>' 
            : '<span class="text-info"><i class="bi bi-power"></i> Energía</span>';
            
        let valueHtml = isVol 
            ? `<span class="badge bg-dark border border-warning text-warning">${log.value}%</span>`
            : (isON ? '<span class="badge bg-success">ON</span>' : '<span class="badge bg-secondary">OFF</span>');

        html += `
            <tr>
                <td class="text-muted small">${timeString}</td>
                <td class="text-start"><i class="bi ${log.deviceIcon} text-neon me-2"></i> ${log.deviceName}</td>
                <td>${eventHtml}</td>
                <td>${valueHtml}</td>
            </tr>`;
    });
    
    tbody.innerHTML = html;
}

// Función para limpiar la tabla
function clearTable() {
    const tbody = document.getElementById('historyTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Tabla limpiada. Los nuevos eventos aparecerán en la próxima actualización.</td></tr>';
    }
}