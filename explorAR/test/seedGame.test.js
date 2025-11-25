// test/seedGame.test.js
import { describe, it, expect, vi } from "vitest"

// AJUSTA ESTA RUTA según tu estructura real
import { Minigame3Vicos } from "../src/js/games/minigame3/Minigame3Vicos.js"

// HUD mock (solo lo que usa este minijuego)
function createHudMock() {
    return {
        show: vi.fn(),
        startTimer: vi.fn(),
        stopTimer: vi.fn(),
        setScore: vi.fn(),
        updateScore: vi.fn(),
        message: vi.fn(),
        showEndPopup: vi.fn(),
        showPopup: vi.fn(),
        _timeLeft: 0
    }
}

// Scene mock mínimo
function createSceneMock() {
    return {
        onBeforeRenderObservable: {
            add: vi.fn(),
            remove: vi.fn()
        }
    }
}

describe("Minigame3Vicos – _handleHit: reglas de suelo seco / exceso", () => {
    it("si la parcela está 'dry' muestra mensaje y no cambia el score", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos", startingScore: 10 })
        game.isRunning = true

        const mesh = {}
        const plot = {
            mesh,
            baseMesh: {},
            state: "dry",
            hasPlant: false,
            waterLevel: 0
        }
        game.plots = [plot]

        // Espiamos _applyPlotVisual para asegurarnos que NO se llama
        const visualSpy = vi.spyOn(game, "_applyPlotVisual").mockImplementation(() => { })

        game._handleHit("seed", mesh)

        expect(game.score).toBe(10)
        expect(hud.setScore).not.toHaveBeenCalled()
        expect(hud.message).toHaveBeenCalledWith("⚠️ Suelo infértil - No se puede usar", 1200)
        expect(visualSpy).not.toHaveBeenCalled()
    })

    it("si la parcela está 'excess' resta overwaterPenalty y muestra mensaje", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos", startingScore: 20 })
        game.isRunning = true
        game.overwaterPenalty = 5

        const mesh = {}
        const plot = {
            mesh,
            baseMesh: {},
            state: "excess",
            hasPlant: true,
            waterLevel: 4
        }
        game.plots = [plot]

        const visualSpy = vi.spyOn(game, "_applyPlotVisual").mockImplementation(() => { })

        game._handleHit("water", mesh)

        expect(game.score).toBe(15) // 20 - 5
        expect(hud.setScore).toHaveBeenLastCalledWith(15)
        expect(hud.message).toHaveBeenCalledWith("💀 Planta muerta - Parcela perdida", 1200)
        // No debería intentar cambiar visualmente nada más
        expect(visualSpy).not.toHaveBeenCalled()
    })
})

describe("Minigame3Vicos – _handleHit: siembra de semillas", () => {
    it("sembrar semilla en suelo fértil cambia a 'seeded', suma puntos y aplica visual", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos", startingScore: 0 })
        game.isRunning = true
        game.seedPoints = 10

        const mesh = {}
        const plot = {
            mesh,
            baseMesh: {},
            state: "fertile",
            hasPlant: false,
            waterLevel: null
        }
        game.plots = [plot]

        const visualSpy = vi.spyOn(game, "_applyPlotVisual").mockImplementation(() => { })

        game._handleHit("seed", mesh)

        expect(plot.hasPlant).toBe(true)
        expect(plot.state).toBe("seeded")
        expect(plot.waterLevel).toBe(0)
        expect(game.score).toBe(10)
        expect(hud.setScore).toHaveBeenLastCalledWith(10)
        expect(hud.message).toHaveBeenCalledWith("🌱 Semilla plantada", 800)
        expect(visualSpy).toHaveBeenCalledTimes(1)
    })

    it("intentar sembrar donde ya hay planta solo muestra mensaje y no cambia score", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos", startingScore: 5 })
        game.isRunning = true
        game.seedPoints = 10

        const mesh = {}
        const plot = {
            mesh,
            baseMesh: {},
            state: "seeded",
            hasPlant: true,
            waterLevel: 0
        }
        game.plots = [plot]

        const visualSpy = vi.spyOn(game, "_applyPlotVisual").mockImplementation(() => { })

        game._handleHit("seed", mesh)

        expect(game.score).toBe(5)
        expect(hud.setScore).not.toHaveBeenCalled()
        expect(hud.message).toHaveBeenCalledWith("Ya hay una planta aquí", 800)
        expect(visualSpy).not.toHaveBeenCalled()
    })
})

