import { GuidanceGame } from "./GuidanceGame.js";

/**
 * Lanza el flujo completo del Minijuego 4.
 * @param {GameManager} gameManager
 */

export async function startMinigame4(gameManager) {
    console.log("[Minigame4Launcher] Iniciando flujo del minijuego 4...");

    // 1 Preparar HUD y panel
    const slot = document.getElementById("hud-panel-slot") || document.getElementById("hud");
    slot.classList.add("active");
    slot.style.pointerEvents = "auto";
    slot.style.background = "";
    slot.innerHTML = "";

    // 2 Cargar componente del tutorial
    const { TutorialPanel } = await import("../../panels/tutorialPanel.js");

    const exp = gameManager?.experienceManager?.currentExperience ?? gameManager?.game?.currentExperience;
    const expId = exp?.id || "default";
    console.log(`[Minigame4Launcher] Experiencia actual: ${expId}`);

    // 3 Configurar contenido genérico del tutorial (común a todas las experiencias)
    const data = {
        title: "Guía a los visitantes perdidos",
        description: "Usa tus señales para ayudarlos a volver al camino correcto. ¡Evita desperdiciar tiempo!",
        imageUrl: "./assets/tutorial/minigame4Tutorial.png",
        buttonText: "Comenzar",
    };

    // 4 Renderizar tutorial
    slot.innerHTML = TutorialPanel.template(data);

    // 5 Montar evento de inicio
    TutorialPanel.mount(slot.firstElementChild, {
        onStart: async () => {
            console.log("[Minigame4Launcher] Iniciando experiencia RA...");

            // Ocultar panel de tutorial
            slot.innerHTML = "";
            slot.classList.remove("active");
            slot.style.pointerEvents = "none";

            // Iniciar experiencia RA (habilita cámara y escena)
            await gameManager.startExperience(exp);

            // 6 Crear instancia del juego
            const gameInstance = new GuidanceGame({
                scene: gameManager.xrSession?.scene,
                hud: gameManager.hud,
                experienceId: expId,
                startingScore: gameManager.getCarryScore?.() || 0,
            });

            // 7 Definir comportamiento al finalizar
            gameInstance.onGameEnd = async () => {
                console.log("[Minigame4Launcher] Fin del minijuego 4, cerrando XR...");
                await gameManager.closeXRSession();
                await new Promise((r) => setTimeout(r, 150));

                // Llevar puntaje acumulado
                gameManager.setCarryScore?.(gameInstance.score);

                // Aquí puedes decidir si continúa o termina la experiencia
                console.log("Puntaje final:", gameInstance.score);
                gameManager.onExit?.();
            };

            // 8 Iniciar el minijuego
            await gameInstance.start();
        },
    });
}