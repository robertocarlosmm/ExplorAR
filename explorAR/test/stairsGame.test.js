import { describe, it, expect, vi } from "vitest"
import { Minigame3Taquile } from "../src/js/games/minigame3/Minigame3Taquile.js"

function createHudMock() {
    return {
        show: vi.fn(),
        startTimer: vi.fn(),
        stopTimer: vi.fn(),
        setScore: vi.fn(),
        message: vi.fn(),
        showEndPopup: vi.fn(),
        _timeLeft: 0
    }
}

function createSceneMock() {
    return {
        onBeforeRenderObservable: {
            add: vi.fn(),
            remove: vi.fn()
        }
    }
}

describe("Minigame3Taquile – _handleProjectileHit (lógica de aciertos y fallos)", () => {
    it("fallo sin target real: resta pointsFail sin bajar de 0", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Taquile({ scene, hud, experienceId: "taquile", startingScore: 3 })

        game.score = 1
        game.pointsFail = 2
        game.isRunning = true

        // Caso 1: mesh null
        game._handleProjectileHit(null)
        expect(game.score).toBe(0)
        expect(hud.setScore).toHaveBeenLastCalledWith(0)

        // Caso 2: mesh sin metadata.real
        hud.setScore.mockClear()
        game.score = 1
        const fakeMesh = { metadata: {} }
        game._handleProjectileHit(fakeMesh)
        expect(game.score).toBe(0)
        expect(hud.setScore).toHaveBeenLastCalledWith(0)
    })

    it("hit correcto marca el target, suma puntos y muestra mensaje", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Taquile({ scene, hud, experienceId: "taquile", startingScore: 0 })

        game.isRunning = true
        game.pointsHit = 15
        game.pointsFail = 1
        game.score = 10

        // Creamos un "target" simple (no mesh real de Babylon)
        const target = { name: "target_0", _marked: false }
        game.steps = [
            { targets: [target] }
        ]

        const indicatorSpy = vi.spyOn(game, "_showTargetIndicator").mockImplementation(() => { })
        const allMarkedSpy = vi.spyOn(game, "_allTargetsMarked").mockReturnValue(false)
        // ProjectileSystem entrega un "proxy" con metadata.real = target
        const proxyMesh = { metadata: { real: target } }

        game._handleProjectileHit(proxyMesh)

        expect(target._marked).toBe(true)
        expect(game.score).toBe(25) // 10 + 15
        expect(hud.setScore).toHaveBeenLastCalledWith(25)
        expect(hud.message).toHaveBeenCalledWith("¡Muy bien!", 1200)
        expect(indicatorSpy).toHaveBeenCalledTimes(1)
        expect(allMarkedSpy).toHaveBeenCalledTimes(1)
    })

    it("double hit sobre mismo target no cambia score ni vuelve a marcar", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Taquile({ scene, hud, experienceId: "taquile", startingScore: 0 })

        game.isRunning = true
        game.pointsHit = 15
        game.score = 10

        const target = { name: "target_0", _marked: true } 
        game.steps = [{ targets: [target] }]

        const indicatorSpy = vi.spyOn(game, "_showTargetIndicator").mockImplementation(() => { })
        const allMarkedSpy = vi.spyOn(game, "_allTargetsMarked").mockReturnValue(false)

        const proxyMesh = { metadata: { real: target } }

        game._handleProjectileHit(proxyMesh)

        // No debe cambiar nada
        expect(game.score).toBe(10)
        expect(indicatorSpy).not.toHaveBeenCalled()
        expect(hud.message).not.toHaveBeenCalled()
        expect(allMarkedSpy).not.toHaveBeenCalled()
    })

    it("cuando todos los targets están marcados, llama a _processCompletedTargets", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Taquile({ scene, hud, experienceId: "taquile", startingScore: 0 })

        game.isRunning = true
        game.pointsHit = 15
        game.score = 0

        const target = { name: "target_0", _marked: false }
        game.steps = [{ targets: [target] }]

        vi.spyOn(game, "_showTargetIndicator").mockImplementation(() => { })
        vi.spyOn(game, "_allTargetsMarked").mockReturnValue(true)
        const processSpy = vi.spyOn(game, "_processCompletedTargets").mockImplementation(() => { })

        const proxyMesh = { metadata: { real: target } }
        game._handleProjectileHit(proxyMesh)

        expect(processSpy).toHaveBeenCalledTimes(1)
    })
})

