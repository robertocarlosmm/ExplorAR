// game/minigames/minigame2/equipmentLauncher.js
// ------------------------------------------------------
// Launcher del Minijuego 2: "Preparación y equipamiento"
// Reutiliza la misma lógica de tutorial del minijuego 1.
// ------------------------------------------------------

/**
 * Lanza el flujo completo del Minijuego 2.
 * @param {GameManager} gameManager
 */
export async function startEquipmentGame(gameManager) {
    console.log("[EquipmentGame] Iniciando flujo del minijuego 2...");

    // 1) Asegurar que el HUD esté visible
    gameManager?.hud?.show?.();

    // 2) Seleccionar el mismo contenedor que usa UIController
    let slot = document.getElementById("hud-panel-slot");
    if (!slot) {
        console.warn("[EquipmentLauncher] #hud-panel-slot no encontrado; usando #hud");
        slot = document.getElementById("hud");
    }

    // 3) Restaurar el estado visual del contenedor
    slot.classList.add("active");
    slot.style.pointerEvents = "auto";
    slot.style.background = "";
    slot.innerHTML = "";

    // 4) Importar dinámicamente el mismo panel de tutorial
    const { TutorialPanel } = await import("../../panels/tutorialPanel.js");

    // Renderizar plantilla en el slot
    slot.innerHTML = TutorialPanel.template({
        title: "Prepárate antes de viajar",
        description:
            "Elige bien tu equipamiento. Conoce el contexto para no olvidar nada.",
        imageUrl: "./assets/tutorial/minigame2Tutorial.png",
        buttonText: "Continuar",
    });

    // 5) Cargar el panel informativo del destino
    const { Minigame2InfoPanel } = await import("../../panels/minigame2Panel.js");

    const exp =
        gameManager?.experienceManager?.currentExperience ??
        gameManager?.game?.currentExperience ?? {
            name: "Destino desconocido",
            description: "Descripción no disponible.",
        };

    // 6) Montar el panel de tutorial con las acciones
    TutorialPanel.mount(slot.firstElementChild, {
        onStart: () => {
            // Limpiar el slot y dejar el HUD listo
            slot.innerHTML = "";
            slot.classList.remove("active");
            slot.style.background = "transparent";
            slot.style.pointerEvents = "none";

            const hud = document.getElementById("hud");
            hud?.classList?.remove("hud-active");
            if (hud) hud.style.background = "transparent";

            // Mostrar panel de información del destino
            Minigame2InfoPanel.show(
                { name: exp?.name, description: exp?.description },
                () => {
                    if (typeof gameManager?.initMinigame2Scene === "function") {
                        gameManager.initMinigame2Scene();
                    } else {
                        console.warn(
                            "[EquipmentLauncher] gameManager.initMinigame2Scene() no está definido."
                        );
                    }
                }
            );
        },
    });
}
