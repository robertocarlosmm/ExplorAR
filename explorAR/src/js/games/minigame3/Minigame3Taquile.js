import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders";
import {
    TransformNode,
    Vector3,
    StandardMaterial,
    Color3,
    MeshBuilder,
    Animation,
    SineEase,
    EasingFunction
} from "@babylonjs/core";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { gameplayConfig } from "../../../config/gameplayConfig.js";
import { experiencesConfig } from "../../../config/experienceConfig.js";
import { ProjectileSystem } from "./ProjectilSystem.js";


export class Minigame3Taquile {
    constructor({ scene, hud, experienceId, startingScore = 0 }) {
        this.scene = scene;
        this.hud = hud;
        this.experienceId = experienceId;
        this.exp = experiencesConfig.find((e) => e.id === this.experienceId);
        this.miniConfig = this.exp.minigames?.find((m) => m.id === "m3Taquile");
        this.score = startingScore;
        this.timer = null;
        this.projectiles = null;
        this._tapHandler = null;
        this._proxyObserver = null;

        this.isRunning = false;
        this.isAnimating = false;

        //score
        // Puntajes desde gameplayConfig
        this.pointsHit = gameplayConfig.scoring?.m3Taquile?.completeBonus ?? 15;
        this.pointsFail = gameplayConfig.scoring?.m3Taquile?.failPenalty ?? 1;
        this.timeBonusPerSec = gameplayConfig.scoring?.m3Taquile?.timeBonusPerSec ?? 2;
        this.startingScore = startingScore;


        // Geometría de escalera
        this.stepWidth = 2.4;
        this.stepDepth = 0.45;
        this.stepHeight = 0.25;
        this.visibleSteps = 6;
        this.xRotation = Math.PI / 3

        // Pendiente fija (invisible)
        this.slopeAngleRad = Math.PI / 6; // ~30°
        this.slopeWidth = 6;
        this.slopeLength = 10;

        // Targets
        this.targetUrl = null;
        this.targetsPerStep = 2;
        this.stepSlots = 7;
        this.targetSize = 0.28;
        this.indicatorSize = 0.32; // Ligeramente más grande que el target

        this.steps = [];
        this.basePlane = null;
        this.slopePlane = null;
        this.stairsRoot = null;
    }

    async start() {
        //console.log("[Minigame3Taquile] Iniciando RA...");

        this.hud?.show?.();
        const totalTime = gameplayConfig.timeSequence[3] || 60;
        this.hud?.startTimer?.(totalTime, null, () => this._onTimeUp());
        this.hud?.setScore?.(this.score);

        this._resolveTargetAsset();
        this.scene.clearColor = new Color3(0.1, 0.1, 0.15);

        this._createBaseAndSlope();
        this.stairsRoot = new TransformNode("stairsRoot", this.scene);

        this._createInitialStairs();
        this._spawnRandomTargetsGlobal();

        this.isRunning = true;
        //console.log("[Minigame3Taquile] Escalera lista.");

        this.projectiles = new ProjectileSystem({
            scene: this.scene,
            hud: this.hud,
            projectileTypes: ["ball"],
            projectileConfig: {
                ball: { hitRadius: 0.18, speed: 3, gravity: -2.5 }
            },
            assetMap: {},
            onHit: (type, mesh) => this._handleProjectileHit(mesh),
            speed: 3,
            gravity: -2.5,
            range: 6,
        });

        this._registerProjectileTargets();

        // Guardar handler para poder removerlo en dispose()
        this._tapHandler = () => this.projectiles.tap();
        window.addEventListener("click", this._tapHandler);

        // Guardar observer para poder removerlo en dispose()
        this._proxyObserver = this.scene.onBeforeRenderObservable.add(() => {
            for (const proxy of this.projectiles.targets) {
                const real = proxy.metadata?.real;
                if (real) proxy.position = real.getAbsolutePosition();
            }
        });

    }

    _registerProjectileTargets() {
        if (!this.projectiles) return;

        const meshes = [];

        for (const step of this.steps) {
            // Registrar solo los targets PNG (no el overlay completo)
            if (step.targets?.length) {
                for (const t of step.targets) {
                    const p = this._createWorldProxy(t);
                    meshes.push(p);
                }
            }
        }

        this.projectiles.registerTargets(meshes);
    }

