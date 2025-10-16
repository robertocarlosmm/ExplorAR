import { GameManager } from "./core/GameManager.js";
import { UIController } from "./ui/UIController.js";
import { HUDController } from "./ui/HUDController.js";
import { experiencesConfig } from "../config/experienceConfig.js";
import { gameplayConfig } from "../config/gameplayConfig.js";   
import { Experience } from "./models/Experience.js";

// 1) Estructura de carga para las experiencias desde el config
const experiences = experiencesConfig.map(cfg =>
    new Experience(
        cfg.id,
        cfg.name,
        cfg.image,
        cfg.modelPath || null,
        cfg.description,
        cfg.minigames || []
    )
)

// 2) Instancias base
const hud = new HUDController()
const gameManager = new GameManager({ hud }) // <- sin onExit aquí (evitamos referencia circular)
const uiController = new UIController({ experiences })

// =========================================================
// 3) NavService: navegación simple con una sola URL
// =========================================================
const Nav = (() => {
    const goLobby = (push = true) => {
        if (push) history.pushState({ view: "lobby" }, "", location.pathname)
        gameManager.stopExperience()
        uiController.hideGame()
    }

    const goExperience = async (exp, push = true) => {
        if (push) history.pushState({ view: "exp", expId: exp.id }, "", location.pathname)
        uiController.showGame()
        await gameManager.startExperience(exp)
        await gameManager.launchPuzzle({
            imageUrl:
                exp?.minigames?.[0]?.assets?.find(a => a.key === "board")?.url || null,
            grid: exp?.minigames?.[0]?.grid ?? 3,
            duration: exp?.minigames?.[0]?.duration ?? 60
        })
        uiController.updateHUD({ showInfo: true, showNav: true })
    }

    // Soporte para botón atrás del navegador
    window.onpopstate = async (ev) => {
        if (ev.state?.view === "exp") {
            const exp = experiences.find(e => e.id === ev.state.expId)
            if (exp) return goExperience(exp, false)
        }
        return goLobby(false)
    }

    // Estado inicial
    if (!history.state) {
        history.replaceState({ view: "lobby" }, "", location.pathname)
    }

    return { goLobby, goExperience }
})()

// =========================================================
// 4) Enlace entre GameManager y Nav (salir de XR => Lobby)
// =========================================================
gameManager.setOnExit(() => {
    Nav.goLobby(false)
})

// =========================================================
// 5) Handlers de UI -> Nav (sin Router)
// =========================================================
uiController.setHandlers({
    onSelectExperience: (exp) => {
        console.log("Seleccionado:", exp.name)
    },
    onContinue: async (exp) => {
        await Nav.goExperience(exp)
    },
    onBack: () => Nav.goLobby()
})

// =========================================================
// 6) Inicia la UI en modo lista (Lobby inicial)
// =========================================================
uiController.init()