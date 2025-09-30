import { XRSession } from "../../features/xrSession.js"

export class GameManager {
    constructor() {
        this.xrSession = null
    }

    async startExperience(experience) {
        this.xrSession = new XRSession()
        await this.xrSession.init("game-container", experience.name)
        await this.xrSession.enterXR()
    }

    stopExperience() {
        if (this.xrSession) {
            this.xrSession.dispose()
            this.xrSession = null
        }
    }
}