// js/api.js
const API_URL = "https://699394e9fade7a9ec0f3054e.mockapi.io/api/v1";

// Función helper para manejar errores
const handleErrors = (response) => {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
};