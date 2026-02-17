// js/control.js

document.addEventListener('DOMContentLoaded', () => {
    loadDevices();
    // Refresco automático cada 5 segundos por si alguien cambia algo en otro lado
    setInterval(loadDevices, 5000); 
});

async function loadDevices() {
    try {
        const response = await fetch(`${API_URL}/devices`);
        const devices = await response.json();
        renderDevices(devices);
    } catch (error) {
        console.error("Error cargando dispositivos:", error);
    }
}

function renderDevices(devices) {
    const container = document.getElementById('devicesContainer');
    
    // Si ya hay tarjetas, solo actualizamos estados para no parpadear,
    // pero para simplificar en este prototipo, limpiamos y redibujamos.
    container.innerHTML = ''; 

    devices.forEach(device => {
        // Determinar si está encendido o apagado
        const isOn = device.status; 
        const statusClass = isOn ? 'device-on' : '';
        const statusText = isOn ? 'ENCENDIDO' : 'APAGADO';
        const statusColor = isOn ? 'text-success' : 'text-muted';

        const cardHtml = `
            <div class="col-md-4 col-sm-6">
                <div class="glass-card device-card ${statusClass}" onclick="toggleDevice('${device.id}', ${isOn})">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <span class="badge bg-dark bg-opacity-50 border border-secondary">${device.type}</span>
                        <i class="bi bi-circle-fill ${isOn ? 'text-success' : 'text-danger'} small-indicator"></i>
                    </div>
                    
                    <div class="device-icon mb-3">
                        <i class="bi ${device.icon}"></i>
                    </div>
                    
                    <h4 class="text-white">${device.name}</h4>
                    <p class="${statusColor} fw-bold mb-0">${statusText}</p>
                </div>
            </div>
        `;
        container.innerHTML += cardHtml;
    });
}

// Función principal: Cambiar estado
async function toggleDevice(id, currentStatus) {
    const newStatus = !currentStatus; // Invertir estado
    const valueForHistory = newStatus ? 1 : 0; // 1 para gráfica alta, 0 para baja

    try {
        // 1. Actualizar el estado visualmente INMEDIATAMENTE (Optimistic UI) para que se sienta rápido
        // (Opcional: aquí podrías agregar un loading, pero recargaremos todo al final)

        // 2. Actualizar base de datos de DISPOSITIVOS (PUT)
        await fetch(`${API_URL}/devices/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: newStatus })
        });

        // 3. Guardar en el HISTORIAL para la gráfica (POST a telemetry)
        // OJO: Esto es vital para tu requisito de monitoreo
        await fetch(`${API_URL}/telemetry`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                deviceId: id,
                value: valueForHistory
                // createdAt lo pone MockAPI automático
            })
        });

        // 4. Recargar interfaz para confirmar cambios
        loadDevices();

    } catch (error) {
        alert("Error de conexión con el dispositivo");
        console.error(error);
    }
}