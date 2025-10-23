// src/js/games/minigame2/EquipmentGame.js
import { MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";
import { gameplayConfig } from "../../../config/gameplayConfig.js";

export class EquipmentGame {
    constructor({ scene, hud, params }) {
        this.scene = scene;
        this.hud = hud;
        this.params = params;

        this.score = 0;
        this.timeLimit = gameplayConfig.timeSequence[1] || 45; // 45 segundos

        this.testCube = null;
        this.onGameEnd = null;
    }

    async start() {
        console.log("[EquipmentGame] 🎮 Iniciando minijuego 2 (PRUEBA)...");

        // ✅ ESPERAR A QUE LA CÁMARA ESTÉ DISPONIBLE
        let cam = this.scene.activeCamera;
        let attempts = 0;

        while (!cam && attempts < 50) {
            console.log("[EquipmentGame] ⏳ Esperando cámara activa...");
            await new Promise(r => setTimeout(r, 100)); // esperar 100ms
            cam = this.scene.activeCamera;
            attempts++;
        }

        if (!cam) {
            console.error("[EquipmentGame] ❌ No se pudo obtener la cámara activa. Usando posición fija.");
            // Crear cubo en posición fija si no hay cámara
            this.testCube = MeshBuilder.CreateBox("test-cube", { size: 0.3 }, this.scene);
            this.testCube.position.set(0, 0, 1.5);
        } else {
            console.log("[EquipmentGame] ✅ Cámara activa obtenida:", cam.name);

            // Crear cubo frente a la cámara
            const forward = cam.getForwardRay(1.0).direction;
            const cubePos = cam.position.add(forward.scale(1.5));
            cubePos.y -= 0.2;

            this.testCube = MeshBuilder.CreateBox("test-cube", { size: 0.3 }, this.scene);
            this.testCube.position.copyFrom(cubePos);
        }

        // Material colorido para que sea visible
        const mat = new StandardMaterial("cube-mat", this.scene);
        mat.diffuseColor = new Color3(0.2, 0.8, 0.3); // Verde brillante
        mat.specularColor = new Color3(0.1, 0.1, 0.1);
        this.testCube.material = mat;

        console.log("[EquipmentGame] ✅ Cubo creado en:", this.testCube.position);
        console.log("[EquipmentGame] 📦 Cubo info:", {
            position: this.testCube.position,
            isVisible: this.testCube.isVisible,
            isEnabled: this.testCube.isEnabled(),
            hasParent: !!this.testCube.parent,
            material: !!this.testCube.material
        });

        // 2️⃣ Configurar HUD (reutiliza el del index.html)
        this.hud.setScore(0);
        this.hud.setTime(this.timeLimit);
        this.hud.clearPanel(); // Sin panel específico por ahora

        // 3️⃣ Iniciar timer
        this.hud.startTimer(this.timeLimit, null, () => this._onTimeUp());

        // 4️⃣ Simular victoria automática después de 5 segundos (solo para prueba)
        setTimeout(() => {
            console.log("[EquipmentGame] 🎉 Victoria automática (prueba)");
            this._onWin();
        }, 5000);
    }

    dispose() {
        console.log("[EquipmentGame] 🧹 Limpiando recursos...");
        this.hud?.stopTimer();
        this.testCube?.dispose();
        this.testCube = null;
    }

    _onWin() {
        this.hud.stopTimer();

        // Sumar puntos de prueba
        this.score = 150;
        this.hud.setScore(this.score);

        console.log("[EquipmentGame] ✅ Mostrando popup de victoria");

        this.hud.showEndPopup({
            score: this.score,
            onRetry: () => {
                console.log("[EquipmentGame] 🔄 Reintentar");
                this._restart();
            },
            onContinue: () => {
                console.log("[EquipmentGame] ➡️ Continuar al siguiente minijuego");
                this.dispose();
                this.onGameEnd?.();
            },
            timeExpired: false
        });
    }

    _onTimeUp() {
        this.hud.stopTimer();
        console.log("[EquipmentGame] ⏰ Tiempo agotado");

        this.hud.showEndPopup({
            score: this.score,
            onRetry: () => {
                console.log("[EquipmentGame] 🔄 Reintentar tras perder");
                this._restart();
            },
            onContinue: null,
            timeExpired: true
        });
    }

    _restart() {
        console.log("[EquipmentGame] 🔄 Reiniciando minijuego 2...");
        this.score = 0;
        this.hud.setScore(0);
        this.hud.stopTimer();

        this.dispose();
        this.start();
    }
}