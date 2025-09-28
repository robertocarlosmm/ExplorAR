export class ExperienceResult {
    constructor(experienceId) {
        this.experienceId = experienceId // Link to Experience
        this.score = 0                   // Score obtained
        this.stars = 0                   // Stars obtained
    }

    updateResult(score) {
        this.score = score
        if (score >= 80) {
            this.stars = 3
        } else if (score >= 50) {
            this.stars = 2
        } else {
            this.stars = 1
        }
    }
}