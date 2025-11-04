// ===============================
// CheckGame.js — versión vertical con caída suave (JPG compatible)
// ===============================
import {
    MeshBuilder,
    StandardMaterial,
    Texture,
    Color3,
    Vector3,
    TransformNode,
    ActionManager,
    ExecuteCodeAction,
    Animation,
    EasingFunction,
    SineEase
} from "@babylonjs/core";
import { experiencesConfig } from "../../../config/experienceConfig.js";

export class CheckGame {
    constructor({ scene, hud, experienceId, startingScore = 0 }) {
        this.scene = scene;
        this.hud = hud;
        this.experienceId = experienceId;
        this.score = startingScore ?? 0;

        this.isRunning = false;
        this.root = new TransformNode("check_root", this.scene);

        this.floor = null;
        this.topPlane = null;
        this.item = null;

        this.groundY = 0.0;
        this.spawnY = 1.6;
        this.fallSpeed = 0.25; // m/s visible y natural
        this.assetMap = {};
    }

    async start() {
        console.log("[CheckGame] 🚀 start()");
        if (!this._loadConfig()) {
            console.error("[CheckGame] ❌ Config inválida");
            return;
        }

        this.hud?.show?.();
        this.hud?.setScore?.(this.score);
        this.hud?.updateScore?.(this.score);

        const cam = this.scene.activeCamera;
        const forward = cam.getForwardRay(1).direction;
        const center = cam.globalPosition.add(forward.scale(0.7));

        this._createFloor(center);
        this._createTopPlane(center);
        this._spawnFallingItem(center);

        // Loop
        this._boundUpdate = this._updateLoop.bind(this);
        this.scene.onBeforeRenderObservable.add(this._boundUpdate);
        this.isRunning = true;

        console.log("[CheckGame] ✅ Setup completo (orientación vertical + caída activa)");
    }

    dispose() {
        this.isRunning = false;
        if (this._boundUpdate) {
            this.scene.onBeforeRenderObservable.removeCallback(this._boundUpdate);
        }
        try { this.topPlane?.dispose(); } catch { }
        try { this.floor?.dispose(); } catch { }
        try { this.item?.dispose(); } catch { }
        try { this.root?.dispose(); } catch { }
        console.log("[CheckGame] 🧹 Recursos liberados");
    }

    _loadConfig() {
        try {
            const exp = experiencesConfig.find(e => e.id === this.experienceId);
            if (!exp) return false;
            const mini = exp.minigames?.find(m => m.id === "check");
            if (!mini) return false;
            this.assetMap = Object.fromEntries((mini.assets || []).map(a => [a.key, a.url]));
            console.log("[CheckGame] ✔️ Assets cargados:", this.assetMap);
            return true;
        } catch (e) {
            console.error("[CheckGame] Error cargando config:", e);
            return false;
        }
    }

    _createFloor(center) {
        console.log("[CheckGame] 🟫 Creando piso (horizontal)...");
        this.floor = MeshBuilder.CreateGround("floor_plane", { width: 2, height: 2 }, this.scene);
        this.floor.parent = this.root;
        this.floor.position = new Vector3(center.x, this.groundY, center.z);
        const mat = new StandardMaterial("floor_mat", this.scene);
        mat.diffuseColor = new Color3(0.25, 0.25, 0.25);
        mat.alpha = 0.6;
        this.floor.material = mat;
    }

