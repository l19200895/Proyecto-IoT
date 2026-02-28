// js/admin.js

// Inicializar toast
const toastEl = document.getElementById('liveToast');
const toast = new bootstrap.Toast(toastEl, { delay: 3000 });

// Función para mostrar notificaciones
function showToast(title, message) {
    document.getElementById('toastTitle').innerText = title;
    document.getElementById('toastBody').innerText = message;
    toast.show();
}

document.addEventListener('DOMContentLoaded', () => {
    fetchDevices();
});

const myModal = new bootstrap.Modal(document.getElementById('deviceModal'));

// 1. READ
async function fetchDevices() {
    try {
        const res = await fetch(`${API_URL}/devices`);
        handleErrors(res);
        const devices = await res.json();
        renderTable(devices);
    } catch (error) {
        showToast("Error", "No se pudieron cargar los dispositivos");
    }
}

function renderTable(devices) {
    const tbody = document.getElementById('deviceTableBody');
    tbody.innerHTML = '';

    if (devices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-emoji-frown fs-1 d-block mb-2"></i>
                    No hay dispositivos registrados. ¡Añade uno!
                </td>
            </tr>
        `;
        return;
    }

    devices.forEach(device => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><i class="bi ${device.icon} fs-4 text-neon"></i></td>
            <td class="fw-bold text-white">${device.name}</td>
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

// 2. Modal
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
        showToast("Error", "No se pudo cargar el dispositivo");
    }
}

// 3. CREATE & UPDATE
async function saveDevice() {
    const id = document.getElementById('deviceId').value;
    const data = {
        name: document.getElementById('name').value,
        type: document.getElementById('type').value,
        icon: document.getElementById('icon').value,
        ...(id === '' && { status: false }) 
    };

    try {
        if (id === '') {
            await fetch(`${API_URL}/devices`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            showToast("Éxito", "Dispositivo creado correctamente");
        } else {
            await fetch(`${API_URL}/devices/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            showToast("Éxito", "Dispositivo actualizado correctamente");
        }
        
        myModal.hide();
        
        // Recargar la tabla
        fetchDevices();
        
    } catch (error) {
        showToast("Error", "No se pudo guardar el dispositivo");
    }
}

// 4. DELETE
async function deleteDevice(id) {
    if(!confirm('¿Estás seguro de eliminar este dispositivo?')) return;
    
    try {
        await fetch(`${API_URL}/devices/${id}`, { method: 'DELETE' });
        showToast("Eliminado", "Dispositivo borrado correctamente");
        fetchDevices();
    } catch (error) {
        showToast("Error", "No se pudo eliminar");
    }
}