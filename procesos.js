import { listaProcesos, obtenerListaProcesos, guardarProcesosEnLocalStorage, configuracionSO } from './estado.js';
import { actualizarTabla } from './ui.js';

export function agregarProceso() {
    const id = document.getElementById("idProceso").value;
    const nombre = document.getElementById("nombreProceso").value;
    const llegada = Number(document.getElementById("llegadaProceso").value);
    const duracion = Number(document.getElementById("duracionProceso").value);
    const prioridad = Number(document.getElementById("prioridadProceso").value);
    const boletos = Number(document.getElementById("boletosProceso").value);
    const paginas = Number(document.getElementById("paginasProceso") ? document.getElementById("paginasProceso").value : 1);

    if (id === "" || nombre === "") {
        alert("Debe ingresar el ID y el nombre del proceso.");
        return;
    }

    const procesosExistentes = obtenerListaProcesos();
    const existeDuplicado = procesosExistentes.some(p => p.id === id);

    if (existeDuplicado) {
        alert(`Ya existe un proceso registrado con el ID '${id}'. Debe ingresar un ID único.`);
        return;
    }

    const proceso = {
        id: id,
        nombre: nombre,
        llegada: llegada,
        duracion: duracion,
        prioridad: prioridad,
        boletos: boletos,
        paginasRequeridas: paginas,
        quantumRestante: configuracionSO.quantum,
        tiempoRestante: duracion,
        estado: "Listo"
    };

    listaProcesos.agregar(proceso);
    guardarProcesosEnLocalStorage();

    actualizarTabla();

    document.getElementById("idProceso").value = "";
    document.getElementById("nombreProceso").value = "";
}

export function limpiarProcesos() {
    if (obtenerListaProcesos().length === 0) {
        return;
    }

    const confirmar = confirm(
        "¿Está seguro de eliminar todos los procesos?"
    );

    if (confirmar) {
        listaProcesos.limpiar();
        localStorage.removeItem("procesosSO");
        actualizarTabla();
    }
}
