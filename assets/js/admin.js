// js/admin.js

// Al cargar la página, obtenemos los dispositivos
document.addEventListener('DOMContentLoaded', () => {
    fetchDevices();
});

const myModal = new bootstrap.Modal(document.getElementById('deviceModal'));

// 1. READ (Leer dispositivos)
async function fetchDevices() {
    try {
        const res = await fetch(`${API_URL}/devices`);
        handleErrors(res);
        const devices = await res.json();
        renderTable(devices);
    } catch (error) {
        alert("Error al cargar dispositivos: " + error);
    }
}

function renderTable(devices) {
    const tbody = document.getElementById('deviceTableBody');
    tbody.innerHTML = '';
    
    devices.forEach(device => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><i class="bi ${device.icon} fs-4"></i></td>
            <td class="fw-bold">${device.name}</td>
            <td><span class="badge bg-secondary">${device.type}</span></td>
            <td>${device.status ? '<span class="text-success">ON</span>' : '<span class="text-danger">OFF</span>'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editDevice('${device.id}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteDevice('${device.id}')"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 2. Preparar Modal (Abrir para crear o editar)
function openModal() {
    document.getElementById('deviceForm').reset();
    document.getElementById('deviceId').value = '';
    document.getElementById('modalTitle').innerText = 'Nuevo Dispositivo';
    myModal.show();
}

async function editDevice(id) {
    try {
        const res = await fetch(`${API_URL}/devices/${id}`);
        const device = await res.json();
        
        document.getElementById('deviceId').value = device.id;
        document.getElementById('name').value = device.name;
        document.getElementById('type').value = device.type;
        document.getElementById('icon').value = device.icon;
        
        document.getElementById('modalTitle').innerText = 'Editar Dispositivo';
        myModal.show();
    } catch (error) {
        console.error(error);
    }
}

// 3. CREATE & UPDATE (Guardar)
async function saveDevice() {
    const id = document.getElementById('deviceId').value;
    const data = {
        name: document.getElementById('name').value,
        type: document.getElementById('type').value,
        icon: document.getElementById('icon').value,
        // Si es nuevo, status por defecto false. Si es edit, no tocamos el status aquí.
        ...(id === '' && { status: false }) 
    };

    try {
        if (id === '') {
            // POST (Crear)
            await fetch(`${API_URL}/devices`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
        } else {
            // PUT (Actualizar)
            await fetch(`${API_URL}/devices/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
        }
        myModal.hide();
        fetchDevices(); // Recargar tabla
    } catch (error) {
        alert("Error al guardar: " + error);
    }
}

// 4. DELETE (Borrar)
async function deleteDevice(id) {
    if(!confirm('¿Estás seguro de eliminar este dispositivo?')) return;
    
    try {
        await fetch(`${API_URL}/devices/${id}`, { method: 'DELETE' });
        fetchDevices();
    } catch (error) {
        alert("Error al eliminar");
    }
}