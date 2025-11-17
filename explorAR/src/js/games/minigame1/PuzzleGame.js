// src/js/games/minigame1/PuzzleGame.js
import {
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    TransformNode,
    Texture,
    Matrix
} from "@babylonjs/core";
import { PointerDragBehavior } from "@babylonjs/core/Behaviors/Meshes/pointerDragBehavior";
import { gameplayConfig } from "../../../config/gameplayConfig.js";

export class PuzzleGame {
    constructor({ scene, hud, grid = 3, imageUrl = null }) {
        this.scene = scene;
        this.hud = hud;
        this.grid = grid;
        this.imageUrl = imageUrl;
        this.timeLimit = gameplayConfig.timeSequence[0] || 60; // tiempo por defecto

        this.board = null;
        this.slots = [];          // { index, center: Vector3 }
        this.slotOccupant = [];   // index -> mesh | null
        this.pieces = [];         // { mesh, startPos, slotIndex, correctIndex, locked }

        this.score = 0;
        this.hintsLeft = 3;

        this._anchorY = 0.01;
        this._cell = 0;
        this._half = 0;
        this._pieceHalf = 0;

        this.penaltySeconds = gameplayConfig.scoring.puzzle3D.timePenalty;
        this.penaltyPoitns = gameplayConfig.scoring.puzzle3D.pointsPenalty;
        this.bonusPerPiece = gameplayConfig.scoring.puzzle3D.perPiece;
        this.bonusTime = gameplayConfig.scoring.puzzle3D.timeBonusPerSec;

        this._draggables = new Map();
        this._draggingEnabled = false;
        this._firstTouchHandled = false; // para el fix del primer toque

        this.onGameEnd = null;      // juego terminado
    }

    async start() {
        // Tablero frente a la cámara
        const cam = this.scene.activeCamera;
        const forward = cam.getForwardRay(1.0).direction;
        const boardPos = cam.position.add(forward.scale(1.0));
        boardPos.y -= 0.2;

        this.board = new TransformNode("puzzle-board", this.scene);
        this.board.position.copyFrom(boardPos);

        // girar 180° para que mire hacia la cámara
        this.board.rotation.y = Math.PI;

        console.log("[PuzzleGame] Tablero colocado en posición detectada:", boardPos);


        // Ground del tablero (solo guía)
        const size = 0.72;
        const gridMesh = MeshBuilder.CreateGround(
            "board-grid",
            { width: size, height: size },
            this.scene
        );
        gridMesh.parent = this.board;
        const gridMat = new StandardMaterial("grid-mat", this.scene);
        gridMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
        gridMat.alpha = 0.5;
        gridMesh.material = gridMat;
        gridMesh.isPickable = false;

        // Crear slots y piezas
        this._buildSlots(size);
        await this._spawnPieces(size);

        // Activar sistema de drag integrado
        this._enableDragging();

        const bounds = {
            minX: -this._half + this._pieceHalf,
            maxX: this._half - this._pieceHalf,
            minZ: -this._half + this._pieceHalf,
            maxZ: this._half - this._pieceHalf
        };

        const snapThreshold = this._cell * 0.35; // 35% de la celda

        // Registrar drag para cada pieza
        this.pieces.forEach((p) => {
            this._registerDraggableForPiece(p, bounds, snapThreshold);
        });

        // HUD
        this.hud.setScore(0);
        this.hud.setTime(this.timeLimit);
        this.hud.startTimer(this.timeLimit, null, () => this._fail());
    }

    dispose() {
        this.hud.stopTimer();

        // Limpieza de behaviors de drag
        this._disableDragging();

        this.pieces.forEach((p) => p.mesh.dispose());
        this.board?.dispose();

        this.pieces = [];
        this.slots = [];
        this.slotOccupant = [];
    }

    // ---------- SISTEMA DE DRAG INTEGRADO ----------

    _enableDragging() {
        if (this._draggingEnabled) return;
        this._draggingEnabled = true;
        console.log("[PuzzleGame] Drag integrado activado (PointerDragBehavior).");
    }

    _disableDragging() {
        if (!this._draggingEnabled) return;
        for (const { behavior } of this._draggables.values()) {
            behavior.detach();
        }
        this._draggables.clear();
        this._draggingEnabled = false;
        this._firstTouchHandled = false;
        console.log("[PuzzleGame] Drag integrado desactivado.");
    }

