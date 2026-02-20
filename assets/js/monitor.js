// js/monitor.js

let chartsInstances = {}; 

document.addEventListener('DOMContentLoaded', () => {
    initMonitor();
    // Tasa de refresco de 2 segundos exacta
    setInterval(updateMonitor, 2000); 
});

async function initMonitor() {
    await updateMonitor();
    const indicator = document.getElementById('liveIndicator');
    if (indicator) {
        indicator.className = "badge bg-success";
        indicator.innerText = "ONLINE - Refrescando 2s";
    }
}

async function updateMonitor() {
    try {
        const reqOpts = { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' };
        const [devRes, telRes] = await Promise.all([ 
            fetch(`${API_URL}/devices`, reqOpts), 
            fetch(`${API_URL}/telemetry`, reqOpts) 
        ]);
        
        // CORRECCIÓN: Leer el JSON correctamente una sola vez
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

    devices.forEach(device => {
        // ¿Es un dispositivo con volumen?
        const hasVolume = ['Entretenimiento', 'Computo', 'Audio'].includes(device.type);
        const volumeValue = device.volume || 0; 
        
        // Filtramos la telemetría solo para este dispositivo y ordenamos
        const deviceLogs = telemetry
            .filter(t => t.deviceId == device.id)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        // Para la gráfica, SOLO tomamos eventos de estado (ON/OFF)
        const statusLogs = deviceLogs.filter(t => t.type === 'status' || !t.type).slice(-20);
        
        const canvasStatusId = `chart-status-${device.id}`;

        // Si la tarjeta no existe, la creamos (CORRECCIÓN: usando insertAdjacentHTML)
        if (!document.getElementById(`card-${device.id}`)) {
            const volumeBadge = hasVolume 
                ? `<span class="badge bg-warning text-dark"><i class="bi bi-volume-up-fill"></i> ${volumeValue}%</span>` 
                : '';

            const cardHTML = `
                <div class="col-md-6 col-lg-4" id="card-${device.id}">
                    <div class="glass-card p-3 h-100">
                        <div class="d-flex align-items-center justify-content-between mb-2 border-bottom border-secondary pb-2">
                            <div class="d-flex align-items-center">
                                <i class="bi ${device.icon} fs-4 me-2 text-neon"></i>
                                <h5 class="text-white m-0">${device.name}</h5>
                            </div>
                            ${volumeBadge} 
                        </div>
                        <h6 class="text-white-50 mt-2 mb-1 small">Estado de Energía (ON/OFF)</h6>
                        <canvas id="${canvasStatusId}"></canvas>
                    </div>
                </div>`;
            
            // Esto agrega la tarjeta sin borrar las gráficas anteriores
            container.insertAdjacentHTML('beforeend', cardHTML);
        } else {
            // Si la tarjeta ya existe, solo actualizamos el número del volumen
            if (hasVolume) {
                const card = document.getElementById(`card-${device.id}`);
                const badge = card.querySelector('.bg-warning');
                if (badge) {
                    badge.innerHTML = `<i class="bi bi-volume-up-fill"></i> ${volumeValue}%`;
                }
            }
        }

        // --- DIBUJAR LA ÚNICA GRÁFICA (Estado) ---
        const ctxStatus = document.getElementById(canvasStatusId);
        if (ctxStatus) {
            const labels = statusLogs.map(d => {
                const date = new Date(d.createdAt);
                return isNaN(date.getTime()) ? '' : date.toLocaleTimeString();
            });
            const data = statusLogs.map(d => (d.value == 1) ? 1 : 0);

            if (chartsInstances[canvasStatusId]) {
                chartsInstances[canvasStatusId].data.labels = labels;
                chartsInstances[canvasStatusId].data.datasets[0].data = data;
                chartsInstances[canvasStatusId].update('none');
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
                            tension: 0, // Cuadrada
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

    devices.forEach(device => {
        // ¿Es un dispositivo con volumen?
        const hasVolume = ['Entretenimiento', 'Computo', 'Audio'].includes(device.type);
        const volumeValue = device.volume || 0; 
        
        // Filtramos la telemetría solo para este dispositivo y ordenamos por fecha
        const deviceLogs = telemetry
            .filter(t => t.deviceId == device.id)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        // Para la gráfica, SOLO tomamos eventos de estado (ON/OFF)
        const statusLogs = deviceLogs.filter(t => t.type === 'status' || !t.type).slice(-20);
        
        const canvasStatusId = `chart-status-${device.id}`;

        // Si la tarjeta no existe, la creamos
        if (!document.getElementById(`card-${device.id}`)) {
            
            // Si tiene volumen, creamos una etiqueta amarilla bonita; si no, queda vacío.
            const volumeBadge = hasVolume 
                ? `<span class="badge bg-warning text-dark"><i class="bi bi-volume-up-fill"></i> ${volumeValue}%</span>` 
                : '';

            container.innerHTML += `
                <div class="col-md-6 col-lg-4" id="card-${device.id}">
                    <div class="glass-card p-3 h-100">
                        <div class="d-flex align-items-center justify-content-between mb-2 border-bottom border-secondary pb-2">
                            <div class="d-flex align-items-center">
                                <i class="bi ${device.icon} fs-4 me-2 text-neon"></i>
                                <h5 class="text-white m-0">${device.name}</h5>
                            </div>
                            ${volumeBadge} 
                        </div>
                        <h6 class="text-white-50 mt-2 mb-1 small">Estado de Energía (ON/OFF)</h6>
                        <canvas id="${canvasStatusId}"></canvas>
                    </div>
                </div>`;
        } else {
            // Si la tarjeta ya existe, solo le actualizamos el numerito del volumen
            if (hasVolume) {
                const card = document.getElementById(`card-${device.id}`);
                const badge = card.querySelector('.bg-warning');
                if (badge) {
                    badge.innerHTML = `<i class="bi bi-volume-up-fill"></i> ${volumeValue}%`;
                }
            }
        }

        // --- DIBUJAR LA ÚNICA GRÁFICA (Estado) ---
        const ctxStatus = document.getElementById(canvasStatusId);
        if (ctxStatus) {
            const labels = statusLogs.map(d => new Date(d.createdAt).toLocaleTimeString());
            const data = statusLogs.map(d => (d.value == 1) ? 1 : 0);

            if (chartsInstances[canvasStatusId]) {
                chartsInstances[canvasStatusId].data.labels = labels;
                chartsInstances[canvasStatusId].data.datasets[0].data = data;
                chartsInstances[canvasStatusId].update('none');
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
                            tension: 0, // Cuadrada
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


// TABLA: Mostrará solo los últimos 10 estatus (encendido/apagado)
// TABLA: Mostrará los últimos 10 estatus globales ordenados por hora
// TABLA: Mostrará los últimos 10 eventos globales (incluyendo cambios de volumen)
function renderTableGrouped(devices, telemetry) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    let html = '';

    let allLogs = [];

    // 1. Juntar y filtrar los logs de todos los dispositivos
    devices.forEach(device => {
        // Verificamos si este dispositivo es de los que soportan volumen
        const hasVolume = ['Entretenimiento', 'Computo', 'Audio'].includes(device.type);
        
        telemetry
            .filter(t => t.deviceId == device.id)
            .forEach(log => {
                // Si es un evento de energía (status) pasa directo.
                // Si es un evento de volumen, solo pasa si el dispositivo es compatible.
                if (log.type === 'status' || !log.type || (log.type === 'volume' && hasVolume)) {
                    allLogs.push({ ...log, deviceName: device.name, deviceIcon: device.icon });
                }
            });
    });

    // 2. Ordenar todos los registros cronológicamente (del más nuevo al más viejo)
    allLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 3. Tomar solo los últimos 10 eventos
    const recentLogs = allLogs.slice(0, 10);

    // 4. Dibujar las filas en el orden correcto
    recentLogs.forEach(log => {
        const isVol = (log.type === 'volume');
        const isON = (log.value == 1);
        
        // Validación de fecha
        let timeString = 'Fecha desconocida';
        if (log.createdAt) {
            const d = new Date(log.createdAt);
            if (!isNaN(d.getTime())) {
                timeString = d.toLocaleString(); // Muestra fecha y hora local
            }
        }

        // Diseño dinámico: ¿Es Volumen o es Energía?
        let eventHtml = '';
        let valueHtml = '';

        if (isVol) {
            eventHtml = '<span class="text-warning"><i class="bi bi-volume-up"></i> Volumen</span>';
            valueHtml = `<span class="badge bg-dark border border-warning text-warning">${log.value}%</span>`;
        } else {
            eventHtml = '<span class="text-info"><i class="bi bi-power"></i> Energía</span>';
            valueHtml = isON ? '<span class="badge bg-success">ON</span>' : '<span class="badge bg-secondary">OFF</span>';
        }

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