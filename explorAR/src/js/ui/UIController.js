export class UIController {
    constructor() {
        this.hud = document.getElementById("hud")
        this.scoreEl = document.getElementById("score")
    }

    showHUD() {
        this.hud.style.display = "block"
    }

    updateScore(score) {
        this.scoreEl.textContent = `Puntaje: ${score}`
    }
}
