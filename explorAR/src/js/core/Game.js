export class Game {
    constructor(experiences = []) {
        this.experiences = experiences   // catálogo de experiencias
        this.currentExperience = null    // la experiencia activa
    }

    selectExperience(experienceId) {
        // Buscar la experiencia en el catálogo
        const exp = this.experiences.find(e => e.id === experienceId)
        if (!exp) return null

        this.currentExperience = exp

        return exp
    }

}
