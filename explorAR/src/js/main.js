import { GameManager } from "./core/GameManager.js"
import { UIController } from "./ui/UIController.js"
// Importa tu catálogo como lo tengas (aquí ejemplo genérico)
import { experiencesConfig } from "../config/experienceConfig.js"
import { Experience } from "./models/Experience.js"

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
        // 1) Muestra la pantalla de juego y el HUD
        uiController.showGame()

        // 2) Inicia la experiencia XR
        await gameManager.startExperience(exp)

        // 3) Configura HUD según el minijuego/estado inicial
        uiController.updateHUD({
            showInfo: true,   // mostrar botón "i" al arrancar
            showNav: true     // ejemplo: mostrar prev/next
        })
    },

    onBack: async () => {
        // 1) Sal de XR limpio
        await gameManager.stopExperience()

        // 2) Oculta juego + HUD y vuelve a la lista
        uiController.hideGame()
    }
})

uiController.init()
