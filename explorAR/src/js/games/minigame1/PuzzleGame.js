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
        // 1Crear tablero frente a la cámara
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

        // Crear slots y piezas
        this._buildSlots(size);
        await this._spawnPieces(size);

        // FASE 3: integración real con InteractionManager
        this.interactionManager = new InteractionManager(this.scene);
        this.interactionManager.enable();

        // Registrar cada pieza con movimiento real sobre el tablero
        this.pieces.forEach((p) => {
            this.interactionManager.registerDraggable(p.mesh, {
                planeNode: this.board,          // plano base de movimiento
                yOffset: this._anchorY,         // altura ligera sobre el tablero
                onDragStart: () => this.hud.message(`Moviendo ${p.mesh.name}`, 500),
                onDragEnd: () => this.hud.message(`${p.mesh.name} soltada`, 500)
            });
        });

        // HUD básico
        this.hud.showPanel(PuzzlePanel, {
            // La rotación se implementará en fases posteriores
            onRotateLeft: () => console.log("Rotate Left (pendiente Fase 4)"),
            onRotateRight: () => console.log("Rotate Right (pendiente Fase 4)"),
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
        // Configuración de grilla
        const n = this.grid;               // Por ejemplo, 3 → 3x3 = 9 piezas
        const count = n * n;
        const cell = size / n;
        const pieceSize = cell * 0.95;
        const spacing = pieceSize * 1.1;   // Separación lateral entre piezas

        // Definir el punto base detrás del tablero
        // El tablero ya tiene su posición en el mundo
        const boardPos = this.board.position.clone();

        // Vector "hacia atrás" relativo a la cámara (opuesto al forward del tablero)
        const backDir = this.board.forward.scale(-1);

        // Colocar la fila de piezas a cierta distancia detrás del tablero
        const separation = 0.35; // metros detrás del tablero
        const basePos = boardPos.add(backDir.scale(separation));

        // Crear todas las piezas en una fila, centradas horizontalmente
        for (let i = 0; i < count; i++) {
            const offsetX = (i - (count - 1) / 2) * spacing;

            // Crear la pieza (plana, tipo cuadrado)
            const piece = MeshBuilder.CreateGround(
                `piece-${i}`,
                { width: pieceSize, height: pieceSize },
                this.scene
            );

            // Parentarla al tablero (así hereda su orientación)
            piece.parent = this.board;

            // Posición local respecto al tablero
            piece.position = new Vector3(offsetX, this._anchorY, -size / 2 - pieceSize * 0.8);

            // Material visible y diferenciado
            const mat = new StandardMaterial(`p-mat-${i}`, this.scene);
            mat.diffuseColor = new Color3(
                0.35 + 0.65 * Math.random(),
                0.35 + 0.65 * Math.random(),
                0.35 + 0.65 * Math.random()
            );
            piece.material = mat;

            // Guardar posición inicial (local)
            piece.metadata = { startPos: piece.position.clone() };

            // Agregar a la lista de piezas
            this.pieces.push({ mesh: piece });
        }

        console.log(`[PuzzleGame] ${count} piezas spawneadas detrás del tablero.`);
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
