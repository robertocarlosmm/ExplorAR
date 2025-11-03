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

export class CheckGame {
    constructor({ scene, hud, experienceId, startingScore = 0 }) {
        this.scene = scene;
        this.hud = hud;
        this.experienceId = experienceId;
        this.score = startingScore;
        this.timer = null;
        this.isRunning = false;
    }

    async start() {
        console.log("[CheckGame] Iniciando RA...");

        // 1️⃣ Mostrar HUD y arrancar el temporizador del gameplayConfig
        this.hud?.show?.();
        const totalTime = gameplayConfig?.timer?.default ?? 60;
        this.hud?.startTimer?.(totalTime, null, () => this._onTimeUp());
        this.hud?.updateScore?.(this.score);

        // 2️⃣ Crear un cubo simple en el centro
        const box = MeshBuilder.CreateBox("demoCube", { size: 0.1 }, this.scene);
        box.position = new Vector3(0, 0, 0.5);
        const mat = new StandardMaterial("matDemo", this.scene);
        mat.diffuseColor = new Color3(0.2, 0.7, 1.0);
        box.material = mat;

        this.box = box;
        this.isRunning = true;

        console.log("[CheckGame] Cubo generado, RA activo.");
    }

    _onTimeUp() {
        console.log("[CheckGame] Tiempo finalizado");
        this.hud?.showPopup?.({
            title: "Tiempo agotado",
            message: "Fin del minijuego 3 (demo)",
            buttonText: "Continuar",
            onClose: () => this._endGame(),
        });
    }

    _endGame() {
        this.isRunning = false;
        this.onGameEnd?.();
    }

    dispose() {
        try {
            this.box?.dispose();
        } catch { }
        this.hud?.stopTimer?.();
        console.log("[CheckGame] Recursos liberados");
    }
}