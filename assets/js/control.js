document.addEventListener('DOMContentLoaded', loadDevices);

async function loadDevices() {
    try {
        const response = await fetch(`${API_URL}/devices`);
        const devices = await response.json();
        renderDevices(devices);
    } catch (error) {
        console.error("Error al cargar dispositivos:", error);
    }
}

function renderDevices(devices) {
    const container = document.getElementById('devicesContainer');
    container.innerHTML = ''; 

    devices.forEach(device => {
        const isOn = device.status; 
        const statusClass = isOn ? 'device-on' : '';
        const volume = device.volume || 0; 
        const hasVolume = ['Entretenimiento', 'Computo', 'Audio'].includes(device.type);

        let volumeHtml = '';
        if (hasVolume) {
            volumeHtml = `
                <div class="mt-3 pt-3 border-top border-secondary">
                    <label class="text-white-50 small mb-1"><i class="bi bi-volume-up"></i> Volumen: <span id="vol-${device.id}">${volume}</span>%</label>
                    <input type="range" class="form-range" min="0" max="100" value="${volume}" 
                        onchange="changeVolume('${device.id}', this.value)" ${!isOn ? 'disabled' : ''}>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="col-md-4 col-sm-6">
                <div class="glass-card device-card ${statusClass}">
                    <div class="d-flex justify-content-between align-items-start mb-2" onclick="toggleDevice('${device.id}', ${isOn})" style="cursor:pointer">
                        <span class="badge bg-dark border border-secondary">${device.type}</span>
                        <i class="bi bi-circle-fill ${isOn ? 'text-success' : 'text-danger'}"></i>
                    </div>
                    <div class="device-icon mb-2 text-center" onclick="toggleDevice('${device.id}', ${isOn})" style="cursor:pointer">
                        <i class="bi ${device.icon} fs-1"></i>
                    </div>
                    <h4 class="text-white text-center">${device.name}</h4>
                    <p class="${isOn ? 'text-success' : 'text-muted'} fw-bold mb-0 text-center">${isOn ? 'ENCENDIDO' : 'APAGADO'}</p>
                    ${volumeHtml}
                </div>
            </div>
        `;
    });
}

async function toggleDevice(id, currentStatus) {
    const newStatus = !currentStatus;
    try {
        await fetch(`${API_URL}/devices/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: newStatus })
        });
        await fetch(`${API_URL}/telemetry`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ deviceId: id, value: newStatus ? 1 : 0, type: 'status' })
        });
        loadDevices();
    } catch (error) { console.error(error); }
}

async function changeVolume(id, newVolume) {
    document.getElementById(`vol-${id}`).innerText = newVolume;
    try {
        await fetch(`${API_URL}/devices/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ volume: newVolume })
        });
        await fetch(`${API_URL}/telemetry`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ deviceId: id, value: newVolume, type: 'volume' })
        });
    } catch (error) { console.error(error); }
}