import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders";
import {
    MeshBuilder,
    StandardMaterial,
    Texture,
    Color3,
    Vector3,
} from "@babylonjs/core";
import { gameplayConfig } from "../../../config/gameplayConfig.js";
import { experiencesConfig } from "../../../config/experienceConfig.js";
import { ProjectileSystem } from "./ProjectilSystem.js";

export class Minigame3Vicos {
    constructor({ scene, hud, experienceId, startingScore = 0 }) {
        this.scene = scene;
        this.hud = hud;
        this.experienceId = experienceId;
        this.score = startingScore;

        // Estado general
        this.isRunning = false;
        this.plots = [];                 // { mesh, state, hasPlant, pos }
        this.gridSize = 4;               // 4x4
        this.gridPositions = [];         // posiciones pre-calculadas (con bloqueo del centro)

        // Parámetros por defecto (se sobrescriben con params del config)
        this.numberOfPlots = 6;
        this.spawnRadius = 1.2;
        this.dryChance = 0.4;

        // Config y assets (se llenan en _loadConfigForVicos)
        this.experience = null;
        this.miniConfig = null;
        this.assetMap = {};              // key -> url (dry_soil, soil_base, soil_wet1, icon_seed, etc.)

        //Porjectil
        this.projectiles = null;
    }

    // ===========================
    // Ciclo de vida
    // ===========================
    async start() {
        console.log("[Minigame3Vicos] Iniciando minijuego Vicos (Fase 1)");

        // 1) Cargar configuración/parametría y construir assetMap
        const ok = this._loadConfigForVicos();
        if (!ok) {
            this._failGracefully("No se encontró la configuración de Vicos en experiencesConfig.");
            return;
        }

        // 2) HUD + Timer
        this.hud?.show?.();
        const totalTime =
            this.miniConfig?.params?.timeLimit ??
            gameplayConfig?.timeByMinigame?.m3Vicos ??
            gameplayConfig?.minigame3Vicos?.timeLimit ??
            gameplayConfig?.timer?.default ??
            60;

        this.hud?.startTimer?.(totalTime, null, () => this._onTimeUp());
        this.hud?.updateScore?.(this.score);

        // 3) Construir plano base lógico (invisible) y grid 4×4
        this._createBasePlane();
        this._generateGridPositions();

        // 4) Spawn inicial de parcelas (solo "fertile" o "dry")
        this._spawnInitialPlots();

        this.isRunning = true;
        console.log("[Minigame3Vicos] Terreno listo. Parcelas iniciales generadas.");

        // 5) Sistema de lanzamiento (ProjectileSystem)
        this.projectiles = new ProjectileSystem({
            scene: this.scene,
            hud: this.hud,
            projectileTypes: ["seed", "water"],
            assetMap: this.assetMap,
            onHit: (type, target) => this._handleHit(type, target),
            speed: 2.8,
            gravity: -2.5,
            range: 5.0,
            cooldown: 400,
        });

        // Registrar las parcelas activas como objetivos
        this.projectiles.registerTargets(this.plots.map(p => p.mesh));

        // Controles (por ahora click, luego se reemplaza por botón HUD)
        window.addEventListener("click", () => this.projectiles.launch());
    }

    // ===========================
    // Impact
    // ===========================
    _handleHit(type, target) {
        if (!this.isRunning) return;

        const plot = this.plots.find(p => p.mesh === target);
        if (!plot) return;

        if (plot.state === "dry") {
            // No ocurre nada si el suelo está seco
            this.hud?.showTemporaryMessage?.("El suelo está seco", 800);
            return;
        }

        if (type === "seed" && !plot.hasPlant) {
            // Planta una semilla
            plot.hasPlant = true;
            this.score += this.miniConfig.params?.pointsPerPlanting || 10;
            this.hud?.updateScore?.(this.score);
            console.log("[Vicos] Semilla sembrada:", plot.mesh.name);
        } else if (type === "water" && plot.hasPlant) {
            // Riega la planta (puntos extra)
            plot.state = "wet";
            this.score += this.miniConfig.params?.pointsPerWatering || 5;
            this.hud?.updateScore?.(this.score);
            console.log("[Vicos] Planta regada:", plot.mesh.name);
        }

        // Feedback visual (por ejemplo, cambio de textura)
        const newTexKey =
            plot.state === "wet" ? "soil_wet1" :
                plot.hasPlant ? "soil_base" :
                    "dry_soil";

        const texUrl = this.assetMap[newTexKey];
        if (texUrl && plot.mesh.material) {
            const tex = new Texture(texUrl, this.scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
            tex.hasAlpha = true;
            plot.mesh.material.diffuseTexture = tex;
            plot.mesh.material.opacityTexture = tex;
            plot.mesh.material.useAlphaFromDiffuseTexture = true;
        }
    }


    // ===========================
    // Config & Assets
    // ===========================
    _loadConfigForVicos() {
        try {
            this.experience = experiencesConfig.find((e) => e.id === this.experienceId);
            if (!this.experience) return false;

            // Busca el minijuego 3 de Vicos (id típico "m3Vicos" | type "throw")
            this.miniConfig =
                this.experience.minigames?.find((m) => m.id === "m3Vicos") ||
                this.experience.minigames?.find((m) => m.type === "throw");

            if (!this.miniConfig) return false;

            // Parametría
            const p = this.miniConfig.params || {};
            this.numberOfPlots = Number.isFinite(p.numberOfPlots) ? p.numberOfPlots : this.numberOfPlots;
            this.spawnRadius = Number.isFinite(p.spawnRadius) ? p.spawnRadius : this.spawnRadius;
            this.dryChance = Number.isFinite(p.dryChance) ? p.dryChance : this.dryChance;

            // Mapa de assets (key -> url)
            this.assetMap = Object.fromEntries(
                (this.miniConfig.assets || []).map((a) => [a.key, a.url])
            );

            // Validaciones mínimas
            if (!this.assetMap["dry_soil"] || !this.assetMap["soil_base"]) {
                console.warn("[Minigame3Vicos] Falta dry_soil o soil_base en assets del config.");
            }
            return true;
        } catch (e) {
            console.error("[Minigame3Vicos] Error cargando config de Vicos:", e);
            return false;
        }
    }

    // ===========================
    // Construcción de escenario
    // ===========================
    _createBasePlane() {
        const size = Math.max(2.5, this.spawnRadius * 2); // base visible lógica
        const base = MeshBuilder.CreateGround("vicos_base", { width: size, height: size }, this.scene);
        const mat = new StandardMaterial("vicos_base_mat", this.scene);
        mat.alpha = 0; // invisible
        base.material = mat;
        this.base = base;
    }

    _generateGridPositions() {
        // Grid 4×4 centrado en el jugador
        // Centro bloqueado: celdas (1,1), (1,2), (2,1), (2,2)
        // Distribución espacial en X/Z proporcional a spawnRadius
        this.gridPositions = [];
        const cellSize = this.spawnRadius / (this.gridSize / 2); // separaciones uniformes
        let idx = 0;

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = (c - (this.gridSize / 2 - 0.5)) * cellSize;
                const z = (r - (this.gridSize / 2 - 0.5)) * cellSize;

                const isCenter = (r === 1 || r === 2) && (c === 1 || c === 2);
                this.gridPositions.push({
                    index: idx++,
                    pos: new Vector3(x, 0, z),
                    available: !isCenter, // sólo bordes disponibles para spawn
                });
            }
        }

