import { describe, it, expect, vi } from "vitest"
import { Vector3 } from "@babylonjs/core"
import { PuzzleGame } from "../src/js/games/minigame1/PuzzleGame.js"

function createHudMock() {
    return {
        setScore: vi.fn(),
        setTime: vi.fn(),
        startTimer: vi.fn(),
        stopTimer: vi.fn(),
        clearPanel: vi.fn(),
        message: vi.fn(),
        showEndPopup: vi.fn(),
        _timeLeft: 0
    }
}

describe("PuzzleGame – lógica de encaje de piezas", () => {
    it("encaje correcto: bloquea la pieza, ocupa el slot y suma puntos", () => {
        const hud = createHudMock()
        const game = new PuzzleGame({ scene: null, hud, grid: 3, imageUrl: null })

        // Configuramos un solo slot en (0,0)
        game._anchorY = 0
        game.slots = [{ index: 0, center: new Vector3(0, 0, 0) }]
        game.slotOccupant = [null]

        // Forzamos bonus conocido
        game.bonusPerPiece = 10

        // Pieza que tiene como correcto el slot 0
        const pieceObj = {
            mesh: {
                name: "piece-0",
                position: new Vector3(1, 0, 1), // se corregirá al centro del slot
                isPickable: true
            },
            startPos: new Vector3(5, 0, 0),
            slotIndex: null,
            correctIndex: 0,
            locked: false
        }
        game.pieces = [pieceObj]

        // Posición local cerca del centro del slot 0
        const localPos = new Vector3(0.05, 0, 0.05)
        const threshold = 0.5

        game._trySnap(pieceObj, localPos, threshold)

        // Debe haberse colocado en el slot correcto
        expect(pieceObj.slotIndex).toBe(0)
        expect(pieceObj.locked).toBe(true)
        expect(game.slotOccupant[0]).toBe(pieceObj.mesh)

        // Score actualizado
        expect(game.score).toBe(10)
        expect(hud.setScore).toHaveBeenLastCalledWith(10)

        // Mensaje de acierto
        expect(hud.message).toHaveBeenCalledWith("¡Correcto!", 600)
    })

    it("encaje en slot equivocado: NO bloquea y aplica penalización", () => {
        const hud = createHudMock()
        const game = new PuzzleGame({ scene: null, hud, grid: 3, imageUrl: null })

        // Dos slots: 0 y 1
        game._anchorY = 0
        game.slots = [
            { index: 0, center: new Vector3(0, 0, 0) },
            { index: 1, center: new Vector3(1, 0, 0) }
        ]
        game.slotOccupant = [null, null]

        // Score inicial
        game.score = 20
        game.penaltyPoitns = 5 

        // Pieza cuyo slot correcto es el 1, pero caerá cerca del 0
        const pieceObj = {
            mesh: {
                name: "piece-1",
                position: new Vector3(),
                isPickable: true
            },
            startPos: new Vector3(2, 0, 0),
            slotIndex: null,
            correctIndex: 1,
            locked: false
        }
        game.pieces = [pieceObj]

        const localPos = new Vector3(0.02, 0, 0.01) // cerca del slot 0
        const threshold = 0.5

        game._trySnap(pieceObj, localPos, threshold)

        // Se encaja en el slot 0, pero es incorrecto
        expect(pieceObj.slotIndex).toBe(0)
        expect(pieceObj.locked).toBe(false)
        expect(game.slotOccupant[0]).toBe(pieceObj.mesh)

        // Score con penalización
        expect(game.score).toBe(15) // 20 - 5
        expect(hud.setScore).toHaveBeenLastCalledWith(15)

        // Mensaje de "Encajó, pero..."
        expect(hud.message).toHaveBeenCalledWith(
            "Encajó, pero no es el lugar correcto",
            600
        )
    })

    it("no encaja: vuelve a la posición inicial y no cambia score", () => {
        const hud = createHudMock()
        const game = new PuzzleGame({ scene: null, hud, grid: 3, imageUrl: null })

        game._anchorY = 0
        game.slots = [{ index: 0, center: new Vector3(0, 0, 0) }]
        game.slotOccupant = [null]
        game.score = 7

        const startPos = new Vector3(5, 0, 0)
        const pieceObj = {
            mesh: {
                name: "piece-0",
                position: startPos.clone(),
                isPickable: true
            },
            startPos: startPos.clone(),
            slotIndex: null,
            correctIndex: 0,
            locked: false
        }
        game.pieces = [pieceObj]

        const farPos = new Vector3(10, 0, 10) // demasiado lejos
        const threshold = 0.5

        game._trySnap(pieceObj, farPos, threshold)

        // No se asigna slot
        expect(pieceObj.slotIndex).toBeNull()
        // Vuelve exactamente al startPos
        expect(pieceObj.mesh.position.equals(startPos)).toBe(true)

        // Score intacto
        expect(game.score).toBe(7)
        expect(hud.setScore).not.toHaveBeenCalled()

        // Mensaje de "No encajó"
        expect(hud.message).toHaveBeenCalledWith("No encajó", 600)
    })
})

describe("PuzzleGame – detección de puzzle completo y victoria", () => {
    it("_checkCompletion llama a _onWin, aplica bonus de tiempo y dispara onGameEnd", () => {
        const hud = createHudMock()
        hud._timeLeft = 10 // 10 segundos restantes

        const game = new PuzzleGame({ scene: null, hud, grid: 3, imageUrl: null })

        // Score inicial y bonus por tiempo
        game.score = 50
        game.bonusTime = 2 // 2 puntos por segundo

        // Piezas ya bloqueadas (puzzle completado)
        game.pieces = [
            {
                mesh: { position: new Vector3(0, 0, 0) },
                locked: true
            },
            {
                mesh: { position: new Vector3(1, 0, 0) },
                locked: true
            }
        ]

        // onGameEnd mock para comprobar que se dispara desde onContinue
        const onGameEnd = vi.fn()
        game.onGameEnd = onGameEnd

        let popupConfig = null
        hud.showEndPopup = vi.fn((cfg) => {
            popupConfig = cfg
        })

        game._checkCompletion()

        // Debe haberse completado
        expect(game.isCompleted).toBe(true)
        expect(hud.stopTimer).toHaveBeenCalled()

        // Score final con bonus: 50 + (10 * 2) = 70
        expect(game.score).toBe(70)
        expect(hud.setScore).toHaveBeenLastCalledWith(70)

        // showEndPopup llamado con los datos correctos
        expect(hud.showEndPopup).toHaveBeenCalledTimes(1)
        expect(popupConfig).not.toBeNull()
        expect(popupConfig.score).toBe(70)
        expect(popupConfig.timeExpired).toBe(false)

        // Si el jugador elige continuar, debe ejecutarse onGameEnd
        popupConfig.onContinue()
        expect(onGameEnd).toHaveBeenCalledTimes(1)
    })
})
