import { GameManager } from "./core/GameManager.js"
import { UIController } from "./ui/UIController.js"
import { Router } from "./router.js"
import { experiencesConfig } from "../config/experienceConfig.js"
import { Experience } from "./models/Experience.js"

/*NO OLVIDAR NUNCA
una sola fuente de verdad para navegación: el Router maneja onpopstate; nada de duplicarlo en main.
ciclo de vida XR controlado: enterXRAsync solo tras click; en sessionEnded paras renderLoop, haces dispose y luego vuelves a la UI.
callback onExit siempre definido (no-op por defecto) y asignado en el constructor.
sin UI por defecto del helper: disableDefaultUI: true.
canvas sin flashes: clearColor(0,0,0,0) y render loop arranca después de entrar a XR.
*/

const experiences = experiencesConfig.map(cfg =>
    new Experience(cfg.id, cfg.name, cfg.image, cfg.modelPath || null, cfg.description, cfg.minigames || [])
)

const gameManager = new GameManager()

// 1) UI primero (sin handlers)
const uiController = new UIController({ experiences })

// 2) Router con referencias a UI y Game
const router = new Router({ experiences, uiController, gameManager })
router.init()

// 2.1) Si la XR se cierra (ej. botón Atrás), volver al lobby SIN push extra
gameManager.setOnExit(() => {
    router.goToLobby(false)   // no hace pushState; cierra XR y restaura UI
})

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

