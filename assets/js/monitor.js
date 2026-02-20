// js/monitor.js

let chartsInstances = {}; 

document.addEventListener('DOMContentLoaded', () => {
    initMonitor();
    setInterval(updateMonitor, 2000); // Tasa de refresco 2 segundos
});

async function initMonitor() {
    await updateMonitor();
    document.getElementById('liveIndicator').className = "badge bg-success";
    document.getElementById('liveIndicator').innerText = "ONLINE - Refrescando 2s";
}

async function updateMonitor() {
    try {
        const reqOpts = { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' };
        const [devRes, telRes] = await Promise.all([ fetch(`${API_URL}/devices`, reqOpts), fetch(`${API_URL}/telemetry`, reqOpts) ]);
        
        const devices = Array.isArray(await devRes.json()) ? await devRes.json() : [];
        const telemetry = Array.isArray(await telRes.json()) ? await telRes.json() : [];

        renderCharts(devices, telemetry);
        renderTableGrouped(devices, telemetry);
    } catch (error) { console.error("Error API:", error); }
}

function renderCharts(devices, telemetry) {
    const container = document.getElementById('chartsContainer');
    if (container.innerHTML.includes('Cargando')) container.innerHTML = '';

    devices.forEach(device => {
        const hasVolume = ['Entretenimiento', 'Computo', 'Audio'].includes(device.type);
        const deviceLogs = telemetry.filter(t => t.deviceId == device.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        const statusLogs = deviceLogs.filter(t => t.type === 'status' || !t.type).slice(-20);
        const volumeLogs = deviceLogs.filter(t => t.type === 'volume').slice(-20);

        const canvasStatusId = `chart-status-${device.id}`;
        const canvasVolumeId = `chart-volume-${device.id}`;

        if (!document.getElementById(`card-${device.id}`)) {
            let chartsHtml = `<h6 class="text-white-50 mt-2 mb-1 small">Estado (ON/OFF)</h6><canvas id="${canvasStatusId}"></canvas>`;
            if (hasVolume) chartsHtml += `<h6 class="text-white-50 mt-4 mb-1 small">Volumen (%)</h6><canvas id="${canvasVolumeId}"></canvas>`;

            container.innerHTML += `
                <div class="col-md-6 col-lg-4" id="card-${device.id}">
                    <div class="glass-card p-3 h-100">
                        <div class="d-flex align-items-center mb-2 border-bottom border-secondary pb-2">
                            <i class="bi ${device.icon} fs-4 me-2 text-neon"></i><h5 class="text-white m-0">${device.name}</h5>
                        </div>
                        ${chartsHtml}
                    </div>
                </div>`;
        }

        // Gráfica de Estado
        const ctxStatus = document.getElementById(canvasStatusId);
        if (ctxStatus) {
            const dataStatus = statusLogs.map(d => d.value == 1 ? 1 : 0);
            if (chartsInstances[canvasStatusId]) {
                chartsInstances[canvasStatusId].data.labels = statusLogs.map(d => new Date(d.createdAt).toLocaleTimeString());
                chartsInstances[canvasStatusId].data.datasets[0].data = dataStatus;
                chartsInstances[canvasStatusId].update('none');
            } else {
                chartsInstances[canvasStatusId] = new Chart(ctxStatus, {
                    type: 'line',
                    data: { labels: statusLogs.map(d => new Date(d.createdAt).toLocaleTimeString()), datasets: [{ label: 'Estado', data: dataStatus, borderColor: '#00ff88', backgroundColor: 'rgba(0, 255, 136, 0.1)', borderWidth: 2, tension: 0, stepped: true, fill: true }] },
                    options: { responsive: true, animation: false, scales: { y: { min: 0, max: 1.2, ticks: { color: 'white', stepSize: 1, callback: v => v===1?'ON':(v===0?'OFF':'') } }, x: { display: false } }, plugins: { legend: { display: false } } }
                });
            }
        }

        // Gráfica de Volumen
        if (hasVolume && document.getElementById(canvasVolumeId)) {
            if (chartsInstances[canvasVolumeId]) {
                chartsInstances[canvasVolumeId].data.labels = volumeLogs.map(d => new Date(d.createdAt).toLocaleTimeString());
                chartsInstances[canvasVolumeId].data.datasets[0].data = volumeLogs.map(d => d.value);
                chartsInstances[canvasVolumeId].update('none');
            } else {
                chartsInstances[canvasVolumeId] = new Chart(document.getElementById(canvasVolumeId), {
                    type: 'line',
                    data: { labels: volumeLogs.map(d => new Date(d.createdAt).toLocaleTimeString()), datasets: [{ label: 'Volumen', data: volumeLogs.map(d => d.value), borderColor: '#d400ff', backgroundColor: 'rgba(212, 0, 255, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] },
                    options: { responsive: true, animation: false, scales: { y: { min: 0, max: 100, ticks: { color: 'white' } }, x: { display: false } }, plugins: { legend: { display: false } } }
                });
            }
        }
    });
}

function renderTableGrouped(devices, telemetry) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    let html = '';

    devices.forEach(device => {
        const logs = telemetry.filter(t => t.deviceId == device.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
        logs.forEach(log => {
            const isVol = log.type === 'volume';
            html += `
                <tr>
                    <td class="text-start"><i class="bi ${device.icon} text-neon me-2"></i> ${device.name}</td>
                    <td class="text-muted small">${new Date(log.createdAt).toLocaleString()}</td>
                    <td>${isVol ? '<span class="text-warning"><i class="bi bi-volume-up"></i> Volumen</span>' : '<span class="text-info"><i class="bi bi-power"></i> Energía</span>'}</td>
                    <td>${isVol ? `<span class="badge bg-dark border border-warning">${log.value}%</span>` : (log.value == 1 ? '<span class="badge bg-success">ON</span>' : '<span class="badge bg-secondary">OFF</span>')}</td>
                </tr>`;
        });
    });
    tbody.innerHTML = html;
}