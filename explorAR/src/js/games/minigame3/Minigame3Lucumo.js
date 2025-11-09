import {
    MeshBuilder,
    StandardMaterial,
    Texture,
    Color3,
    Vector3
} from "@babylonjs/core";
import { gameplayConfig } from "../../../config/gameplayConfig.js";
import { experiencesConfig } from "../../../config/experienceConfig.js";

export class Minigame3Lucumo {
    constructor({ scene, hud, experienceId, startingScore = 0 }) {
        this.scene = scene;
        this.hud = hud;
        this.experienceId = experienceId;
        this.score = startingScore;

        this.gridSize = 8; // reducido
        this.grid = [];
        this.spawnRadius = 1.2;
        this.plotSize = 0.38;

        this.isRunning = false;
    }

    async start() {
        console.log("[Minigame3Lucumo] Iniciando...");

        const ok = this._loadConfigForLucumo();
        if (!ok) {
            console.error("[Lucumo] No se encontró configuración.");
            return;
        }

        this.hud?.show?.();
        const totalTime = gameplayConfig?.timer?.default ?? 60;
        this.hud?.startTimer?.(totalTime, null, () => this._onTimeUp());
        this.hud?.updateScore?.(this.score);

        this._createBasePlane();

        this._generateGridPositions();
        const camino = this._generatePath();

        await this._buildPathOnly(camino);

        this.isRunning = true;
        console.log("[Minigame3Lucumo] ✓ Camino generado correctamente (solo celdas del sendero).");
    }

    _loadConfigForLucumo() {
        try {
            this.experience = experiencesConfig.find(e => e.id === this.experienceId);
            if (!this.experience) return false;
            this.miniConfig = this.experience.minigames?.find(m => m.id === "m3Lucumo");
            if (!this.miniConfig) return false;

            const p = this.miniConfig.params || {};
            if (Number.isFinite(p.spawnRadius)) this.spawnRadius = p.spawnRadius;
            if (Number.isFinite(p.plotSize)) this.plotSize = p.plotSize;

            this.assetMap = {};
            for (const a of this.miniConfig.assets || []) {
                this.assetMap[a.key] = a.url;
            }

            this.dirtUrl = this.assetMap["dirt_trail"];
            return true;
        } catch (e) {
            console.error("[Lucumo] Error cargando configuración:", e);
            return false;
        }
    }

    _createBasePlane() {
        const size = Math.max(2.0, this.spawnRadius * 2.0);
        const base = MeshBuilder.CreateGround("lucumo_base", { width: size, height: size }, this.scene);
        const mat = new StandardMaterial("lucumo_base_mat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        mat.alpha = 0.05;
        base.material = mat;
        base.position = new Vector3(0, 0, 0);
        this.base = base;
    }

    _generateGridPositions() {
        this.grid = [];
        const cellSize = this.spawnRadius / (this.gridSize / 2);
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = (c - (this.gridSize / 2 - 0.5)) * cellSize;
                const z = (r - (this.gridSize / 2 - 0.5)) * cellSize;
                this.grid.push({ row: r, col: c, pos: new Vector3(x, 0.002, z) });
            }
        }
    }

    _generatePath() {
        const path = Array.from({ length: this.gridSize }, () =>
            Array(this.gridSize).fill(0)
        );

        const filaLarga1 = Math.random() < 0.5 ? 3 : 4;
        const filaLarga2 = Math.random() < 0.5 ? 6 : 7; // adaptado al 8x8

        let inicio = Math.floor(Math.random() * (this.gridSize - 3));
        let ancho = 2;

        for (let fila = 0; fila < this.gridSize; fila++) {
            // ajustar ancho según fila
            if (fila === filaLarga1 || fila === filaLarga2) ancho = 4 + Math.floor(Math.random() * 2);
            else ancho = 2 + Math.floor(Math.random() * 2);

            let fin = inicio + ancho - 1;
            if (fin >= this.gridSize) fin = this.gridSize - 1;

            for (let c = inicio; c <= fin; c++) path[fila][c] = 1;

            const desplazamiento = Math.floor(Math.random() * 3) - 1; // -1,0,+1
            inicio += desplazamiento;
            if (inicio < 0) inicio = 0;
            if (inicio > this.gridSize - 3) inicio = this.gridSize - 3;
        }

        console.log("[Lucumo] Camino generado:", path.map(r => r.join("")).join("\n"));
        return path;
    }

    async _buildPathOnly(path) {
        const dirtTex = new Texture(this.dirtUrl, this.scene);
        dirtTex.wrapU = Texture.CLAMP_ADDRESSMODE;
        dirtTex.wrapV = Texture.CLAMP_ADDRESSMODE;
        dirtTex.uScale = 1;
        dirtTex.vScale = 1;

        const size = this.plotSize;

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (path[r][c] !== 1) continue; // solo celdas del camino

                const cell = this.grid[r * this.gridSize + c];
                const ground = MeshBuilder.CreateGround(
                    `path_${r}_${c}`,
                    { width: size * 0.98, height: size * 0.98 },
                    this.scene
                );

                // elevar un poquito según la fila para evitar z-fighting
                ground.position = new Vector3(cell.pos.x, 0.001 * r, cell.pos.z);

                const mat = new StandardMaterial(`pathMat_${r}_${c}`, this.scene);
                mat.diffuseTexture = dirtTex;
                mat.specularColor = new Color3(0, 0, 0);
                mat.backFaceCulling = false;
                ground.material = mat;
            }
        }
    }


    _onTimeUp() {
        console.log("[Lucumo] Tiempo finalizado");
        this.hud?.showPopup?.({
            title: "Tiempo agotado",
            message: "Fin del minijuego Lucumo (camino base generado)",
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
            this.base?.dispose();
        } catch { }
        this.hud?.stopTimer?.();
        console.log("[Lucumo] Recursos liberados");
    }
}
