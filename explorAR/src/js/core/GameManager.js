import { XRSession } from "../../features/xrSession.js"

export class GameManager {
    constructor({ onExit } = {}) {
        this.xrSession = null
        this.onExit = (typeof onExit === 'function') ? onExit : () => { }
    }

    setOnExit(fn) {
        if (typeof fn === 'function') this.onExit = fn
    }

    async startExperience(experience) {
        // Evita dobles inicios
        if (this.xrSession) await this.stopExperience()

        this.xrSession = new XRSession({
            onExit: this.onExit
        });

        await this.xrSession.init(experience?.name || "Experiencia")
        await this.xrSession.enterXR()

        // Aquí podrías instanciar/controlar minijuegos, y usar UIController.updateHUD según el estado
    }

    async stopExperience() {
        if (this.xrSession) {
            await this.xrSession.exit() // salir de XR limpio
            this.xrSession = null
        }
    }
}