    _resolveTargetAsset() {
        const targetAsset = this.miniConfig.assets?.find(a => a.key === "target");
        this.targetUrl = targetAsset?.url || null;
        if (!this.targetUrl) {
            console.warn("[Taquile] target.png no definido en experienceConfig.");
        } else {
            //console.log("[Taquile] target.png resuelto:", this.targetUrl);
        }
    }

    _createWorldProxy(mesh) {
        const proxy = new TransformNode(`proxy_${mesh.name}`, this.scene);
        proxy.position = mesh.getAbsolutePosition();
        proxy.metadata = { real: mesh };
        return proxy;
    }

    _handleProjectileHit(mesh) {
        if (!this.isRunning) return;

        // ❌ Lanzamiento fallado (no golpeó target real)
        if (!mesh || !mesh.metadata?.real) {
            this.score = Math.max(0, this.score - this.pointsFail);
            this.hud?.setScore?.(this.score);
            //console.log("[Taquile] ❌ Fallo → -" + this.pointsFail);
            return;
        }

        const real = mesh.metadata.real;

        // Encontrar el escalón y el target específico
        let targetStep = null;
        let hitTarget = null;

        for (const step of this.steps) {
            if (step.targets?.includes(real)) {
                targetStep = step;
                hitTarget = real;
                break;
            }
        }

        if (!hitTarget) {
            // Miss silencioso
            this.score = Math.max(0, this.score - this.pointsFail);
            this.hud?.setScore?.(this.score);
            //console.log("[Taquile] ❌ Fallo → -" + this.pointsFail);
            return;
        }

        // Doble hit ignorado
        if (hitTarget._marked) return;

        // Marcar hit correcto
        hitTarget._marked = true;
        this._showTargetIndicator(hitTarget, new Color3(0.1, 1.0, 0.1));

        // Sumar por acierto
        this.score += this.pointsHit;
        this.hud.message("¡Muy bien!", 1200);
        this.hud?.setScore?.(this.score);
        //console.log("[Taquile] ✓ HIT → +" + this.pointsHit);

        if (this._allTargetsMarked()) {
            //console.log("[Taquile] ★ Targets completados");
            this._processCompletedTargets();
        }
    }


    _showTargetIndicator(targetMesh, color) {
        // Crear cuadradito detrás del target
        const indicator = MeshBuilder.CreatePlane(
            `indicator_${targetMesh.name}`,
            { width: this.indicatorSize, height: this.indicatorSize },
            this.scene
        );

        // Material sólido del color especificado
        const mat = new StandardMaterial(`mat_indicator_${targetMesh.name}`, this.scene);
        mat.diffuseColor = color;
        mat.specularColor = new Color3(0, 0, 0);
        mat.emissiveColor = color.scale(0.3); // Brillo suave
        indicator.material = mat;

        // Posicionar detrás del target (renderingGroupId más bajo)
        indicator.parent = targetMesh.parent; // mismo parent que el target
        indicator.position.copyFrom(targetMesh.position);
        indicator.position.y -= 0.001; // Ligeramente atrás
        indicator.rotation.copyFrom(targetMesh.rotation);
        indicator.renderingGroupId = 1; // target está en 2

        // Guardar referencia en el target
        targetMesh._indicator = indicator;
    }

    _allTargetsMarked() {
        let count = 0;
        for (const step of this.steps) {
            for (const t of step.targets) {
                if (t._marked) count++;
            }
        }
        return count >= 6;
    }

    async _processCompletedTargets() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        // Animación subir escalones
        await this._advanceStep6();

        // Resetear marcas (los indicadores se eliminan con dispose)
        for (const s of this.steps) {
            if (s.targets) {
                for (const t of s.targets) {
                    t._marked = false;
                    t._indicator = null;
                }
            }
        }

