// test/checkGame.test.js
import { describe, it, expect, vi } from "vitest"
import { CheckGame } from "../src/js/games/minigame4/CheckGame.js" // AJUSTA la ruta si es distinta

// HUD mock: solo lo que usa CheckGame
function createHudMock() {
    return {
        show: vi.fn(),
        setScore: vi.fn(),
        updateScore: vi.fn(),
        startTimer: vi.fn(),
        stopTimer: vi.fn(),
        message: vi.fn(),
        showFinalPopup: vi.fn(),
    }
}

// Scene mock: ahora incluye getUniqueId + addTransformNode
function createSceneMock() {
    let uid = 1
    const scene = {
        _nodes: [],
        transformNodes: [],

        // Lo que usa Node/TransformNode internamente
        getUniqueId() {
            return uid++
        },

        addTransformNode(node) {
            this.transformNodes.push(node)
            this._nodes.push(node)
        },

        // Lo que usa CheckGame directamente
        activeCamera: {
            globalPosition: { x: 0, y: 1.6, z: 0 },
            getForwardRay: () => ({ direction: { x: 0, y: 0, z: 1 } }),
        },

        onBeforeRenderObservable: {
            add: vi.fn(),
            removeCallback: vi.fn(),
        },

        getEngine() {
            return {
                getDeltaTime: () => 16, // ~60fps
            }
        },
    }

    return scene
}

describe("CheckGame – _onTimeUp (fin de tiempo)", () => {
    it("detiene el juego, para el timer y muestra popup con callbacks", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const game = new CheckGame({
            scene,
            hud,
            experienceId: "test-exp",
            startingScore: 15,
        })

        game.score = 20
        game.isRunning = true

        const restartSpy = vi.spyOn(game, "_restart").mockImplementation(() => { })
        const endSpy = vi.spyOn(game, "_endGame").mockImplementation(() => { })

        game._onTimeUp()

        expect(game.isRunning).toBe(false)
        expect(hud.stopTimer).toHaveBeenCalledTimes(1)
        expect(hud.showFinalPopup).toHaveBeenCalledTimes(1)

        const popupConfig = hud.showFinalPopup.mock.calls[0][0]
        expect(popupConfig.score).toBe(20)
        expect(typeof popupConfig.onRetry).toBe("function")
        expect(typeof popupConfig.onContinue).toBe("function")

        // Simulamos callbacks del popup
        popupConfig.onRetry()
        expect(restartSpy).toHaveBeenCalledTimes(1)

        popupConfig.onContinue()
        expect(endSpy).toHaveBeenCalledTimes(1)
    })
})

describe("CheckGame – _restart (reinicio del minijuego)", () => {
    it("limpia recursos, resetea score y llama a start()", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const game = new CheckGame({
            scene,
            hud,
            experienceId: "test-exp",
            startingScore: 5,
        })

        game.score = 30

        const disposeSpy = vi.spyOn(game, "dispose").mockImplementation(() => { })
        const startSpy = vi.spyOn(game, "start").mockResolvedValue()

        game._restart()

        expect(disposeSpy).toHaveBeenCalledTimes(1)
        expect(game.score).toBe(5)
        expect(hud.updateScore).toHaveBeenLastCalledWith(5)
        expect(hud.setScore).toHaveBeenLastCalledWith(5)
        expect(startSpy).toHaveBeenCalledTimes(1)
    })
})

describe("CheckGame – _endGame (fin normal del minijuego)", () => {
    it("libera recursos y llama a onGameEnd", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const game = new CheckGame({
            scene,
            hud,
            experienceId: "test-exp",
            startingScore: 0,
        })

        const disposeSpy = vi.spyOn(game, "dispose").mockImplementation(() => { })
        const onGameEndSpy = vi.fn()
        game.onGameEnd = onGameEndSpy

        game._endGame()

        expect(disposeSpy).toHaveBeenCalledTimes(1)
        expect(onGameEndSpy).toHaveBeenCalledTimes(1)
    })
})

describe("CheckGame – _updateLoop (caída simple del ítem)", () => {
    it("reduce la Y del ítem y detiene el juego cuando toca el piso", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const game = new CheckGame({
            scene,
            hud,
            experienceId: "test-exp",
            startingScore: 0,
        })

        game.item = {
            position: { x: 0, y: 1.0, z: 0 },
        }
        game.fallSpeed = 1.0
        game.groundY = 0.0
        game.isRunning = true

        const initialY = game.item.position.y

        // 1ª llamada: debe bajar pero no llegar al piso
        game._updateLoop(null, 500)
        expect(game.item.position.y).toBeLessThan(initialY)
        expect(game.item.position.y).toBeGreaterThan(game.groundY + 0.01)
        expect(game.isRunning).toBe(true)

        // Varias llamadas más hasta que toque el piso
        let safety = 0
        while (game.isRunning && safety < 200) {
            game._updateLoop(null, 1000) // da igual, dt se capa en 0.05
            safety++
        }

        expect(game.isRunning).toBe(false)
        expect(game.item.position.y).toBeCloseTo(game.groundY + 0.01, 5)
    })

    it("si no hay item o no está corriendo, no explota", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const game = new CheckGame({
            scene,
            hud,
            experienceId: "test-exp",
            startingScore: 0,
        })

        game.isRunning = false
        game.item = null

        expect(() => game._updateLoop(null, 16)).not.toThrow()
    })
})

