export class UIController {
    constructor({ experiences }) {
        this.experiences = experiences

        this.gridContainer = document.getElementById("grid-container")
        this.experienceListScreen = document.getElementById("experience-list")
        this.experienceDetailScreen = document.getElementById("experience-detail")
        this.detailImage = document.getElementById("detail-image")
        this.detailTitle = document.getElementById("detail-title")

        this.btnContinue = document.getElementById("btn-continue")
        this.btnBack = document.getElementById("btn-back")

        this.hud = document.getElementById("hud")
        this.btnInfoGame1 = document.getElementById("btn-igame1")
        this.btnExit = document.getElementById("btn-exit")

        this.currentIndex = null

        // Handlers inyectables
        this.handlers = {
            onSelectExperience: null,
            onContinue: null,
            onBack: null,
        }
    }

    setHandlers(h) {
        this.handlers = { ...this.handlers, ...h }
    }

    init() {
        this.renderExperiences()

        this.btnBack?.addEventListener("click", () => {
            this.handlers.onBack?.()
        })

        this.btnContinue?.addEventListener("click", () => {
            if (this.currentIndex !== null) {
                const exp = this.experiences[this.currentIndex]
                this.handlers.onContinue?.(exp)
            }
        })

        this.btnInfoGame1?.addEventListener("click", () => {
            console.log("Botón info (i)")
        })

        this.btnExit?.addEventListener("click", () => {
            this.handlers.onBack?.()
        })
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

        this.handlers.onSelectExperience?.(exp)
    }

    showList() {
        this.experienceDetailScreen.classList.remove("active")
        this.experienceListScreen.classList.add("active")
        this.currentIndex = null
    }

    showGame() {
        this.experienceDetailScreen.classList.remove("active")
        this.gameContainer?.classList.add("active")
        this.hud?.classList.remove("hidden")    // <- aquí lo muestras
    }

    hideGame() {
        this.gameContainer?.classList.remove("active")
        this.hud?.classList.add("hidden")       // <- aquí lo ocultas
        this.showList()
    }

    updateHUD(cfg = {}) {
        const show = (id, v) => {
            const el = document.getElementById(id)
            if (el) el.classList.toggle("hidden", !v)
        }
        show("btn-igame1", !!cfg.showInfo)
        show("btn-prev", !!cfg.showNav)
        show("btn-next", !!cfg.showNav)
    }
}