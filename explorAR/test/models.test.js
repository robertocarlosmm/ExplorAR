// test/models.test.js
import { describe, it, expect } from "vitest"

// AJUSTA ESTAS RUTAS SEGÚN TU PROYECTO
// Si tus archivos están en src/models y src/core, esto debería funcionar.
// Si no, cambia ../src/... por la ruta correcta.
import { Experience } from "../src/js/models/Experience.js"
import { Player } from "../src/js/models/Player.js"
import { ExperienceResult } from "../src/js/models/ExperienceResult.js"
import { Game } from "../src/js/core/Game.js"

// ---------------------------------------------------------------------------
// EXPERIENCE: solo lo que se usa (constructor + getNextMinigameId)
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
// PLAYER + EXPERIENCE RESULT: solo el mapa experienciaId → resultado
// ---------------------------------------------------------------------------

describe("Player y ExperienceResult (mapa de resultados por experiencia)", () => {
    it("setExperienceResult y getExperienceResult guardan y devuelven el resultado", () => {
        const player = new Player()
        const result = new ExperienceResult("taquile")

        // Al inicio no hay resultado
        expect(player.getExperienceResult("taquile")).toBeNull()

        // Guardar y recuperar
        player.setExperienceResult("taquile", result)
        const stored = player.getExperienceResult("taquile")

        expect(stored).toBe(result)
        expect(stored.experienceId).toBe("taquile")
    })

    it("updateResult acumula score en ExperienceResult", () => {
        const result = new ExperienceResult("taquile")

        // IMPORTANTE:
        // Estas llamadas van a ejecutar finalize().
        // Si en tu código aún tienes `const thresholds = 350;`
        // en ExperienceResult.finalize(), las pruebas van a fallar
        // con un error de tipo. En ese caso, corrige esa parte.
        result.updateResult(100)
        result.updateResult(50)

        expect(result.score).toBe(150)
        // No comprobamos el número exacto de estrellas porque depende
        // de los umbrales que tú definas, solo que sea un número válido.
        expect(typeof result.stars).toBe("number")
        expect(result.stars).toBeGreaterThanOrEqual(0)
        expect(result.stars).toBeLessThanOrEqual(3)
    })
})

// ---------------------------------------------------------------------------
// GAME: selectExperience + completeMinigame (lo que usa main/puzzleLauncher)
// ---------------------------------------------------------------------------

describe("Game (selección de experiencia y acumulación de score)", () => {
    // Dos experiencias sencillas, sin minijuegos porque aquí
    // solo probamos la lógica de modelo.
    const experiences = [
        new Experience("taquile", "Taquile", "/img/t.png", null, "desc", []),
        new Experience("vicos", "Vicos", "/img/v.png", null, "desc", []),
    ]

    it("selectExperience cambia currentExperience y crea ExperienceResult si no existía", () => {
        const game = new Game(experiences)

        // Antes de seleccionar no hay experiencia activa
        expect(game.currentExperience).toBeNull()

        const selected = game.selectExperience("taquile")

        // Devuelve la experiencia correcta
        expect(selected).not.toBeNull()
        expect(selected.id).toBe("taquile")

        // currentExperience apunta a la misma instancia
        expect(game.currentExperience).toBe(selected)

        // Se creó un ExperienceResult asociado en el Player
        const result = game.player.getExperienceResult("taquile")
        expect(result).not.toBeNull()
        expect(result).toBeInstanceOf(ExperienceResult)
        expect(result.score).toBe(0)
    })

    it("selectExperience devuelve null si el id no existe y no cambia currentExperience", () => {
        const game = new Game(experiences)

        const res = game.selectExperience("no-existe")
        expect(res).toBeNull()
        expect(game.currentExperience).toBeNull()
    })

    it("completeMinigame acumula score en la experiencia actual", () => {
        const game = new Game(experiences)

        // Seleccionamos Vicos como experiencia actual
        game.selectExperience("vicos")

        // Simulamos dos minijuegos que dan 80 y 40 puntos
        game.completeMinigame(80)
        game.completeMinigame(40)

        const result = game.player.getExperienceResult("vicos")
        expect(result).not.toBeNull()
        expect(result.score).toBe(120) // 80 + 40
    })

    it("completeMinigame no revienta si no hay currentExperience", () => {
        const game = new Game(experiences)

        // No debería lanzar excepción aunque no haya experiencia seleccionada
        expect(() => game.completeMinigame(100)).not.toThrow()

        // Y no debe haberse creado ningún resultado
        expect(game.player.getExperienceResult("taquile")).toBeNull()
        expect(game.player.getExperienceResult("vicos")).toBeNull()
    })
})
