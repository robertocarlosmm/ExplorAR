// test/equipmentGame.test.js
import { describe, it, expect, vi } from "vitest"
import { Vector3, Color3 } from "@babylonjs/core"
import { EquipmentGame } from "../src/js/games/minigame2/EquipmentGame.js"
import { gameplayConfig } from "../src/config/gameplayConfig.js"

function createHudMock() {
    return {
        setScore: vi.fn(),
        setTime: vi.fn(),
        startTimer: vi.fn(),
        stopTimer: vi.fn(),
        showEndPopup: vi.fn(),
        showHintPopup: vi.fn(),
        _timeLeft: 0
    }
}

function createSceneMock() {
    return {
        meshes: [],
        beginAnimation: vi.fn(),
        getMeshByName: vi.fn(),
        onBeforeRenderObservable: {
            add: vi.fn()
        }
    }
}

describe("EquipmentGame – _nearestSlot2D", () => {
    it("devuelve el slot más cercano dentro del threshold", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const game = new EquipmentGame({
            scene,
            hud,
            correctKeys: [],
            incorrectKeys: [],
            feedbacks: {},
            assetMap: {},
            experienceId: "exp1"
        })

        const slotA = {
            position: new Vector3(0, 0, 0),
            occupant: null
        }
        const slotB = {
            position: new Vector3(1, 0, 0),
            occupant: null
        }
        game.slots = [slotA, slotB]

        const posCercaDeA = new Vector3(0.05, 0.03, 0)
        const posLejos = new Vector3(5, 5, 0)

        const found = game._nearestSlot2D(posCercaDeA, 0.3)
        expect(found).toBe(slotA)

        const none = game._nearestSlot2D(posLejos, 0.3)
        expect(none).toBeNull()
    })

    it("no devuelve slots ya ocupados", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new EquipmentGame({
            scene,
            hud,
            correctKeys: [],
            incorrectKeys: [],
            feedbacks: {},
            assetMap: {},
            experienceId: "exp1"
        })

        const slotA = {
            position: new Vector3(0, 0, 0),
            occupant: {} // ocupado
        }
        const slotB = {
            position: new Vector3(0.2, 0, 0),
            occupant: null
        }
        game.slots = [slotA, slotB]

        const pos = new Vector3(0.05, 0, 0)
        const found = game._nearestSlot2D(pos, 0.3)
        expect(found).toBe(slotB)
    })
})

describe("EquipmentGame – _evaluate (resultado de elección de equipamiento)", () => {
    it("si no faltan correctos llama a _win y NO muestra pistas", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const feedbacks = {
            agua: "Lleva agua adicional"
        }

        const game = new EquipmentGame({
            scene,
            hud,
            correctKeys: ["agua"],
            incorrectKeys: [],
            feedbacks,
            assetMap: {},
            experienceId: "exp1"
        })

        // Simulamos 1 slot con un ítem correcto colocado
        const correctMesh = {
            metadata: {
                key: "agua",
                correct: true
            },
            material: { diffuseColor: new Color3(1, 1, 1) }
        }

        game.slots = [
            { occupant: correctMesh, mesh: { material: { diffuseColor: new Color3(1, 1, 1) } } }
        ]

        // Espiamos _win
        const winSpy = vi.spyOn(game, "_win").mockImplementation(() => { })

        game._evaluate()

        expect(hud.stopTimer).toHaveBeenCalled()
        expect(winSpy).toHaveBeenCalledTimes(1)
        expect(hud.showHintPopup).not.toHaveBeenCalled()
    })

    it("si faltan ítems correctos muestra showHintPopup y NO llama a _win", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const feedbacks = {
            agua: "Lleva agua adicional",
            botas: "Usa botas adecuadas"
        }

        const game = new EquipmentGame({
            scene,
            hud,
            correctKeys: ["agua", "botas"],
            incorrectKeys: [],
            feedbacks,
            assetMap: {},
            experienceId: "exp1"
        })

        // Solo hemos elegido "agua" correctamente; "botas" falta
        const aguaMesh = {
            metadata: {
                key: "agua",
                correct: true
            },
            material: { diffuseColor: new Color3(1, 1, 1) }
        }

        game.slots = [
            { occupant: aguaMesh, mesh: { material: { diffuseColor: new Color3(1, 1, 1) } } },
            { occupant: null, mesh: { material: { diffuseColor: new Color3(1, 1, 1) } } }
        ]

        const winSpy = vi.spyOn(game, "_win").mockImplementation(() => { })

        game._evaluate()

        expect(hud.stopTimer).toHaveBeenCalled()
        expect(winSpy).not.toHaveBeenCalled()
        expect(hud.showHintPopup).toHaveBeenCalledTimes(1)

        const popupConfig = hud.showHintPopup.mock.calls[0][0]
        expect(popupConfig.title).toBe("¡ATENCIÓN!")
        // Debe haber por lo menos una pista asociada a "botas"
        expect(popupConfig.hints.some(h => h.includes("botas") || h.includes("Usa botas"))).toBe(true)
    })
})

describe("EquipmentGame – _win (cálculo de puntaje y popup final)", () => {
    it("aplica base + tiempo restante * bonus y muestra popup final", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        // Configuración real (ajusta si cambias gameplayConfig)
        const base = Number(gameplayConfig.scoring.equipment.base ?? 60)
        const bonus = Number(gameplayConfig.scoring.equipment.timeBonusPerSec ?? 2)

        const startingScore = 10
        const remaining = 8 // segundos
        hud._timeLeft = remaining

        const game = new EquipmentGame({
            scene,
            hud,
            correctKeys: [],
            incorrectKeys: [],
            feedbacks: {},
            assetMap: {},
            experienceId: "exp1",
            startingScore
        })

        game.score = startingScore

        game._win()

        expect(hud.stopTimer).toHaveBeenCalled()

        const expectedNewPoints = Math.floor(base + remaining * bonus)
        const expectedTotal = startingScore + expectedNewPoints

        expect(game.score).toBe(expectedTotal)
        expect(hud.setScore).toHaveBeenLastCalledWith(expectedTotal)

        // showEndPopup debe haberse llamado con score y callbacks
        expect(hud.showEndPopup).toHaveBeenCalledTimes(1)
        const popup = hud.showEndPopup.mock.calls[0][0]
        expect(popup.score).toBe(expectedTotal)
        expect(typeof popup.onRetry).toBe("function")
        expect(typeof popup.onContinue).toBe("function")
        expect(popup.timeExpired).toBe(false)
    })
})

describe("EquipmentGame – _onTimeUp (tiempo agotado)", () => {
    it("detiene el timer y muestra popup de tiempo agotado", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const game = new EquipmentGame({
            scene,
            hud,
            correctKeys: [],
            incorrectKeys: [],
            feedbacks: {},
            assetMap: {},
            experienceId: "exp1"
        })

        game._onTimeUp()

        expect(hud.stopTimer).toHaveBeenCalled()
        expect(hud.showEndPopup).toHaveBeenCalledTimes(1)

        const popup = hud.showEndPopup.mock.calls[0][0]
        expect(popup.score).toBe(game.score)
        expect(typeof popup.onRetry).toBe("function")
        expect(popup.onContinue).toBeNull()
        expect(popup.timeExpired).toBe(true)
    })
})
