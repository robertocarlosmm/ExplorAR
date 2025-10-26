// EquipmentGame.js (versión mejorada con sistema de encaje tipo puzzle y depuración completa)
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders";
import {
    TransformNode,
    Vector3,
    StandardMaterial,
    Texture,
    Color3,
    MeshBuilder,
    ActionManager,
    ExecuteCodeAction,
    Animation,
    EasingFunction,
    SineEase
} from "@babylonjs/core";
import { gameplayConfig } from "../../../config/gameplayConfig.js";
import { experiencesConfig } from "../../../config/experienceConfig.js";

export class EquipmentGame {
    constructor({ scene, hud, correctKeys, incorrectKeys, feedbacks, assetMap, experienceId, startingScore = 0 }) {
        this.scene = scene;
        this.hud = hud;
        this.correctKeys = correctKeys;
        this.incorrectKeys = incorrectKeys;
        this.feedbacks = feedbacks;
        this.assetMap = assetMap;
        this.experienceId = experienceId;

        this.backpack = null;
        this.pieces = [];
        this.slots = [];
        this.timeLimit = gameplayConfig.timeSequence[1] || 45;
        this.score = Number(startingScore) || 0;
        this.scoreInicial = Number(startingScore) || 0;
        this.onGameEnd = null;
        this._draggedPiece = null;

        // Configuración de plano vertical compartido
        this._planeZ = 0.7;
        this._slotYOff = 0.2;
        this._itemsYOff = 0.18;
    }

    async start() {
        console.log("[EquipmentGame] Iniciando minijuego de equipamiento...");

        this.hud.setScore(this.score);
        this.hud.setTime(this.timeLimit);
        this.hud.startTimer(this.timeLimit, null, () => this._onTimeUp());

        await this._loadBackpack();
        if (!this.backpack) {
            console.error("[EquipmentGame] No se pudo cargar la mochila.");
            return;
        }

        this._createSlots();
        this._spawnItems();
        this._trackDragging();
    }

    async _loadBackpack() {
        const experience = experiencesConfig.find(e => e.id === this.experienceId);
        const backpackAsset = experience?.minigames?.find(m => m.id === "equipment")?.assets?.find(a => a.key === "backpack");
        if (!backpackAsset?.url) {
            console.warn("[EquipmentGame] No se encontró la URL de 'backpack'.");
            return;
        }

        console.log("[EquipmentGame] Cargando modelo de mochila:", backpackAsset.url);
        await SceneLoader.AppendAsync(backpackAsset.url, "", this.scene);

        this.backpack = new TransformNode("BackpackNode", this.scene);
        this.scene.meshes.forEach(mesh => {
            if (!mesh.parent && mesh !== this.backpack) mesh.parent = this.backpack;
        });

        this.backpack.position = new Vector3(0, 1.0, this._planeZ);
        this.backpack.scaling = new Vector3(0.6, 0.6, 0.6);

        console.log("[EquipmentGame] Mochila posicionada en:", this.backpack.position);
    }

    _createSlots() {
        const origin = this.backpack.position.clone();
        const gapX = 0.13;
        const baseY = origin.y + this._slotYOff;
        const baseZ = this._planeZ;

        console.log("[EquipmentGame] Creando slots de equipamiento...");

        for (let i = 0; i < 4; i++) {
            const x = origin.x - 0.195 + i * gapX;
            const y = baseY;
            const position = new Vector3(x, y, baseZ);

            const slotPlane = MeshBuilder.CreatePlane("slot-bg-" + i, { size: 0.11 }, this.scene);
            const mat = new StandardMaterial("slot-mat-" + i, this.scene);
            mat.diffuseColor = new Color3(1, 1, 1);
            mat.alpha = 0.25;
            slotPlane.material = mat;
            slotPlane.position = position;

            this.slots.push({ position, occupant: null, mesh: slotPlane });
            console.log(`  → Slot ${i} @ (${x.toFixed(2)}, ${y.toFixed(2)}, ${baseZ.toFixed(2)})`);
        }
    }