    /**
     * Registra el drag para una pieza concreta del puzzle.
     * Usa:
     *  - this.board como plano base
     *  - this._anchorY como altura local constante
     *  - bounds para limitar el área
     *  - snapThreshold para decidir encaje en slot
     */
    _registerDraggableForPiece(pieceObj, bounds, snapThreshold) {
        const mesh = pieceObj.mesh;
        const planeNode = this.board;
        if (!planeNode) {
            console.warn("[PuzzleGame] No hay board para registrar drag.");
            return;
        }

        // Plano de arrastre según la orientación real del tablero
        const boardNormal = planeNode.up.clone();
        const behavior = new PointerDragBehavior({
            dragPlaneNormal: boardNormal,
            useObjectOrientationForDragging: false
        });
        behavior.updateDragPlane = false; // plano fijo

        mesh.addBehavior(behavior);

        let invBoardWorld = null;

        behavior.onDragStartObservable.add(() => {
            // --- Fix global del primer toque (para el salto de Z) ---
            if (!this._firstTouchHandled) {
                this._firstTouchHandled = true;

                const deltas = this.pieces.map(pp => pp.mesh.position.z - pp.startPos.z);
                const promedioDeltaZ = deltas.reduce((a, b) => a + b, 0) / deltas.length;
                const saltoDetectado = Math.abs(promedioDeltaZ) > 0.02; // ~2cm

                if (saltoDetectado) {
                    console.warn("[PuzzleGame] Desplazamiento detectado en primer toque. Restaurando posiciones...");
                    this.pieces.forEach(pp => {
                        pp.mesh.position.copyFrom(pp.startPos);
                    });
                }
            }

            // No permitir mover piezas bloqueadas
            if (pieceObj.locked) {
                console.log("[PuzzleGame] Intento de arrastrar pieza bloqueada:", mesh.name);
                return;
            }

            // Liberar slot anterior si lo tenía
            if (pieceObj.slotIndex != null) {
                this.slotOccupant[pieceObj.slotIndex] = null;
                pieceObj.slotIndex = null;
            }

            // Calcular matriz inversa del tablero: mundo -> local
            planeNode.computeWorldMatrix(true);
            const boardWorld = planeNode.getWorldMatrix();
            invBoardWorld = new Matrix();
            boardWorld.invertToRef(invBoardWorld);

            console.log("[PuzzleGame] DRAG START ->", mesh.name);
        });

        behavior.onDragObservable.add((evt) => {
            if (!invBoardWorld) return;

            // Punto en mundo del behavior
            const world = evt.dragPlanePoint
                ?? evt.draggedPosition
                ?? mesh.getAbsolutePosition();

            // Convertir a coordenadas locales del tablero
            const local = Vector3.TransformCoordinates(world, invBoardWorld);
            local.y = this._anchorY;

            // Aplicar límites
            if (bounds) {
                const b = bounds;
                if (local.x < b.minX) local.x = b.minX;
                if (local.x > b.maxX) local.x = b.maxX;
                if (local.z < b.minZ) local.z = b.minZ;
                if (local.z > b.maxZ) local.z = b.maxZ;
            }

            // Aplicar posición local
            mesh.position.copyFrom(local);
        });

        behavior.onDragEndObservable.add(() => {
            const local = mesh.position.clone(); // ya está en coords locales del board
            this._trySnap(pieceObj, local, snapThreshold);
            console.log("[PuzzleGame] DRAG END ->", mesh.name, "@", local);
        });

        const abs = mesh.getAbsolutePosition();
        console.log(
            `[PuzzleGame] Registrado draggable: ${mesh.name} @ (${abs.x.toFixed(3)}, ${abs.y.toFixed(3)}, ${abs.z.toFixed(3)})`
        );

        this._draggables.set(mesh, { behavior, piece: pieceObj });
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

        console.log(`[PuzzleGame] Cargando textura base: ${this.imageUrl}`);

        const baseTexture = new Texture(
            this.imageUrl,
            this.scene,
            true,
            false,
            Texture.TRILINEAR_SAMPLINGMODE,
            null,
            null,
            null,
            false
        );
        baseTexture.wrapU = baseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;

        // Mezclar el orden de aparición (Fisher–Yates)
        const indices = Array.from({ length: count }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        for (let i = 0; i < count; i++) {
            const index = indices[i];
            const offsetX = (i - (count - 1) / 2) * (pieceSize * 1.1);

            const piece = MeshBuilder.CreateGround(
                `piece-${index}`,
                { width: pieceSize, height: pieceSize },
                this.scene
            );
            piece.parent = this.board;

            const forwardPush = 1.05;
            piece.position = new Vector3(
                offsetX,
                this._anchorY,
                -this._half - pieceSize * 0.5 + forwardPush
            );

            this._applyImageFragment(piece, index, n, baseTexture);

            // Índice correcto (espejo vertical)
            const raux = Math.floor(index / n);
            const caux = index % n;
            const mirrorRow = n - 1 - raux;
            const aux = mirrorRow * n + caux;

            this.pieces.push({
                mesh: piece,
                startPos: piece.position.clone(),
                slotIndex: null,
                correctIndex: aux,
                locked: false
            });
        }

        console.log(`[PuzzleGame] ${count} piezas spawneadas con textura completa.`);
    }

    _applyImageFragment(piece, index, n, baseTexture) {
        const row = Math.floor(index / n);
        const col = index % n;

        const mat = new StandardMaterial(`p-mat-${index}`, this.scene);
        mat.diffuseTexture = baseTexture.clone();
        mat.diffuseTexture.wrapU = mat.diffuseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;

        mat.diffuseTexture.uScale = 1 / n;
        mat.diffuseTexture.vScale = 1 / n;
        mat.diffuseTexture.uOffset = col / n;
        mat.diffuseTexture.vOffset = (n - 1 - row) / n;

        mat.specularColor = new Color3(0, 0, 0);
        piece.material = mat;
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
            if (d < dmin) {
                dmin = d;
                best = i;
            }
        }
        return { idx: best, dist: dmin };
    }

