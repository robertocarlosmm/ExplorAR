export class UIController {
    constructor({ experiences, onSelectExperience, onContinue, onBack }) {
        this.experiences = experiences
        this.onSelectExperience = onSelectExperience
        this.onContinue = onContinue
        this.onBack = onBack

        this.gridContainer = document.getElementById("grid-container")
        this.experienceListScreen = document.getElementById("experience-list")
        this.experienceDetailScreen = document.getElementById("experience-detail")

        this.detailImage = document.getElementById("detail-image")
        this.detailTitle = document.getElementById("detail-title")

        this.btnContinue = document.getElementById("btn-continue")
        this.btnBack = document.getElementById("btn-back")

        this.currentIndex = null

        this.btnInfoGame1 = document.getElementById("btn-igame1")
    }

    init() {
        this.renderExperiences()

        this.btnBack.addEventListener("click", () => {
            this.showList()
            this.onBack()
        })

        this.btnContinue.addEventListener("click", () => {
            if (this.currentIndex !== null) {
                console.log("Continuar con experiencia:", this.currentIndex)
                const exp = this.experiences[this.currentIndex]
                this.onContinue(exp)
            }
        })

        if (this.btnInfoGame1) {
            this.btnInfoGame1.addEventListener("click", () => {
                console.log("Botón Minijuego 1 presionado")
                if (this.onGame1) this.onGame1()
            })
        }
    }

    renderExperiences() {
        this.gridContainer.innerHTML = ""
        this.experiences.forEach((exp, index) => {
            const card = document.createElement("div")
            card.classList.add("card")
            card.innerHTML = `
                <img src="${exp.imagePath}" alt="${exp.name}">
                <div class="card-title">${exp.name}</div>
            `
            card.addEventListener("click", () => this.showDetail(index))
            this.gridContainer.appendChild(card)
        })
    }

    showDetail(index) {
        const exp = this.experiences[index]
        this.detailImage.src = exp.imagePath
        this.detailTitle.textContent = exp.name
        this.currentIndex = index

        this.experienceListScreen.classList.remove("active")
        this.experienceDetailScreen.classList.add("active")

        this.onSelectExperience(exp)
    }

    showList() {
        this.experienceDetailScreen.classList.remove("active")
        this.experienceListScreen.classList.add("active")
        this.currentIndex = null
    }

    showGame() {
        this.experienceDetailScreen.classList.remove("active")
        document.getElementById("experience-detail").classList.remove("active")
        document.getElementById("game-container").classList.add("active")

        // mostrar HUD
        document.getElementById("hud").style.display = "block"
    }

    hideGame() {
        document.getElementById("game-container").classList.remove("active")
        // ocultar HUD
        document.getElementById("hud").style.display = "none"

        this.showList()
    }

}
