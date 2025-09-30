import { experiencesConfig } from "../config/experienceConfig.js"
import { Experience } from "./models/Experience.js"
import { GameManager } from "./core/GameManager.js"
import { UIController } from "./ui/UIController.js"

// Catálogo dinámico
const experiences = experiencesConfig.map(cfg =>
    new Experience(cfg.id, cfg.name, cfg.image, cfg.modelPath || null, cfg.description, cfg.minigames || [])
)

const gameManager = new GameManager()

const uiController = new UIController({
    experiences,
    onSelectExperience: (exp) => {
        console.log("Seleccionado:", exp.name)
    },
    onContinue: async (exp) => {
        await gameManager.startExperience(exp)
        uiController.showGame()
    },
    onBack: () => {
        gameManager.stopExperience()
        uiController.hideGame()
    }

})

uiController.init()
