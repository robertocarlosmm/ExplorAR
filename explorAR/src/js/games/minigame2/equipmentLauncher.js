import { EquipmentGame } from "./EquipmentGame.js";

/**
 * Lanza el flujo completo del Minijuego 2.
 * @param {GameManager} gameManager
 */
export async function startEquipmentGame(gameManager) {
    //console.log("[EquipmentGame] Iniciando flujo del minijuego 2...");

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
        imageUrl: "/ExplorAR/assets/tutorial/minigame2Tutorial.png",
        buttonText: "Continuar",
    });

    const { Minigame2InfoPanel } = await import("../../panels/minigame2Panel.js");

    const exp =
        gameManager?.experienceManager?.currentExperience ??
        gameManager?.game?.currentExperience;
    const minigameData = exp?.minigames?.find((m) => m.id === "equipment");
    const infoText =
        minigameData?.params?.information ??
        "No hay información disponible para este destino.";

    // Helper para ocultar y destruir completamente el panel de información
    const destroyInfoPanel = () => {
        try {
            Minigame2InfoPanel.hide?.();
        } catch (err) {
            console.warn(
                "[EquipmentGame] Error al ocultar Minigame2InfoPanel:",
                err
            );
        }
        const leftover = document.getElementById("minigame2-info-panel");
        if (leftover) {
            leftover.remove();
        }
    };

    // Enganchar el botón global "Salir" para limpiar siempre el panel de info
    const exitBtn = document.getElementById("btn-exit");
    if (exitBtn && !exitBtn.dataset.equipmentExitHooked) {
        exitBtn.addEventListener(
            "click",
            () => {
                /*console.log(
                    "[EquipmentGame] 'Salir' presionado → limpiando panel de información del minijuego 2."
                );*/
                destroyInfoPanel();
            },
            true // captura: se ejecuta antes del handler global de navegación
        );
        exitBtn.dataset.equipmentExitHooked = "true";
    }

    // Función que lanza SOLO la parte RA del minijuego 2
    async function launchEquipmentRound() {
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

        let equipment = new EquipmentGame({
            scene: gameManager.xrSession?.scene,
            hud: gameManager.hud,
            correctKeys,
            incorrectKeys,
            feedbacks,
            assetMap,
            experienceId: exp?.id,
            startingScore: gameManager.getCarryScore?.() || 0,
            onRestartRequest: async () => {
                /*console.log(
                    "[EquipmentGame] onRestartRequest → volver a pantalla de información."
                );*/
                try {
                    equipment?.dispose();
                } catch (err) {
                    console.warn(
                        "[EquipmentGame] Error al hacer dispose en restart:",
                        err
                    );
                }

                // Cerrar la sesión XR actual antes de reiniciar el flujo
                await gameManager.closeXRSession?.();

                // Volver a mostrar SOLO la pantalla informativa.
                Minigame2InfoPanel.show(
                    { name: exp?.name, description: infoText },
                    async () => {
                        // Cuando el jugador pulse “Listo” otra vez,
                        // destruimos ese panel y lanzamos la parte RA.
                        destroyInfoPanel();
                        await launchEquipmentRound();
                    }
                );
            },
        });

        equipment.onGameEnd = async () => {
            await gameManager.closeXRSession();

            // Ocultar panel informativo si sigue activo (por seguridad)
            destroyInfoPanel();

            await new Promise((r) => setTimeout(r, 150));

            const nextId = "minigame3";
            if (nextId) {
                gameManager.setCarryScore?.(equipment.score);
                /*console.log(
                    "Puntaje llevado al GameManager:",
                    gameManager.getCarryScore()
                );*/
                gameManager.launchNextMinigame(nextId);
            } else {
                gameManager.onExit?.();
            }
        };

        await equipment.start();
    }

    // Tutorial: SOLO se muestra la primera vez
    TutorialPanel.mount(slot.firstElementChild, {
        onStart: async () => {
            // Ocultar overlay del tutorial
            slot.innerHTML = "";
            slot.classList.remove("active");
            slot.style.background = "transparent";
            slot.style.pointerEvents = "none";

            const hud = document.getElementById("hud");
            if (hud) {
                hud.classList.remove("hud-active");
                hud.style.background = "transparent";
            }

            // Mostrar pantalla informativa del minijuego 2
            Minigame2InfoPanel.show(
                { name: exp?.name, description: infoText },
                async () => {
                    // Cuando el jugador pulsa “Listo” por primera vez:
                    destroyInfoPanel();
                    await launchEquipmentRound();
                }
            );
        },
    });
}
