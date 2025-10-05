import { MeshBuilder, StandardMaterial, Color3, Vector3, TransformNode } from "@babylonjs/core";
import { PuzzlePanel } from "../../panels/minigame1Panel.js";
import { InteractionManager } from "../../input/InteractionManager.js"; // ✅ nuevo módulo central de interacción

export class PuzzleGame {
    constructor({ scene, hud, grid = 3, imageUrl = null }) {
        this.scene = scene;
        this.hud = hud;
        this.grid = grid;
        this.imageUrl = imageUrl;

        this.board = null;
        this.slots = [];
        this.pieces = [];

        this.score = 0;
        this.hintsLeft = 3;

        this._anchorY = 0.01;
        this.interactionManager = null;
    }

    async start() {
        // 1️⃣ Crear tablero frente a la cámara
        const cam = this.scene.activeCamera;
        const forward = cam.getForwardRay(1.0).direction;
        const boardPos = cam.position.add(forward.scale(1.0));
        boardPos.y -= 0.2;

        this.board = new TransformNode("puzzle-board", this.scene);
        this.board.position.copyFrom(boardPos);

        const size = 0.72;
        const gridMesh = MeshBuilder.CreateGround("board-grid", { width: size, height: size }, this.scene);
        gridMesh.parent = this.board;
        const gridMat = new StandardMaterial("grid-mat", this.scene);
        gridMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
        gridMat.alpha = 0.5;
        gridMesh.material = gridMat;
        gridMesh.isPickable = false;

        this._buildSlots(size);
        await this._spawnPieces(size);

        // 🧩 TEMPORAL FASE 2: instanciación y prueba del InteractionManager
        // En Fase 3 moveremos las piezas y eliminaremos estos logs.
        this.interactionManager = new InteractionManager(this.scene);
        this.interactionManager.enable();

        // 🧩 TEMPORAL FASE 2: registrar piezas solo para imprimir eventos
        this.pieces.forEach((p) => {
            this.interactionManager.registerDraggable(p.mesh, {
                planeNode: this.board,
                onDragStart: () => console.log(`[DragStart] ${p.mesh.name}`),
                onDrag: (_, pos) => console.log(`[Drag] ${p.mesh.name} → ${pos.toString()}`),
                onDragEnd: () => console.log(`[DragEnd] ${p.mesh.name}`)
            });
        });
        // 🧩 FIN TEMPORAL FASE 2

        // 3️⃣ HUD básico
        this.hud.showPanel(PuzzlePanel, {
            // 🧩 TEMPORAL FASE 2: rotaciones aún no activas
            onRotateLeft: () => console.log("Rotate Left (pendiente Fase 3)"),
            onRotateRight: () => console.log("Rotate Right (pendiente Fase 3)"),
            onHint: () => this._useHint()
        });
        this.hud.setTime(60);
        this.hud.startTimer(60, null, () => this._fail());
    }

    dispose() {
        this.hud.stopTimer();
        this.pieces.forEach((p) => p.mesh.dispose());
        this.board?.dispose();

        // 🧩 TEMPORAL FASE 2
        this.interactionManager?.dispose();
        // 🧩 FIN TEMPORAL FASE 2

        this.pieces = [];
        this.slots = [];
    }

    // ---------------- construcción ----------------
    _buildSlots(size) {
        const n = this.grid;
        const cell = size / n;
        const half = size / 2;

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const index = r * n + c;
                const cx = -half + (c + 0.5) * cell;
                const cz = -half + (r + 0.5) * cell;
                this.slots.push({ index, center: new Vector3(cx, 0, cz), expectedRot: 0 });
            }
        }
    }

    async _spawnPieces(size) {
        const n = this.grid;
        const cell = size / n;
        const half = size / 2;
        const pieceSize = cell * 0.95;
        const pieceHalf = pieceSize * 0.5;
        const margin = 0.03;
        const safeZ = -(half + pieceHalf + margin);

        const rect = {
            xMin: -half - 0.20,
            xMax: half + 0.20,
            zMin: safeZ - 0.40,
            zMax: safeZ - 0.02
        };

        const rand = (a, b) => a + Math.random() * (b - a);
        const positions = [];
        for (let i = 0; i < n * n; i++) {
            positions.push({ x: rand(rect.xMin, rect.xMax), z: rand(rect.zMin, rect.zMax) });
        }

        for (let i = 0; i < n * n; i++) {
            const piece = MeshBuilder.CreateGround(`piece-${i}`, { width: pieceSize, height: pieceSize }, this.scene);
            piece.parent = this.board;
            const { x, z } = positions[i];
            piece.position.set(x, this._anchorY, z);

            const mat = new StandardMaterial(`p-mat-${i}`, this.scene);
            mat.diffuseColor = new Color3(
                0.35 + 0.65 * Math.random(),
                0.35 + 0.65 * Math.random(),
                0.35 + 0.65 * Math.random()
            );
            piece.material = mat;
            this.pieces.push({ mesh: piece });
        }
    }

    // ---------------- HUD y lógica menor ----------------
    _useHint() {
        if (this.hintsLeft <= 0) return;
        this.hintsLeft--;
        this._addScore(-15);
        this.hud.message("Pista: mira la guía", 1500);
    }

    _addScore(delta) {
        this.score = Math.max(0, this.score + delta);
        this.hud.setScore(this.score);
    }

    _fail() {
        this.hud.message("Se acabó el tiempo. Inténtalo de nuevo.", 3000);
    }
}
