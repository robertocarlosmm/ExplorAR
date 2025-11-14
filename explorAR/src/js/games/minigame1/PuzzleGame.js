// src/js/games/minigame1/PuzzleGame.js
import { MeshBuilder, StandardMaterial, Color3, Vector3, TransformNode, Texture } from "@babylonjs/core";
import { InteractionManager } from "../../input/InteractionManager.js";
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
        this.pieces = [];         // { mesh, startPos, slotIndex }

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

        this.interactionManager = null;

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
        console.log("[PuzzleGame] Tablero colocado en posición detectada:", boardPos);

        // Ground del tablero (solo guí­a)
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
                    // Evitar mover si ya está bloqueada
                    if (p.locked) return false;

                    // Liberar slot anterior si lo tenía
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

        // === Prevención de desplazamiento inicial ===
        let firstTouch = true;

        // Recorremos los draggables y sobreescribimos su onDragStart para interceptar el primer toque
        this.pieces.forEach((p) => {
            const original = this.interactionManager._draggables.get(p.mesh);
            if (!original) return;

            const behavior = original.behavior;
            behavior.onDragStartObservable.addOnce(() => {
                if (firstTouch) {
                    firstTouch = false;

                    // Detectamos si todas las piezas cambiaron su posición (p.ej. salto en Z)
                    const deltas = this.pieces.map(pp => pp.mesh.position.z - pp.startPos.z);
                    const promedioDeltaZ = deltas.reduce((a, b) => a + b, 0) / deltas.length;
                    const saltoDetectado = Math.abs(promedioDeltaZ) > 0.02; // umbral de ~2cm

                    if (saltoDetectado) {
                        console.warn("[PuzzleGame] Desplazamiento detectado en primer toque. Restaurando posiciones...");
                        this.pieces.forEach(pp => {
                            pp.mesh.position.copyFrom(pp.startPos);
                        });
                    }
                }
            });
        });

        // HUD
        this.hud.setScore(0);          // NUEVO: marcador visible en 0 al iniciar
        this.hud.setTime(this.timeLimit);
        this.hud.startTimer(this.timeLimit, null, () => this._fail());

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

        console.log(`[PuzzleGame] Cargando textura base: ${this.imageUrl}`);

        // Carga la textura base (una sola vez)
        const baseTexture = new Texture(this.imageUrl, this.scene, true, false, Texture.TRILINEAR_SAMPLINGMODE, null, null, null, false);
        baseTexture.wrapU = baseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;


        // Tras el borde inferior del tablero
        const indices = Array.from({ length: count }, (_, i) => i);

        // Mezclar el orden de aparición (Fisher–Yates shuffle)
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        for (let i = 0; i < count; i++) {
            const index = indices[i]; // índice de la pieza (para textura y correctIndex)
            const offsetX = (i - (count - 1) / 2) * (pieceSize * 1.1);

            const piece = MeshBuilder.CreateGround(`piece-${index}`, { width: pieceSize, height: pieceSize }, this.scene);
            piece.parent = this.board;

            const forwardPush = 1.05;
            piece.position = new Vector3(
                offsetX,
                this._anchorY,
                -this._half - pieceSize * 0.5 + forwardPush
            );

            // Asignar textura según su índice real (no el mezclado)
            this._applyImageFragment(piece, index, n, baseTexture);

            // Calcular índice correcto (espejo vertical)
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

    //asignar texturas a las piezas
    _applyImageFragment(piece, index, n, baseTexture) {
        const row = Math.floor(index / n);
        const col = index % n;

        const mat = new StandardMaterial(`p-mat-${index}`, this.scene);

        // Clonamos la textura base para esta pieza
        mat.diffuseTexture = baseTexture.clone();
        mat.diffuseTexture.wrapU = mat.diffuseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;

        // Escala y desplazamiento UV correctos
        mat.diffuseTexture.uScale = 1 / n;
        mat.diffuseTexture.vScale = 1 / n;
        mat.diffuseTexture.uOffset = col / n;
        mat.diffuseTexture.vOffset = (n - 1 - row) / n; // asegura orientación correcta

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
            if (d < dmin) { dmin = d; best = i; }
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
                pieceObj.locked = true; // 🔒 se bloquea (no se moverá más)
                pieceObj.mesh.isPickable = false;  
                this._addScore(this.bonusPerPiece);
                this.hud.message("¡Correcto!", 600);
            } else {
                pieceObj.locked = false; // 🔓 puede volver a moverse
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
        // Detiene el temporizador y registra victoria
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
            score: this.score,                    // puntaje actual
            onRetry: () => {
                console.log("[PuzzleGame] Reintentar puzzle");
                this._restart();                    // método que reinicia este puzzle
            },
            onContinue: () => {
                console.log("[PuzzleGame] Continuar con siguiente minijuego (por ahora: exit)");
                this.onGameEnd?.();
                //this._exit();                       // método temporal para salir
            },
            timeExpired: false                    // ganó, así que mostramos ambos botones
        });
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

    _applyPenalty() {

        console.log(`[PuzzleGame] Penalización: -${this.penaltyPoitns} puntos`);
        this._addScore(-this.penaltyPoitns);
        /*console.log(`[PuzzleGame] Penalización: -${penaltySeconds}s`);
        this.hud.decreaseTime(penaltySeconds);*/

        // Opcional: pequeña animación o feedback
        //this.hud.message(`-${penaltySeconds}s`, 1000);
    }

    _fail() {
        this.hud.stopTimer();
        this.hud.message("Se acabó el tiempo. Inténtalo de nuevo.", 2000);

        // Mostrar popup sin botón de continuar
        this.hud.showEndPopup({
            score: this.score,
            onRetry: () => {
                console.log("[PuzzleGame] Reintentar tras perder");
                this._restart();
            },
            onContinue: null,   // se oculta
            timeExpired: true
        });
    }

    _restart() {
        console.log("[PuzzleGame] Reiniciando minijuego...");

        // Reset lógico del minijuego
        this.score = 0;
        this.hintsLeft = 3;
        this.isCompleted = false;

        // Reset visual del HUD
        this.hud.setScore(0);
        this.hud.stopTimer();

        // Reconstruye escena y cronómetro
        this.dispose();
        this.start();
    }

}