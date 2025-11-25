// test/models.test.js
import { describe, it, expect } from "vitest"

// Modelos reales del proyecto
import { Experience } from "../src/js/models/Experience.js"
import { ExperienceResult } from "../src/js/models/ExperienceResult.js"
import { Game } from "../src/js/core/Game.js"

// ---------------------------------------------------------------------------
// EXPERIENCE: constructor + getNextMinigameId
// ---------------------------------------------------------------------------

describe("Experience (modelo de experiencia usado en main/puzzleLauncher)", () => {
    const minigamesConfig = [
        { id: "minigame1", type: "puzzle" },
        { id: "minigame2", type: "equipment" },
    ]

    const exp = new Experience(
        "taquile",
        "Isla de Taquile",
        "/img/taquile.png",
        null,
        "Descripción de prueba",
        minigamesConfig
    )

    it("construye la experiencia con el arreglo de minijuegos", () => {
        // Datos básicos
        expect(exp.id).toBe("taquile")
        expect(exp.name).toBe("Isla de Taquile")
        expect(exp.imagePath).toBe("/img/taquile.png")

        // Minijuegos mapeados correctamente
        expect(Array.isArray(exp.minigames)).toBe(true)
        expect(exp.minigames.length).toBe(2)
        expect(exp.minigames[0].id).toBe("minigame1")
        expect(exp.minigames[0].type).toBe("puzzle")
        expect(exp.minigames[1].id).toBe("minigame2")
        expect(exp.minigames[1].type).toBe("equipment")
    })

    it("getNextMinigameId devuelve el siguiente id cuando existe", () => {
        const next = exp.getNextMinigameId("minigame1")
        expect(next).toBe("minigame2")
    })

    it("getNextMinigameId devuelve null cuando es el último o el id no existe", () => {
        expect(exp.getNextMinigameId("minigame2")).toBeNull()
        expect(exp.getNextMinigameId("no-existe")).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// EXPERIENCE RESULT: acumulación de score
// ---------------------------------------------------------------------------

describe("ExperienceResult (acumulación de score por experiencia)", () => {
    it("inicializa con score y stars en 0", () => {
        const result = new ExperienceResult("taquile")
        expect(result.experienceId).toBe("taquile")
        expect(result.score).toBe(0)
        expect(result.stars).toBe(0)
    })

    it("addScore suma puntaje de forma acumulativa", () => {
        const result = new ExperienceResult("taquile")

        result.addScore(100)
        result.addScore(50)

        expect(result.score).toBe(150)
    })

    it("updateResult acumula score y recalcula estrellas sin reventar", () => {
        const result = new ExperienceResult("taquile")

        // Estas llamadas ejecutan finalize() internamente.
        // Asegúrate de que ExperienceResult.finalize() use umbrales válidos.
        result.updateResult(80)
        result.updateResult(70)

        expect(result.score).toBe(150)
        expect(typeof result.stars).toBe("number")
        expect(result.stars).toBeGreaterThanOrEqual(0)
        expect(result.stars).toBeLessThanOrEqual(3)
    })
})

// ---------------------------------------------------------------------------
// GAME: selectExperience (lo que hace la clase actual)
// ---------------------------------------------------------------------------

describe("Game (selección de experiencia)", () => {
    const experiences = [
        new Experience("taquile", "Taquile", "/img/t.png", null, "desc", []),
        new Experience("vicos", "Vicos", "/img/v.png", null, "desc", []),
    ]

    it("selectExperience cambia currentExperience y devuelve la experiencia", () => {
        const game = new Game(experiences)

        // Antes de seleccionar no hay experiencia activa
        expect(game.currentExperience).toBeNull()

        const selected = game.selectExperience("taquile")

        // Devuelve la experiencia correcta
        expect(selected).not.toBeNull()
        expect(selected.id).toBe("taquile")

        // currentExperience apunta a la misma instancia
        expect(game.currentExperience).toBe(selected)
    })

    it("selectExperience devuelve null si el id no existe y no cambia currentExperience", () => {
        const game = new Game(experiences)

        const res = game.selectExperience("no-existe")
        expect(res).toBeNull()
        expect(game.currentExperience).toBeNull()
    })
})
