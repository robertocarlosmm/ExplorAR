import { MeshBuilder, StandardMaterial, Color3, Vector3, TransformNode } from "@babylonjs/core";
import { PuzzlePanel } from "../../panels/minigame1Panel.js";
import { InteractionManager } from "../../input/InteractionManager.js";

export class PuzzleGame {
    constructor({ scene, hud, grid = 3 }) {
        this.scene = scene;
        this.hud = hud;
        this.grid = grid;

        this.board = null;
        this.slots = [];
        this.pieces = [];
        this.score = 0;
        this.hintsLeft = 3;

        this._anchorY = 0.01;
        this.interactionManager = null;
    }

    async start() {
        // 1️⃣ Tablero frente a la cámara
        const cam = this.scene.activeCamera;
        const forward = cam.getForwardRay(1.0).direction;
        const boardPos = cam.position.add(forward.scale(1.0));
        boardPos.y -= 0.2;

        this.board = new TransformNode("puzzle-board", this.scene);
        this.board.position.copyFrom(boardPos);
        console.log("[PuzzleGame] Tablero colocado en posición detectada:", boardPos);

        // 2️⃣ Malla base del tablero
        const size = 0.72;
        const gridMesh = MeshBuilder.CreateGround("board-grid", { width: size, height: size }, this.scene);
        gridMesh.parent = this.board;
        const gridMat = new StandardMaterial("grid-mat", this.scene);
        gridMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
        gridMat.alpha = 0.5;
        gridMesh.material = gridMat;
        gridMesh.isPickable = false;

        // 3️⃣ Slots y piezas
        this._buildSlots(size);
        await this._spawnPieces(size);

        // 4️⃣ Interaction Manager
        this.interactionManager = new InteractionManager(this.scene);
        this.interactionManager.enable();

        // 5️⃣ Registrar piezas
        const fixedY = this.board.position.y + this._anchorY;
        this.pieces.forEach((p) => {
            this.interactionManager.registerDraggable(p.mesh, {
                dragPlaneNormal: new Vector3(0, 1, 0),
                fixedY,
                onDragStart: () => this.hud.message(`Moviendo ${p.mesh.name}`, 500),
                onDragEnd: (mesh) => {
                    this.hud.message(`${mesh.name} soltada`, 500);
                    this._checkSnap(mesh);
                },
            });
        });

        // 6️⃣ HUD
        this.hud.showPanel(PuzzlePanel, {
            onRotateLeft: () => console.log("Rotate Left (pendiente Fase 4)"),
            onRotateRight: () => console.log("Rotate Right (pendiente Fase 4)"),
            onHint: () => this._useHint(),
        });
        this.hud.setTime(60);
        this.hud.startTimer(60, null, () => this._fail());
    }

    dispose() {
        this.hud.stopTimer();
        this.pieces.forEach((p) => p.mesh.dispose());
        this.board?.dispose();
        this.interactionManager?.dispose();
        this.pieces = [];
        this.slots = [];
    }

    // --- Construcción ---
    _buildSlots(size) {
        const n = this.grid;
        const cell = size / n;
        const half = size / 2;

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const index = r * n + c;
                const cx = -half + (c + 0.5) * cell;
                const cz = -half + (r + 0.5) * cell;
                this.slots.push({ index, center: new Vector3(cx, 0, cz) });
            }
        }
    }

    async _spawnPieces(size) {
        const n = this.grid;
        const count = n * n;
        const cell = size / n;
        const pieceSize = cell * 0.95;
        const spacing = pieceSize * 1.1;
        const boardPos = this.board.position.clone();

        for (let i = 0; i < count; i++) {
            const offsetX = (i - (count - 1) / 2) * spacing;
            const piece = MeshBuilder.CreateGround(`piece-${i}`, { width: pieceSize, height: pieceSize }, this.scene);
            piece.parent = this.board;
            piece.position = new Vector3(offsetX, this._anchorY, -size / 2 - pieceSize * 0.8);
            const mat = new StandardMaterial(`p-mat-${i}`, this.scene);
            mat.diffuseColor = new Color3(Math.random(), Math.random(), Math.random());
            piece.material = mat;
            this.pieces.push({ mesh: piece });
        }

        console.log(`[PuzzleGame] ${count} piezas spawneadas detrás del tablero.`);
    }

    // --- Snap ---
    _checkSnap(mesh) {
        const threshold = 0.05;
        let closest = null;
        let minDist = Infinity;

        for (const slot of this.slots) {
            const slotPos = this.board.position.add(slot.center);
            const dist = Vector3.Distance(mesh.position, slotPos);
            if (dist < minDist) {
                minDist = dist;
                closest = slot;
            }
        }

        if (minDist < threshold) {
            const snapPos = this.board.position.add(closest.center);
            mesh.position.copyFrom(snapPos);
            this._addScore(50);
            this.hud.message("¡Encajó correctamente!", 1000);
            console.log(`[SNAP] ${mesh.name} encajada en slot ${closest.index}`);
        } else {
            console.log(`[SNAP FAIL] ${mesh.name} lejos (${minDist.toFixed(3)})`);
        }
    }

    _useHint() {
        if (this.hintsLeft <= 0) return;
        this.hintsLeft--;
        this._addScore(-15);
        this.hud.message("Pista: observa el patrón", 1500);
    }

    _addScore(delta) {
        this.score = Math.max(0, this.score + delta);
        this.hud.setScore(this.score);
    }

    _fail() {
        this.hud.message("Se acabó el tiempo. Inténtalo de nuevo.", 3000);
    }
}
