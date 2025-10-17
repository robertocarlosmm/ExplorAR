export class ExperienceResult {
    constructor(experienceId) {
        this.experienceId = experienceId
        this.score = 0
        this.stars = 0
    }

    addScore(extra) {
        this.score += extra
    }

    finalize() {
        const thresholds = gameplayConfig.stars
        if (this.score >= thresholds.three) {
            this.stars = 3
        } else if (this.score >= thresholds.two) {
            this.stars = 2
        } else if (this.score >= thresholds.one) {
            this.stars = 1
        } else {
            this.stars = 0
        }
    }

    updateResult(score) {
        this.score += score;      // acumulativo por minijuego
        this.finalize();          // recalcula estrellas si aplica
    }

}