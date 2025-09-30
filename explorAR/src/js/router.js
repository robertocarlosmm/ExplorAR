export class Router {
    constructor({ experiences, uiController, gameManager }) {
        this.experiences = experiences
        this.ui = uiController
        this.game = gameManager
    }

    init() {
        window.onpopstate = async (event) => {
            if (event.state?.expId) {
                const exp = this.experiences.find(e => e.id === event.state.expId)
                if (exp) await this.goToExperience(exp, /*push*/ false)
            } else {
                await this.goToLobby(/*push*/ false)
            }
        }
        // Opcional: parsear URL inicial (deep-link)
        this._hydrateFromLocation()
    }

    async goToExperience(exp, push = true) {
        if (push) window.history.pushState({ expId: exp.id }, "", `/experiencia/${exp.name}`)
        this.ui.showGame()
        await this.game.startExperience(exp)
        this.ui.updateHUD({ showInfo: true, showNav: true })
    }

    async goToLobby(push = true) {
        if (push) window.history.pushState({}, "", "/")
        await this.game.stopExperience()
        this.ui.hideGame()
    }

    // Maneja si abren /experiencia/Algo directo
    async _hydrateFromLocation() {
        const path = location.pathname || "/"
        const m = path.match(/^\/experiencia\/(.+)$/)
        if (!m) return
        const name = decodeURIComponent(m[1])
        const exp = this.experiences.find(e => e.name === name)
        if (exp) {
            // No push: ya estamos en esa URL
            await this.goToExperience(exp, /*push*/ false)
            // Y escribe un state para que “atrás” funcione
            window.history.replaceState({ expId: exp.id }, "", location.pathname)
        }
    }
}
