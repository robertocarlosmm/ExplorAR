import { GameManager } from "./core/GameManager.js"
import { UIController } from "./ui/UIController.js"
import { Router } from "./router.js"
import { experiencesConfig } from "../config/experienceConfig.js"
import { Experience } from "./models/Experience.js"

const experiences = experiencesConfig.map(cfg =>
    new Experience(cfg.id, cfg.name, cfg.image, cfg.modelPath || null, cfg.description, cfg.minigames || [])
)

const gameManager = new GameManager()

// 1) UI primero (sin handlers)
const uiController = new UIController({ experiences })

// 2) Router con referencias a UI y Game
const router = new Router({ experiences, uiController, gameManager })
router.init()

// 3) Inyecta handlers que llaman al router
uiController.setHandlers({
    onSelectExperience: (exp) => {
        console.log("Seleccionado:", exp.name)
    },
    onContinue: (exp) => router.goToExperience(exp),
    onBack: () => router.goToLobby(),
})

// 4) Inicia UI
uiController.init()

// 5) Mostrar lobby inicialmente
window.onpopstate = async (event) => {
    if (event.state?.expId) {
        // Usuario está volviendo a una experiencia desde el historial
        const exp = experiences.find(e => e.id === event.state.expId)
        if (exp) {
            uiController.showGame()
            await gameManager.startExperience(exp)
            uiController.updateHUD({ showInfo: true, showNav: true })
        }
    } else {
        console.log("Botón físico del celular: Volver al lobby")
        // Usuario presionó atrás mientras estaba en AR
        await gameManager.stopExperience()   // aquí se asegura de cerrar XR
        uiController.hideGame()
    }
}