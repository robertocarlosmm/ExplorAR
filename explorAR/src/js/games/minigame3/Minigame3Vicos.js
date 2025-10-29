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
        this.startingScore = startingScore;

        // Estado general
        this.isRunning = false;
        this.plots = [];
        this.gridSize = 4;
        this.gridPositions = [];

        // Parámetros por defecto
        this.numberOfPlots = 6;
        this.spawnRadius = 1.2;
        this.dryChance = 0.4;

        // Config y assets
        this.experience = null;
        this.miniConfig = null;
        this.assetMap = {};
        this.waterPoints = gameplayConfig.scoring?.m3Vicos?.waterBonus ?? 8;
        this.overwaterPenalty = gameplayConfig.scoring?.m3Vicos?.overwaterPenalty ?? 5;
        this.seedPoints = gameplayConfig.scoring?.m3Vicos?.seedBonus ?? 10;

        // Projectil
        this.projectiles = null;
    }

    // ===========================
    // Ciclo de vida
    // ===========================
    async start() {
        console.log("[Minigame3Vicos] Iniciando minijuego Vicos - VERSIÓN MEJORADA");

        const ok = this._loadConfigForVicos();
        if (!ok) {
            this._failGracefully("No se encontró la configuración de Vicos en experiencesConfig.");
            return;
        }

        this.hud?.show?.();
        const totalTime =
            this.miniConfig?.params?.timeLimit ??
            gameplayConfig?.timeByMinigame?.m3Vicos ??
            gameplayConfig?.minigame3Vicos?.timeLimit ??
            gameplayConfig?.timer?.default ??
            60;

        this.hud?.startTimer?.(totalTime, null, () => this._onTimeUp());
        this.hud?.updateScore?.(this.score);

        this._createBasePlane();
        this._generateGridPositions();
        this._spawnInitialPlots();

        this.isRunning = true;
        console.log("[Minigame3Vicos] ✓ Terreno listo con sistema de capas");

        // Sistema de lanzamiento mejorado con previsualización
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

        this.projectiles.registerTargets(this.plots.map(p => p.mesh));

        // Controles
        window.addEventListener("click", () => this.projectiles.tap());
    }

    // ===========================
    // ★★★ LÓGICA DE IMPACTO MEJORADA ★★★
    // Estados permanentes: "dry" y "excess" NO se pueden cambiar
    // ===========================
    _handleHit(type, target) {
        if (!this.isRunning) return;

        const plot = this.plots.find(p => p.mesh === target);
        if (!plot) return;

        // Inicializa contadores si no existen
        if (plot.waterLevel == null) plot.waterLevel = 0;

        console.log(`[Vicos] Impacto: tipo=${type}, estado=${plot.state}, waterLevel=${plot.waterLevel}`);

        // ═══════════════════════════════════════════
        // REGLA 1: Suelo seco es PERMANENTE - NO se puede recuperar
        // ═══════════════════════════════════════════
        if (plot.state === "dry") {
            this.hud.message("⚠️ Suelo infértil - No se puede usar", 1200);
            return;
        }

        // ═══════════════════════════════════════════
        // REGLA 2: Parcela ahogada (excess) es PERMANENTE
        // ═══════════════════════════════════════════
        if (plot.state === "excess") {
            this.hud.message("💀 Planta muerta - Parcela perdida", 1200);
            return;
        }

        // ═══════════════════════════════════════════
        // REGLA 3: Sembrar semilla
        // ═══════════════════════════════════════════
        if (type === "seed") {
            if (plot.hasPlant) {
                this.hud.message("Ya hay una planta aquí", 800);
                return;
            }

            // Sembrar en suelo fértil
            plot.hasPlant = true;
            plot.state = "seeded";
            plot.waterLevel = 0; // Resetear agua
            this.score += this.seedPoints;
            this.hud.setScore(this.score);
            this.hud.message("🌱 Semilla plantada", 800);

            console.log("[Vicos] ✓ Semilla sembrada:", plot.mesh.name);
            this._applyPlotVisual(plot);
            return;
        }

        // ═══════════════════════════════════════════
        // REGLA 4: Regar con agua
        // ═══════════════════════════════════════════
        if (type === "water") {
            if (!plot.hasPlant) {
                this.hud.message("Debes plantar una semilla primero", 1000);
                return;
            }

            // Incrementar nivel de agua
            plot.waterLevel++;

            // Estados progresivos CON BLOQUEO PERMANENTE
            if (plot.waterLevel === 1) {
                plot.state = "watered1"; // Verde medio
                this.score += waterPoints
                this.hud.setScore(this.score);
                this.hud.message("💧 Riego perfecto", 800);
                console.log("[Vicos] ✓ Nivel agua: 1 - Estado óptimo");
            }
            else if (plot.waterLevel === 2) {
                plot.state = "watered2"; // Verde intenso
                this.score += waterPoints;
                this.hud.setScore(this.score);
                this.hud.message("💧💧 Planta muy saludable", 800);
                console.log("[Vicos] ✓ Nivel agua: 2 - Estado excelente");
            }
            else if (plot.waterLevel === 3) {
                plot.state = "overwatered"; // Naranja
                this.score = Math.max(0, this.score - overwaterPenalty);
                this.hud.setScore(this.score);
                this.hud.message("⚠️ ¡Demasiada agua!", 1200);
                console.log("[Vicos] ⚠ Nivel agua: 3 - Sobreregado");
            }
            else if (plot.waterLevel >= 4) {
                // ★ MUERTE PERMANENTE - YA NO SE PUEDE USAR ★
                plot.state = "excess";
                plot.isLocked = true; // Marcar como bloqueada
                this.score = Math.max(0, this.score - overwaterPenalty);
                this.hud.message("💀 ¡PLANTA AHOGADA! Parcela perdida", 2000);
                console.log("[Vicos] ✖ Nivel agua: 4+ - PLANTA MUERTA PERMANENTE");
            }

            this.hud?.updateScore?.(this.score);
            this._applyPlotVisual(plot);
            return;
        }
    }

    // ===========================
    // ★★★ SISTEMA DE CAPAS VISUAL ★★★
    // Capa 1 (baseMesh): Color de fondo
    // Capa 2 (mesh): Textura PNG encima
    // ===========================
    _applyPlotVisual(plot) {
        if (!plot?.mesh || !plot?.baseMesh) {
            console.warn("[Vicos] Plot sin meshes válidos:", plot);
            return;
        }

        // ═══════════════════════════════════════════
        // CAPA 1: COLOR DE FONDO (debajo del PNG)
        // ═══════════════════════════════════════════
        const baseMat = plot.baseMesh.material ?? new StandardMaterial(`baseMat_${plot.mesh.name}`, this.scene);
        plot.baseMesh.material = baseMat;

        // Asignar color según el estado
        baseMat.diffuseColor = this._getColorForState(plot.state);
        baseMat.alpha = 0.75; // Semitransparente
        baseMat.specularColor = new Color3(0, 0, 0);
        baseMat.emissiveColor = new Color3(0, 0, 0);
        baseMat.backFaceCulling = false;

        console.log(`[Vicos] Aplicando color ${plot.state}:`, baseMat.diffuseColor);

        // ═══════════════════════════════════════════
        // CAPA 2: TEXTURA PNG (encima, muestra solo la tierra)
        // ═══════════════════════════════════════════
        const texMat = plot.mesh.material ?? new StandardMaterial(`texMat_${plot.mesh.name}`, this.scene);
        plot.mesh.material = texMat;

        // Seleccionar textura según estado
        let texKey;
        if (plot.state === "dry") {
            texKey = "dry_soil";
        } else if (plot.state === "watered1" || plot.state === "watered2") {
            texKey = "soil_wet1";
        } else {
            texKey = "soil_base";
        }

        const texUrl = this.assetMap?.[texKey];
        if (texUrl) {
            const tex = new Texture(texUrl, this.scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
            tex.hasAlpha = true;
            texMat.diffuseTexture = tex;
            texMat.opacityTexture = tex;
            texMat.useAlphaFromDiffuseTexture = true;
            texMat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
        }

        // ★ IMPORTANTE: NO aplicar diffuseColor aquí, solo en la capa base
        texMat.specularColor = new Color3(0, 0, 0);
        texMat.emissiveColor = new Color3(0.02, 0.02, 0.02);
        texMat.backFaceCulling = false;
    }

    // ===========================
    // ★★★ TABLA DE COLORES ★★★
    // Colores claros para cada estado
    // ===========================
    _getColorForState(state) {
        const colorMap = {
            dry: new Color3(0.9, 0.1, 0.1),        // 🔴 Rojo intenso - INFÉRTIL PERMANENTE
            fertile: new Color3(1.0, 0.95, 0.2),   // 🟡 Amarillo brillante - Listo para sembrar
            seeded: new Color3(0.75, 0.9, 0.3),    // 🟢 Verde-amarillo - Recién sembrado
            watered1: new Color3(0.2, 0.85, 0.3),  // 🟢 Verde medio - Nivel óptimo 1
            watered2: new Color3(0.1, 0.75, 0.2),  // 🟢 Verde intenso - Nivel óptimo 2
            overwatered: new Color3(1.0, 0.5, 0.0),// 🟠 Naranja - Advertencia crítica
            excess: new Color3(0.95, 0.0, 0.0),    // 🔴 Rojo brillante - MUERTE PERMANENTE
        };

        const color = colorMap[state] ?? new Color3(1, 1, 1);
        console.log(`[Vicos] Color para estado '${state}':`, color);
        return color;
    }

    // ===========================
    // Config & Assets
    // ===========================
    _loadConfigForVicos() {
        try {
            this.experience = experiencesConfig.find((e) => e.id === this.experienceId);
            if (!this.experience) return false;

            this.miniConfig =
                this.experience.minigames?.find((m) => m.id === "m3Vicos") ||
                this.experience.minigames?.find((m) => m.type === "throw");

            if (!this.miniConfig) return false;

            const p = this.miniConfig.params || {};
            this.numberOfPlots = Number.isFinite(p.numberOfPlots) ? p.numberOfPlots : this.numberOfPlots;
            this.spawnRadius = Number.isFinite(p.spawnRadius) ? p.spawnRadius : this.spawnRadius;
            this.dryChance = Number.isFinite(p.dryChance) ? p.dryChance : this.dryChance;

            this.assetMap = Object.fromEntries(
                (this.miniConfig.assets || []).map((a) => [a.key, a.url])
            );

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
        const size = Math.max(2.5, this.spawnRadius * 2);
        const base = MeshBuilder.CreateGround("vicos_base", { width: size, height: size }, this.scene);

        const mat = new StandardMaterial("vicos_grid_mat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        mat.alpha = 0.15;
        base.material = mat;

        this.base = base;
    }

    _generateGridPositions() {
        this.gridPositions = [];
        const cellSize = this.spawnRadius / (this.gridSize / 2);
        let idx = 0;

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = (c - (this.gridSize / 2 - 0.5)) * cellSize;
                const z = (r - (this.gridSize / 2 - 0.5)) * cellSize;

                const isCenter = (r === 1 || r === 2) && (c === 1 || c === 2);
                this.gridPositions.push({
                    index: idx++,
                    pos: new Vector3(x, 0, z),
                    available: !isCenter,
                });
            }
        }

        console.log("[Minigame3Vicos] Grid 4x4 generado (centro bloqueado).");
    }

    _spawnInitialPlots() {
        const spawnable = this.gridPositions.filter((p) => p.available);
        const chosen = this._getRandomSubset(spawnable, this.numberOfPlots);

        for (const cell of chosen) {
            const state = Math.random() < this.dryChance ? "dry" : "fertile";
            this._spawnPlotAt(cell.pos, state);
        }

        console.log(`[Minigame3Vicos] ✓ Spawned ${this.plots.length} parcelas iniciales`);
    }

    // ===========================
    // ★★★ SPAWN CON SISTEMA DE CAPAS ★★★
    // Crea DOS planos: uno para color, otro para textura
    // ===========================
    _spawnPlotAt(position, state) {
        const plotSize = this.miniConfig.params?.plotSize || 0.3;

        // ═══════════════════════════════════════════
        // CAPA 1: Plano base de COLOR (debajo)
        // ═══════════════════════════════════════════
        const baseMesh = MeshBuilder.CreateGround(
            `vicos_base_${state}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            { width: plotSize, height: plotSize },
            this.scene
        );
        baseMesh.position = new Vector3(position.x, 0.002, position.z); // Pegado al suelo

        const baseMat = new StandardMaterial(`baseMat_${state}_${Date.now()}`, this.scene);
        baseMat.diffuseColor = this._getColorForState(state);
        baseMat.alpha = 0.75; // Semitransparente
        baseMat.specularColor = new Color3(0, 0, 0);
        baseMat.backFaceCulling = false;
        baseMesh.material = baseMat;

        // ═══════════════════════════════════════════
        // CAPA 2: Plano superior con TEXTURA PNG (encima)
        // ═══════════════════════════════════════════
        const textureMesh = MeshBuilder.CreateGround(
            `vicos_tex_${state}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            { width: plotSize, height: plotSize },
            this.scene
        );
        textureMesh.position = new Vector3(position.x, 0.006, position.z); // Ligeramente más alto

        const texMat = new StandardMaterial(`texMat_${state}_${Date.now()}`, this.scene);
        const texUrl = state === "dry" ? this.assetMap["dry_soil"] : this.assetMap["soil_base"];

        if (texUrl) {
            const tex = new Texture(texUrl, this.scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
            tex.hasAlpha = true;
            texMat.diffuseTexture = tex;
            texMat.opacityTexture = tex;
            texMat.useAlphaFromDiffuseTexture = true;
            texMat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
        }

        texMat.specularColor = new Color3(0, 0, 0);
        texMat.backFaceCulling = false;
        textureMesh.material = texMat;

        // ═══════════════════════════════════════════
        // Guardar AMBAS capas en el objeto plot
        // ═══════════════════════════════════════════
        const newPlot = {
            mesh: textureMesh,      // Capa superior (PNG)
            baseMesh: baseMesh,     // Capa inferior (COLOR)
            state,
            hasPlant: false,
            pos: position,
            waterLevel: 0,
            isLocked: state === "dry" // Suelo seco bloqueado desde el inicio
        };

        this.plots.push(newPlot);

        console.log(`[Vicos] ✓ Spawned parcela: estado=${state}, pos=${position.x.toFixed(2)},${position.z.toFixed(2)}`);
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
        console.log("[Minigame3Vicos] ⏰ Tiempo finalizado");
        this.hud?.showPopup?.({
            title: "¡Tiempo agotado!",
            message: `Puntaje final: ${this.score}`,
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
            try {
                p.mesh?.dispose();
                p.baseMesh?.dispose(); // ★ Eliminar ambas capas
            } catch (e) {
                console.warn("[Vicos] Error disposing plot:", e);
            }
        }
        this.plots = [];
    }

    dispose() {
        try {
            this._disposeAllPlots();
            this.base?.dispose();
            this.projectiles?.dispose();
        } catch (e) {
            console.warn("[Vicos] Error en dispose:", e);
        }
        this.hud?.stopTimer?.();
        console.log("[Minigame3Vicos] ✓ Recursos liberados.");
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