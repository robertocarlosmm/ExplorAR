import { XRSession } from "../features/xrSession.js"
import { PuzzleGame } from "../games/minigame1/PuzzleGame.js"
import { preloadAssets } from "./assetLoader.js";

export class GameManager {
    constructor({ hud, game, onExit } = {}) {
        this.xrSession = null;
        this.hud = hud;
        this._runningGame = null;
        this.game = game;
        this.onExit = (typeof onExit === 'function') ? onExit : () => { };
    }

    setOnExit(fn) { if (typeof fn === 'function') this.onExit = fn; }

    async startExperience(experience) {
        if (this.xrSession) await this.stopExperience();

        this.xrSession = new XRSession({
            onExit: this.onExit           // se pasa al XRSession
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
    async launchPuzzle({ imageUrl, grid = 3, experienceId, minigameId } = {}) {
        const scene = this.xrSession?.scene;
        if (!scene) {
            console.warn("XR no iniciado aún");
            return;
        }

        // Asegurar limpieza de cualquier instancia previa
        if (this._runningGame) this._runningGame.dispose();

        const puzzle = new PuzzleGame({ scene, hud: this.hud, grid, imageUrl });

        // callback al finalizar el minijuego
        puzzle.onGameEnd = () => {
            // 1. Guardar puntaje en el sistema global
            this.game?.completeMinigame?.(puzzle.score);

            // 2. Buscar el siguiente minijuego
            const exp = this.game?.currentExperience;
            const nextId = exp?.getNextMinigameId?.(minigameId);

            if (nextId) {
                const next = exp.getMinigameById(nextId);
                console.log(`[GameManager] Avanzando al siguiente minijuego: ${nextId}`);
                this.launchPuzzle({
                    imageUrl: next.assets.find(a => a.key === "board")?.url || null,
                    grid: next.params?.grid ?? 3,
                    experienceId: exp.id,
                    minigameId: nextId
                });
            } else {
                console.log("[GameManager] Experiencia finalizada, volviendo al lobby.");
                this.onExit?.();
            }
        };

        this._runningGame = puzzle;
        await puzzle.start();
    }


    restartCurrentMiniGame() {
        // Reinicia solo el minijuego actual
        const current = this.currentMiniGame
        if (!current) return
        this.stopMiniGame(current)
        this.startMiniGame(current)
    }

    advanceToNextMiniGame() {
        const next = this.getNextMiniGame()
        if (next) {
            this.startMiniGame(next)
        } else {
            // Si ya no hay más, salir al lobby o mostrar "Fin"
            this.onExit?.()
        }
    }

}