export class UIController {
    constructor({ experiences }) {
        this.experiences = experiences

        this.gridContainer = document.getElementById("grid-container")
        this.experienceListScreen = document.getElementById("experience-list")
        this.experienceDetailScreen = document.getElementById("experience-detail")
        this.detailImage = document.getElementById("detail-image")
        this.detailTitle = document.getElementById("detail-title")

        this.btnContinue = document.getElementById("btn-continue-detail")
        this.btnBack = document.getElementById("btn-back")

        this.hud = document.getElementById("hud")
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

        this.btnExit?.addEventListener("click", () => {
            this.handlers.onBack?.()
        })

        this.btnContinue?.addEventListener("click", () => {
            if (this.currentIndex !== null) {
                const exp = this.experiences[this.currentIndex];

                // ⚠️ CORRECCIÓN 1: Cambiar a vista de juego y hacer visible el HUD
                this.showGame();                                 // <—— necesario para que el HUD (y su slot) estén en escena
                this.hud?.classList.remove("hidden");            // <—— redundante pero seguro

                const tutorialData = {
                    title: "Descubre el lugar oculto",
                    description: "Mueve las piezas para ver la imagen oculta",
                    imageUrl: "/assets/tutorial/minigame1Tutorial.png",
                    buttonText: "Comenzar",
                    onStart: () => this.handlers.onContinue?.(exp) // main.js → Nav.goExperience → XR + Puzzle
                };

                console.log("Antes de show tutorial");
                this.showTutorial(tutorialData);
            }
        });

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
        document.getElementById("game-container").classList.add("active")
        this.hud?.classList.remove("hidden")
    }

    hideGame() {
        document.getElementById("game-container").classList.remove("active")
        this.hud?.classList.add("hidden")
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

    showTutorial({ title, description, imageUrl, buttonText = "Listo", onStart }) {
        console.log("[UIController] Mostrando tutorial dentro del HUD...");

        // 1️⃣ Obtener contenedor seguro dentro del HUD
        let slot = document.getElementById("hud-panel-slot");
        if (!slot) {
            console.warn("[UI] #hud-panel-slot no existe; usando #hud como contenedor");
            slot = this.hud;
        }

        // 2️⃣ Cargar y montar el panel de tutorial
        import("../panels/tutorialPanel.js").then(({ TutorialPanel }) => {
            slot.innerHTML = TutorialPanel.template({
                title,
                description,
                imageUrl,
                buttonText,
            });

            // Forzar el estilo fullscreen previsto por tu CSS
            const panel = slot.querySelector(".panel-tutorial");
            if (panel) {
                panel.classList.add("panel-fullscreen"); // asegura cobertura total
                slot.style.pointerEvents = "auto";       // permite interacción
                slot.style.background = "transparent";   // sin fondo extra
            }

            // 3️⃣ Vincular evento del botón
            TutorialPanel.mount(slot.firstElementChild, {
                onStart: () => {
                    // Limpiar el tutorial al continuar
                    slot.innerHTML = "";
                    slot.style.pointerEvents = "none";
                    this.hud?.classList.remove("hud-active");
                    if (this.hud) this.hud.style.background = "transparent";
                    onStart?.(); // continuar flujo (Nav.goExperience o siguiente minijuego)
                },
            });
        });
    }
}