        console.log("[Minigame3Vicos] Grid 4x4 generado.");
    }

    _spawnInitialPlots() {
        const spawnable = this.gridPositions.filter((p) => p.available);
        const chosen = this._getRandomSubset(spawnable, this.numberOfPlots);

        for (const cell of chosen) {
            const state = Math.random() < this.dryChance ? "dry" : "fertile";
            this._spawnPlotAt(cell.pos, state);
        }
    }

    _spawnPlotAt(position, state) {
        const plotSize = this.miniConfig.params?.plotSize || 0.3;
        console.log("Plotsize:", plotSize);
        const mesh = MeshBuilder.CreateGround(
            `vicos_plot_${state}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            { width: plotSize, height: plotSize },
            this.scene
        );

        // Ligero offset aleatorio interno para que no queden demasiado “cuadriculados”
        const jitterX = (Math.random() - 0.5) * 0.10;
        const jitterZ = (Math.random() - 0.5) * 0.10;

        mesh.position = new Vector3(position.x + jitterX, 0.01, position.z + jitterZ);
        mesh.rotation = new Vector3(0, Math.random() * Math.PI * 2, 0);

        const mat = new StandardMaterial(`vicos_mat_${state}_${Date.now()}`, this.scene);
        const texUrl = state === "dry" ? this.assetMap["dry_soil"] : this.assetMap["soil_base"];

        if (texUrl) {
            const tex = new Texture(texUrl, this.scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
            tex.hasAlpha = true; // Activa el canal alfa del PNG

            mat.diffuseTexture = tex;
            mat.opacityTexture = tex; // Usa el mismo canal alfa para la opacidad
            mat.useAlphaFromDiffuseTexture = true;
            mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND; // ← así se accede correctamente en módulos
        }

        mat.specularColor = new Color3(0, 0, 0);
        mat.emissiveColor = new Color3(0.05, 0.05, 0.05);
        mat.backFaceCulling = false;

        mesh.material = mat;

        this.plots.push({ mesh, state, hasPlant: false, pos: position });
    }

    // ===========================
    // Utilidades
    // ===========================
    _getRandomSubset(array, count) {
        if (count <= 0) return [];
        if (count >= array.length) return [...array];
        const pool = [...array];
        const result = [];
        while (result.length < count && pool.length) {
            const i = Math.floor(Math.random() * pool.length);
            result.push(pool.splice(i, 1)[0]);
        }
        return result;
    }

    // ===========================
    // Fin de partida y limpieza
    // ===========================
    _onTimeUp() {
        console.log("[Minigame3Vicos] Tiempo finalizado (Fase 1)");
        this.hud?.showPopup?.({
            title: "Tiempo agotado",
            message: `Puntaje: ${this.score}`,
            buttonText: "Continuar",
            onClose: () => this._endGame(),
        });
    }

    _endGame() {
        this.isRunning = false;
        this._disposeAllPlots();
        this.onGameEnd?.();
    }

    _disposeAllPlots() {
        for (const p of this.plots) {
            try { p.mesh.dispose(); } catch { }
        }
        this.plots = [];
    }

    dispose() {
        try {
            this._disposeAllPlots();
            this.base?.dispose();
            this.projectiles?.dispose();
        } catch { }
        this.hud?.stopTimer?.();
        console.log("[Minigame3Vicos] Recursos liberados (Fase 1).");
    }

    _failGracefully(msg) {
        console.error("[Minigame3Vicos] " + msg);
        this.hud?.showPopup?.({
            title: "Configuración faltante",
            message: msg,
            buttonText: "Salir",
            onClose: () => this._endGame(),
        });
    }
}
