// equipmentLauncher.js
import { EquipmentGame } from "./EquipmentGame.js";

/**
 * Lanza el flujo completo del Minijuego 2.
 * @param {GameManager} gameManager
 */
export async function startEquipmentGame(gameManager) {
    console.log("[EquipmentGame] Iniciando flujo del minijuego 2...");

    // Mostrar HUD
    gameManager?.hud?.show?.();

    let slot = document.getElementById("hud-panel-slot") || document.getElementById("hud");
    slot.classList.add("active");
    slot.style.pointerEvents = "auto";
    slot.style.background = "";
    slot.innerHTML = "";

    const { TutorialPanel } = await import("../../panels/tutorialPanel.js");
    slot.innerHTML = TutorialPanel.template({
        title: "Prepárate antes de viajar",
        description: "Elige bien tu equipamiento. Conoce el contexto para no olvidar nada.",
        imageUrl: "./assets/tutorial/minigame2Tutorial.png",
        buttonText: "Continuar",
    });

    const { Minigame2InfoPanel } = await import("../../panels/minigame2Panel.js");

    const exp = gameManager?.experienceManager?.currentExperience ?? gameManager?.game?.currentExperience;
    const minigameData = exp?.minigames?.find((m) => m.id === "equipment");
    const infoText = minigameData?.params?.information ?? "No hay información disponible para este destino.";

    TutorialPanel.mount(slot.firstElementChild, {
        onStart: async () => {
            // Ocultar overlay
            slot.innerHTML = "";
            slot.classList.remove("active");
            slot.style.background = "transparent";
            slot.style.pointerEvents = "none";

            const hud = document.getElementById("hud");
            if (hud) {
                hud.classList.remove("hud-active");
                hud.style.background = "transparent";
            }

            // Mostrar pantalla informativa del minijuego
            Minigame2InfoPanel.show(
                { name: exp?.name, description: infoText },
                async () => {
                    await gameManager.startExperience(exp);

                    const correctKeys = minigameData?.params?.correctos ?? [];
                    const incorrectKeys = minigameData?.params?.incorrectos ?? [];
                    const feedbacks = minigameData?.params?.feedbacks ?? {};
                    const assetMap = {};

                    minigameData?.assets?.forEach((asset) => {
                        if (asset.key && asset.url) {
                            assetMap[asset.key] = asset.url;
                        }
                    });

                    const equipment = new EquipmentGame({
                        scene: gameManager.xrSession?.scene,
                        hud: gameManager.hud,
                        correctKeys,
                        incorrectKeys,
                        feedbacks,
                        assetMap,
                        experienceId: exp?.id,
                        startingScore: gameManager.getCarryScore?.() || 0
                    });

                    equipment.onGameEnd = async () => {
                        await gameManager.closeXRSession();
                        

                        //ocultar panel informativo si sigue activo
                        try {
                            Minigame2InfoPanel.hide();
                            const leftover = document.getElementById("minigame2-info-panel");
                            if (leftover) leftover.remove();
                        } catch (err) {
                            console.warn("[EquipmentGame] No se encontró InfoPanel activo para limpiar:", err);
                        }

                        await new Promise((r) => setTimeout(r, 150));

                        const nextId = "minigame3";
                        if (nextId) {
                            gameManager.setCarryScore?.(equipment.score);
                            console.log("Puntaje llevado al GameManager:", gameManager.getCarryScore());
                            gameManager.launchNextMinigame(nextId);
                        } else {
                            gameManager.onExit?.();
                        }
                    };

                    await equipment.start();
                }
            );
        }
    });
}