describe("Minigame3Vicos – _handleHit: riego con agua y estados de la planta", () => {
    it("no permite regar una parcela sin semilla", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos", startingScore: 0 })
        game.isRunning = true

        const mesh = {}
        const plot = {
            mesh,
            baseMesh: {},
            state: "fertile",
            hasPlant: false,
            waterLevel: 0
        }
        game.plots = [plot]

        const visualSpy = vi.spyOn(game, "_applyPlotVisual").mockImplementation(() => { })

        game._handleHit("water", mesh)

        expect(plot.waterLevel).toBe(0)
        expect(game.score).toBe(0)
        expect(hud.message).toHaveBeenCalledWith("Debes plantar una semilla primero", 1000)
        expect(visualSpy).not.toHaveBeenCalled()
    })

    it("riego sucesivo cambia estados watered1 → watered2 → overwatered → excess", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos", startingScore: 0 })
        game.isRunning = true
        game.waterPoints = 8
        game.overwaterPenalty = 5

        const mesh = {}
        const plot = {
            mesh,
            baseMesh: {},
            state: "seeded",
            hasPlant: true,
            waterLevel: 0,
            isLocked: false
        }
        game.plots = [plot]

        const visualSpy = vi.spyOn(game, "_applyPlotVisual").mockImplementation(() => { })
        const spawnPlantSpy = vi.spyOn(game, "_spawnPlant").mockResolvedValue()
        const growPlantSpy = vi.spyOn(game, "_growPlant").mockImplementation(() => { })
        const wiltSpy = vi.spyOn(game, "_wiltPlant").mockImplementation(() => { })
        const wiltSevereSpy = vi.spyOn(game, "_wiltPlantSevere").mockImplementation(() => { })
        const spawnBatchSpy = vi.spyOn(game, "_spawnNextBatch").mockImplementation(() => { })

        // 1er riego: watered1
        game._handleHit("water", mesh)
        expect(plot.waterLevel).toBe(1)
        expect(plot.state).toBe("watered1")
        expect(game.score).toBe(8)
        expect(hud.setScore).toHaveBeenLastCalledWith(8)
        expect(hud.message).toHaveBeenLastCalledWith("💧 Riego perfecto", 800)
        expect(spawnPlantSpy).toHaveBeenCalledTimes(1)

        // 2do riego: watered2
        game._handleHit("water", mesh)
        expect(plot.waterLevel).toBe(2)
        expect(plot.state).toBe("watered2")
        expect(game.score).toBe(16)
        expect(hud.message).toHaveBeenLastCalledWith("💧💧 Planta muy saludable", 800)
        expect(growPlantSpy).toHaveBeenCalledTimes(1)

        // 3er riego: overwatered
        game._handleHit("water", mesh)
        expect(plot.waterLevel).toBe(3)
        expect(plot.state).toBe("overwatered")
        expect(game.score).toBe(11) // 16 - 5
        expect(hud.message).toHaveBeenLastCalledWith("⚠️ ¡Demasiada agua!", 1200)
        expect(wiltSpy).toHaveBeenCalledTimes(1)

        // 4to riego: excess (planta muerta)
        game._handleHit("water", mesh)
        expect(plot.waterLevel).toBe(4)
        expect(plot.state).toBe("excess")
        expect(plot.isLocked).toBe(true)
        expect(game.score).toBe(6) // 11 - 5
        expect(hud.message).toHaveBeenLastCalledWith("💀 ¡PLANTA AHOGADA! Parcela perdida", 2000)
        expect(wiltSevereSpy).toHaveBeenCalledTimes(1)

        // En varios puntos se puede haber llamado a _spawnNextBatch; aquí solo verificamos que no reviente
        expect(spawnBatchSpy).toHaveBeenCalled()
        expect(visualSpy).toHaveBeenCalled()
    })
})

describe("Minigame3Vicos – _getColorForState", () => {
    it("devuelve un Color3 específico según el estado y blanco por defecto", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos" })

        const dry = game._getColorForState("dry")
        const fertile = game._getColorForState("fertile")
        const seeded = game._getColorForState("seeded")
        const watered1 = game._getColorForState("watered1")
        const watered2 = game._getColorForState("watered2")
        const overwatered = game._getColorForState("overwatered")
        const excess = game._getColorForState("excess")
        const unknown = game._getColorForState("alguna-cosa-rara")

        // No revisamos valores exactos de floats, solo que sean objetos distintos
        expect(dry).not.toEqual(fertile)
        expect(fertile).not.toEqual(seedded => seeded)
        expect(overwatered).not.toEqual(excess)
        // Por defecto: blanco (1,1,1)
        expect(unknown.r).toBeCloseTo(1)
        expect(unknown.g).toBeCloseTo(1)
        expect(unknown.b).toBeCloseTo(1)
    })
})

