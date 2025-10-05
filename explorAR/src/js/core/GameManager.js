import { XRSession } from "../features/xrSession.js"
import { PuzzleGame } from "../games/minigame1/PuzzleGame.js"
import { preloadAssets } from "./assetLoader.js";

export class GameManager {
    constructor({ hud, onExit } = {}) {
        this.xrSession = null;
        this.hud = hud;
        this._runningGame = null;
        this.onExit = (typeof onExit === 'function') ? onExit : () => { };
    }

    setOnExit(fn) { if (typeof fn === 'function') this.onExit = fn; }

    async startExperience(experience) {
        if (this.xrSession) await this.stopExperience();

        this.xrSession = new XRSession({
            onExit: this.onExit           // ⬅️ se pasa al XRSession
        });

        await this.xrSession.init(experience?.name || "Experiencia");
        await this.xrSession.enterXR();
    }

    async stopExperience() {
        if (this._runningGame) { this._runningGame.dispose(); this._runningGame = null; }
        if (this.hud) { this.hud.stopTimer(); this.hud.clearPanel(); }
        if (this.xrSession) { await this.xrSession.exit(); this.xrSession = null; }
    }

    //Minijuego 1: Puzzle
    async launchPuzzle({ imageUrl, grid = 3 } = {}) {
        const scene = this.xrSession?.scene
        if (!scene) { console.warn("XR no iniciado aún"); return }
        // cierra el juego anterior si lo hubiera
        if (this._runningGame) { this._runningGame.dispose() }
        this._runningGame = new PuzzleGame({ scene, hud: this.hud, grid, imageUrl })
        await this._runningGame.start()
    }
}