// src/js/games/minigame1/PuzzleGame.js
import { MeshBuilder, StandardMaterial, Color3, Vector3, TransformNode } from "@babylonjs/core";
import { PuzzlePanel } from "../../panels/minigame1Panel.js";
import { InteractionManager } from "../../input/InteractionManager.js";

export class PuzzleGame {
    constructor({ scene, hud, grid = 3, imageUrl = null }) {
        this.scene = scene;
        this.hud = hud;
        this.grid = grid;
        this.imageUrl = imageUrl;

        this.board = null;
        this.slots = [];          // { index, center: Vector3 }
        this.slotOccupant = [];   // index -> mesh | null
        this.pieces = [];         // { mesh, startPos, slotIndex }

        this.score = 0;
        this.hintsLeft = 3;

        this._anchorY = 0.01;
        this._cell = 0;
        this._half = 0;
        this._pieceHalf = 0;

        this.interactionManager = null;
    }

    async start() {
        // Tablero frente a la cámara
        const cam = this.scene.activeCamera;
        const forward = cam.getForwardRay(1.0).direction;
        const boardPos = cam.position.add(forward.scale(1.0));
        boardPos.y -= 0.2;

        this.board = new TransformNode("puzzle-board", this.scene);
        this.board.position.copyFrom(boardPos);
        console.log("[PuzzleGame] Tablero colocado en posición detectada:", boardPos);

        // Ground del tablero (solo guía)
        const size = 0.72;
        const gridMesh = MeshBuilder.CreateGround("board-grid", { width: size, height: size }, this.scene);
        gridMesh.parent = this.board;
        const gridMat = new StandardMaterial("grid-mat", this.scene);
        gridMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
        gridMat.alpha = 0.5;
        gridMesh.material = gridMat;
        gridMesh.isPickable = false;

        // Crear SOLO slots (sin highlight)
        this._buildSlots(size);
        await this._spawnPieces(size);

        // InteractionManager
        this.interactionManager = new InteractionManager(this.scene);
        this.interactionManager.enable();

        const bounds = {
            minX: -this._half + this._pieceHalf,
            maxX: this._half - this._pieceHalf,
            minZ: -this._half + this._pieceHalf,
            maxZ: this._half - this._pieceHalf
        };

        const snapThreshold = this._cell * 0.35; // 35% de la celda

        this.pieces.forEach((p) => {
            this.interactionManager.registerDraggable(p.mesh, {
                planeNode: this.board,
                fixedYLocal: this._anchorY,
                bounds,
                onDragStart: () => {
                    // si estaba ocupando un slot, liberarlo mientras se arrastra
                    if (p.slotIndex != null) {
                        this.slotOccupant[p.slotIndex] = null;
                        p.slotIndex = null;
                    }
                },
                // sin onDragMove (se quitó highlight)
                onDragEnd: (mesh, localPos) => {
                    this._trySnap(p, localPos, snapThreshold);
                }
            });
        });

        // HUD
        this.hud.showPanel(PuzzlePanel, {
            onRotateLeft: () => { },  // sin rotación por ahora
            onRotateRight: () => { },
            onHint: () => this._useHint()
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
        this.slotOccupant = [];
    }

    // ---------- construcción ----------

    _buildSlots(size) {
        const n = this.grid;
        this._cell = size / n;
        this._half = size / 2;

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const index = r * n + c;
                const cx = -this._half + (c + 0.5) * this._cell;
                const cz = -this._half + (r + 0.5) * this._cell;

                this.slots.push({ index, center: new Vector3(cx, 0, cz) });
                this.slotOccupant[index] = null;
            }
        }
    }

    async _spawnPieces(size) {
        const n = this.grid;
        const count = n * n;
        const pieceSize = this._cell * 0.95;
        this._pieceHalf = pieceSize * 0.5;

        // Tras el borde inferior del tablero
        for (let i = 0; i < count; i++) {
            const offsetX = (i - (count - 1) / 2) * (pieceSize * 1.1);

            const piece = MeshBuilder.CreateGround(`piece-${i}`, { width: pieceSize, height: pieceSize }, this.scene);
            piece.parent = this.board;
            piece.position = new Vector3(offsetX, this._anchorY, -this._half - pieceSize * 0.5);

            const mat = new StandardMaterial(`p-mat-${i}`, this.scene);
            mat.diffuseColor = new Color3(
                0.35 + 0.65 * Math.random(),
                0.35 + 0.65 * Math.random(),
                0.35 + 0.65 * Math.random()
            );
            piece.material = mat;

            this.pieces.push({
                mesh: piece,
                startPos: piece.position.clone(),
                slotIndex: null
            });
        }

        console.log(`[PuzzleGame] ${count} piezas spawneadas detrás del tablero.`);
    }

    // ---------- snap ----------

    _nearestSlot(localPos) {
        let best = -1;
        let dmin = Number.POSITIVE_INFINITY;

        for (let i = 0; i < this.slots.length; i++) {
            const c = this.slots[i].center;
            const dx = localPos.x - c.x;
            const dz = localPos.z - c.z;
            const d = Math.hypot(dx, dz);
            if (d < dmin) { dmin = d; best = i; }
        }
        return { idx: best, dist: dmin };
    }

    _trySnap(pieceObj, localPos, threshold) {
        const { idx, dist } = this._nearestSlot(localPos);

        if (dist <= threshold && this.slotOccupant[idx] == null) {
            // encajar
            const target = this.slots[idx].center;
            pieceObj.mesh.position.set(target.x, this._anchorY, target.z);
            this.slotOccupant[idx] = pieceObj.mesh;
            pieceObj.slotIndex = idx;

            this._addScore(10);
            this.hud.message(`Encajó en ${idx}`, 600);
            console.log(`[SNAP ✅] ${pieceObj.mesh.name} → slot ${idx} (d=${dist.toFixed(3)})`);
        } else {
            // volver al origen
            pieceObj.mesh.position.copyFrom(pieceObj.startPos);
            pieceObj.slotIndex = null;
            this.hud.message("No encajó", 600);
            console.log(`[SNAP ❌] ${pieceObj.mesh.name} (dmin=${dist.toFixed(3)})`);
        }

        // 🔍 Mostrar posiciones de todas las piezas después de soltar una
        console.log("=== Estado actual de las piezas ===");
        this.pieces.forEach((p, i) => {
            const pos = p.mesh.position;
            console.log(
                `piece-${i}: (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})`
            );
        });
        console.log("===================================");
    }


    // ---------- HUD ----------

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
