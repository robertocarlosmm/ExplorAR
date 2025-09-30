import { XRSession } from "../../features/xrSession.js"

export class GameManager {
    constructor() {
        this.xrSession = null
    }

    async startExperience(experience) {
        // Evita dobles inicios
        if (this.xrSession) await this.stopExperience()

        this.xrSession = new XRSession()
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
