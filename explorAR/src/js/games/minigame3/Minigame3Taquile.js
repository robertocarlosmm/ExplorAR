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
        this.isRunning = false;
        this.isAnimating = false;

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
        this.stepSlots = 7; // dividir el ancho del escalón en 7
        this.targetSize = 0.28; // tamaño del png sobre el escalón

        this.steps = [];
        this.basePlane = null;
        this.slopePlane = null;

        this.stairsRoot = null; // solo los escalones se mueven
    }

    async start() {
        console.log("[Minigame3Taquile] Iniciando RA...");

        // HUD
        this.hud?.show?.();
        const totalTime = gameplayConfig?.timer?.default ?? 60;
        this.hud?.startTimer?.(totalTime, null, () => this._onTimeUp());
        this.hud?.updateScore?.(this.score);

        // cargar asset target desde experienceConfig
        this._resolveTargetAsset();

        // escena
        this.scene.clearColor = new Color3(0.1, 0.1, 0.15);

        // base y pendiente fijas (invisibles)
        this._createBaseAndSlope();

        // contenedor de escalones
        this.stairsRoot = new TransformNode("stairsRoot", this.scene);

        // escalones iniciales y targets en 1,3,5
        this._createInitialStairs();
        this._spawnRandomTargetsGlobal();

        // tap global para avanzar 6 escalones - TESTEO
        /*this.scene.onPointerDown = async () => {
            if (!this.isRunning || this.isAnimating) return;
            await this._advanceStep6();
        };*/

        this.isRunning = true;
        console.log("[Minigame3Taquile] Escalera lista. Tap para subir.");

        // Sistema de proyectiles tipo Vicos
        this.projectiles = new ProjectileSystem({
            scene: this.scene,
            hud: this.hud,
            projectileTypes: ["ball"], // una sola categoría
            projectileConfig: {
                ball: { hitRadius: 0.18, speed: 3, gravity: -2.5 }
            },
            assetMap: {}, // sin iconos PNG
            onHit: (type, mesh) => this._handleProjectileHit(mesh),
            speed: 3,
            gravity: -2.5,
            range: 6,
        });

        // Registrar targets PNG y overlays como objetivos
        this._registerProjectileTargets();

        // Escuchar el tap global
        window.addEventListener("click", () => this.projectiles.tap());

        // actualiza proxies cada frame para que sigan el movimiento
        this.scene.onBeforeRenderObservable.add(() => {
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
            // overlay = golpe incorrecto
            if (step.overlay) {
                const p = this._createWorldProxy(step.overlay);
                meshes.push(p);
            }

            // targets png = golpe correcto
            if (step.targets?.length) {
                for (const t of step.targets) {
                    const p = this._createWorldProxy(t);
                    meshes.push(p);
                }
            }
        }

        // registrar proxies
        this.projectiles.registerTargets(meshes);
    }



    _resolveTargetAsset() {
        const targetAsset = this.miniConfig.assets?.find(a => a.key === "target");
        this.targetUrl = targetAsset?.url || null;
        if (!this.targetUrl) {
            console.warn("[Taquile] target.png no definido en experienceConfig.");
        } else {
            console.log("[Taquile] target.png resuelto:", this.targetUrl);
        }
    }

    _createWorldProxy(mesh) {
        const proxy = new TransformNode(`proxy_${mesh.name}`, this.scene);
        proxy.position = mesh.getAbsolutePosition();
        proxy.metadata = { real: mesh };
        return proxy;
    }

    _handleProjectileHit(mesh) {
        if (!mesh) return;

        // Si es proxy, obtener el mesh real
        const real = mesh.metadata?.real || mesh;

        // Encontrar el escalón al que pertenece
        const step = this.steps.find(s =>
            s.overlay === real ||
            s.targets?.includes(real)
        );

        // Si no pertenece a ningún escalón → no hacer nada
        if (!step) {
            console.log("[Taquile] Impacto ignorado (zona vacía):", real.name);
            return;
        }

        // Impacto en TARGET (correcto)
        if (step.targets.includes(real)) {
            console.log("[Taquile] ✓ HIT CORRECTO (target) en escalón:", step.metadata.index);

            // Cambiar color del overlay (cuadrado de la malla) a VERDE
            step.overlay.material.diffuseColor = new Color3(0.1, 1.0, 0.1);
            step.overlay.material.alpha = 1.0;

            real._marked = true;
        }

        // Impacto en OVERLAY (incorrecto)
        else if (step.overlay === real) {
            console.log("[Taquile] ✗ HIT INCORRECTO (overlay) en escalón:", step.metadata.index);

            // Pintar overlay en ROJO
            step.overlay.material.diffuseColor = new Color3(1, 0.1, 0.1);
            step.overlay.material.alpha = 0.6;

            real._markedMiss = true;
        }

        // Verificar si completó los 6 targets
        if (this._allTargetsMarked()) {
            console.log("[Taquile] ★ Los 6 targets fueron completados → avanzar escaleras");
            this._processCompletedTargets();
        }
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

        // Resetear colores
        for (const s of this.steps) {
            if (s.overlay?.material) {
                s.overlay.material.diffuseColor = new Color3(0, 0, 0);
                s.overlay.material.alpha = 0;
            }
            if (s.targets) {
                for (const t of s.targets) t._marked = false;
            }
        }

        // Registrar targets nuevos
        this._registerProjectileTargets();

        this.isAnimating = false;
    }


    _createBaseAndSlope() {
        // Base horizontal invisible
        const matBase = new StandardMaterial("matBase", this.scene);
        matBase.alpha = 0;
        matBase.diffuseColor = new Color3(0, 0, 0);

        this.basePlane = MeshBuilder.CreatePlane(
            "basePlane",
            { width: this.slopeWidth, height: this.slopeWidth },
            this.scene
        );
        this.basePlane.rotation.x = Math.PI / 2;
        this.basePlane.position = new Vector3(0, 0, 0);
        this.basePlane.material = matBase;
        this.basePlane.visibility = 0;

        // Pendiente fija invisible
        const matSlope = new StandardMaterial("matSlope", this.scene);
        matSlope.alpha = 0;
        matSlope.diffuseColor = new Color3(0, 0, 0);

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
            // horizontales
            step.rotation.x = this.xRotation;

            // posición relativa dentro del root
            const y = i * this.stepHeight;
            const z = i * this.stepDepth;
            step.position = new Vector3(0, y, z);
            step.material = matStep;
            step.parent = this.stairsRoot;
            step.metadata = { index: i };
            step.targets = []; // contenedor de targets sobre este escalón
            this.steps.push(step);

            // Crear overlay semitransparente, CONGRUENTE con el escalón y pegado a él
            const overlay = MeshBuilder.CreatePlane(
                `overlay_${i}`,
                { width: this.stepWidth, height: this.stepDepth },
                this.scene
            );

            // Parent al escalón y alineación exacta
            overlay.parent = step;
            overlay.position = new Vector3(0, 0.001, 0);      // pegadito encima
            overlay.rotation.x = 0;                           // ya hereda del padre (step)
            overlay.rotation.y = 0;
            overlay.rotation.z = 0;

            // Material semitransparente neutro
            const matOverlay = new StandardMaterial(`matOverlay_${i}`, this.scene);
            matOverlay.diffuseColor = new Color3(0.2, 0.8, 0.9); // o gris (0.5,0.5,0.5)
            matOverlay.alpha = 0.35;                             // semitransparente
            matOverlay.specularColor = new Color3(0, 0, 0);      // sin brillo
            overlay.material = matOverlay;

            overlay.renderingGroupId = 1;
            step.overlay = overlay;


        }

        // alinear el root con la pendiente
        const slopeOrigin = this.slopePlane.position.clone();
        this.stairsRoot.position = new Vector3(
            slopeOrigin.x,
            slopeOrigin.y - 0.5,
            slopeOrigin.z - 1.2
        );
    }

    _spawnRandomTargetsGlobal() {
        if (!this.targetUrl) return;

        // Limpiar targets previos
        for (const s of this.steps) this._disposeTargets(s);

        // Material transparente correctamente configurado
        const matTarget = new StandardMaterial("matTarget", this.scene);
        const tex = new Texture(this.targetUrl, this.scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
        tex.hasAlpha = true;

        matTarget.diffuseTexture = tex;
        matTarget.opacityTexture = tex;
        matTarget.useAlphaFromDiffuseTexture = true;
        matTarget.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
        matTarget.backFaceCulling = false;
        matTarget.specularColor = new Color3(0, 0, 0);
        matTarget.emissiveColor = new Color3(1, 1, 1); // Opcional: brillo ligero

        const totalTargets = 6;
        const maxPerStep = 2;
        const stepIndices = [];

        while (stepIndices.length < totalTargets) {
            const idx = Math.floor(Math.random() * this.steps.length);
            const count = stepIndices.filter(i => i === idx).length;
            if (count < maxPerStep) stepIndices.push(idx);
        }

        for (const idx of stepIndices) {
            const step = this.steps[idx];
            if (!step?.overlay) continue;

            const slotIdx = Math.floor(Math.random() * this.stepSlots);
            const w = this.stepWidth;
            const margin = w * 0.05;
            const usable = w - margin * 2;
            const slotWidth = usable / this.stepSlots;
            const x = -w / 2 + margin + slotWidth * (slotIdx + 0.5);

            const y = step.overlay.position.y + 0.015;
            const z = step.overlay.position.z;

            const target = MeshBuilder.CreatePlane(`target_${idx}_${slotIdx}`, {
                width: this.targetSize,
                height: this.targetSize,
            }, this.scene);

            target.position = new Vector3(x, 0.002, 0);
            target.rotation.x = 0;
            target.material = matTarget;
            target.renderingGroupId = 2; // más alto para dibujar encima
            target.parent = step.overlay;

            if (!step.targets) step.targets = [];
            step.targets.push(target);
        }
        this._registerProjectileTargets();

    }



    _disposeTargets(step) {
        if (!step?.targets) return;
        for (const t of step.targets) {
            t?.dispose();
        }
        step.targets = [];
    }

    _pickTwoDistinct(min, max) {
        const a = Math.floor(Math.random() * (max - min + 1)) + min;
        let b = Math.floor(Math.random() * (max - min + 1)) + min;
        while (b === a) b = Math.floor(Math.random() * (max - min + 1)) + min;
        return [a, b];
    }

    async _advanceStep6() {
        if (this.steps.length === 0) return;
        this.isAnimating = true;
        console.log("[Taquile] Avanzar 6 gradas: crear arriba → deslizar → eliminar abajo → regenerar targets");

        // 1) crear 6 nuevos arriba
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

            //overlay
            const overlay = MeshBuilder.CreatePlane(
                `overlay_${newIndex}`,
                { width: this.stepWidth, height: this.stepDepth },
                this.scene
            );

            // Parent y alineación local
            overlay.parent = newStep;
            overlay.position = new Vector3(0, 0.001, 0);

            // Material semitransparente
            const matOverlay = new StandardMaterial(`matOverlay_${i}`, this.scene);
            matOverlay.diffuseColor = new Color3(0, 0, 0); // color irrelevante
            matOverlay.alpha = 0;                         // INVISIBLE total
            matOverlay.specularColor = new Color3(0, 0, 0);

            overlay.material = matOverlay;

            overlay.renderingGroupId = 1;
            newStep.overlay = overlay;


        }

        // 2) animar el conjunto Y- y Z- (hacia la cámara) la distancia de 6 escalones
        const moveY = this.stepHeight * 6;
        const moveZ = this.stepDepth * 6;
        await this._animateStairsDownForward(moveY, moveZ);

        // 3) eliminar los 6 inferiores y sus targets
        for (let i = 0; i < 6; i++) {
            const s = this.steps.shift();
            if (s) {
                this._disposeTargets(s);
                s.dispose();
            }
        }

        // 4) regenerar targets 
        this._spawnRandomTargetsGlobal();
        this._reflowStepsFromZero();

        this.isAnimating = false;
    }

    _reflowStepsFromZero() {
        if (this.steps.length === 0) return;

        // Toma como base el primero
        const baseY = this.steps[0].position.y;
        const baseZ = this.steps[0].position.z;

        // Reindexa y reasigna posiciones exactas sin flotantes acumulados
        for (let i = 0; i < this.steps.length; i++) {
            const step = this.steps[i];
            step.metadata.index = i; // opcional, si quieres mantener correlativo
            step.position.y = baseY + i * this.stepHeight;
            step.position.z = baseZ + i * this.stepDepth;

            // El overlay ahora es hijo del step y tiene pos local (0, 0.001, 0),
            // por lo que no requiere ajustes: siempre quedará pegado.
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
            const endY = startY - deltaY;  // baja
            const startZ = this.stairsRoot.position.z;
            const endZ = startZ - deltaZ;  // avanza hacia la cámara

            animY.setKeys([{ frame: 0, value: startY }, { frame: 60, value: endY }]);
            animZ.setKeys([{ frame: 0, value: startZ }, { frame: 60, value: endZ }]);

            const easing = new SineEase();
            easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
            animY.setEasingFunction(easing);
            animZ.setEasingFunction(easing);

            // duración visible
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
        this.hud?.showPopup?.({
            title: "Tiempo agotado",
            message: "Fin del minijuego de Taquile",
            buttonText: "Continuar",
            onClose: () => this._endGame(),
        });
    }

    _endGame() {
        this.isRunning = false;
        this.onGameEnd?.();
    }

    dispose() {
        // limpiar targets
        for (const s of this.steps) this._disposeTargets(s);
        this.steps.forEach((s) => s.dispose());
        this.basePlane?.dispose();
        this.slopePlane?.dispose();
        this.hud?.stopTimer?.();
        console.log("[Minigame3Taquile] Recursos liberados");
    }
}
