import { describe, it, expect, vi } from "vitest"
import { Minigame3Lucumo } from "../src/js/games/minigame3/Minigame3Lucumo.js"

function createHudMock() {
    return {
        show: vi.fn(),
        startTimer: vi.fn(),
        stopTimer: vi.fn(),
        setScore: vi.fn(),
        updateScore: vi.fn(),
        getRemainingTime: vi.fn().mockReturnValue(0),
        showEndPopup: vi.fn()
    }
}

function createSceneMock() {
    return {
        meshes: [],
        onPointerObservable: {
            add: vi.fn(),
            remove: vi.fn()
        }
    }
}

describe("Minigame3Lucumo – _decideNextProjectileType", () => {
    it("si no hay currentPath o bots, devuelve 'derecha' por defecto", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo" })

        game.currentPath = null
        game.bots = []
        expect(game._decideNextProjectileType()).toBe("derecha")

        game.currentPath = [[0, 0], [0, 0]]
        expect(game._decideNextProjectileType()).toBe("derecha")
    })

    it("bot completamente a la izquierda del tramo de camino → 'derecha'", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo" })

        game.gridSize = 5
        game.currentPath = [
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0], // fila 1: camino de col 1 a 3
            [0, 0, 0, 0, 0]
        ]

        game.bots = [
            { row: 1, col: 0, isMoving: false } // totalmente a la izquierda
        ]

        const type = game._decideNextProjectileType()
        expect(type).toBe("derecha")
    })

    it("bot completamente a la derecha del tramo de camino → 'izquierda'", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo" })

        game.gridSize = 5
        game.currentPath = [
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0], // camino en 1–3
            [0, 0, 0, 0, 0]
        ]

        game.bots = [
            { row: 1, col: 4, isMoving: false } // totalmente a la derecha
        ]

        const type = game._decideNextProjectileType()
        expect(type).toBe("izquierda")
    })

    it("bot dentro de la fila pero fuera del camino decide hacia el borde más cercano", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo" })

        game.gridSize = 7
        // camino entre col 2 y 4
        game.currentPath = [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0]
        ]

        // caso 1: más cerca del borde izquierdo del CAMINO -> derecha
        game.bots = [{ row: 1, col: 1, isMoving: false }]
        let type = game._decideNextProjectileType()
        expect(type).toBe("derecha")

        // caso 2: más cerca del borde derecho del CAMINO -> izquierda
        game.bots = [{ row: 1, col: 5, isMoving: false }]
        type = game._decideNextProjectileType()
        expect(type).toBe("izquierda")

    })

    it("si el bot ya está sobre el camino, no se considera candidato y devuelve 'derecha' si no hay otros", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo" })

        game.gridSize = 5
        game.currentPath = [
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 0, 0, 0, 0]
        ]

        game.bots = [
            { row: 1, col: 2, isMoving: false } // en el camino
        ]

        const type = game._decideNextProjectileType()
        expect(type).toBe("derecha")
    })
})

describe("Minigame3Lucumo – _botAt y _pickCellsNoRepeatRow", () => {
    it("_botAt detecta si hay bot en una celda", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo" })

        game.bots = [
            { row: 2, col: 3 },
            { row: 4, col: 1 }
        ]

        expect(game._botAt(2, 3)).toBe(true)
        expect(game._botAt(4, 1)).toBe(true)
        expect(game._botAt(0, 0)).toBe(false)
    })

    it("_pickCellsNoRepeatRow devuelve como máximo k celdas y sin repetir fila", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo" })

        const cells = [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 1, col: 2 },
            { row: 2, col: 3 },
            { row: 2, col: 4 }
        ]

        // Evitamos el azar aquí
        game._shuffleInPlace = (arr) => arr

        const res = game._pickCellsNoRepeatRow(cells, 3)
        expect(res.length).toBeLessThanOrEqual(3)

        const rows = res.map(c => c.row)
        const uniqueRows = new Set(rows)
        expect(uniqueRows.size).toBe(rows.length)
    })
})

