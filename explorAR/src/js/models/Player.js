export class Player {
    constructor() {
        this.experienceResults = {} // { taquile: ExperienceResult, vicos: ExperienceResult, ... }
        this.unlockedIcons = []     // Global unlocked icons
    }

    setExperienceResult(experienceId, result) {
        this.experienceResults[experienceId] = result
    }

    getExperienceResult(experienceId) {
        return this.experienceResults[experienceId] || null
    }

    unlockIcon(iconName) {
        if (!this.unlockedIcons.includes(iconName)) {
            this.unlockedIcons.push(iconName)
        }
    }

    getTotalScore() {
        return Object.values(this.experienceResults)
            .reduce((acc, res) => acc + res.score, 0)
    }

    getTotalStars() {
        return Object.values(this.experienceResults)
            .reduce((acc, res) => acc + res.stars, 0)
    }
}