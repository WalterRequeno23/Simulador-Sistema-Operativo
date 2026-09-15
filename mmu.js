import { obtenerListaProcesos, ultimaSecuenciaEjecucion, configuracionSO } from "./estado.js";

export function ejecutarMMU() {

    const algoritmo =
        document.getElementById("algoritmoMMU").value;

    const resultado =
        document.getElementById("resultadoMMU");


    const procesos = obtenerListaProcesos();

    // ==========================================
    // VERIFICAR PROCESOS
    // ==========================================

    if (procesos.length === 0) {

        resultado.innerHTML = `
            <p class="mensaje-error">
                Primero debe agregar procesos.
            </p>
        `;

        return;
    }


    // ==========================================
    // OBTENER CANTIDAD DE MARCOS
    // ==========================================

    const cantidadMarcos =
        configuracionSO.marcosFisicos;


    if (!cantidadMarcos || cantidadMarcos <= 0) {

        resultado.innerHTML = `
            <p class="mensaje-error">
                Configure primero la cantidad de marcos físicos.
            </p>
        `;

        return;
    }


// ==========================================
// GENERAR REFERENCIAS DESDE EL PLANIFICADOR
// ==========================================

let referencias = [];


if (ultimaSecuenciaEjecucion.length === 0) {

    resultado.innerHTML = `

        <p class="mensaje-error">

            Primero debe ejecutar un algoritmo
            de planificación.

        </p>

    `;

    return;
}


const mapaProcesos = {};
procesos.forEach(p => {
    mapaProcesos[p.id] = p;
});

let contadorPaginaGlobal = 1;
const paginasPorProceso = {};

procesos.forEach(p => {
    const cantidadPaginas = p.paginasRequeridas || 1;
    const listaPaginasProc = [];
    for (let k = 0; k < cantidadPaginas; k++) {
        let pagAsignada = ((contadorPaginaGlobal - 1) % configuracionSO.paginasVirtuales) + 1;
        listaPaginasProc.push(pagAsignada);
        contadorPaginaGlobal++;
    }
    paginasPorProceso[p.id] = listaPaginasProc;
});

ultimaSecuenciaEjecucion.forEach(idProceso => {
    const paginasAsignadas = paginasPorProceso[idProceso];
    if (paginasAsignadas && paginasAsignadas.length > 0) {
        paginasAsignadas.forEach(numPagina => {
            referencias.push(numPagina);
        });
    } else {
        const proc = mapaProcesos[idProceso];
        const cantidadPaginas = proc && proc.paginasRequeridas ? proc.paginasRequeridas : 1;
        for (let k = 1; k <= cantidadPaginas; k++) {
            let numPagina = ((k - 1) % configuracionSO.paginasVirtuales) + 1;
            referencias.push(numPagina);
        }
    }
});

    if (algoritmo === "FIFO") {

        ejecutarFIFO(
            referencias,
            cantidadMarcos,
            resultado
        );

        return;
    }
    else if (algoritmo === "LRU") {

        ejecutarLRU(
            referencias,
            cantidadMarcos,
            resultado
        );

        return;
    }
    else if (algoritmo === "OPTIMO") {

        ejecutarOptimo(
            referencias,
            cantidadMarcos,
            resultado
        );

        return;
    }
    else if (algoritmo === "CLOCK") {

        ejecutarClock(
            referencias,
            cantidadMarcos,
            resultado
        );

        return;
    }
    else if (algoritmo === "SEGUNDA_OPORTUNIDAD") {

        ejecutarSegundaOportunidad(
            referencias,
            cantidadMarcos,
            resultado
        );

        return;
    }
    else if (algoritmo === "MRU") {

        ejecutarMRU(
            referencias,
            cantidadMarcos,
            resultado
        );

        return;
    }
    else if (algoritmo === "LFU") {

        ejecutarLFU(
            referencias,
            cantidadMarcos,
            resultado
        );

        return;
    }

}
// ==========================================
// ALGORITMO FIFO
// ==========================================