describe("Minigame3Lucumo – _handleProjectileHit (movimiento y scoring)", () => {
    it("mueve el bot una columna, sin sumar puntos si no cae en el camino", async () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo", startingScore: 0 })

        game.isRunning = true
        game.gridSize = 5
        game.score = 10
        game.completeBonus = 5

        // camino en fila 1 col 2–3
        game.currentPath = [
            [0, 0, 0, 0, 0],
            [0, 0, 1, 1, 0],
            [0, 0, 0, 0, 0]
        ]

        // grid con info mínima
        game.grid = []
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 5; c++) {
                game.grid.push({ row: r, col: c, pos: { x: 0, z: 0 } })
            }
        }

        const bot = {
            root: {}, ags: [],
            row: 1, col: 0,
            isMoving: false,
            hasReturned: false
        }
        game.bots = [bot]

        // stub: encontrar bot a partir del mesh golpeado
        vi.spyOn(game, "_findBotByPickedMesh").mockReturnValue(bot)
        // stub: mover bot inmediatamente a la celda destino
        game._moveBotToCell = vi.fn((b, targetCell) => {
            b.row = targetCell.row
            b.col = targetCell.col
            return Promise.resolve()
        })

        const targetMesh = {} // no importa, se ignora por el stub
        game._handleProjectileHit("derecha", targetMesh)

        // esperar a que se resuelva el .then del move
        await Promise.resolve()

        // Ahora el bot está en col 1, que NO es camino en currentPath
        expect(bot.col).toBe(1)
        expect(game.score).toBe(10)
        expect(hud.setScore).not.toHaveBeenCalled()
    })

    it("cuando el bot entra al camino suma completeBonus solo la primera vez", async () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo", startingScore: 0 })

        game.isRunning = true
        game.gridSize = 5
        game.score = 0
        game.completeBonus = 7

        // camino en col 2–3
        game.currentPath = [
            [0, 0, 0, 0, 0],
            [0, 0, 1, 1, 0],
            [0, 0, 0, 0, 0]
        ]

        game.grid = []
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 5; c++) {
                game.grid.push({ row: r, col: c, pos: { x: 0, z: 0 } })
            }
        }

        const bot = {
            root: {}, ags: [],
            row: 1, col: 1,
            isMoving: false,
            hasReturned: false
        }
        game.bots = [bot]

        vi.spyOn(game, "_findBotByPickedMesh").mockReturnValue(bot)
        game._moveBotToCell = vi.fn((b, targetCell) => {
            b.row = targetCell.row
            b.col = targetCell.col
            return Promise.resolve()
        })

        const finishSpy = vi.spyOn(game, "_finishGameEarly").mockImplementation(() => { })

        // Primer hit: lo manda a col 2, que sí es camino
        game._handleProjectileHit("derecha", {})
        await Promise.resolve()

        expect(bot.col).toBe(2)
        expect(bot.hasReturned).toBe(true)
        expect(game.score).toBe(7)
        expect(hud.setScore).toHaveBeenLastCalledWith(7)
        expect(hud.showEndPopup).not.toHaveBeenCalled()
        expect(finishSpy).toHaveBeenCalledTimes(1) // todos los bots están en el camino (solo hay uno)

        // Segundo hit sobre el mismo bot ya en el camino NO debe volver a sumar
        game._handleProjectileHit("derecha", {})
        await Promise.resolve()

        expect(game.score).toBe(7) // sigue igual
    })
})

describe("Minigame3Lucumo – _finishGameEarly", () => {
    it("aplica bonus de tiempo, detiene timer y muestra popup final", () => {
        const hud = createHudMock()
        const scene = createSceneMock()
        hud.getRemainingTime.mockReturnValue(10) // 10 segundos restantes

        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo", startingScore: 20 })
        game.score = 20
        game.timeBonusPerSec = 2 // 2 puntos por segundo
        game.isRunning = true
        game.finished = false

        game._finishGameEarly()

        expect(game.finished).toBe(true)
        expect(game.isRunning).toBe(false)

        const expectedBonus = 10 * 2
        const expectedScore = 20 + expectedBonus

        expect(game.score).toBe(expectedScore)
        expect(hud.stopTimer).toHaveBeenCalled()
        expect(hud.setScore).toHaveBeenLastCalledWith(expectedScore)
        expect(hud.showEndPopup).toHaveBeenCalledTimes(1)

        const popup = hud.showEndPopup.mock.calls[0][0]
        expect(popup.score).toBe(expectedScore)
        expect(typeof popup.onRetry).toBe("function")
        expect(typeof popup.onContinue).toBe("function")
        expect(popup.timeExpired).toBe(false)
    })
})

describe("Minigame3Lucumo – _onTimeUp, _restart, _endGame", () => {
    it("_onTimeUp detiene timer y muestra popup de fin por tiempo", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo", startingScore: 5 })
        game.score = 9
        game.finished = false
        game.isRunning = true

        game._onTimeUp()

        expect(game.finished).toBe(true)
        expect(game.isRunning).toBe(false)
        expect(hud.stopTimer).toHaveBeenCalled()
        expect(hud.showEndPopup).toHaveBeenCalledTimes(1)

        const popup = hud.showEndPopup.mock.calls[0][0]
        expect(popup.score).toBe(9)
        expect(typeof popup.onRetry).toBe("function")
        expect(typeof popup.onContinue).toBe("function")
        expect(popup.timeExpired).toBe(false)
    })

    it("_restart reinicia score, llama a dispose y start", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo", startingScore: 3 })
        game.score = 15

        const disposeSpy = vi.spyOn(game, "dispose").mockImplementation(() => { })
        const startSpy = vi.spyOn(game, "start").mockResolvedValue()

        game._restart()

        expect(disposeSpy).toHaveBeenCalledTimes(1)
        expect(game.score).toBe(3)
        expect(hud.updateScore).toHaveBeenLastCalledWith(3)
        expect(hud.setScore).toHaveBeenLastCalledWith(3)
        expect(startSpy).toHaveBeenCalledTimes(1)
    })

    it("_endGame marca isRunning=false y dispara onGameEnd", () => {
        const hud = createHudMock()
        const scene = createSceneMock()

        const game = new Minigame3Lucumo({ scene, hud, experienceId: "lucumo", startingScore: 0 })
        game.isRunning = true
        const endSpy = vi.fn()
        game.onGameEnd = endSpy

        game._endGame()

        expect(game.isRunning).toBe(false)
        expect(endSpy).toHaveBeenCalledTimes(1)
    })
})