    _createTopPlane(center) {
        console.log("[CheckGame] 🛖 Creando plano techo (vertical frente a cámara)...");
        this.topPlane = MeshBuilder.CreatePlane("top_plane", { width: 0.8, height: 0.8 }, this.scene);
        this.topPlane.parent = this.root;

        // Colocar el plano frente a la cámara y algo elevado
        this.topPlane.position = new Vector3(center.x, this.spawnY + 0.8, center.z);
        this.topPlane.lookAt(this.scene.activeCamera.globalPosition);

        const mat = new StandardMaterial("top_mat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        mat.alpha = 0.15;
        this.topPlane.material = mat;

        console.log("[CheckGame] ✅ Techo en Y =", this.topPlane.position.y.toFixed(2));
    }

    _spawnFallingItem(center) {
        // 🔹 Definir carriles (izquierda, centro, derecha)
        const lanes = [-0.5, 0, 0.5];
        const laneOffset = lanes[Math.floor(Math.random() * lanes.length)];

        // 🔹 Calcular posición inicial
        const topY = this.topPlane?.position.y ?? this.spawnY;
        const zBase = this.topPlane?.position.z ?? center.z;
        const spawnY = topY - 0.05;
        const spawnZ = zBase + 0.02;

        console.log(`[CheckGame] 🎯 Spawneando ítem en carril X=${(center.x + laneOffset).toFixed(2)}, Y=${spawnY.toFixed(2)}, Z=${spawnZ.toFixed(2)}`);

        // 🔹 Crear ítem principal (más pequeño)
        const item = MeshBuilder.CreatePlane("fall_item", { width: 0.3, height: 0.3 }, this.scene);
        item.parent = this.root;
        item.position = new Vector3(center.x + laneOffset, spawnY, spawnZ);

        // 🔹 Siempre vertical y mirando hacia el jugador
        item.lookAt(this.scene.activeCamera.globalPosition);

        // 🔁 Corregir orientación (evitar que esté de cabeza)
        item.rotation.x = Math.PI;
        item.rotation.z = 0;
        item.rotation.y += Math.PI;

        // 🔹 Marco negro detrás
        const frame = MeshBuilder.CreatePlane("frame_plane", { width: 0.33, height: 0.33 }, this.scene);
        frame.parent = item;
        frame.position = new Vector3(0, 0, -0.008);
        const frameMat = new StandardMaterial("frame_mat", this.scene);
        frameMat.diffuseColor = new Color3(0, 0, 0);
        frameMat.backFaceCulling = false;
        frame.material = frameMat;

        // 🔹 Textura JPG (compatible)
        const texKey = Object.keys(this.assetMap).find(k => k.startsWith("p")) ?? null;
        if (texKey) {
            const url = this.assetMap[texKey];
            console.log("[CheckGame] 🖼️ Cargando textura para ítem:", texKey, url);
            const mat = new StandardMaterial("item_mat", this.scene);
            const tex = new Texture(
                url, this.scene, false, false, Texture.TRILINEAR_SAMPLINGMODE,
                () => console.log("[CheckGame] ✅ Textura cargada OK:", url),
                (msg, e) => console.error("[CheckGame] ❌ Error cargando textura:", url, e)
            );
            mat.diffuseTexture = tex;
            mat.transparencyMode = StandardMaterial.MATERIAL_OPAQUE;
            mat.backFaceCulling = false;
            item.material = mat;
        } else {
            const mat = new StandardMaterial("item_mat", this.scene);
            mat.diffuseColor = new Color3(1, 0.7, 0.2);
            mat.backFaceCulling = false;
            item.material = mat;
            console.warn("[CheckGame] ⚠️ Asset por defecto aplicado.");
        }

        this.item = item;
    }

    // -------------------------------
    // Caída del ítem (loop)
    // -------------------------------
    _updateLoop(_, deltaMs) {
        if (!this.isRunning || !this.item) return;

        const safeDelta = (typeof deltaMs === "number" && !isNaN(deltaMs)) ? deltaMs : 16.6;
        const dt = Math.min(safeDelta / 1000, 0.05);

        this.item.position.y -= this.fallSpeed * dt;

        if (Math.random() < 0.08) {
            console.log("[CheckGame] y =", this.item.position.y.toFixed(2));
        }

        if (this.item.position.y <= this.groundY + 0.01) {
            console.log("[CheckGame] 💥 Ítem tocó el piso");
            this.item.position.y = this.groundY + 0.01;
            this.isRunning = false; // detener caída
        }
    }
}
