

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

    // 4) IMPORTANTE: NO LLAMAR a TutorialPanel.mount(...)
    // De esa forma, el botón "Continuar" queda sin handler y no hace nada.

    // (Opcional) Si quieres bloquear clicks fuera del panel:
    // slot.style.pointerEvents = "auto";
}