    _trySnap(pieceObj, localPos, threshold) {
        const { idx, dist } = this._nearestSlot(localPos);

        if (dist <= threshold && this.slotOccupant[idx] == null) {
            const target = this.slots[idx].center;
            pieceObj.mesh.position.set(target.x, this._anchorY, target.z);
            pieceObj.slotIndex = idx;
            this.slotOccupant[idx] = pieceObj.mesh;

            const isCorrect = pieceObj.correctIndex === idx;

            if (isCorrect) {
                pieceObj.locked = true;
                pieceObj.mesh.isPickable = false;
                this._addScore(this.bonusPerPiece);
                this.hud.message("¡Correcto!", 600);
            } else {
                pieceObj.locked = false;
                this._applyPenalty();
                this.hud.message("Encajó, pero no es el lugar correcto", 600);
            }

            this._checkCompletion();
        } else {
            pieceObj.mesh.position.copyFrom(pieceObj.startPos);
            pieceObj.slotIndex = null;
            this.hud.message("No encajó", 600);
        }

        console.log("=== Estado actual de las piezas ===");
        this.pieces.forEach((p, i) => {
            const pos = p.mesh.position;
            console.log(
                `piece-${i}: (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}) ${p.locked ? "[LOCKED]" : ""}`
            );
        });
        console.log("===================================");
    }

    // ---------- verificación de finalización ----------

    _checkCompletion() {
        const allCorrect = this.pieces.every(p => p.locked === true);

        if (allCorrect) {
            console.log("[PuzzleGame] 🏆 Puzzle completado!");
            this.hud.message("¡Puzzle completado!", 2000);
            this._onWin();
        }
    }

    _onWin() {
        this.hud.stopTimer();
        const remaining = Math.max(0, this.hud._timeLeft ?? 0);
        let bonusPerSec = Number(this.bonusTime ?? 0);
        let timeBonusPoints = 0;
        if (Number.isFinite(bonusPerSec) && bonusPerSec > 0 && remaining > 0) {
            timeBonusPoints = Math.floor(remaining * bonusPerSec);
            console.log(
                `[PuzzleGame] Bonus por tiempo: ${remaining}s * ${bonusPerSec} = +${timeBonusPoints} pts`
            );
            this._addScore(timeBonusPoints);
        }

        this.isCompleted = true;

        console.log("[PuzzleGame] 🎉 ¡Victoria detectada!");
        this.hud.message("¡Felicidades, completaste el puzzle!", 2000);

        this.hud.showEndPopup({
            score: this.score,
            onRetry: () => {
                console.log("[PuzzleGame] Reintentar puzzle");
                this._restart();
            },
            onContinue: () => {
                console.log("[PuzzleGame] Continuar con siguiente minijuego (por ahora: exit)");
                this.onGameEnd?.();
            },
            timeExpired: false
        });
    }

    // ---------- HUD / puntuación ----------

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

    _applyPenalty() {
        console.log(`[PuzzleGame] Penalización: -${this.penaltyPoitns} puntos`);
        this._addScore(-this.penaltyPoitns);
    }

    _fail() {
        this.hud.stopTimer();
        this.hud.message("Se acabó el tiempo. Inténtalo de nuevo.", 2000);

        this.hud.showEndPopup({
            score: this.score,
            onRetry: () => {
                console.log("[PuzzleGame] Reintentar tras perder");
                this._restart();
            },
            onContinue: null,
            timeExpired: true
        });
    }

    _restart() {
        console.log("[PuzzleGame] Reiniciando minijuego...");

        this.score = 0;
        this.hintsLeft = 3;
        this.isCompleted = false;
        this._firstTouchHandled = false;

        this.hud.setScore(0);
        this.hud.stopTimer();

        // Reconstruye
        this.dispose();
        this.start();
    }
}
