import { GameManager } from "./core/GameManager.js"
import { UIController } from "./ui/UIController.js"
import { experiencesConfig } from "../config/experienceConfig.js"
import { Experience } from "./models/Experience.js"

const experiences = experiencesConfig.map(cfg =>
    new Experience(cfg.id, cfg.name, cfg.image, cfg.modelPath || null, cfg.description, cfg.minigames || [])
)

const gameManager = new GameManager()
const uiController = new UIController({ experiences })

// Inyectamos handlers directamente (sin router)
uiController.setHandlers({
    onSelectExperience: (exp) => {
        console.log("Seleccionado:", exp.name)
    },

    onContinue: async (exp) => {
        uiController.showGame()
        await gameManager.startExperience(exp)
        uiController.updateHUD({ showInfo: true, showNav: true })
    },

    onBack: async () => {
        await gameManager.stopExperience()
        uiController.hideGame()
    }
})

// Inicia UI en modo lista
uiController.init()