export function mostrarResultadoMMU(
    resultado,
    nombreAlgoritmo,
    referencias,
    cantidadMarcos,
    pasos,
    aciertos,
    fallos
) {
    const totalReferencias = referencias.length;
    const porcentajeAciertos = totalReferencias > 0 ? (aciertos / totalReferencias) * 100 : 0;
    const porcentajeFallos = totalReferencias > 0 ? (fallos / totalReferencias) * 100 : 0;

    let html = `
        <h3>Simulación MMU - ${nombreAlgoritmo}</h3>

        <p>
            <strong>Referencias de página:</strong>
            ${referencias.join(" → ")}
        </p>

        <h3>Matriz Paso a Paso (Intercambio entre Página y Marco)</h3>

        <div class="tabla-mmu-contenedor">
            <table class="tabla-mmu-horizontal">
                <tbody>
                    <tr>
                        <th class="encabezado-fila">REFERENCIA</th>
    `;

    pasos.forEach(paso => {
        html += `<td class="celda-referencia">${paso.pagina}</td>`;
    });

    html += `</tr>`;

    for (let m = 0; m < cantidadMarcos; m++) {
        html += `
            <tr>
                <th class="encabezado-fila">MARCO ${m + 1}</th>
        `;

        pasos.forEach(paso => {
            const valor = paso.marcos[m];
            html += `<td>${valor !== null ? valor : ""}</td>`;
        });

        html += `</tr>`;
    }

    html += `
        <tr>
            <th class="encabezado-fila">FALLOS</th>
    `;

    pasos.forEach(paso => {
        const esFallo = paso.resultado === "Fallo de página";
        const claseStatus = esFallo ? "fallo-simbolo" : "hit-simbolo";
        const textoStatus = esFallo ? "X" : "—";
        html += `<td class="${claseStatus}">${textoStatus}</td>`;
    });

    html += `
                </tr>
            </tbody>
        </table>
        </div>

        <h3>Rendimiento de la MMU</h3>

        <div class="estadisticas-mmu">
            <p>Total de referencias: <strong>${totalReferencias}</strong></p>
            <p>Aciertos: <strong>${aciertos}</strong></p>
            <p>Fallos de página: <strong>${fallos}</strong></p>
            <p>Tasa de aciertos: <strong>${porcentajeAciertos.toFixed(2)}%</strong></p>
            <p>Tasa de fallos: <strong>${porcentajeFallos.toFixed(2)}%</strong></p>
        </div>
    `;

    resultado.innerHTML = html;
}

export function ejecutarFIFO(
    referencias,
    cantidadMarcos,
    resultado
) {
    let marcos = new Array(cantidadMarcos).fill(null);
    let colaFIFO = [];
    let aciertos = 0;
    let fallos = 0;
    let pasos = [];

    referencias.forEach((pagina, indice) => {
        const posicion = marcos.indexOf(pagina);

        if (posicion !== -1) {
            aciertos++;
            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Acierto",
                marcos: [...marcos]
            });
        } else {
            fallos++;
            const marcoVacio = marcos.indexOf(null);

            if (marcoVacio !== -1) {
                marcos[marcoVacio] = pagina;
                colaFIFO.push(pagina);
            } else {
                const paginaSalida = colaFIFO.shift();
                const posicionSalida = marcos.indexOf(paginaSalida);
                marcos[posicionSalida] = pagina;
                colaFIFO.push(pagina);
            }

            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Fallo de página",
                marcos: [...marcos]
            });
        }
    });

    mostrarResultadoMMU(
        resultado,
        "FIFO",
        referencias,
        cantidadMarcos,
        pasos,
        aciertos,
        fallos
    );
}
// ================================================
// ALGORITMO LRU
// ================================================

