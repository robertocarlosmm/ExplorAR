import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder } from "@babylonjs/core"
import "@babylonjs/core/XR"   // activa soporte WebXR
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience.js"

export class XRSession {
    constructor() {
        this.engine = null
        this.scene = null
        this.canvas = null
        this.xrHelper = null
    }

    async init(containerId, titleText) {
        // 1. Crear canvas dinámico
        this.canvas = document.createElement("canvas")
        this.canvas.id = "renderCanvas"
        this.canvas.style.width = "100%"
        this.canvas.style.height = "100%"
        document.getElementById(containerId).appendChild(this.canvas)

        // 2. Crear motor y escena
        this.engine = new Engine(this.canvas, true)
        this.scene = new Scene(this.engine)

        // Cámara
        const camera = new ArcRotateCamera("cam", Math.PI / 2, Math.PI / 4, 4, Vector3.Zero(), this.scene)
        camera.attachControl(this.canvas, true)

        // Luz
        new HemisphericLight("light", new Vector3(0, 1, 0), this.scene)

        // Cubo de prueba
        MeshBuilder.CreateBox("box", { size: 1 }, this.scene)

        // Texto del destino (solo console.log por ahora)
        //console.log("Destino:", titleText)

        // 3. Loop de render
        this.engine.runRenderLoop(() => this.scene.render())
        window.addEventListener("resize", () => this.engine.resize())
    }

    async enterXR() {
        // Crear experiencia XR con soporte a overlay
        this.xrHelper = await WebXRDefaultExperience.CreateAsync(this.scene, {
            optionalFeatures: ["dom-overlay"],
            domOverlay: { root: document.getElementById("game-container") }
        })

        // Entrar directamente a AR (sin necesidad del botón de gafas)
        await this.xrHelper.baseExperience.enterXRAsync("immersive-ar", "local-floor")

        //console.log("WebXR directo iniciado")
    }

    dispose() {
        if (this.engine) {
            this.engine.stopRenderLoop()
            this.scene.dispose()
            this.engine.dispose()
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas) // <--- fuerza quitar del DOM
        }
        this.engine = null
        this.scene = null
        this.canvas = null
        this.xrHelper = null
    }

}
