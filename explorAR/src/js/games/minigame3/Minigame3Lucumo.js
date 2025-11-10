import {
    MeshBuilder,
    StandardMaterial,
    Texture,
    Color3,
    Vector3,
    TransformNode,
    PointerEventTypes, // ← para tap/pointer
} from "@babylonjs/core";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders";

import { gameplayConfig } from "../../../config/gameplayConfig.js";
import { experiencesConfig } from "../../../config/experienceConfig.js";

export class Minigame3Lucumo {
    constructor({ scene, hud, experienceId, startingScore = 0 }) {
        this.scene = scene;
        this.hud = hud;
        this.experienceId = experienceId;
        this.score = startingScore;

        this.gridSize = 10; // cuadrícula 10x10
        this.grid = [];
        this.spawnRadius = 1.2;
        this.plotSize = null; // se calculará dinámicamente
        this.tileLiftY = 0.003; // altura visual del tile (evitar z-fighting)

        this.isRunning = false;

        // bots
        this.botUrl = null;
        this.bots = []; // { root, ags, row, col, defaultRotationY, isMoving }
        this.defaultBotScaleXZRatio = 0.60; // % del tile que puede ocupar el bot
        this.defaultBotFaceX = true;       // “mirar al eje X” tras terminar de moverse
        this.defaultBotRotationY = 0;      // ajusta si tu GLB no mira a +X por defecto

        // interacción
        this.pointerObserver = null;

        // path actual (matriz 0/1)
        this.currentPath = null;
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
        this.currentPath = camino; // ← guardamos para validaciones de movimiento

        await this._buildPathOnly(camino);

        // Spawn 3 Y_Bot en celdas NO camino (sin repetir fila)
        try {
            await this._spawnBots(camino);
        } catch (e) {
            console.error("[Lucumo] Error al spawnear bots:", e);
        }

        // Habilitar tap para mover a la derecha
        this._wireTapMoveRight();

        this.isRunning = true;
        console.log("[Minigame3Lucumo] ✓ Camino + bots listos.");
    }

