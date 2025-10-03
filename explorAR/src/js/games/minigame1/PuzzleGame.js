import { MeshBuilder, StandardMaterial, Color3, Vector3, TransformNode, Ray, Texture } from "@babylonjs/core";
import { PuzzlePanel } from "../../panels/minigame1Panel.js";

export class PuzzleGame {
    constructor({ scene, hud, grid = 3, imageUrl = null }) {
        this.scene = scene;
        this.hud = hud;
        this.grid = grid;
        this.imageUrl = imageUrl;
        this.board = null;        // TransformNode del tablero (padre)
        this.slots = [];          // { index, center: Vector3, expectedRot }
        this.pieces = [];         // { index, mesh, correctSlotIndex, encajada, rotCount }
        this.activePiece = null;
        this.score = 0;
        this.hintsLeft = 3;
        this.rotationsForPenalty = 0;
        this._pointerObs = null;
        this._dragOffset = new Vector3(0, 0, 0);
        this._boardPlaneN = new Vector3(0, 1, 0); // tablero en XZ
        this._boardPlaneP = new Vector3(0, 0, 0);
        this._anchorY = 0.01;     // piezas flotan 1cm sobre el tablero
    }

    async start() {
        // 1) Crear tablero (si aún no tienes hit-test, colócalo frente a cámara)
        const cam = this.scene.activeCamera;
        const forward = cam.getForwardRay(1.0).direction;
        const boardPos = cam.position.add(forward.scale(1.0)); // 1m al frente
        boardPos.y -= 0.2;

        this.board = new TransformNode("puzzle-board", this.scene);
        this.board.position.copyFrom(boardPos);

        // Plano base visible SIEMPRE (guía)
        const size = 0.72;
        const gridMesh = MeshBuilder.CreateGround("board-grid", { width: size, height: size }, this.scene);
        gridMesh.parent = this.board;
        const gridMat = new StandardMaterial("grid-mat", this.scene);
        gridMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
        gridMat.alpha = 0.5; // semitransparente
        gridMesh.material = gridMat;

        // Líneas de guía (slots)
        this._buildSlots(size);

        // 2) Generar piezas dispersas
        await this._spawnPieces(size);

        // 3) HUD: panel + acciones
        this.hud.showPanel(PuzzlePanel, {
            onRotateLeft: () => this._rotateActive(-1),
            onRotateRight: () => this._rotateActive(+1),
            onHint: () => this._useHint()
        });
        this.hud.setTime(60);
        this.hud.startTimer(60, null, () => this._fail());

        // 4) Input (selección/arrastre/soltar)
        this._attachPointer();
    }

    dispose() {
        this.hud.stopTimer();
        if (this._pointerObs) {
            this.scene.onPointerObservable.remove(this._pointerObs);
            this._pointerObs = null;
        }
        this.pieces.forEach(p => p.mesh.dispose());
        this.slots = [];
        this.pieces = [];
        this.board?.dispose();
    }

