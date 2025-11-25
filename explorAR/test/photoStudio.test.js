// test/photoStudio.test.js
import { describe, it, expect, vi, beforeEach } from "vitest"

// IMPORTANTE: ajusta estas rutas según tu proyecto.
// 1) Mock de experiencesConfig (PhotoStudio la importa con esa ruta)
vi.mock("../../../config/experienceConfig.js", () => {
    return {
        experiencesConfig: [
            {
                id: "taquile",
                minigames: [
                    {
                        id: "photo",
                        params: {
                            star1: "basic",
                            star2: "mid",
                            star3: "pro",
                        },
                        assets: [
                            { key: "basic", type: "sticker", url: "/basic.png" },
                            { key: "mid", type: "sticker", url: "/mid.png" },
                            { key: "pro", type: "sticker", url: "/pro.png" },
                            { key: "other", type: "sticker", url: "/ignore.png" }, // no debería entrar
                            { key: "basic", type: "other", url: "/nope.png" }, // no es sticker
                        ],
                    },
                ],
            },
        ],
    }
})

// 2) Importar la clase real
//    Ajusta la ruta a donde tengas PhotoStudio.js
import { PhotoStudio } from "../src/js/game/photoStudio/PhotoStudio.js"

beforeEach(() => {
    // limpiar DOM y clases entre tests
    document.body.innerHTML = ""
    document.body.className = ""
})

describe("PhotoStudio – constructor (clamp de estrellas)", () => {
    it("clampa stars al rango [1..3]", () => {
        const s1 = new PhotoStudio({ stars: 0 })
        expect(s1.stars).toBe(1)

        const s2 = new PhotoStudio({ stars: 2 })
        expect(s2.stars).toBe(2)

        const s3 = new PhotoStudio({ stars: 5 })
        expect(s3.stars).toBe(3)

        const sDefault = new PhotoStudio({})
        expect(sDefault.stars).toBe(3)
    })
})

describe("PhotoStudio – _resolveStickersFromConfig", () => {
    it("para 1 estrella carga solo los stickers de star1", () => {
        const studio = new PhotoStudio({
            stars: 1,
            experienceId: "taquile",
        })

        studio._resolveStickersFromConfig()

        expect(studio.stickers.length).toBe(1)
        expect(studio.stickers[0].key).toBe("basic")
        expect(studio.stickers[0].url).toBe("/basic.png")
    })

    it("para 2 estrellas carga star1 + star2", () => {
        const studio = new PhotoStudio({
            stars: 2,
            experienceId: "taquile",
        })

        studio._resolveStickersFromConfig()

        const keys = studio.stickers.map((s) => s.key).sort()
        expect(keys).toEqual(["basic", "mid"])
    })

    it("para 3 estrellas carga star1 + star2 + star3", () => {
        const studio = new PhotoStudio({
            stars: 3,
            experienceId: "taquile",
        })

        studio._resolveStickersFromConfig()

        const keys = studio.stickers.map((s) => s.key).sort()
        expect(keys).toEqual(["basic", "mid", "pro"])
    })

    it("si no encuentra la experiencia, deja stickers en [] y no revienta", () => {
        const studio = new PhotoStudio({
            stars: 2,
            experienceId: "no-existe",
        })

        studio._resolveStickersFromConfig()

        expect(Array.isArray(studio.stickers)).toBe(true)
        expect(studio.stickers.length).toBe(0)
    })
})

describe("PhotoStudio – cleanup()", () => {
    it("llama a helpers, limpia estado, borra canvases grandes y ejecuta onExit", () => {
        const onExit = vi.fn()
        const studio = new PhotoStudio({
            stars: 2,
            experienceId: "taquile",
            onExit,
        })

        // Stub de métodos internos para no depender de cámara real ni overlay real
        studio._stopCamera = vi.fn()
        studio._removeOverlay = vi.fn()
        studio._removeStyles = vi.fn()

        // Estado interno simulado
        studio.activeStickerEl = {}
        studio.stickers = [{ key: "x", url: "/x.png" }]
        studio.stream = { getTracks: () => [{ stop: vi.fn() }] }
        studio.currentStickerIdx = 3

        // Clase en body
        document.body.classList.add("photo-mode")

        // Canvas grande (debe borrarse)
        const bigCanvas = document.createElement("canvas")
        bigCanvas.width = window.innerWidth * 0.9
        bigCanvas.height = window.innerHeight * 0.9
        document.body.appendChild(bigCanvas)

        // Canvas pequeño (no debe borrarse)
        const smallCanvas = document.createElement("canvas")
        smallCanvas.width = 100
        smallCanvas.height = 100
        document.body.appendChild(smallCanvas)

        studio.cleanup()

        // Helpers internos llamados
        expect(studio._stopCamera).toHaveBeenCalled()
        expect(studio._removeOverlay).toHaveBeenCalled()
        expect(studio._removeStyles).toHaveBeenCalled()

        // Clase de body eliminada
        expect(document.body.classList.contains("photo-mode")).toBe(false)

        // Estado reseteado
        expect(studio.activeStickerEl).toBeNull()
        expect(studio.stickers).toEqual([])
        expect(studio.stream).toBeNull()
        expect(studio.currentStickerIdx).toBe(0)

        // Solo queda el canvas pequeño
        const canvases = Array.from(document.querySelectorAll("canvas"))
        expect(canvases.length).toBe(1)
        expect(canvases[0]).toBe(smallCanvas)

        // Callback de salida ejecutado
        expect(onExit).toHaveBeenCalledTimes(1)
    })
})