export function ejecutarLRU(
    referencias,
    cantidadMarcos,
    resultado
) {

    // Marcos físicos inicialmente vacíos
    let marcos = new Array(cantidadMarcos).fill(null);

    // Guarda el orden de uso de las páginas
    let ordenUso = [];

    // Contadores
    let aciertos = 0;
    let fallos = 0;

    // Guardar los pasos de la simulación
    let pasos = [];

    // ================================================
    // PROCESAR REFERENCIAS
    // ================================================

    referencias.forEach((pagina, indice) => {

        // Buscar la página en los marcos
        const posicion = marcos.indexOf(pagina);

        // ============================================
        // ACIERTO
        // ============================================

        if (posicion !== -1) {

            aciertos++;

            // La página acaba de utilizarse,
            // por lo tanto pasa a ser la más reciente
            ordenUso = ordenUso.filter(
                p => p !== pagina
            );

            ordenUso.push(pagina);

            // Guardar paso
            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Acierto",
                marcos: [...marcos]
            });

        }

        // ============================================
        // FALLO DE PÁGINA
        // ============================================

        else {

            fallos++;

            // Buscar marco vacío
            const marcoVacio =
                marcos.indexOf(null);

            // ========================================
            // TODAVÍA HAY ESPACIO
            // ========================================

            if (marcoVacio !== -1) {

                marcos[marcoVacio] = pagina;

            }

            // ========================================
            // MEMORIA LLENA
            // ========================================

            else {

                // El primer elemento de ordenUso
                // es el menos recientemente utilizado
                const paginaSalida =
                    ordenUso.shift();

                // Buscar su marco
                const posicionSalida =
                    marcos.indexOf(paginaSalida);

                // Reemplazar
                marcos[posicionSalida] = pagina;
            }

            // La nueva página pasa a ser
            // la más recientemente utilizada
            ordenUso.push(pagina);

            // Guardar paso
            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Fallo de página",
                marcos: [...marcos]
            });

        }

    });

    mostrarResultadoMMU(
        resultado,
        "LRU",
        referencias,
        cantidadMarcos,
        pasos,
        aciertos,
        fallos
    );
}
// ================================================
// ALGORITMO LFU
// ================================================

export function ejecutarLFU(
    referencias,
    cantidadMarcos,
    resultado
) {

    // Marcos físicos inicialmente vacíos
    let marcos = new Array(cantidadMarcos).fill(null);

    // Contador de frecuencia de cada página
    let frecuencias = {};

    // Orden de llegada para desempatar
    let ordenLlegada = [];

    // Contadores
    let aciertos = 0;
    let fallos = 0;

    // Guardar los pasos
    let pasos = [];

    // ================================================
    // PROCESAR REFERENCIAS
    // ================================================

    referencias.forEach((pagina, indice) => {

        // Si la página todavía no tiene contador
        if (frecuencias[pagina] === undefined) {
            frecuencias[pagina] = 0;
        }

        // Buscar la página en los marcos
        const posicion = marcos.indexOf(pagina);

        // ============================================
        // ACIERTO
        // ============================================

        if (posicion !== -1) {

            aciertos++;

            // Aumentar frecuencia
            frecuencias[pagina]++;

            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Acierto",
                marcos: [...marcos]
            });

        }

        // ============================================
        // FALLO DE PÁGINA
        // ============================================

        else {

            fallos++;

            // Aumentar frecuencia porque la página
            // acaba de ser cargada
            frecuencias[pagina]++;

            // Buscar marco vacío
            const marcoVacio = marcos.indexOf(null);

            if (marcoVacio !== -1) {

                // Todavía hay espacio
                marcos[marcoVacio] = pagina;

                ordenLlegada.push(pagina);

            }

            else {

                // ========================================
                // MEMORIA LLENA
                // ========================================

                // Buscar la página con menor frecuencia
                let paginaSalida = marcos[0];

                for (let i = 1; i < marcos.length; i++) {

                    const paginaActual = marcos[i];

                    if (
                        frecuencias[paginaActual] <
                        frecuencias[paginaSalida]
                    ) {

                        paginaSalida = paginaActual;

                    }
                    else if (
                        frecuencias[paginaActual] ===
                        frecuencias[paginaSalida]
                    ) {

                        // Desempate: sale la que llegó primero
                        const posicionActual =
                            ordenLlegada.indexOf(paginaActual);

                        const posicionSalida =
                            ordenLlegada.indexOf(paginaSalida);

                        if (
                            posicionActual < posicionSalida
                        ) {

                            paginaSalida = paginaActual;

                        }
                    }
                }

                // Buscar el marco de la página que sale
                const posicionSalida =
                    marcos.indexOf(paginaSalida);

                // Reemplazar
                marcos[posicionSalida] = pagina;

                // Actualizar orden de llegada
                ordenLlegada =
                    ordenLlegada.filter(
                        p => p !== pagina
                    );

                ordenLlegada.push(pagina);
            }

            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Fallo de página",
                marcos: [...marcos]
            });
        }
    });

    mostrarResultadoMMU(
        resultado,
        "LFU",
        referencias,
        cantidadMarcos,
        pasos,
        aciertos,
        fallos
    );
}
// ============================================
// ALGORITMO CLOCK (RELOJ)
// ============================================

