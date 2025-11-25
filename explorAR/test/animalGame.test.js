// test/animalGame.test.js
import { describe, it, expect, vi } from "vitest"
import { Color3 } from "@babylonjs/core"

// AJUSTA ESTA RUTA según tu proyecto
import { Minigame3Tambopata } from "../src/js/games/minigame3/Minigame3Tambopata.js"

// HUD falso
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
        getRemainingTime: vi.fn().mockReturnValue(0),
    }
}

// Scene falso (no usamos Babylon real aquí)
function createSceneMock() {
    return {
        meshes: [],
    }
}

// Helper compartido para luces
function createLightZone(state = "inactive") {
    const baseMat = { diffuseColor: new Color3(0.2, 0.2, 0.2) }
    const baseMesh = { material: baseMat }
    const texMesh = {}

    return {
        mesh: texMesh,
        baseMesh,
        baseMat,
        row: 0,
        col: 0,
        state,
    }
}

describe("Minigame3Tambopata – impactos a animales", () => {
    it("disparar a un animal resta lightPenalty y muestra mensaje de advertencia", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Tambopata({
            scene,
            hud,
            experienceId: "tambopata",
            startingScore: 20,
        })

        game.isRunning = true
        game.lightPenalty = 5
        game.score = 20

        const animalGround = {}
        game.currentAnimals = [
            {
                ground: animalGround,
                mesh: null,
            },
        ]

        game._handleHit("light_ball", animalGround)

        expect(game.score).toBe(15)
        expect(hud.setScore).toHaveBeenLastCalledWith(15)
        expect(hud.message).toHaveBeenCalledWith(
            "🐊 ¡No apuntes a los animales!",
            1000
        )
    })
})

describe("Minigame3Tambopata – impactos a luces (cambios de estado y puntaje)", () => {
    it("inactive → green1 suma lightBonus y cambia color base a verde", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Tambopata({
            scene,
            hud,
            experienceId: "tambopata",
            startingScore: 0,
        })

        game.isRunning = true
        game.lightBonus = 10
        game.lightPenalty = 5
        game.score = 0

        const luz = createLightZone("inactive")
        game.currentLightZones = [luz]

        // Disparo a la capa PNG
        game._handleHit("light_ball", luz.mesh)

        expect(luz.state).toBe("green1")
        expect(game.score).toBe(10)
        expect(hud.setScore).toHaveBeenLastCalledWith(10)

        // Color más tirando a verde
        expect(luz.baseMesh.material.diffuseColor.r).toBeCloseTo(0.6)
        expect(luz.baseMesh.material.diffuseColor.g).toBeCloseTo(1.0)
        expect(luz.baseMesh.material.diffuseColor.b).toBeCloseTo(0.2)
    })

    it("green1 → green2 vuelve a sumar lightBonus", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Tambopata({
            scene,
            hud,
            experienceId: "tambopata",
            startingScore: 0,
        })

        game.isRunning = true
        game.lightBonus = 10
        game.lightPenalty = 5
        game.score = 10

        const luz = createLightZone("green1")
        game.currentLightZones = [luz]

        game._handleHit("light_ball", luz.mesh)

        expect(luz.state).toBe("green2")
        expect(game.score).toBe(20)
        expect(hud.setScore).toHaveBeenLastCalledWith(20)
    })

    it("green2 → orange y orange → red aplican penalización", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Tambopata({
            scene,
            hud,
            experienceId: "tambopata",
            startingScore: 30,
        })

        game.isRunning = true
        game.lightBonus = 10
        game.lightPenalty = 5
        game.score = 30

        const luz = createLightZone("green2")
        game.currentLightZones = [luz]

        // green2 → orange
        game._handleHit("light_ball", luz.mesh)
        expect(luz.state).toBe("orange")
        expect(game.score).toBe(25)

        // orange → red
        game._handleHit("light_ball", luz.mesh)
        expect(luz.state).toBe("red")
        expect(game.score).toBe(20)
    })

    it("red mantiene estado y sigue penalizando en impactos posteriores", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Tambopata({
            scene,
            hud,
            experienceId: "tambopata",
            startingScore: 20,
        })

        game.isRunning = true
        game.lightPenalty = 5
        game.score = 20

        const luz = createLightZone("red")
        game.currentLightZones = [luz]

        game._handleHit("light_ball", luz.mesh)
        expect(luz.state).toBe("red")
        expect(game.score).toBe(15)

        game._handleHit("light_ball", luz.mesh)
        expect(luz.state).toBe("red")
        expect(game.score).toBe(10)
    })
})