    _loadConfigForLucumo() {
        try {
            this.experience = experiencesConfig.find(e => e.id === this.experienceId);
            if (!this.experience) return false;
            this.miniConfig = this.experience.minigames?.find(m => m.id === "m3Lucumo");
            if (!this.miniConfig) return false;

            const p = this.miniConfig.params || {};
            if (Number.isFinite(p.spawnRadius)) this.spawnRadius = p.spawnRadius;

            this.assetMap = {};
            for (const a of this.miniConfig.assets || []) {
                this.assetMap[a.key] = a.url;
            }

            this.dirtUrl = this.assetMap["dirt_trail"];
            this.botUrl = this.assetMap["y_bot"] ?? null;

            if (!this.dirtUrl) {
                console.warn("[Lucumo] No se encontró 'dirt_trail' en assets; el path usará material plano.");
            }
            if (!this.botUrl) {
                console.warn("[Lucumo] No se encontró 'y_bot' en assets; no se spawnearán bots.");
            } else {
                console.log("[Lucumo] ✓ botUrl (y_bot) =", this.botUrl);
            }
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
        this.plotSize = cellSize; // coherencia entre tamaño y espaciado

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = (c - (this.gridSize / 2 - 0.5)) * cellSize;
                const z = (r - (this.gridSize / 2 - 0.5)) * cellSize;
                this.grid.push({ row: r, col: c, pos: new Vector3(x, 0.002, z) });
            }
        }
        console.log(`[Lucumo] Grid ${this.gridSize}x${this.gridSize} generado; cellSize=${cellSize.toFixed(3)} plotSize=${this.plotSize.toFixed(3)}`);
    }

    _generatePath() {
        const path = Array.from({ length: this.gridSize }, () =>
            Array(this.gridSize).fill(0)
        );

        const filaLarga1 = Math.random() < 0.5 ? 3 : 4;
        const filaLarga2 = Math.random() < 0.5 ? 6 : 7;

        // inicio y dirección inicial aleatorios
        let inicio = Math.floor(Math.random() * this.gridSize);
        let direccionActual = Math.random() < 0.5 ? -1 : 1;

        for (let fila = 0; fila < this.gridSize; fila++) {
            // ancho dinámico con variación leve
            let ancho;
            if (fila === filaLarga1 || fila === filaLarga2)
                ancho = 4 + Math.floor(Math.random() * 2);
            else
                ancho = 2 + Math.floor(Math.random() * 2);

            // ancho puede variar ±1 por fila
            ancho = Math.max(2, ancho + (Math.floor(Math.random() * 3) - 1));

            // limitar inicio dentro de grilla
            inicio = Math.max(0, Math.min(this.gridSize - 1, inicio));

            let fin = inicio + ancho * direccionActual;
            if (direccionActual > 0) {
                // hacia la derecha
                fin = Math.min(this.gridSize - 1, inicio + ancho - 1);
            } else {
                // hacia la izquierda
                fin = Math.max(0, inicio - ancho + 1);
            }

            const desde = Math.min(inicio, fin);
            const hasta = Math.max(inicio, fin);

            for (let c = desde; c <= hasta; c++) path[fila][c] = 1;

            // cada pocas filas, chance de invertir dirección
            if (Math.random() < 0.25) direccionActual *= -1;

            // desplazamiento suave con inercia
            const desplazamiento = (Math.random() < 0.5 ? 1 : 2) * direccionActual;
            inicio += desplazamiento;

            // rebote al tocar bordes
            if (inicio <= 0) {
                inicio = 0;
                direccionActual = 1;
            } else if (inicio >= this.gridSize - 1) {
                inicio = this.gridSize - 1;
                direccionActual = -1;
            }
        }

        console.log("[Lucumo] Camino generado (caótico):\n" + path.map(r => r.join("")).join("\n"));
        return path;
    }


    async _buildPathOnly(path) {
        // texturizado del sendero
        let dirtTex = null;
        if (this.dirtUrl) {
            dirtTex = new Texture(this.dirtUrl, this.scene);
            dirtTex.wrapU = Texture.CLAMP_ADDRESSMODE;
            dirtTex.wrapV = Texture.CLAMP_ADDRESSMODE;
            dirtTex.uScale = 1;
            dirtTex.vScale = 1;
        }

        const tileSize = this.plotSize * 0.99;
        console.log(`[Lucumo] Construyendo path; tileSize=${tileSize.toFixed(3)}`);

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (path[r][c] !== 1) continue;

                const cell = this.grid[r * this.gridSize + c];
                const ground = MeshBuilder.CreateGround(
                    `path_${r}_${c}`,
                    { width: tileSize, height: tileSize },
                    this.scene
                );

                // elevar levemente para evitar z-fighting con el base plane
                ground.position = new Vector3(cell.pos.x, this.tileLiftY, cell.pos.z);

                const mat = new StandardMaterial(`pathMat_${r}_${c}`, this.scene);
                if (dirtTex) mat.diffuseTexture = dirtTex;
                mat.specularColor = new Color3(0, 0, 0);
                mat.backFaceCulling = false;
                ground.material = mat;
            }
        }
        console.log("[Lucumo] ✓ Path construido.");
    }

    // ────────────────────────────── BOTS ──────────────────────────────

    async _spawnBots(path) {
        if (!this.botUrl) {
            console.warn("[Lucumo] _spawnBots: botUrl no definido; se omite spawn.");
            return;
        }

        // 1) Celdas libres (no camino)
        const libres = [];
        for (let i = 0; i < this.grid.length; i++) {
            const cell = this.grid[i];
            if (path[cell.row][cell.col] === 0) libres.push(cell);
        }
        if (!libres.length) {
            console.warn("[Lucumo] _spawnBots: no hay celdas libres.");
            return;
        }

        // 2) Elegir 3 sin repetir fila
        const seleccion = this._pickCellsNoRepeatRow(libres, 3);
        console.log("[Lucumo] Bots celdas seleccionadas:", seleccion.map(c => `(${c.row},${c.col})`).join(", "));

        for (let idx = 0; idx < seleccion.length; idx++) {
            const cell = seleccion[idx];
            console.log(`[Lucumo] Cargando Y_Bot #${idx + 1} para celda (${cell.row},${cell.col}) ...`);

            const result = await SceneLoader.ImportMeshAsync(null, "", this.botUrl, this.scene);

            const root = new TransformNode(`ybot_root_${idx}`, this.scene);
            result.meshes.forEach(m => {
                if (m.parent === null) m.parent = root;
            });

            // Escalado según bounding box
            const bbox = root.getHierarchyBoundingVectors();
            const size = bbox.max.subtract(bbox.min);
            const maxXZ = Math.max(size.x, size.z);
            const tileSize = this.plotSize * 0.99;
            const targetXZ = tileSize * this.defaultBotScaleXZRatio; // 60% del tile
            const scale = maxXZ > 0 ? (targetXZ / maxXZ) : 1.0;
            root.scaling.set(scale, scale, scale);

            // Recalcular bounding para apoyar en piso
            const bbox2 = root.getHierarchyBoundingVectors();
            const minY2 = bbox2.min.y;
            const yGround = 0; // en celdas libres el base plane está en y=0
            const yOffset = (yGround - minY2);
            root.position = new Vector3(cell.pos.x, yGround + yOffset, cell.pos.z);

            // Orientación base al eje X
            root.rotation.set(0, this.defaultBotRotationY, 0);

            const ags = result.animationGroups || [];
            const names = ags.map(a => a.name);
            console.log(`[Lucumo] Y_Bot #${idx + 1}: AnimGroups=`, names);

            // Arrancar en idle si existe; sino detener todas
            this._playOnly(ags, g => /idle/i.test(g.name), true);

            this.bots.push({
                root,
                ags,
                row: cell.row,
                col: cell.col,
                defaultRotationY: this.defaultBotRotationY,
                isMoving: false,
            });
            console.log(`[Lucumo] ✓ Y_Bot #${idx + 1} spawn OK en (${cell.row},${cell.col}), scale=${scale.toFixed(3)}.`);
        }

        if (this.bots.length === 0) {
            console.warn("[Lucumo] _spawnBots: no se pudo spawnear ningún bot.");
        } else {
            console.log(`[Lucumo] ✓ ${this.bots.length} bot(s) spawneado(s). Listos para moverse.`);
        }
    }

    _pickCellsNoRepeatRow(cells, k) {
        const byRow = new Map();
        for (const c of cells) {
            if (!byRow.has(c.row)) byRow.set(c.row, []);
            byRow.get(c.row).push(c);
        }
        const rows = Array.from(byRow.keys());
        this._shuffleInPlace(rows);
        const result = [];
        for (const r of rows) {
            const arr = byRow.get(r);
            this._shuffleInPlace(arr);
            result.push(arr[0]);
            if (result.length >= k) break;
        }
        return result;
    }

    _shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    _playOnly(animationGroups, predicate, loop = true, speedRatio = 1.0) {
        if (!animationGroups || animationGroups.length === 0) return;
        let played = false;
        for (const ag of animationGroups) {
            if (predicate(ag) && !played) {
                ag.start(loop, speedRatio, ag.from, ag.to, false);
                played = true;
            } else {
                ag.stop();
            }
        }
        if (!played) {
            for (const ag of animationGroups) ag.stop();
        }
    }

    async _moveBotToCell(bot, targetCell, durationMs = 1200) {
        if (!bot || !targetCell) return;
        const from = bot.root.position.clone();
        const to = new Vector3(targetCell.pos.x, from.y, targetCell.pos.z);

        // Rotar hacia el destino
        bot.root.lookAt(to);

        // “walk” si existe, sino se mueve sin animación
        this._playOnly(bot.ags, g => /walk/i.test(g.name), true, 1.0);

        const start = performance.now();
        return new Promise(resolve => {
            const step = () => {
                const now = performance.now();
                const t = Math.min(1, (now - start) / durationMs);
                bot.root.position = Vector3.Lerp(from, to, t);

                if (t < 1 && this.isRunning) {
                    requestAnimationFrame(step);
                } else {
                    // Detener “walk” y volver a mirar al frente (eje X)
                    this._playOnly(bot.ags, g => /idle/i.test(g.name), true, 1.0);
                    if (this.defaultBotFaceX) {
                        bot.root.rotation.set(0, bot.defaultRotationY, 0);
                    }
                    bot.row = targetCell.row;
                    bot.col = targetCell.col;
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }

    // ───────────────────── TAP → MOVER A LA DERECHA ─────────────────────

    _wireTapMoveRight() {
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        this.pointerObserver = this.scene.onPointerObservable.add((pi) => {
            if (pi.type !== PointerEventTypes.POINTERDOWN) return;
            const pick = pi.pickInfo;
            if (!pick?.hit || !pick.pickedMesh) return;

            // ¿Qué bot fue tocado?
            const bot = this._findBotByPickedMesh(pick.pickedMesh);
            if (!bot) return;
            if (bot.isMoving) {
                console.log("[Lucumo] Tap ignorado: bot ya se está moviendo.");
                return;
            }

            const row = bot.row;
            const nextCol = bot.col + 1;

            // Validaciones: dentro de la grilla, no camino, no ocupado
            if (nextCol >= this.gridSize) {
                console.log(`[Lucumo] Bot (${row},${bot.col}) → derecha: fuera de la grilla.`);
                return;
            }
            if (!this.currentPath) {
                console.warn("[Lucumo] currentPath no definido.");
                return;
            }
            if (this.currentPath[row][nextCol] === 1) {
                console.log(`[Lucumo] Bot (${row},${bot.col}) → derecha bloqueado (hay camino).`);
                return;
            }
            if (this._botAt(row, nextCol)) {
                console.log(`[Lucumo] Bot (${row},${bot.col}) → derecha ocupada por otro bot.`);
                return;
            }

            const targetCell = this.grid[row * this.gridSize + nextCol];
            if (!targetCell) return;

            console.log(`[Lucumo] Tap sobre bot en (${row},${bot.col}) → mover a (${row},${nextCol}).`);
            bot.isMoving = true;
            this._moveBotToCell(bot, targetCell).then(() => {
                bot.isMoving = false;
                console.log(`[Lucumo] Bot llegó a (${row},${nextCol}).`);
            });
        });
        console.log("[Lucumo] Tap → mover a derecha habilitado.");
    }

    _findBotByPickedMesh(mesh) {
        // Busca el bot cuyo root sea ancestro del mesh pickeado
        for (const b of this.bots) {
            // getChildMeshes incluye jerarquía; más barato: probar ascendencia
            let n = mesh;
            while (n) {
                if (n === b.root) return b;
                n = n.parent;
            }
        }
        return null;
    }

    _botAt(row, col) {
        return this.bots.some(b => b.row === row && b.col === col);
    }

    // ─────────────────────────────────────────────────────────────────

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
        try {
            for (const b of this.bots) {
                try { b.root?.dispose(); } catch { }
                if (b.ags) for (const ag of b.ags) { try { ag.stop(); } catch { } }
            }
        } catch { }
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        this.hud?.stopTimer?.();
        console.log("[Lucumo] Recursos liberados");
    }
}