export function ejecutarClock(
    referencias,
    cantidadMarcos,
    resultado
) {
    let marcos = new Array(cantidadMarcos).fill(null);
    let bitsUso = new Array(cantidadMarcos).fill(0);
    let puntero = 0;
    let aciertos = 0;
    let fallos = 0;
    let pasos = [];

    referencias.forEach((pagina, indice) => {
        const posicion = marcos.indexOf(pagina);

        if (posicion !== -1) {
            aciertos++;
            bitsUso[posicion] = 1;
            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Acierto",
                marcos: [...marcos]
            });
        } else {
            fallos++;
            const marcoVacio = marcos.indexOf(null);

            if (marcoVacio !== -1) {
                marcos[marcoVacio] = pagina;
                bitsUso[marcoVacio] = 1;
                puntero = (marcoVacio + 1) % cantidadMarcos;
            } else {
                while (true) {
                    if (bitsUso[puntero] === 0) {
                        marcos[puntero] = pagina;
                        bitsUso[puntero] = 1;
                        puntero = (puntero + 1) % cantidadMarcos;
                        break;
                    } else {
                        bitsUso[puntero] = 0;
                        puntero = (puntero + 1) % cantidadMarcos;
                    }
                }
            }

            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Fallo de página",
                marcos: [...marcos]
            });
        }
    });

    mostrarResultadoMMU(
        resultado,
        "Clock (Reloj)",
        referencias,
        cantidadMarcos,
        pasos,
        aciertos,
        fallos
    );
}

// ============================================
// ALGORITMO SEGUNDA OPORTUNIDAD
// ============================================

export function ejecutarSegundaOportunidad(
    referencias,
    cantidadMarcos,
    resultado
) {
    let marcos = new Array(cantidadMarcos).fill(null);
    let cola = [];
    let bitsUso = {};
    let aciertos = 0;
    let fallos = 0;
    let pasos = [];

    referencias.forEach((pagina, indice) => {
        const posicion = marcos.indexOf(pagina);

        if (posicion !== -1) {
            aciertos++;
            bitsUso[pagina] = 1;
            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Acierto",
                marcos: [...marcos]
            });
        } else {
            fallos++;
            const marcoVacio = marcos.indexOf(null);

            if (marcoVacio !== -1) {
                marcos[marcoVacio] = pagina;
                cola.push(pagina);
                bitsUso[pagina] = 0;
            } else {
                while (true) {
                    const candidato = cola.shift();
                    if (bitsUso[candidato] === 1) {
                        bitsUso[candidato] = 0;
                        cola.push(candidato);
                    } else {
                        const posicionSalida = marcos.indexOf(candidato);
                        marcos[posicionSalida] = pagina;
                        cola.push(pagina);
                        bitsUso[pagina] = 0;
                        delete bitsUso[candidato];
                        break;
                    }
                }
            }

            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Fallo de página",
                marcos: [...marcos]
            });
        }
    });

    mostrarResultadoMMU(
        resultado,
        "Segunda Oportunidad",
        referencias,
        cantidadMarcos,
        pasos,
        aciertos,
        fallos
    );
}

// ============================================
// ALGORITMO MRU (MÁS RECIENTEMENTE USADO)
// ============================================

