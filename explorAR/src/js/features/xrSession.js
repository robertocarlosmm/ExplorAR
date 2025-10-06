// src/features/xrSession.js
import {
    Engine,
    Scene,
    ArcRotateCamera,
    Vector3,
    HemisphericLight,
    Color4,
    WebXRDefaultExperience,
    WebXRFeatureName,
    PointerEventTypes
} from "@babylonjs/core";
import "@babylonjs/core/XR";
import { setupPlaneDetection } from "../core/xr/planeDetection.js";
import { setupAnchors } from "../core/xr/anchors.js";
import { attachBoardToFirstPlane } from "../core/xr/anchorBoard.js";

/**
 * Controla la creación, inicio y salida de una sesión WebXR (modo AR)
 * con soporte multitáctil y overlay DOM personalizado (#hud).
 */
export class XRSession {
    constructor(opts = {}) {
        this.engine = null;
        this.scene = null;
        this.canvas = null;
        this.xrHelper = null;
        this._onResize = null;
        this.planeDetection = null;
        this.anchorSystem = null
        // Callback al salir de XR
        this.onExitCallback =
            typeof opts.onExit === "function" ? opts.onExit : () => { };
    }

    /** Inicializa motor y escena (sin entrar aún en XR) */
    async init(titleText) {
        // 1️⃣ Canvas
        this.canvas = document.getElementById("renderCanvas");
        if (!this.canvas) throw new Error("No se encontró #renderCanvas en el DOM");

        // 2️⃣ Motor + escena
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 0);

        // Cámara previa (antes de XR)
        const camera = new ArcRotateCamera(
            "cam",
            Math.PI / 2,
            Math.PI / 4,
            4,
            Vector3.Zero(),
            this.scene
        );
        camera.attachControl(this.canvas, true);

        // Luz básica
        new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        console.log("[XRSession] Escena inicializada:", titleText);

        // 3️⃣ Listener de resize
        this._onResize = () => {
            if (this.engine) this.engine.resize();
        };
        window.addEventListener("resize", this._onResize);
    }

    /** Entra al modo WebXR (immersive-ar) con overlay DOM y multitouch */
    async enterXR() {
        const loading = document.getElementById("loading-screen");
        if (loading) loading.style.display = "flex";

        try {
            // Crear experiencia WebXR sin UI gris
            this.xrHelper = await WebXRDefaultExperience.CreateAsync(this.scene, {
                disableDefaultUI: true,
                disableTeleportation: true
            });
            console.log("[XRSession] WebXRDefaultExperience creada correctamente");

            // Habilitar multitouch (todos los controladores generan punteros)
            const fm = this.xrHelper.baseExperience.featuresManager;
            fm.enableFeature(WebXRFeatureName.POINTER_SELECTION, "latest", {
                xrInput: this.xrHelper.input,
                enablePointerSelectionOnAllControllers: true
            });
            console.log("[XRSession] Pointer Selection multitouch habilitado");

            /*deteccion de planos y anclaje*/
            this.planeDetection = await setupPlaneDetection(fm);
            this.anchorSystem = await setupAnchors(fm);

            // Fase 3.3: emitir evento surfaceDetected con la primera superficie
            if (this.planeDetection) {
                attachBoardToFirstPlane(this.planeDetection, this.scene, (pos) => {
                    const event = new CustomEvent("surfaceDetected", { detail: { position: pos } });
                    window.dispatchEvent(event);
                });
            }

            if (!this.planeDetection) {
                console.warn("[XRSession] Plane Detection no disponible o no compatible.");
            }
            if (!this.anchorSystem) {
                console.warn("[XRSession] Anchor System no disponible o no compatible.");
            }

            // Overlay DOM (HUD)
            const root = document.getElementById("hud");
            if (!root) throw new Error("No se encontró #hud para dom-overlay");
            root.classList.remove("hidden");

            // Entrar a XR con overlay activo
            await this.xrHelper.baseExperience.enterXRAsync(
                "immersive-ar",
                "local-floor",
                this.xrHelper.renderTarget,
                {
                    optionalFeatures: ["dom-overlay"],
                    domOverlay: { root }
                }
            );
            console.log("[XRSession] Entrando a modo AR inmersivo...");

            // Salida limpia
            this.xrHelper.baseExperience.sessionManager.onXRSessionEnded.add(() => {
                try {
                    this.engine?.stopRenderLoop();
                    this.dispose();
                } finally {
                    this.onExitCallback();
                }
            });

            // Mensaje inicial (opcional)
            const msg = document.getElementById("center-msg");
            if (msg) {
                msg.style.display = "block";
                setTimeout(() => msg.classList.add("hidden"), 3000);
            }

            // Render loop principal
            this.engine.runRenderLoop(() => this.scene.render());

            // Log táctil de diagnóstico (multitouch)
            this.scene.onPointerObservable.add((pi) => {
                if (pi.type === PointerEventTypes.POINTERDOWN) {
                    console.log(
                        `[Touch] id=${pi.event.pointerId}, tipo=${pi.event.pointerType}`
                    );
                }
            });

            console.log("✅ WebXR iniciado con DOM Overlay y multitouch activo");
        } catch (err) {
            console.error("❌ Error al iniciar WebXR:", err);
            alert(
                "Error al iniciar la experiencia AR.\nRevisa la consola para más detalles."
            );
        } finally {
            // 9️⃣ Quitar loader siempre
            if (loading) loading.style.display = "none";
        }
    }

    /** Sale de la sesión XR y limpia recursos */
    async exit() {
        try {
            await this.xrHelper?.baseExperience?.exitXRAsync();
        } catch (e) {
            console.warn("Error al salir de XR:", e);
        }
        this.dispose();
    }

    /** Libera recursos y elimina listeners */
    dispose() {
        if (this.engine) {
            this.engine.stopRenderLoop();
            this.scene?.dispose();
            this.engine?.dispose();
        }
        if (this._onResize) {
            window.removeEventListener("resize", this._onResize);
        }
        this.engine = null;
        this.scene = null;
        this.xrHelper = null;
        this._onResize = null;
        console.log("[XRSession] Recursos liberados");
    }
}