describe("Minigame3Vicos – _getNextProjectileTypeWeighted", () => {
    it("si ninguna parcela necesita nada, devuelve 'seed' por defecto", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos" })

        // Todas infértiles o muertas
        game.plots = [
            { state: "dry", hasPlant: false },
            { state: "excess", hasPlant: true }
        ]

        const type = game._getNextProjectileTypeWeighted()
        expect(type).toBe("seed")
    })

    it("si solo necesitan agua, devuelve 'water'", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos" })

        game.plots = [
            { state: "watered1", hasPlant: true },   // necesita agua (no watered2)
            { state: "excess", hasPlant: true },     // descartada
        ]

        const type = game._getNextProjectileTypeWeighted()
        expect(type).toBe("water")
    })

    it("si solo necesitan semillas, devuelve 'seed'", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos" })

        game.plots = [
            { state: "fertile", hasPlant: false }, // necesita semilla
            { state: "fertile", hasPlant: false }, // también semilla
        ]

        const type = game._getNextProjectileTypeWeighted()
        expect(type).toBe("seed")
    })

    it("cuando necesitan ambos, elige según pesos (agua con el doble de peso)", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos" })

        // 1 parcela necesita semilla, 1 necesita agua
        game.plots = [
            { state: "fertile", hasPlant: false },     // needSeed = 1
            { state: "watered1", hasPlant: true }      // needWater = 1
        ]

        const randomSpy = vi.spyOn(Math, "random")

        // total = weightSeed(1) + weightWater(2) = 3
        // r = 0.1 -> 0.3 < 2 => "water"
        randomSpy.mockReturnValueOnce(0.1)
        let t1 = game._getNextProjectileTypeWeighted()
        expect(t1).toBe("water")

        // r = 0.9 -> 2.7 > 2 => "seed"
        randomSpy.mockReturnValueOnce(0.9)
        let t2 = game._getNextProjectileTypeWeighted()
        expect(t2).toBe("seed")

        randomSpy.mockRestore()
    })
})

describe("Minigame3Vicos – _onTimeUp, _restart, _endGame", () => {
    it("_onTimeUp detiene timer y muestra popup con onRetry/onContinue", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos", startingScore: 12 })
        game.score = 15

        game._onTimeUp()

        expect(hud.stopTimer).toHaveBeenCalled()
        expect(hud.showEndPopup).toHaveBeenCalledTimes(1)

        const popup = hud.showEndPopup.mock.calls[0][0]
        expect(popup.score).toBe(15)
        expect(typeof popup.onRetry).toBe("function")
        expect(typeof popup.onContinue).toBe("function")
        // En el código actual, timeExpired siempre es false aquí
        expect(popup.timeExpired).toBe(false)
    })

    it("_restart reinicia el score, llama a dispose y start", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos", startingScore: 5 })
        game.score = 20

        const disposeSpy = vi.spyOn(game, "dispose").mockImplementation(() => { })
        const startSpy = vi.spyOn(game, "start").mockResolvedValue()

        game._restart()

        expect(disposeSpy).toHaveBeenCalledTimes(1)
        expect(game.score).toBe(5)
        expect(hud.updateScore).toHaveBeenLastCalledWith(5)
        expect(hud.setScore).toHaveBeenLastCalledWith(5)
        expect(startSpy).toHaveBeenCalledTimes(1)
    })

    it("_endGame marca isRunning=false, elimina parcelas y llama onGameEnd", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Vicos({ scene, hud, experienceId: "vicos" })
        game.isRunning = true

        const mesh1 = { dispose: vi.fn() }
        const mesh2 = { dispose: vi.fn() }
        const base1 = { dispose: vi.fn() }
        const base2 = { dispose: vi.fn() }

        game.plots = [
            { mesh: mesh1, baseMesh: base1 },
            { mesh: mesh2, baseMesh: base2 }
        ]

        const endSpy = vi.fn()
        game.onGameEnd = endSpy

        game._endGame()

        expect(game.isRunning).toBe(false)
        expect(mesh1.dispose).toHaveBeenCalled()
        expect(mesh2.dispose).toHaveBeenCalled()
        expect(base1.dispose).toHaveBeenCalled()
        expect(base2.dispose).toHaveBeenCalled()
        expect(game.plots.length).toBe(0)
        expect(endSpy).toHaveBeenCalledTimes(1)
    })
})
