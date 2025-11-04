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

        // 🔹 Inicializar HUD
        this.hud?.show?.();
        this.hud?.setScore?.(this.score);
        this.hud?.updateScore?.(this.score);

        // 🔹 Calcular posición base frente a la cámara
        const cam = this.scene.activeCamera;
        const forward = cam.getForwardRay(1).direction;
        const center = cam.globalPosition.add(forward.scale(0.7));

        // 🔹 Crear entorno base
        this._createFloor(center);
        this._createTopPlane(center);

        // 🔹 Activar loop general
        this._boundUpdate = this._updateLoop.bind(this);
        this.scene.onBeforeRenderObservable.add(this._boundUpdate);
        this.isRunning = true;

        // 🔁 Obtener lista de imágenes directamente desde la configuración original
        const exp = experiencesConfig.find(e => e.id === this.experienceId);
        const mini = exp?.minigames?.find(m => m.id === "check");
        const assets = mini?.assets || [];

        // 🔹 Filtrar solo los assets tipo "image"
        let remainingKeys = assets
            .filter(a => a?.type === "image" && a?.key && a?.url)
            .map(a => a.key);

        if (remainingKeys.length === 0) {
            console.warn("[CheckGame] ⚠️ No hay assets tipo 'image', no se generarán ítems");
            return;
        }

        // 🔹 Spawnear uno inmediatamente
        const firstIndex = Math.floor(Math.random() * remainingKeys.length);
        const firstKey = remainingKeys[firstIndex];
        console.log(`[CheckGame] 🪂 Primera caída iniciada con key: ${firstKey}`);
        this._spawnFallingItem(center, firstKey);
        remainingKeys.splice(firstIndex, 1); // eliminar el usado

        // 🔁 Generar nuevos ítems cada 5 segundos hasta agotar imágenes
        const spawnInterval = setInterval(() => {
            if (!this.isRunning || remainingKeys.length === 0) {
                clearInterval(spawnInterval);
                console.log("[CheckGame] 🛑 Fin de generación de ítems (ya no quedan imágenes)");
                return;
            }

            const randomIndex = Math.floor(Math.random() * remainingKeys.length);
            const randomKey = remainingKeys[randomIndex];
            console.log(`[CheckGame] 🪂 Nueva caída iniciada con key: ${randomKey}`);

            this._spawnFallingItem(center, randomKey);
            remainingKeys.splice(randomIndex, 1);
        }, 5000);

        console.log("[CheckGame] ✅ Setup completo (solo imágenes, sin repeticiones)");
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

            const assets = mini.assets || [];

            // assetMap sigue siendo key -> url (como ya lo usas)
            this.assetMap = Object.fromEntries(assets.map(a => [a.key, a.url]));

            // NUEVO: guarda únicamente las keys cuyo type === "image"
            this.imageKeys = assets
                .filter(a => a?.type === "image" && a?.key && a?.url)
                .map(a => a.key);

            console.log("[CheckGame] ✔️ Assets cargados:", this.assetMap);
            console.log("[CheckGame] ✔️ Image keys:", this.imageKeys);
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

    _spawnFallingItem(center, key) {
        // 🔹 Definir carriles (izquierda, centro, derecha)
        const lanes = [-0.5, 0, 0.5];
        const laneOffset = lanes[Math.floor(Math.random() * lanes.length)];

        // 🔹 Calcular posición inicial
        const topY = this.topPlane?.position.y ?? this.spawnY;
        const zBase = this.topPlane?.position.z ?? center.z;
        const spawnY = topY - 0.05;
        const spawnZ = zBase + 0.02;

        console.log(`[CheckGame] 🎯 Spawneando ítem (${key}) en carril X=${(center.x + laneOffset).toFixed(2)}`);

        const item = MeshBuilder.CreatePlane("fall_item", { width: 0.3, height: 0.3 }, this.scene);
        item.parent = this.root;
        item.position = new Vector3(center.x + laneOffset, spawnY, spawnZ);
        item.lookAt(this.scene.activeCamera.globalPosition);

        // 🔁 Corregir orientación
        item.rotation.x = Math.PI;
        item.rotation.y += Math.PI;
        item.rotation.z = 0;

        // Marco negro
        const frame = MeshBuilder.CreatePlane("frame_plane", { width: 0.33, height: 0.33 }, this.scene);
        frame.parent = item;
        frame.position = new Vector3(0, 0, -0.008);
        const frameMat = new StandardMaterial("frame_mat", this.scene);
        frameMat.diffuseColor = new Color3(0, 0, 0);
        frameMat.backFaceCulling = false;
        frame.material = frameMat;

        // 🔹 Textura JPG según la key aleatoria
        const url = this.assetMap[key];
        const mat = new StandardMaterial("item_mat", this.scene);
        if (url) {
            const tex = new Texture(
                url, this.scene, false, false, Texture.TRILINEAR_SAMPLINGMODE,
                () => console.log(`[CheckGame] ✅ Textura cargada OK (${key}):`, url),
                (msg, e) => console.error("[CheckGame] ❌ Error cargando textura:", url, e)
            );
            mat.diffuseTexture = tex;
            mat.backFaceCulling = false;
            mat.transparencyMode = StandardMaterial.MATERIAL_OPAQUE;
        } else {
            mat.diffuseColor = new Color3(1, 0.7, 0.2);
            console.warn(`[CheckGame] ⚠️ No se encontró URL para key: ${key}`);
        }
        item.material = mat;

        // 🔹 Control de caída individual (sin detener todo el juego)
        this.scene.onBeforeRenderObservable.add(() => {
            if (!item || item.isDisposed()) return;
            const dt = this.scene.getEngine().getDeltaTime() / 1000;
            item.position.y -= this.fallSpeed * dt;

            if (item.position.y <= this.groundY + 0.01) {
                console.log(`[CheckGame] 💥 Ítem (${key}) tocó el piso`);
                item.dispose();
            }
        });
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