    // ----------------- construcción -----------------
    _buildSlots(size) {
        const n = this.grid;
        const cell = size / n;
        const half = size / 2;

        // posiciones centrales de cada slot en espacio local del tablero
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const index = r * n + c;
                const cx = -half + (c + 0.5) * cell;
                const cz = -half + (r + 0.5) * cell;
                this.slots.push({ index, center: new Vector3(cx, 0, cz), expectedRot: 0 });
            }
        }

        // líneas guía simples (opcional: usa MeshBuilder.CreateLines)
        // mantenemos solo el ground semitransparente para arrancar.
    }

    async _spawnPieces(size) {
        const n = this.grid;
        const cell = size / n;
        const half = size / 2;

        for (let i = 0; i < n * n; i++) {
            // pieza como plano elevado
            const piece = MeshBuilder.CreateGround(`piece-${i}`, { width: cell * 0.95, height: cell * 0.95 }, this.scene);
            piece.parent = this.board;
            // dispersión alrededor (frente del tablero)
            const rx = (Math.random() * size) - half;
            const rz = half + 0.35 + Math.random() * 0.35; // delante del borde
            piece.position.set(rx, this._anchorY, rz);
            // material de color (luego reemplaza por textura recortada)
            const mat = new StandardMaterial(`p-mat-${i}`, this.scene);
            mat.diffuseColor = new Color3(0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.5);
            piece.material = mat;

            // rotación aleatoria en cuartos
            const k = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2][(Math.random() * 4) | 0];
            piece.rotation.y = k;

            this.pieces.push({ index: i, mesh: piece, correctSlotIndex: i, encajada: false, rotCount: 0 });
        }
    }

    // ----------------- interacción -----------------
    _attachPointer() {
        const pickOpts = { predicate: (m) => this.pieces.some(p => p.mesh === m && !p.encajada) };

        this._pointerObs = this.scene.onPointerObservable.add((pointerInfo) => {
            const type = pointerInfo.type;
            if (type === 1) { // POINTERDOWN
                const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, pickOpts.predicate);
                if (pick?.hit) {
                    this.activePiece = this.pieces.find(p => p.mesh === pick.pickedMesh);
                    const local = pick.pickedPoint.subtract(this.board.position);
                    this._dragOffset.copyFrom(this.activePiece.mesh.position.subtract(local));
                }
            } else if (type === 2) { // POINTERUP
                if (this.activePiece) this._drop();
                this.activePiece = null;
            } else if (type === 3) { // POINTERMOVE
                if (!this.activePiece) return;
                // proyectar sobre el plano del tablero (y = board.y)
                const ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY);
                const t = (this._boardPlaneP.subtract(ray.origin)).dot(this._boardPlaneN) / ray.direction.dot(this._boardPlaneN);
                if (t > 0) {
                    const hit = ray.origin.add(ray.direction.scale(t));
                    const local = hit.subtract(this.board.position);
                    const target = local.add(this._dragOffset);
                    this.activePiece.mesh.position.set(target.x, this._anchorY, target.z);
                }
            }
        });
    }

    _drop() {
        const piece = this.activePiece;
        if (!piece) return;

        // slot correcto
        const slot = this.slots[piece.correctSlotIndex];
        const worldCenter = slot.center.add(this.board.position);
        const d = Vector3.Distance(piece.mesh.position, worldCenter);

        // tolerancias
        const snapDist = 0.025; // 2.5 cm
        const rot = ((piece.mesh.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const isRightRot = (Math.abs(rot - 0) < (10 * Math.PI / 180)) || (Math.abs(rot - Math.PI / 2) < (10 * Math.PI / 180)) ||
            (Math.abs(rot - Math.PI) < (10 * Math.PI / 180)) || (Math.abs(rot - 3 * Math.PI / 2) < (10 * Math.PI / 180));

        if (d <= snapDist && isRightRot) {
            // encajar exacto
            piece.mesh.position.copyFrom(worldCenter);
            // corrige a múltiplos exactos de 90°
            const k = Math.round(rot / (Math.PI / 2));
            piece.mesh.rotation.y = k * (Math.PI / 2);
            piece.encajada = true;
            piece.mesh.isPickable = false;

            // puntaje
            this._addScore(10);
            // ¿completado?
            if (this.pieces.every(p => p.encajada)) this._complete();
        } else {
            // nada: queda donde la soltó
        }
    }

    _rotateActive(dir) {
        if (!this.activePiece) return;
        this.activePiece.mesh.rotation.y += (dir < 0 ? -1 : 1) * (Math.PI / 2);
        this.activePiece.rotCount++;
        if (this.activePiece.rotCount % 3 === 0) { // penaliza cada 3 giros “inútiles”
            this._addScore(-1);
        }
    }

    _useHint() {
        if (this.hintsLeft <= 0) return;
        this.hintsLeft--;
        this._addScore(-15);
        // Mostrar “fantasma” rápido: resaltamos todos los slots por 2s
        this.hud.message("Pista: mira la guía", 1500);
        // (si usas textura completa, aquí puedes mostrar overlay con la imagen 2s)
    }

    _addScore(delta) {
        this.score = Math.max(0, this.score + delta);
        this.hud.setScore(this.score);
    }

    _complete() {
        const timeLeft = this.hud ? this.hud._timeLeft : 0;
        this.hud.stopTimer();
        // bonus tiempo
        this._addScore(Math.floor(timeLeft * 2));
        if (this.hintsLeft === 3) this._addScore(20); // Perfect
        this.hud.message("¡Completado!", 2500);
        // aquí puedes notificar al runner para pasar al siguiente minijuego
    }

    _fail() {
        this.hud.message("Se acabó el tiempo. Inténtalo de nuevo.", 3000);
        // podrías reiniciar: this.dispose(); await this.start();
    }
}
