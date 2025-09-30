export class Router {
    constructor({ experiences, uiController, gameManager }) {
        this.experiences = experiences
        this.uiController = uiController
        this.gameManager = gameManager
    }

    init() {
        // Manejar popstate (botón atrás)
        window.onpopstate = async (event) => {
            if (event.state?.expId) {
                const exp = this.experiences.find(e => e.id === event.state.expId)
                if (exp) {
                    this.uiController.showGame()
                    await this.gameManager.startExperience(exp)
                }
            } else {
                await this.gameManager.stopExperience()
                this.uiController.hideGame()
            }
        }
    }

    goToExperience(exp) {
        window.history.pushState({ expId: exp.id }, "", `/experiencia/${exp.name}`)
        this.uiController.showGame()
        this.gameManager.startExperience(exp)
    }

    goToLobby() {
        window.history.pushState({}, "", "/")
        this.gameManager.stopExperience()
        this.uiController.hideGame()
    }
}
