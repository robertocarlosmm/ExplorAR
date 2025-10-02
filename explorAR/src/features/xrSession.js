import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder } from "@babylonjs/core"
import "@babylonjs/core/XR"
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience.js"

export class XRSession {
    constructor({ onExit } = {}) {
        this.engine = null
        this.scene = null
        this.canvas = null
        this.xrHelper = null
        this._onResize = null
        this.onExitCallback = onExit || (() => { })
    }

    async init() {
        this.canvas = document.getElementById("renderCanvas")
        if (!this.canvas) throw new Error("No se encontró #renderCanvas")

        // IMPORTANTE: el canvas debe estar visible y a pantalla completa (ver CSS más abajo)
        this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true })
        this.scene = new Scene(this.engine)

        // Cámara “dummy” para modo no-XR
        const cam = new ArcRotateCamera("cam", Math.PI / 2, Math.PI / 3, 5, Vector3.Zero(), this.scene)
        cam.attachControl(this.canvas, true)

        new HemisphericLight("h", new Vector3(0, 1, 0), this.scene)

        // Loop (Babylon cambiará al loop XR cuando entres a la sesión)
        this.engine.runRenderLoop(() => this.scene?.render())
        this._onResize = () => this.engine?.resize()
        window.addEventListener("resize", this._onResize)
    }

    async enterXR() {
        const hudRoot = document.getElementById("hud")
        if (!hudRoot) throw new Error("No se encontró #hud")

        // Crea la experiencia XR
        this.xrHelper = await WebXRDefaultExperience.CreateAsync(this.scene)

        // Observa fin de sesión desde el Session Manager (API pública)
        this.xrHelper.baseExperience.sessionManager.onXRSessionEnded.add(() => {
            // A partir de aquí ya no estás en XR
            this.onExitCallback()
        }) // :contentReference[oaicite:4]{index=4}

        // Pide XR con DOM Overlay
        const sessionInit = { optionalFeatures: ["dom-overlay"], domOverlay: { root: hudRoot } }

        // 'unbounded' es la referencia recomendada para AR; cae a 'local' si no está
        try {
            await this.xrHelper.baseExperience.enterXRAsync("immersive-ar", "unbounded", undefined, sessionInit)
        } catch {
            await this.xrHelper.baseExperience.enterXRAsync("immersive-ar", "local", undefined, sessionInit)
        }

        // Mensaje de 3s al inicio (UIController puede manejar esto si prefieres)
        const msg = document.getElementById("center-msg")
        if (msg) {
            msg.classList.remove("hidden")
            msg.style.display = "block"
            setTimeout(() => msg.classList.add("hidden"), 3000)
        }

        console.log("WebXR iniciado con DOM Overlay")
    }

    async exit() {
        try {
            await this.xrHelper?.baseExperience?.exitXRAsync()
        } catch (e) {
            console.warn("Error al salir de XR:", e)
        }
        // onExitCallback se dispara también por el observable superior
    }

    dispose() {
        if (this._onResize) window.removeEventListener("resize", this._onResize)
        this._onResize = null
        this.xrHelper = null
        // Mantenemos engine/scene para reutilizar
    }
}