export function ejecutarMRU(
    referencias,
    cantidadMarcos,
    resultado
) {
    let marcos = new Array(cantidadMarcos).fill(null);
    let ultimoUso = null;
    let aciertos = 0;
    let fallos = 0;
    let pasos = [];

    referencias.forEach((pagina, indice) => {
        const posicion = marcos.indexOf(pagina);

        if (posicion !== -1) {
            aciertos++;
            ultimoUso = pagina;
            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Acierto",
                marcos: [...marcos]
            });
        } else {
            fallos++;
            const marcoVacio = marcos.indexOf(null);

            if (marcoVacio !== -1) {
                marcos[marcoVacio] = pagina;
            } else {
                let posicionReemplazo = marcos.indexOf(ultimoUso);
                if (posicionReemplazo === -1) {
                    posicionReemplazo = 0;
                }
                marcos[posicionReemplazo] = pagina;
            }

            ultimoUso = pagina;
            pasos.push({
                turno: indice + 1,
                pagina: pagina,
                resultado: "Fallo de página",
                marcos: [...marcos]
            });
        }
    });

    mostrarResultadoMMU(
        resultado,
        "MRU (Más Recientemente Usado)",
        referencias,
        cantidadMarcos,
        pasos,
        aciertos,
        fallos
    );
}

// ============================================
// ALGORITMO ÓPTIMO
// ============================================

export function ejecutarOptimo(
    referencias,
    cantidadMarcos,
    resultado
) {

    // Marcos físicos inicialmente vacíos
    let marcos =
        new Array(cantidadMarcos).fill(null);

    // Contadores
    let aciertos = 0;
    let fallos = 0;

    // Guardar los pasos de la simulación
    let pasos = [];

    // ============================================
    // PROCESAR REFERENCIAS
    // ============================================

    referencias.forEach(
        (pagina, indice) => {

            // Buscar si la página ya está en memoria
            const posicion =
                marcos.indexOf(pagina);

            // ========================================
            // ACIERTO
            // ========================================

            if (posicion !== -1) {

                aciertos++;

                pasos.push({
                    turno: indice + 1,
                    pagina: pagina,
                    resultado: "Acierto",
                    marcos: [...marcos]
                });

            }

            // ========================================
            // FALLO DE PÁGINA
            // ========================================

            else {

                fallos++;

                // Buscar un marco vacío
                const marcoVacio =
                    marcos.indexOf(null);

                // ====================================
                // TODAVÍA HAY ESPACIO
                // ====================================

                if (marcoVacio !== -1) {

                    marcos[marcoVacio] =
                        pagina;

                }

                // ====================================
                // MEMORIA LLENA
                // ====================================

                else {

                    let posicionReemplazo = 0;
                    let mayorDistancia = -1;

                    // Analizar cada página que está
                    // actualmente en memoria
                    for (
                        let i = 0;
                        i < marcos.length;
                        i++
                    ) {

                        const paginaEnMarco =
                            marcos[i];

                        // Buscar cuándo volverá a utilizarse
                        const siguienteUso =
                            referencias
                                .slice(indice + 1)
                                .indexOf(paginaEnMarco);

                        // Si nunca vuelve a utilizarse,
                        // es la mejor candidata para reemplazar
                        if (siguienteUso === -1) {

                            posicionReemplazo = i;
                            break;
                        }

                        // Guardar la página cuyo próximo
                        // uso está más lejos
                        if (
                            siguienteUso >
                            mayorDistancia
                        ) {

                            mayorDistancia =
                                siguienteUso;

                            posicionReemplazo = i;
                        }
                    }

                    // Reemplazar la página seleccionada
                    marcos[posicionReemplazo] =
                        pagina;
                }

                pasos.push({
                    turno: indice + 1,
                    pagina: pagina,
                    resultado: "Fallo de página",
                    marcos: [...marcos]
                });
            }
        }
    );

    mostrarResultadoMMU(
        resultado,
        "Óptimo",
        referencias,
        cantidadMarcos,
        pasos,
        aciertos,
        fallos
    );
}
// ==========================================
// SALIR
// ==========================================
