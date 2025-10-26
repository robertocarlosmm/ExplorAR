// ui/panels/minigame2Panel.js
let panel = null;
let _savedTopbarDisplay = null;

export function hide() {
  // Restaurar topbar si la ocultamos
  const topbar =
    document.getElementById("hud-topbar") ||
    document.querySelector("#hud .topbar");

  if (topbar && _savedTopbarDisplay !== null) {
    topbar.style.display = _savedTopbarDisplay;
    _savedTopbarDisplay = null;
  }

  if (panel) {
    panel.classList.add("hidden");
    setTimeout(() => panel?.remove(), 180);
    panel = null;
  }
}

export function show(experienceData, onReady) {
  hide();

  // 1) (Opcional pero recomendado) ocultar la topbar mientras mostramos la Info
  const topbar =
    document.getElementById("hud-topbar") ||
    document.querySelector("#hud .topbar");
  if (topbar) {
    _savedTopbarDisplay = topbar.style.display || "";
    topbar.style.display = "none"; // 👈 oculta PUNTOS/TIEMPO/Salir
  }

  // 2) Contenedor fullscreen con el MISMO layout que el tutorial
  panel = document.createElement("section");
  panel.id = "minigame2-info-panel";
  panel.className = "panel panel-fullscreen panel-info fade-in";

  panel.innerHTML = `
    <div class="panel-text">
      <h2>${experienceData?.name ?? "Destino desconocido"}</h2>
      <p>${experienceData?.description ?? "Descripción no disponible."}</p>
      <button id="btn-ready-m2" class="btn-primary">¡Listo!</button>
    </div>
  `;

  // 3) Inserta en <body> para salir de stacking contexts del HUD
  //    y asegura que esté siempre por encima.
  document.body.appendChild(panel);
  panel.style.zIndex = "2147483647"; // 👈 por encima de cualquier HUD

  const btnReady = panel.querySelector("#btn-ready-m2");
  btnReady.addEventListener("click", () => {
    hide();
    onReady?.();
  });
}

export const Minigame2InfoPanel = { show, hide };
