import { GameManager } from "./core/GameManager.js";
import { UIController } from "./ui/UIController.js";
import { Router } from "./router.js";
import { HUDController } from "./ui/HUDController.js";
import { experiencesConfig } from "../config/experienceConfig.js";
import { Experience } from "./models/Experience.js";

// 1) Normaliza las experiencias desde el config
const experiences = experiencesConfig.map(cfg =>
    new Experience(
        cfg.id,
        cfg.name,
        cfg.image,
        cfg.modelPath || null,
        cfg.description,
        cfg.minigames || []
    )
);

// 2) Instancias base
const hud = new HUDController();
const gameManager = new GameManager({ hud });     // <- sin onExit aquí (evitamos referencia circular)
const uiController = new UIController({ experiences });

// 3) Router (única autoridad de navegación)
const router = new Router({ experiences, uiController, gameManager });
router.init();

// 4) onExit: cuando termina la XRSession (incluye botón Atrás)
//    vuelve al lobby SIN pushState extra
gameManager.setOnExit(() => {
    router.goToLobby(false);
});

// 5) Handlers de UI -> Router (un solo onContinue)
uiController.setHandlers({
    onSelectExperience: (exp) => {
        console.log("Seleccionado:", exp.name);
    },
    onContinue: async (exp) => {
        // El Router hace: pushState, showGame, startExperience
        // y (con el cambio que te di) también game.launchPuzzle(...)
        await router.goToExperience(exp);
    },
    onBack: () => router.goToLobby(),
});

// 6) Inicia la UI en modo lista
uiController.init();