describe("Minigame3Taquile – _allTargetsMarked (conteo global de hits)", () => {
    it("devuelve true cuando hay al menos 6 targets marcados", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Taquile({ scene, hud, experienceId: "taquile", startingScore: 0 })

        // 6 targets marcados repartidos
        game.steps = [
            { targets: [{ _marked: true }, { _marked: true }] },
            { targets: [{ _marked: true }, { _marked: true }] },
            { targets: [{ _marked: true }, { _marked: true }] }
        ]

        expect(game._allTargetsMarked()).toBe(true)
    })

    it("devuelve false si hay menos de 6 hits", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Taquile({ scene, hud, experienceId: "taquile", startingScore: 0 })

        game.steps = [
            { targets: [{ _marked: true }, { _marked: false }] },
            { targets: [{ _marked: true }] }
        ]

        expect(game._allTargetsMarked()).toBe(false)
    })
})

describe("Minigame3Taquile – _processCompletedTargets (reset de targets tras animación)", () => {
    it("espera _advanceStep6, limpia marcas y vuelve a registrar targets", async () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Taquile({ scene, hud, experienceId: "taquile", startingScore: 0 })

        game.isAnimating = false

        // 2 escalones con targets marcados y con indicador
        const t1 = { _marked: true, _indicator: { dispose: vi.fn() } }
        const t2 = { _marked: true, _indicator: { dispose: vi.fn() } }
        game.steps = [
            { targets: [t1] },
            { targets: [t2] }
        ]

        const advanceSpy = vi
            .spyOn(game, "_advanceStep6")
            .mockResolvedValue() // no anima nada real
        const registerSpy = vi
            .spyOn(game, "_registerProjectileTargets")
            .mockImplementation(() => { })

        await game._processCompletedTargets()

        expect(advanceSpy).toHaveBeenCalledTimes(1)
        expect(registerSpy).toHaveBeenCalledTimes(1)

        // Targets deben quedar desmarcados y sin indicador
        for (const step of game.steps) {
            for (const t of step.targets) {
                expect(t._marked).toBe(false)
                expect(t._indicator).toBeNull()
            }
        }

        expect(game.isAnimating).toBe(false)
    })
})

describe("Minigame3Taquile – _onTimeUp, _restart y _endGame", () => {
    it("_onTimeUp detiene el timer y muestra popup con onRetry/onContinue", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Taquile({ scene, hud, experienceId: "taquile", startingScore: 5 })

        game.score = 7

        game._onTimeUp()

        expect(hud.stopTimer).toHaveBeenCalled()
        expect(hud.showEndPopup).toHaveBeenCalledTimes(1)

        const popup = hud.showEndPopup.mock.calls[0][0]
        expect(popup.score).toBe(7)
        expect(popup.timeExpired).toBe(false)
        expect(typeof popup.onRetry).toBe("function")
        expect(typeof popup.onContinue).toBe("function")
    })

    it("_restart reinicia score, llama a dispose y start", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Taquile({ scene, hud, experienceId: "taquile", startingScore: 5 })

        // Stub de start y dispose para no levantar RA
        const disposeSpy = vi.spyOn(game, "dispose").mockImplementation(() => { })
        const startSpy = vi.spyOn(game, "start").mockResolvedValue()

        game.score = 20

        game._restart()

        expect(disposeSpy).toHaveBeenCalledTimes(1)
        expect(game.score).toBe(5) // vuelve al startingScore
        expect(hud.setScore).toHaveBeenLastCalledWith(5)
        expect(startSpy).toHaveBeenCalledTimes(1)
    })

    it("_endGame marca isRunning=false, libera recursos y dispara onGameEnd", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Taquile({ scene, hud, experienceId: "taquile", startingScore: 0 })

        game.isRunning = true
        const disposeSpy = vi.spyOn(game, "dispose").mockImplementation(() => { })
        const endSpy = vi.fn()
        game.onGameEnd = endSpy

        game._endGame()

        expect(game.isRunning).toBe(false)
        expect(disposeSpy).toHaveBeenCalledTimes(1)
        expect(endSpy).toHaveBeenCalledTimes(1)
    })
})