describe("Minigame3Tambopata – completar todas las luces y bonus de tiempo", () => {
    it("cuando todas las luces están al menos en green2, aplica bonus y llama a _onTimeUp", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Tambopata({
            scene,
            hud,
            experienceId: "tambopata",
            startingScore: 0,
        })

        game.isRunning = true
        game.lightBonus = 10
        game.lightPenalty = 5
        game.timeBonusPerSec = 2
        game.score = 0

        // Luz 1 ya está en green2
        const luz1 = {
            ...createLightZone("green2"),
            state: "green2",
        }

        // Luz 2 en green1, va a pasar a green2 con un hit
        const luz2 = {
            ...createLightZone("green1"),
            state: "green1",
        }

        game.currentLightZones = [luz1, luz2]

        hud.getRemainingTime.mockReturnValue(5) // 5 segundos restantes

        const onTimeUpSpy = vi.spyOn(game, "_onTimeUp").mockImplementation(() => { })

        // Este impacto pasa luz2 de green1 → green2
        game._handleHit("light_ball", luz2.mesh)

        // Score: +10 por el impacto
        // Bonus: 5 * 2 = 10 → total 20
        expect(game.score).toBe(20)
        expect(hud.setScore).toHaveBeenLastCalledWith(20)
        expect(hud.message).toHaveBeenCalledWith(
            "✨ ¡Todas las luces completadas!",
            2000
        )
        expect(onTimeUpSpy).toHaveBeenCalledTimes(1)
    })
})

describe("Minigame3Tambopata – _updateAnimalLighting", () => {
    it("a más luces activas (green1/green2), más claro y con algo de emisivo", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Tambopata({
            scene,
            hud,
            experienceId: "tambopata",
            startingScore: 0,
        })

        const mat = {
            emissiveColor: new Color3(0, 0, 0),
            diffuseColor: new Color3(0.2, 0.2, 0.2),
        }

        const mesh = { material: mat }
        const root = {
            getChildMeshes: () => [mesh],
        }

        const luzA = { state: "green1" }
        const luzB = { state: "green2" }
        const luzC = { state: "inactive" }

        game.currentAnimals = [
            {
                mesh: root,
                lights: [luzA, luzB, luzC],
            },
        ]

        game._updateAnimalLighting()

        // Debe ser más claro que 0.2
        expect(mat.diffuseColor.r).toBeGreaterThan(0.2)
        expect(mat.diffuseColor.g).toBeGreaterThan(0.2)
        expect(mat.diffuseColor.b).toBeGreaterThan(0.2)

        // Algo de emisivo (> 0)
        expect(mat.emissiveColor.r).toBeGreaterThan(0)
    })
})

describe("Minigame3Tambopata – fin de partida", () => {
    it("_onTimeUp detiene timer y muestra popup con onRetry/onContinue", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Tambopata({
            scene,
            hud,
            experienceId: "tambopata",
            startingScore: 10,
        })

        game.score = 15

        game._onTimeUp()

        expect(hud.stopTimer).toHaveBeenCalled()
        expect(hud.showEndPopup).toHaveBeenCalledTimes(1)

        const popup = hud.showEndPopup.mock.calls[0][0]
        expect(popup.score).toBe(15)
        expect(typeof popup.onRetry).toBe("function")
        expect(typeof popup.onContinue).toBe("function")
        expect(popup.timeExpired).toBe(false)
    })

    it("_restart resetea score, llama a dispose y start", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Tambopata({
            scene,
            hud,
            experienceId: "tambopata",
            startingScore: 5,
        })

        game.score = 30

        const disposeSpy = vi.spyOn(game, "dispose").mockImplementation(() => { })
        const startSpy = vi.spyOn(game, "start").mockResolvedValue()

        game._restart()

        expect(disposeSpy).toHaveBeenCalledTimes(1)
        expect(game.score).toBe(5)
        expect(hud.setScore).toHaveBeenLastCalledWith(5)
        expect(startSpy).toHaveBeenCalledTimes(1)
    })

    it("_endGame marca isRunning=false, limpia y llama onGameEnd", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Tambopata({
            scene,
            hud,
            experienceId: "tambopata",
            startingScore: 0,
        })

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
