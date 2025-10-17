import { Player } from "../models/Player.js"
import { Experience } from "../models/Experience.js"
import { ExperienceResult } from "../models/ExperienceResult.js"

export class Game {
    constructor(experiences = []) {
        this.player = new Player()
        this.experiences = experiences   // catálogo de experiencias
        this.currentExperience = null    // la experiencia activa
    }

    selectExperience(experienceId) {
        // Buscar la experiencia en el catálogo
        const exp = this.experiences.find(e => e.id === experienceId)
        if (!exp) return null

        this.currentExperience = exp

        // Crear un ExperienceResult si aún no existe
        if (!this.player.getExperienceResult(exp.id)) {
            this.player.setExperienceResult(exp.id, new ExperienceResult(exp.id))
        }

        return exp
    }

    completeMinigame(score) {
        if (!this.currentExperience) return;

        const result = this.player.getExperienceResult(this.currentExperience.id);
        result.updateResult(score);
    }

    unlockIcon(iconName) {
        this.player.unlockIcon(iconName)
    }

    getPlayerProgress() {
        return {
            totalScore: this.player.getTotalScore(),
            totalStars: this.player.getTotalStars(),
            unlockedIcons: this.player.unlockedIcons
        }
    }
}
