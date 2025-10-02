import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, Color4 } from "@babylonjs/core"
import "@babylonjs/core/XR"
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience.js"

export class XRSession {
    constructor(opts = {}) {
        this.engine = null
        this.scene = null
        this.canvas = null
        this.xrHelper = null
        this._onResize = null
        // Guardar callback de salida (no-op si no lo pasan)
        this.onExitCallback = (typeof opts.onExit === 'function') ? opts.onExit : () => { }
    }

    async init(titleText) {
        // 1) Canvas fijo
        this.canvas = document.getElementById("renderCanvas")
        if (!this.canvas) throw new Error("No se encontró #renderCanvas en el DOM")

        // 2) Motor + escena
        this.engine = new Engine(this.canvas, true)
        this.scene = new Scene(this.engine)
        this.scene.clearColor = new Color4(0, 0, 0, 0)

        // Cámara “dummy” para que la escena no falle antes del XR
        const camera = new ArcRotateCamera("cam", Math.PI / 2, Math.PI / 4, 4, Vector3.Zero(), this.scene)
        camera.attachControl(this.canvas, true)

        // Luz básica
        new HemisphericLight("light", new Vector3(0, 1, 0), this.scene)

        // Objeto de prueba
        MeshBuilder.CreateBox("box", { size: 1 }, this.scene)

        console.log("Destino:", titleText)

        // 3) Resize listener (pero SIN renderLoop aún)
        this._onResize = () => { if (this.engine) this.engine.resize() }
        window.addEventListener("resize", this._onResize)
    }

    async enterXR() {
        // Overlay opcional de carga
        const loading = document.getElementById("loading-screen")
        if (loading) loading.style.display = "flex"

        // Crear experiencia XR
        this.xrHelper = await WebXRDefaultExperience.CreateAsync(this.scene, {
            disableDefaultUI: true,   // desactiva overlay/botón gris
            disableTeleportation: true
        });

        // HUD como overlay
        const root = document.getElementById("hud")
        if (!root) throw new Error("No se encontró #hud para dom-overlay")
        root.classList.remove("hidden")

        // Entrar a AR
        await this.xrHelper.baseExperience.enterXRAsync(
            "immersive-ar",
            "local-floor",
            this.xrHelper.renderTarget,
            { optionalFeatures: ["dom-overlay"], domOverlay: { root } }
        )

        // ÚNICO handler de salida: limpia y luego vuelve a UI
        this.xrHelper.baseExperience.sessionManager.onXRSessionEnded.add(() => {
            try {
                // Asegurar que nunca quede el loop/canvas “pintando gris”
                this.engine?.stopRenderLoop()
                this.dispose()
            } finally {
                // Siempre es función válida (no-op si no la pasaron)
                this.onExitCallback()
            }
        })

        // Mostrar mensaje de inicio solo 3 segundos
        const msg = document.getElementById("center-msg")
        if (msg) {
            msg.style.display = "block"        // asegurar que aparezca
            setTimeout(() => {
                msg.classList.add("hidden")
            }, 3000)
        }

        // Ahora sí arranca el loop
        this.engine.runRenderLoop(() => this.scene.render())

        // Quitar overlay de carga
        if (loading) loading.style.display = "none"

        console.log("WebXR iniciado con DOM Overlay")
    }

    async exit() {
        try {
            await this.xrHelper?.baseExperience?.exitXRAsync()
        } catch (e) {
            console.warn("Error al salir de XR:", e)
        }
        this.dispose()
    }

    dispose() {
        if (this.engine) {
            this.engine.stopRenderLoop()
            this.scene?.dispose()
            this.engine?.dispose()
        }
        if (this._onResize) {
            window.removeEventListener("resize", this._onResize)
        }
        this.engine = null
        this.scene = null
        this.xrHelper = null
        this._onResize = null
    }
}