    _spawnItems() {
        const allKeys = [...this.correctKeys, ...this.incorrectKeys];
        const baseY = this.backpack.position.y - this._itemsYOff;
        const baseZ = this._planeZ;
        const startX = -0.33;
        const stepX = 0.22;
        const size = 0.085;

        console.log("[EquipmentGame] Spawneando ítems debajo de la mochila...");

        allKeys.forEach((key, i) => {
            const mat = new StandardMaterial("mat-" + key, this.scene);
            mat.diffuseTexture = new Texture(this.assetMap[key], this.scene);
            mat.diffuseTexture.hasAlpha = true;
            mat.backFaceCulling = false;
            mat.emissiveColor = new Color3(1, 1, 1);

            const icon = MeshBuilder.CreatePlane("piece-icon-" + key, { size }, this.scene);
            icon.material = mat;

            const x = startX + i * stepX;
            icon.position = new Vector3(x, baseY, baseZ);

            icon.metadata = {
                key,
                correct: this.correctKeys.includes(key),
                originalPosition: icon.position.clone(),
                slotIndex: null
            };

            this._enableInteraction(icon);
            this.pieces.push(icon);
            console.log(`  → Item ${key} en (${x.toFixed(2)}, ${baseY.toFixed(2)}, ${baseZ.toFixed(2)})`);
        });
    }