        this._registerProjectileTargets();
        this.isAnimating = false;
    }

    _createBaseAndSlope() {
        const matBase = new StandardMaterial("matBase", this.scene);
        matBase.alpha = 0;
        this.basePlane = MeshBuilder.CreatePlane(
            "basePlane",
            { width: this.slopeWidth, height: this.slopeWidth },
            this.scene
        );
        this.basePlane.rotation.x = Math.PI / 2;
        this.basePlane.position = new Vector3(0, 0, 0);
        this.basePlane.material = matBase;
        this.basePlane.visibility = 0;

        const matSlope = new StandardMaterial("matSlope", this.scene);
        matSlope.alpha = 0;
        this.slopePlane = MeshBuilder.CreatePlane(
            "slopePlane",
            { width: this.slopeWidth, height: this.slopeLength },
            this.scene
        );
        this.slopePlane.rotation.x = this.slopeAngleRad;
        this.slopePlane.position = new Vector3(0, 1.0, 2.8);
        this.slopePlane.material = matSlope;
        this.slopePlane.visibility = 0;
    }

    _createInitialStairs() {
        const matStep = new StandardMaterial("matStep", this.scene);
        matStep.diffuseColor = new Color3(0.33, 0.43, 0.52);
        matStep.alpha = 0.85;

        this.steps = [];
        for (let i = 0; i < this.visibleSteps; i++) {
            const step = MeshBuilder.CreatePlane(
                `step_${i}`,
                { width: this.stepWidth, height: this.stepDepth },
                this.scene
            );
            step.rotation.x = this.xRotation;

            const y = i * this.stepHeight;
            const z = i * this.stepDepth;
            step.position = new Vector3(0, y, z);
            step.material = matStep;
            step.parent = this.stairsRoot;
            step.metadata = { index: i };
            step.targets = [];
            this.steps.push(step);
        }

        const slopeOrigin = this.slopePlane.position.clone();
        this.stairsRoot.position = new Vector3(
            slopeOrigin.x,
            slopeOrigin.y - 0.5,
            slopeOrigin.z - 1.2
        );
    }

    _spawnRandomTargetsGlobal() {
        if (!this.targetUrl) return;

        // Limpiar targets anteriores
        for (const s of this.steps) this._disposeTargets(s);

        const matTarget = new StandardMaterial("matTarget", this.scene);
        const tex = new Texture(this.targetUrl, this.scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
        tex.hasAlpha = true;

        matTarget.diffuseTexture = tex;
        matTarget.opacityTexture = tex;
        matTarget.useAlphaFromDiffuseTexture = true;
        matTarget.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
        matTarget.backFaceCulling = false;

        const totalTargets = 6;
        const maxPerStep = 2;

        // --- NUEVO: asegurar pasos con máximo 2 slots únicos ---
        const stepCounts = Array(this.steps.length).fill(0);
        const finalPositions = [];

        while (finalPositions.length < totalTargets) {
            const stepIndex = Math.floor(Math.random() * this.steps.length);
            if (stepCounts[stepIndex] >= maxPerStep) continue;

            const slotIndex = Math.floor(Math.random() * this.stepSlots);

            // evitar duplicados exactos step-slot
            if (finalPositions.some(p => p.step === stepIndex && p.slot === slotIndex)) continue;

            finalPositions.push({ step: stepIndex, slot: slotIndex });
            stepCounts[stepIndex]++;
        }

        // --- Crear los 6 targets garantizados ---
        for (const pos of finalPositions) {
            const step = this.steps[pos.step];

            const w = this.stepWidth;
            const margin = w * 0.05;
            const usable = w - margin * 2;
            const slotWidth = usable / this.stepSlots;
            const x = -w / 2 + margin + slotWidth * (pos.slot + 0.5);

            const target = MeshBuilder.CreatePlane(
                `target_${pos.step}_${pos.slot}`,
                { width: this.targetSize, height: this.targetSize },
                this.scene
            );

            target.position = new Vector3(x, 0.002, 0);
            target.material = matTarget;
            target.renderingGroupId = 2;
            target.parent = step;

            if (!step.targets) step.targets = [];
            step.targets.push(target);
        }

        this._registerProjectileTargets();
    }


    _disposeTargets(step) {
        if (!step?.targets) return;
        for (const t of step.targets) {
            // Eliminar indicador si existe
            if (t._indicator) {
                t._indicator.dispose();
                t._indicator = null;
            }
            t?.dispose();
        }
        step.targets = [];
    }

    async _advanceStep6() {
        if (this.steps.length === 0) return;
        this.isAnimating = true;
        //console.log("[Taquile] Avanzar 6 gradas");

        // Crear 6 nuevos arriba
        for (let i = 0; i < 6; i++) {
            const last = this.steps[this.steps.length - 1];
            const newIndex = last.metadata.index + 1;
            const y = last.position.y + this.stepHeight;
            const z = last.position.z + this.stepDepth;

            const newStep = MeshBuilder.CreatePlane(
                `step_${newIndex}`,
                { width: this.stepWidth, height: this.stepDepth },
                this.scene
            );
            newStep.rotation.x = this.xRotation;
            newStep.position = new Vector3(0, y, z);
            newStep.material = last.material;
            newStep.parent = this.stairsRoot;
            newStep.metadata = { index: newIndex };
            newStep.targets = [];
            this.steps.push(newStep);
        }

        // Animar
        const moveY = this.stepHeight * 6;
        const moveZ = this.stepDepth * 6;
        await this._animateStairsDownForward(moveY, moveZ);

        // Eliminar los 6 inferiores
        for (let i = 0; i < 6; i++) {
            const s = this.steps.shift();
            if (s) {
                this._disposeTargets(s);
                s.dispose();
            }
        }

        this._spawnRandomTargetsGlobal();
        this._reflowStepsFromZero();

        this.isAnimating = false;
    }

    _reflowStepsFromZero() {
        if (this.steps.length === 0) return;

        const baseY = this.steps[0].position.y;
        const baseZ = this.steps[0].position.z;

        for (let i = 0; i < this.steps.length; i++) {
            const step = this.steps[i];
            step.metadata.index = i;
            step.position.y = baseY + i * this.stepHeight;
            step.position.z = baseZ + i * this.stepDepth;
        }
    }

    _animateStairsDownForward(deltaY, deltaZ) {
        return new Promise((resolve) => {
            const animY = new Animation(
                "stairsDownY",
                "position.y",
                60,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            const animZ = new Animation(
                "stairsForwardZ",
                "position.z",
                60,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            const startY = this.stairsRoot.position.y;
            const endY = startY - deltaY;
            const startZ = this.stairsRoot.position.z;
            const endZ = startZ - deltaZ;

            animY.setKeys([{ frame: 0, value: startY }, { frame: 60, value: endY }]);
            animZ.setKeys([{ frame: 0, value: startZ }, { frame: 60, value: endZ }]);

            const easing = new SineEase();
            easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
            animY.setEasingFunction(easing);
            animZ.setEasingFunction(easing);

            this.scene.beginDirectAnimation(
                this.stairsRoot,
                [animY, animZ],
                0,
                60,
                false,
                0.85,
                () => resolve()
            );
        });
    }

    _onTimeUp() {
        //console.log("[Taquile] ⏰ Tiempo finalizado");

        this.hud?.stopTimer();

        this.hud.showEndPopup({
            score: this.score,
            timeExpired: false,
            onRetry: () => this._restart(),
            onContinue: () => this._endGame()
        });
    }

    _restart() {
        //console.log("[Taquile] Reiniciando minijuego...");
        this.dispose();

        this.score = this.startingScore;
        this.hud?.setScore?.(this.startingScore);

        this.start();
    }

    _endGame() {
        this.isRunning = false;
        this.dispose();
        this.onGameEnd?.();
    }


    dispose() {
        // 1. Quitar listener de click
        if (this._tapHandler) {
            window.removeEventListener("click", this._tapHandler);
            this._tapHandler = null;
        }

        // 2. Quitar observer del onBeforeRender
        if (this._proxyObserver) {
            this.scene.onBeforeRenderObservable.remove(this._proxyObserver);
            this._proxyObserver = null;
        }

        // 3. Disponer sistema de proyectiles
        if (this.projectiles) {
            this.projectiles.dispose?.();
            this.projectiles = null;
        }

        // 4. Limpiar escalones y planos
        for (const s of this.steps) this._disposeTargets(s);
        this.steps.forEach((s) => s.dispose());
        this.steps = [];

        this.stairsRoot?.dispose();
        this.stairsRoot = null;

        this.basePlane?.dispose();
        this.basePlane = null;

        this.slopePlane?.dispose();
        this.slopePlane = null;

        // 5. Timer HUD
        this.hud?.stopTimer?.();

        //console.log("[Minigame3Taquile] Recursos liberados");
    }

}