// ui/panels/minigame2InfoPanel.js
// -------------------------------------------------------------
// Panel dinámico de información del destino (Minijuego 2)
// -------------------------------------------------------------
// Crea, muestra y destruye su propio panel en tiempo de ejecución
// -------------------------------------------------------------

let panel = null;

/**
 * Elimina el panel del DOM (si existe)
 */
export function hide() {
    if (panel) {
        panel.classList.add("hidden");
        setTimeout(() => panel?.remove(), 200); // Espera la transición antes de eliminar
        panel = null;
    }
}

/**
 * Crea y muestra el panel de información del destino actual.
 * @param {{ name: string, description: string }} experienceData
 * @param {Function} onReady callback al presionar "¡Listo!"
 */
export function show(experienceData, onReady) {
    hide();

    // Crear estructura del panel
    panel = document.createElement("section");
    panel.id = "minigame2-info-panel";
    panel.className = "panel fade-in";

    panel.innerHTML = `
    <div class="panel-text">
        <h2>${experienceData?.name ?? "Destino desconocido"}</h2>
        <p>${experienceData?.description ?? "Descripción no disponible."}</p>
        <button id="btn-ready-m2" class="btn-primary">¡Listo!</button>
        </div>
    `;

    // Inyectar en el body o HUD (elige contenedor principal de panels)
    const hud = document.getElementById("hud") ?? document.body;
    hud.appendChild(panel);

    // Manejar evento de botón
    const btnReady = panel.querySelector("#btn-ready-m2");
    btnReady.addEventListener("click", () => {
        hide();
        onReady?.();
    });
}

export const Minigame2InfoPanel = { show, hide };