    _enableInteraction(mesh) {
        mesh.actionManager = new ActionManager(this.scene);
        mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPickDownTrigger, () => this._onDragStart(mesh))
        );
        mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPickUpTrigger, () => this._onDrop(mesh))
        );
    }

    _onDragStart(mesh) {
        mesh.isDragging = true;
        this._draggedPiece = mesh;
        mesh.scaling = new Vector3(1.06, 1.06, 1.06);
        mesh.material.emissiveColor = new Color3(0.8, 0.8, 1);
        console.log(`[EquipmentGame] Arrastrando ${mesh.name} desde ${mesh.position.toString()}`);
    }

    _onDrop(mesh) {
        console.log(`[EquipmentGame] Soltando ${mesh.name} en posición: ${mesh.position.toString()}`);
        mesh.isDragging = false;
        this._draggedPiece = null;
        mesh.scaling = new Vector3(1, 1, 1);
        mesh.material.emissiveColor = new Color3(1, 1, 1);

        const snapThreshold = 0.12;
        const slot = this._nearestSlot2D(mesh.position, snapThreshold);

        if (slot) {
            console.log(`[EquipmentGame] Encaje detectado con slot ${this.slots.indexOf(slot)}`);

            if (mesh.metadata.slotIndex !== null) {
                const prev = this.slots[mesh.metadata.slotIndex];
                prev.occupant = null;
                prev.mesh.material.diffuseColor = new Color3(1, 1, 1);
                prev.mesh.material.alpha = 0.25;
            }

            mesh.position.set(slot.position.x, slot.position.y, this._planeZ);
            slot.occupant = mesh;
            mesh.metadata.slotIndex = this.slots.indexOf(slot);

            slot.mesh.material.diffuseColor = new Color3(0.3, 1, 0.3);
            slot.mesh.material.alpha = 0.4;

            // animación de rebote
            const anim = new Animation("snapBounce", "position.y", 60, Animation.ANIMATIONTYPE_FLOAT);
            const baseY = slot.position.y;
            anim.setKeys([
                { frame: 0, value: baseY },
                { frame: 10, value: baseY + 0.015 },
                { frame: 20, value: baseY }
            ]);
            const easing = new SineEase();
            easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
            anim.setEasingFunction(easing);
            mesh.animations = [anim];
            this.scene.beginAnimation(mesh, 0, 20, false);
        } else {
            console.log(`[EquipmentGame] No encajó, devolviendo ${mesh.name} a su origen.`);
            this._returnToOrigin(mesh);
        }

        const total = this.slots.filter(s => s.occupant).length;
        console.log(`[EquipmentGame] Slots ocupados: ${total}/${this.slots.length}`);
        if (total === this.slots.length) setTimeout(() => this._evaluate(), 400);
    }

    _returnToOrigin(mesh) {
        const origin = mesh.metadata.originalPosition.clone();
        mesh.metadata.slotIndex = null;

        // Animación simple de retorno
        const animX = new Animation("returnX", "position.x", 60, Animation.ANIMATIONTYPE_FLOAT);
        animX.setKeys([
            { frame: 0, value: mesh.position.x },
            { frame: 20, value: origin.x }
        ]);

        const animY = new Animation("returnY", "position.y", 60, Animation.ANIMATIONTYPE_FLOAT);
        animY.setKeys([
            { frame: 0, value: mesh.position.y },
            { frame: 20, value: origin.y }
        ]);

        mesh.animations = [animX, animY];
        this.scene.beginAnimation(mesh, 0, 20, false);

        // asegurar posición final
        setTimeout(() => {
            mesh.position.copyFrom(origin);
            console.log(`[EquipmentGame] ${mesh.name} restaurado a posición original:`, origin.toString());
        }, 350);
    }

    _nearestSlot2D(pos, threshold) {
        let best = null;
        let min = threshold;
        for (const slot of this.slots) {
            const dx = slot.position.x - pos.x;
            const dy = slot.position.y - pos.y;
            const dist = Math.hypot(dx, dy);
            if (dist < min && !slot.occupant) {
                best = slot;
                min = dist;
            }
        }
        return best;
    }

    _trackDragging() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this._draggedPiece) return;
            const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
            if (!pick?.pickedPoint) return;

            const newPos = pick.pickedPoint.clone();
            newPos.z = this._planeZ;
            this._draggedPiece.position.copyFrom(newPos);
        });
    }

    _evaluate() {
        console.log("[EquipmentGame] Evaluando resultado...");
        this.hud.stopTimer(); // pausa el tiempo durante la evaluación

        const experience = experiencesConfig.find(e => e.id === this.experienceId);
        const mg = experience?.minigames?.find(m => m.id === "equipment");
        const feedbacks = mg?.params?.feedbacks || {};

        let correct = 0;
        const incorrectKeys = [];

        for (const slot of this.slots) {
            const item = slot.occupant;
            if (item && item.metadata.correct) {
                correct++;
                console.log(`  ✓ ${item.metadata.key} correcto`);
            } else if (item) {
                console.log(`  ✗ ${item.metadata.key} incorrecto`);
                item.material.diffuseColor = new Color3(1, 0.3, 0.3);
                incorrectKeys.push(item.metadata.key);
            }
        }

        console.log(`[EquipmentGame] Resultado final: ${correct}/${this.slots.length} correctos.`);

        if (correct === this.slots.length) {
            // todos correctos → gana
            this._win();
        } else {
            // hay incorrectos → mostrar popup de pistas
            const pistas = incorrectKeys
                .map(k => `• ${feedbacks[k] || "Revisa este elemento"}`)
                .join("<br>");

            const htmlMsg = `
            Hay ${incorrectKeys.length} incorrecto${incorrectKeys.length > 1 ? "s" : ""}.<br>
            <br><strong>Pistas:</strong><br>${pistas}
        `;

            this.hud.showHintPopup({
                html: htmlMsg,
                onClose: () => {
                    setTimeout(() => {
                        console.log("[EquipmentGame] Reanudando tiempo tras pistas...");
                        this.hud.startTimer(this.hud._timeLeft, null, () => this._onTimeUp());
                    }, 1000);
                }
            });
        }
    }


    _win() {
        this.hud.stopTimer();

        // Usa el tiempo que muestra el HUD
        const remaining = Math.max(0, this.hud._timeLeft);

        const base = Number(gameplayConfig.scoring.equipment.base ?? 60);
        const bonus = Number(gameplayConfig.scoring.equipment.timeBonusPerSec ?? 2);

        // Validación básica
        if (!Number.isFinite(base) || !Number.isFinite(bonus) || !Number.isFinite(remaining)) {
            console.error("[EquipmentGame] Datos de configuración inválidos:", { base, bonus, remaining });
            return;
        }

        const newPoints = Math.floor(base + remaining * bonus);

        // Si deseas acumular sobre el puntaje heredado:
        this.score += newPoints;
        // Si prefieres reemplazarlo por el puntaje del minijuego:
        // this.score = newPoints;

        this.hud.setScore(this.score);

        console.log("[EquipmentGame] Puntaje calculado con _timeLeft:", {
            base,
            bonus,
            remaining,
            newPoints,
            total: this.score,
        });

        this.hud.showEndPopup({
            score: this.score,
            onRetry: () => this._restart(),
            onContinue: () => {
                this.dispose();
                this.onGameEnd?.();
            },
            timeExpired: false,
        });
    }


    _onTimeUp() {
        this.hud.stopTimer();
        this.hud.showEndPopup({
            score: this.score,
            onRetry: () => this._restart(),
            onContinue: null,
            timeExpired: true
        });
    }

    _restart() {
        console.log("[EquipmentGame] Reiniciando minijuego...");
        this.score = this.scoreInicial;
        this.dispose();
        this.start();
    }

    dispose() {
        console.log("[EquipmentGame] Liberando recursos...");
        this.hud.stopTimer();
        this.pieces.forEach(p => p?.dispose?.());
        this.slots.forEach((s, i) => this.scene.getMeshByName("slot-bg-" + i)?.dispose());
        if (this.backpack) {
            this.scene.meshes.filter(m => m.parent === this.backpack).forEach(m => m.dispose());
            this.backpack.dispose();
        }
        this.slots = [];
        this.pieces = [];
        this._draggedPiece = null;
        this.backpack = null;
    }
}
