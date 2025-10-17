import { XRSession } from "../features/xrSession.js"
import { PuzzleGame } from "../games/minigame1/PuzzleGame.js"
import { launchMinigame } from "../games/registry.js";
//import { preloadAssets } from "./assetLoader.js";

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
    //COMENTARIO MOMENTANEO
    /*async launchPuzzle({ imageUrl, grid = 3, experienceId, minigameId } = {}) {
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
    }*/

    launchNextMinigame(nextId) {
        if (!nextId) {
            console.warn("[GameManager] No hay siguiente minijuego definido.");
            this.onExit?.();
            return;
        }

        const success = launchMinigame(nextId, this);
        if (!success) {
            console.warn("[GameManager] No se pudo lanzar el minijuego:", nextId);
            this.onExit?.();
        }
    }

    // Opción inicial (si quieres empezar por el primero):
    startCurrentExperience() {
        const firstId = this.game?.currentExperience?.getFirstMinigameId?.();
        this.launchNextMinigame(firstId);
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

    // MINI GAME 2
    startMinigame2() {
        const currentExperience = this.experienceManager?.currentExperience ?? {
            name: "Destino desconocido",
            description: "Descripción no disponible.",
        };

        // 1️⃣ Mostrar el tutorial reutilizable
        TutorialPanel.show({
            image: "/assets/tutorial/minigame2Tutorial.png",
            title: "Prepárate antes de viajar",
            message: "Elige bien tu equipamiento. Conoce el contexto para no olvidar nada.",
            onContinue: () => {
                // 2️⃣ Luego mostrar el panel dinámico de información del destino
                Minigame2InfoPanel.show(currentExperience, () => {
                    this.initMinigame2Scene?.();
                });
            },
        });
    }

    initMinigame2Scene() {
        console.log("[GameManager] Iniciando escena RA del minijuego 2...");
    }

    // ------------------------------------------------------
    // Cierra de forma segura la sesión WebXR actual
    // ------------------------------------------------------
    async closeXRSession() {
        if (!this.xrSession) {
            console.log("[GameManager] No hay XRSession activa para cerrar.");
            return;
        }
        try {
            console.log("[GameManager] Cerrando XR via XRSession.exit(silent)...");
            await this.xrSession.exit(true);  // 👈 silencioso: NO dispara Nav.goLobby
        } catch (err) {
            console.warn("[GameManager] Error al cerrar XR:", err);
        } finally {
            this.xrSession = null;
            this.hud?.stopTimer?.();
            this.hud?.clearPanel?.();
            await new Promise(r => setTimeout(r, 150)); // respiro para liberar cámara/framebuffer
        }
    }

}