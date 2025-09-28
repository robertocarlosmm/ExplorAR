export class UIController {
    constructor(game) {
        this.game = game
        this.gridContainer = document.getElementById("grid-container")
        this.listEl = document.getElementById("experience-list")
        this.detailEl = document.getElementById("experience-detail")
        this.detailTitle = document.getElementById("detail-title")
        this.detailImage = document.getElementById("detail-image")
        this.subtitle = document.getElementById("subtitle")
        this.subtitleDetail = document.getElementById("subtitle-detail")
        this.btnContinue = document.getElementById("btn-continue")
        this.btnBack = document.getElementById("btn-back")
    }

    init() {
        this.renderExperienceList()

        this.btnBack.addEventListener("click", () => this.showList())
        this.btnContinue.addEventListener("click", () => {
            alert("Aquí luego empieza la experiencia seleccionada")
        })
    }

    renderExperienceList() {
        this.gridContainer.innerHTML = ""
        this.subtitle.textContent = "Elige una experiencia para jugar"
        this.game.experiences.forEach(exp => {
            const card = document.createElement("div")
            card.className = "card"
            card.innerHTML = `
                <img src="${exp.imagePath}" alt="${exp.name}">
                <p>${exp.name}</p>
            `
            card.addEventListener("click", () => this.showDetail(exp))
            this.gridContainer.appendChild(card)
        })
    }

    showDetail(exp) {
        this.game.selectExperience(exp.id)
        this.listEl.style.display = "none"
        this.detailEl.style.display = "block"
        this.detailTitle.textContent = exp.name
        this.detailImage.src = exp.imagePath
        this.subtitleDetail.textContent = "Estás por comenzar la experiencia"
    }

    showList() {
        this.listEl.style.display = "block"
        this.detailEl.style.display = "none"
    }
}
