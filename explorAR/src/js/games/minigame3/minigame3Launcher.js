import { Minigame3Vicos } from "./Minigame3Vicos.js";
import { Minigame3Lucumo } from "./Minigame3Lucumo.js";
import { Minigame3Taquile } from "./Minigame3Taquile.js";
import { Minigame3Tambopata } from "./Minigame3Tambopata.js";

/**
 * Lanza el flujo completo del Minijuego 2.
 * @param {GameManager} gameManager
 */

export async function startMinigame3(gameManager) {
    console.log("[Minigame3Launcher] Mostrando SOLO tutorial del minijuego 3...");

    // 1) Mostrar HUD / slot activo (mismo patrón que minigame2)
    const slot = document.getElementById("hud-panel-slot") || document.getElementById("hud");
    slot.classList.add("active");
    slot.style.pointerEvents = "auto";
    slot.style.background = "";
    slot.innerHTML = "";

    // 2) Cargar el panel de tutorial (reutilizas tu componente)
    const { TutorialPanel } = await import("../../panels/tutorialPanel.js");

    // Puedes decidir el contenido según la experiencia actual
    const exp = gameManager?.experienceManager?.currentExperience ?? gameManager?.game?.currentExperience;
    const expId = exp?.id || "default";

    console.log(`[Minigame3Launcher] Experiencia actual: ${expId}`);

    const TUTORIAL_CONTENT = {
        taquile: {
            title: "Tradición textil de Taquile",
            description: "Descubre el arte del tejido y su significado cultural.",
            imageUrl: "./assets/tutorial/minigame3TaqTutorial.png",
        },
        vicos: {
            title: "Agricultura ancestral en Vicos",
            description: "Aprende sobre técnicas de cultivo en los Andes.",
            imageUrl: "./assets/tutorial/minigame3VicTutorial.png",
        },
        tambopata: {
            title: "Fauna y conservación en Tambopata",
            description: "Conoce el ecosistema amazónico y sus especies.",
            imageUrl: "./assets/tutorial/minigame3TamTutorial.png",
        },
        lucumo: {
            title: "Aventura en Lomas de Lúcumo",
            description: "Supera los retos naturales de este destino.",
            imageUrl: "./assets/tutorial/minigame3LucTutorial.png",
        },
        default: {
            title: "Minijuego 3",
            description: "Contenido no disponible.",
            imageUrl: "./assets/tutorial/minigame1Tutorial.png",
        },
    };

    const data = TUTORIAL_CONTENT[expId] || TUTORIAL_CONTENT.default;

    // 3) Renderizar plantilla del tutorial
    slot.innerHTML = TutorialPanel.template({
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        buttonText: "Continuar", // <- visual, pero sin comportamiento
    });

    // 4) click en continua
    TutorialPanel.mount(slot.firstElementChild, {
        onStart: async () => {
            console.log("[Minigame3Launcher] Iniciando sesión RA para la experiencia actual...");

            // Limpiar tutorial
            slot.innerHTML = "";
            slot.classList.remove("active");
            slot.style.pointerEvents = "none";

            // Iniciar sesión XR (RA)
            await gameManager.startExperience(exp);

            // 5️⃣ Seleccionar el minijuego según experiencia
            let gameInstance = null;
            switch (expId) {
                case "vicos":
                    gameInstance = new Minigame3Vicos({
                        scene: gameManager.xrSession?.scene,
                        hud: gameManager.hud,
                        experienceId: expId,
                        startingScore: gameManager.getCarryScore?.() || 0,
                    });
                    break;

                case "lucumo":
                    gameInstance = new Minigame3Lucumo({
                        scene: gameManager.xrSession?.scene,
                        hud: gameManager.hud,
                        experienceId: expId,
                        startingScore: gameManager.getCarryScore?.() || 0,
                    });
                    break;

                case "tambopata":
                    gameInstance = new Minigame3Tambopata({
                        scene: gameManager.xrSession?.scene,
                        hud: gameManager.hud,
                        experienceId: expId,
                        startingScore: gameManager.getCarryScore?.() || 0,
                    });
                    break;

                case "taquile":
                    // gameInstance = new Minigame3Taquile({ ... });
                    gameInstance = new Minigame3Taquile({
                        scene: gameManager.xrSession?.scene,
                        hud: gameManager.hud,
                        experienceId: expId,
                        startingScore: gameManager.getCarryScore?.() || 0,
                    });
                    break;
                /*console.warn("[Minigame3Launcher] Versión Taquile aún no implementada.");
                break;*/

                default:
                    console.warn(`[Minigame3Launcher] Experiencia no reconocida: ${expId}.`);
                    return;
            }

            if (!gameInstance) {
                console.error("[Minigame3Launcher] No se pudo crear la instancia del minijuego.");
                return;
            }

            // 6 Definir callback de fin de juego
            gameInstance.onGameEnd = async () => {
                console.log(`[Minigame3Launcher] Fin del minijuego 3 (${expId}), cerrando XR...`);
                await gameManager.closeXRSession();
                await new Promise((r) => setTimeout(r, 150));
                console.log("[Minigame3Launcher] Sesión XR cerrada.");

                const nextId = "minigame4";
                if(nextId) {
                    gameManager.setCarryScore?.(gameInstance.score);
                    console.log("Puntaje llevado al GameManager:", gameManager.getCarryScore());
                    gameManager.launchNextMinigame(nextId);
                }else{
                    gameManager.onExit?.();
                }            
            };

            // 7 Iniciar el minijuego
            await gameInstance.start();
        },
    });
}
