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

        // HUD elements
        this.hud = document.getElementById("hud")
        this.btnInfoGame1 = document.getElementById("btn-igame1")
        this.btnExit = document.getElementById("btn-exit")
    }

    init() {
        this.renderExperiences()

        // Navegación detalle ←→ lista
        this.btnBack?.addEventListener("click", () => {
            this.showList()
            this.onBack?.()
        })

        this.btnContinue?.addEventListener("click", () => {
            if (this.currentIndex !== null) {
                const exp = this.experiences[this.currentIndex]
                this.onContinue?.(exp)
            }
        })

        // HUD: botón info (ejemplo)
        this.btnInfoGame1?.addEventListener("click", () => {
            console.log("Botón info (i) presionado")
            // Aquí puedes abrir un modal o mostrar tooltip
        })

        // HUD: botón salir AR (atajo alternativo)
        this.btnExit?.addEventListener("click", () => {
            this.onBack?.()
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

        this.onSelectExperience?.(exp)
    }

    showList() {
        this.experienceDetailScreen.classList.remove("active")
        this.experienceListScreen.classList.add("active")
        this.currentIndex = null
    }

    showGame() {
        // Oculta el detalle y muestra el contenedor del juego
        this.experienceDetailScreen.classList.remove("active")
        document.getElementById("game-container").classList.add("active")

        // Muestra el HUD (DOM overlay necesita que exista y no esté oculto)
        this.hud?.classList.remove("hidden")
    }

    hideGame() {
        document.getElementById("game-container").classList.remove("active")
        this.hud?.classList.add("hidden")
        this.showList()
    }

    /**
     * Controla qué elementos del HUD se muestran según estado/parámetros.
     * @param {{showInfo?: boolean, showNav?: boolean}} cfg
     */
    updateHUD(cfg = {}) {
        const show = (el, v) => el && el.classList.toggle("hidden", !v)

        // ejemplo: botón "i" (info)
        show(this.btnInfoGame1, !!cfg.showInfo)

        // ejemplo: barra de navegación (prev/next)
        const prev = document.getElementById("btn-prev")
        const next = document.getElementById("btn-next")
        show(prev, !!cfg.showNav)
        show(next, !!cfg.showNav)
    }
}
