// js/monitor.js

let chartsInstances = {}; 

document.addEventListener('DOMContentLoaded', () => {
    initMonitor();
    // Refresco cada 2 segundos
    setInterval(updateMonitor, 2000);
});

async function initMonitor() {
    await updateMonitor();
    const indicator = document.getElementById('liveIndicator');
    if (indicator) {
        indicator.classList.remove('bg-danger');
        indicator.classList.add('bg-success');
        indicator.innerText = "ONLINE";
    }
}

async function updateMonitor() {
    try {
        // CORRECCIÓN: Usamos headers para evitar el caché sin romper la URL de MockAPI
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store' // Esto obliga al navegador a pedir datos nuevos siempre
        };
        
        const [devicesRes, telemetryRes] = await Promise.all([
            fetch(`${API_URL}/devices`, requestOptions),
            fetch(`${API_URL}/telemetry`, requestOptions)
        ]);
        
        if (!devicesRes.ok || !telemetryRes.ok) throw new Error("Error en la API");

        const devices = await devicesRes.json();
        const telemetry = await telemetryRes.json();

        // Si MockAPI devuelve un string por error, intentamos parsearlo (seguridad extra)
        const cleanDevices = Array.isArray(devices) ? devices : [];
        const cleanTelemetry = Array.isArray(telemetry) ? telemetry : [];

        renderCharts(cleanDevices, cleanTelemetry);
        renderTable(cleanDevices, cleanTelemetry);

    } catch (error) {
        console.error("Error en monitoreo:", error);
    }
}

function renderCharts(devices, telemetry) {
    const container = document.getElementById('chartsContainer');

    // Limpiar mensaje de carga inicial si existe
    if (container.innerHTML.includes('Cargando')) {
        container.innerHTML = '';
    }

    devices.forEach(device => {
        // Filtramos y ordenamos la telemetría
        // Usamos '==' para que coincida ID texto ("1") con ID número (1)
        const deviceData = telemetry
            .filter(t => t.deviceId == device.id) 
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // Orden Cronológico (antiguo -> nuevo)
            .slice(-20); // Últimos 20 puntos para la gráfica

        const labels = deviceData.map(d => new Date(d.createdAt).toLocaleTimeString());
        const dataPoints = deviceData.map(d => d.value);

        const canvasId = `chart-${device.id}`;

        // Crear la tarjeta HTML si no existe
        if (!document.getElementById(canvasId)) {
            const html = `
                <div class="col-md-6 col-lg-4">
                    <div class="glass-card p-3 h-100">
                        <div class="d-flex align-items-center mb-3">
                            <i class="bi ${device.icon} fs-4 me-2 text-neon"></i>
                            <h5 class="text-white m-0">${device.name}</h5>
                        </div>
                        <canvas id="${canvasId}"></canvas>
                    </div>
                </div>
            `;
            container.innerHTML += html;
        }

        // Actualizar o Crear Gráfica
        const ctx = document.getElementById(canvasId);
        if (ctx) {
            if (chartsInstances[device.id]) {
                // Actualizar existente
                chartsInstances[device.id].data.labels = labels;
                chartsInstances[device.id].data.datasets[0].data = dataPoints;
                chartsInstances[device.id].update('none'); // 'none' ahorra recursos en la animación
            } else {
                // Crear nueva
                chartsInstances[device.id] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Estado',
                            data: dataPoints,
                            borderColor: '#00d4ff',
                            backgroundColor: 'rgba(0, 212, 255, 0.1)',
                            borderWidth: 2,
                            tension: 0.1, // Línea más recta para señales digitales
                            fill: true,
                            stepped: true // Importante para ver la señal cuadrada
                        }]
                    },
                    options: {
                        responsive: true,
                        animation: false, // Desactivar animación inicial para que se sienta más 'tiempo real'
                        scales: {
                            y: { 
                                beginAtZero: true, 
                                max: 1.5, // Dejar espacio arriba del 1
                                ticks: { color: 'white', stepSize: 1 } 
                            },
                            x: { display: false }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }
        }
    });
}

function renderTable(devices, telemetry) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    // Ordenamos INVERSO (Nuevo -> Antiguo) para la tabla
    const last10 = [...telemetry] // Creamos una copia para no romper el orden de las gráficas
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);

    // Si no ha cambiado la cantidad de filas y es el mismo primer dato, no redibujamos (optimización)
    // Pero para asegurar que funcione, forzamos el redibujado:
    tbody.innerHTML = '';

    last10.forEach(log => {
        const device = devices.find(d => d.id == log.deviceId);
        const deviceName = device ? device.name : 'Desconocido';
        const deviceIcon = device ? device.icon : 'bi-question';

        const date = new Date(log.createdAt).toLocaleString();
        
        const statusBadge = log.value == 1 
            ? '<span class="badge bg-success">ENCENDIDO</span>' 
            : '<span class="badge bg-secondary">APAGADO</span>';

        const row = `
            <tr>
                <td class="text-muted small">${date}</td>
                <td><i class="bi ${deviceIcon}"></i> ${deviceName}</td>
                <td>Switch</td>
                <td>${statusBadge}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}