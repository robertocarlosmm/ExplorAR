import {
    SceneLoader,
    Vector3,
    Color3,
    MeshBuilder,
    StandardMaterial,
    Texture,
    ActionManager,
    ExecuteCodeAction
} from "@babylonjs/core";

import { experienceConfig } from "../config/experienceConfig";
import { InteractionManager } from "../managers/InteractionManager";

export class EquipmentGame {
    constructor(scene, xr, hud) {
        this.scene = scene;
        this.xr = xr;
        this.hud = hud;
        this.assets = experienceConfig.minigame2.assets;
        this.interactionManager = new InteractionManager(scene, xr);
        this.equipment = [];
        this.slots = [];
        this.occupiedSlots = Array(4).fill(null);
        this.score = 0;
        this.timeLimit = 60;
    }

    async start() {
        await this._loadBackpack();
        this._createSlots();
        this._createEquipmentIcons();
        this.hud.startTimer(this.timeLimit, null, () => this._onTimeUp());
    }

    async _loadBackpack() {
        const backpackUrl = this.assets.backpack;
        await SceneLoader.AppendAsync(backpackUrl, "", this.scene);
        const backpackMesh = this.scene.meshes[this.scene.meshes.length - 1];
        backpackMesh.scaling = new Vector3(0.5, 0.5, 0.5);
        backpackMesh.position = new Vector3(0, 0.8, 1.2);
        backpackMesh.rotation = new Vector3(0, Math.PI, 0);
    }

    _createSlots() {
        const startX = -0.3;
        const gap = 0.2;

        for (let i = 0; i < 4; i++) {
            const slot = MeshBuilder.CreatePlane(`slot_${i}`, { size: 0.2 }, this.scene);
            slot.position = new Vector3(startX + i * gap, 1.0, 1.0);
            slot.rotation = new Vector3(Math.PI / 2, 0, 0);
            slot.isVisible = false; // no render, used for placement
            this.slots.push(slot);
        }
    }

    _createEquipmentIcons() {
        const equipmentList = this.assets.equipment;
        const correctItems = ["boots", "canteen", "firstAidKit", "jacket"];
        const startX = -0.6;
        const gap = 0.3;

        equipmentList.forEach((item, index) => {
            const plane = MeshBuilder.CreatePlane(`equipment_${index}`, { size: 0.2 }, this.scene);
            const mat = new StandardMaterial(`mat_${index}`, this.scene);
            mat.diffuseTexture = new Texture(item.url, this.scene);
            mat.diffuseTexture.hasAlpha = true;
            mat.backFaceCulling = false;
            mat.emissiveColor = Color3.White();
            plane.material = mat;
            plane.position = new Vector3(startX + index * gap, 1, 0.5);
            plane.rotation = new Vector3(Math.PI / 2, 0, 0);
            plane.originalPosition = plane.position.clone();
            plane.slotIndex = null;
            plane.correct = correctItems.includes(item.name);
            plane.actionManager = new ActionManager(this.scene);

            plane.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickDownTrigger, () => {
                this.interactionManager.pick(plane);
            }));

            plane.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickUpTrigger, () => {
                this._onDrop(plane);
            }));

            this.equipment.push(plane);
        });
    }

    _onDrop(piece) {
        const slotIndex = this._findNearestSlot(piece.position);

        if (slotIndex !== -1 && !this.occupiedSlots[slotIndex]) {
            if (piece.slotIndex !== null) {
                this.occupiedSlots[piece.slotIndex] = null;
            }

            piece.position = this.slots[slotIndex].position.clone();
            piece.slotIndex = slotIndex;
            this.occupiedSlots[slotIndex] = piece;
        } else {
            if (piece.slotIndex !== null) {
                this.occupiedSlots[piece.slotIndex] = null;
                piece.slotIndex = null;
            }
            piece.position = piece.originalPosition.clone();
        }

        const total = this.occupiedSlots.filter(Boolean).length;
        if (total === 4) {
            setTimeout(() => this._evaluate(), 500);
        }
    }

    _findNearestSlot(pos) {
        let minDist = Infinity;
        let bestIndex = -1;

        this.slots.forEach((slot, index) => {
            const dist = Vector3.Distance(slot.position, pos);
            if (dist < 0.15 && dist < minDist) {
                minDist = dist;
                bestIndex = index;
            }
        });

        return bestIndex;
    }

    _evaluate() {
        let correct = 0;
        this.occupiedSlots.forEach(piece => {
            if (piece && piece.correct) {
                correct++;
            } else if (piece) {
                piece.material.emissiveColor = new Color3(1, 0, 0);
            }
        });

        if (correct === 4) {
            this._win();
        }
    }

    _win() {
        this.hud.stopTimer();
        this.score = 100;
        this.hud.showEndPopup({
            score: this.score,
            onRetry: () => this._restart(),
            onContinue: null,
            timeExpired: false
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
        this.dispose();
        this.start();
    }

    dispose() {
        this.equipment.forEach(mesh => mesh.dispose());
        this.slots.forEach(slot => slot.dispose());
        this.hud.stopTimer();
        this.equipment = [];
        this.slots = [];
        this.occupiedSlots = Array(4).fill(null);
        this.score = 0;
    }
}
