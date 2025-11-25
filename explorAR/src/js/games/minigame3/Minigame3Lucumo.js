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
import { ProjectileSystem } from "./ProjectilSystem.js";

export class Minigame3Lucumo {
    constructor({ scene, hud, experienceId, startingScore = 0 }) {
        this.scene = scene;
        this.hud = hud;
        this.experienceId = experienceId;
        this.score = startingScore;
        this.startingScore = startingScore;

        this.gridSize = 10; // cuadrícula 10x10
        this.grid = [];
        this.spawnRadius = 1.2;
        this.plotSize = null; // se calculará dinámicamente
        this.tileLiftY = 0.003; // altura visual del tile (evitar z-fighting)
        this.completeBonus = gameplayConfig.scoring.m3Lucumo.completeBonus || 15;
        this.timeBonusPerSec = gameplayConfig.scoring.m3Lucumo.timeBonusPerSec || 2;

        this.isRunning = false;

        // bots
        this.botUrl = null;
        this.bots = []; // { root, ags, row, col, defaultRotationY, isMoving }
        this.defaultBotScaleXZRatio = 0.60; // % del tile que puede ocupar el bot
        this.defaultBotFaceX = true;       // “mirar al eje X” tras terminar de moverse
        this.defaultBotRotationY = Math.PI;      // ajusta si tu GLB no mira a +X por defecto
        this.totalBotsSpawned = 0;
        this.botsPerWave = 5;
        this.wave = 1;
        this.finished = false;


        // interacción
        this.pointerObserver = null;

        // path actual (matriz 0/1)
        this.currentPath = null;
    }

    async start() {
        //console.log("[Minigame3Lucumo] Iniciando...");

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

        // ─────────────── SISTEMA DE PROYECTILES ───────────────
        this.projectiles = new ProjectileSystem({
            scene: this.scene,
            hud: this.hud,
            projectileTypes: ["izquierda", "derecha"],
            assetMap: this.assetMap,
            onHit: (type, target) => this._handleProjectileHit(type, target),
            speed: 2.8,
            gravity: -2.5,
            range: 5.0,
            cooldown: 600,
            getNextType: () => this._decideNextProjectileType(),
        });

        // Los bots son los targets
        this.projectiles.registerTargets(this.bots.map(b => b.root));

        // Lanza proyectil con clic/tap
        window.addEventListener("click", () => this.projectiles.tap());

        // Lógica automática de aparición de proyectiles
        this._scheduleProjectileSpawn();


        this.isRunning = true;
        //console.log("[Minigame3Lucumo] ✓ Camino + bots listos.");
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
                //console.log("[Lucumo] ✓ botUrl (y_bot) =", this.botUrl);
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
        //console.log(`[Lucumo] Grid ${this.gridSize}x${this.gridSize} generado; cellSize=${cellSize.toFixed(3)} plotSize=${this.plotSize.toFixed(3)}`);
    }

    _generatePath() {
        const path = Array.from({ length: this.gridSize }, () =>
            Array(this.gridSize).fill(0)
        );

        // Dos filas largas (posiciones absolutas como tu versión)
        const filaLarga1 = Math.random() < 0.5 ? 3 : 4;
        const filaLarga2 = Math.random() < 0.5 ? 6 : 7;

        // inicio y dirección inicial aleatorios
        let inicio = Math.floor(Math.random() * this.gridSize);
        let direccionActual = Math.random() < 0.5 ? -1 : 1;

        // Para asegurar continuidad, guardamos el tramo anterior [prevDesde, prevHasta]
        let prevDesde = null;
        let prevHasta = null;

        for (let fila = 0; fila < this.gridSize; fila++) {
            // --- Ancho base (2–3; 4–5 si fila larga), con variación ±1 y clamp ---
            let ancho = (fila === filaLarga1 || fila === filaLarga2)
                ? 4 + Math.floor(Math.random() * 2) // 4–5
                : 2 + Math.floor(Math.random() * 2); // 2–3
            ancho = Math.max(2, Math.min(this.gridSize, ancho + (Math.floor(Math.random() * 3) - 1)));

            // --- Tramo tentativo según inicio y dirección ---
            inicio = Math.max(0, Math.min(this.gridSize - 1, inicio));

            let desde, hasta;
            if (direccionActual > 0) {
                // hacia la derecha: tramo [inicio .. inicio+ancho-1]
                desde = inicio;
                hasta = Math.min(this.gridSize - 1, desde + ancho - 1);
            } else {
                // hacia la izquierda: tramo [inicio-ancho+1 .. inicio]
                hasta = inicio;
                desde = Math.max(0, hasta - (ancho - 1));
            }

            // --- Ajuste de continuidad: forzar intersección con la fila anterior ---
            if (prevDesde !== null) {
                // Si el tramo actual queda completamente a la izquierda del anterior -> empujamos a la derecha
                if (hasta < prevDesde) {
                    const shift = prevDesde - hasta;
                    desde += shift;
                    hasta += shift;
                }
                // Si el tramo actual queda completamente a la derecha del anterior -> empujamos a la izquierda
                else if (desde > prevHasta) {
                    const shift = desde - prevHasta;
                    desde -= shift;
                    hasta -= shift;
                }

                // Re-clamp dentro de la grilla
                if (desde < 0) {
                    const overflow = -desde;
                    desde = 0;
                    hasta = Math.min(this.gridSize - 1, hasta + overflow);
                }
                if (hasta > this.gridSize - 1) {
                    const overflow = hasta - (this.gridSize - 1);
                    hasta = this.gridSize - 1;
                    desde = Math.max(0, desde - overflow);
                }

                // Si por límites el ancho se achicó, intentamos expandir respetando la intersección
                const anchoActual = hasta - desde + 1;
                if (anchoActual < ancho) {
                    let falta = ancho - anchoActual;
                    // Preferimos expandir hacia la dirección actual
                    while (falta > 0) {
                        let expandido = false;
                        if (direccionActual > 0 && hasta < this.gridSize - 1) {
                            hasta++;
                            falta--;
                            expandido = true;
                        } else if (direccionActual < 0 && desde > 0) {
                            desde--;
                            falta--;
                            expandido = true;
                        }
                        // Si ya no se puede por la dirección preferida, expandimos al otro lado
                        if (!expandido) {
                            if (desde > 0) {
                                desde--;
                                falta--;
                            } else if (hasta < this.gridSize - 1) {
                                hasta++;
                                falta--;
                            } else {
                                break; // sin espacio
                            }
                        }
                    }
                }

                // Garantía final de intersección: si aún no intersecta (muy raro), colapsa al centro de la anterior
                if (hasta < prevDesde || desde > prevHasta) {
                    const objetivo = Math.floor((prevDesde + prevHasta) / 2);
                    const mitad = Math.floor(ancho / 2);
                    desde = Math.max(0, objetivo - mitad);
                    hasta = Math.min(this.gridSize - 1, desde + ancho - 1);
                    // Reajuste por límites
                    desde = Math.max(0, Math.min(desde, this.gridSize - ancho));
                    hasta = desde + ancho - 1;
                }
            }

            // --- Pintar la fila ---
            for (let c = desde; c <= hasta; c++) path[fila][c] = 1;

            // Actualizar tramo previo
            prevDesde = desde;
            prevHasta = hasta;

            // --- Dinámica para la siguiente fila (serpenteo) ---
            // 1) Probabilidad de invertir dirección cada ciertas filas
            if (Math.random() < 0.25) direccionActual *= -1;

            // 2) Desplazamiento con inercia (1 o 2 celdas en la dirección actual)
            const drift = (Math.random() < 0.5 ? 1 : 2) * direccionActual;

            // Tomamos como "inicio" para la siguiente fila el borde del tramo en la dirección de avance
            const borde = (direccionActual > 0) ? hasta : desde;
            inicio = borde + drift;

            // 3) Rebotes en bordes
            if (inicio <= 0) {
                inicio = 0;
                direccionActual = 1;
            } else if (inicio >= this.gridSize - 1) {
                inicio = this.gridSize - 1;
                direccionActual = -1;
            }
        }

        /*console.log("[Lucumo] Camino generado (conectado y serpenteante):\n" +
            path.map(r => r.join("")).join("\n"));*/
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
        //console.log(`[Lucumo] Construyendo path; tileSize=${tileSize.toFixed(3)}`);

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
        //console.log("[Lucumo] ✓ Path construido.");
    }

    // ----───────────── PROYECTILES ──────────────────────────────
    _decideNextProjectileType() {
        if (!this.currentPath || !this.bots?.length) return "derecha";

        // Bots que no están moviéndose y NO están sobre el camino
        const candidates = this.bots.filter(b =>
            !b.isMoving && this.currentPath[b.row]?.[b.col] !== 1
        );
        if (candidates.length === 0) return "derecha";

        // Tomamos uno al azar
        const bot = candidates[(Math.random() * candidates.length) | 0];
        const row = bot.row;
        const rowArr = this.currentPath[row];
        if (!rowArr) return Math.random() < 0.5 ? "izquierda" : "derecha";

        // Hallar el tramo continuo del camino en esta fila: [minCol, maxCol]
        let minCol = Infinity, maxCol = -Infinity;
        for (let c = 0; c < rowArr.length; c++) {
            if (rowArr[c] === 1) {
                if (c < minCol) minCol = c;
                if (c > maxCol) maxCol = c;
            }
        }

        // Si por alguna razón no hay camino en esta fila, elige aleatorio
        if (minCol === Infinity) {
            return Math.random() < 0.5 ? "izquierda" : "derecha";
        }

        // Si el bot está totalmente a la izquierda del tramo -> mover a la derecha
        if (bot.col < minCol) {
            // Evitar tirar a celda ocupada si es posible
            const targetCol = bot.col + 1;
            if (targetCol < this.gridSize && !this._botAt(row, targetCol)) return "derecha";
            // si está ocupada, inténtalo igual (ProjectileSystem podría resolver en hit-time)
            return "derecha";
        }

        // Si el bot está totalmente a la derecha del tramo -> mover a la izquierda
        if (bot.col > maxCol) {
            const targetCol = bot.col - 1;
            if (targetCol >= 0 && !this._botAt(row, targetCol)) return "izquierda";
            return "izquierda";
        }

        // Está dentro del rango del tramo pero en una celda que NO es camino (agujero raro)
        // Decide hacia el borde más cercano del tramo
        const distLeft = Math.abs(bot.col - minCol);
        const distRight = Math.abs(maxCol - bot.col);
        if (distLeft < distRight) {
            const targetCol = bot.col - 1;
            if (targetCol >= 0 && !this._botAt(row, targetCol)) return "izquierda";
            return "izquierda";
        } else if (distRight < distLeft) {
            const targetCol = bot.col + 1;
            if (targetCol < this.gridSize && !this._botAt(row, targetCol)) return "derecha";
            return "derecha";
        } else {
            // equidistante: elige cualquiera, pero prioriza celda libre si se puede
            const rightFree = (bot.col + 1 < this.gridSize) && !this._botAt(row, bot.col + 1);
            const leftFree = (bot.col - 1 >= 0) && !this._botAt(row, bot.col - 1);
            if (rightFree && !leftFree) return "derecha";
            if (leftFree && !rightFree) return "izquierda";
            return Math.random() < 0.5 ? "izquierda" : "derecha";
        }
    }



    _scheduleProjectileSpawn() {
        // Cada cierto tiempo “decide” un nuevo proyectil
        const spawnInterval = 2500 + Math.random() * 1000;
        if (!this.isRunning) return;

        // Forzar creación de nuevo proyectil del tipo decidido
        this._decideNextProjectileType();

        setTimeout(() => this._scheduleProjectileSpawn(), spawnInterval);
    }

    _handleProjectileHit(type, target) {
        if (!this.isRunning) return;

        const bot = this._findBotByPickedMesh(target);
        if (!bot || bot.isMoving) return;

        const offset = type === "izquierda" ? -1 : 1;
        const newCol = bot.col + offset;
        if (newCol < 0 || newCol >= this.gridSize) return;

        const targetCell = this.grid[bot.row * this.gridSize + newCol];
        if (!targetCell) return;

        // Evitar mover bots ya en el camino
        if (this.currentPath[bot.row][bot.col] === 1) {
            //console.log(`[Lucumo] Bot en (${bot.row},${bot.col}) ya está en el camino; no se mueve.`);
            return;
        }

        bot.isMoving = true;
        this._moveBotToCell(bot, targetCell).then(() => {
            bot.isMoving = false;

            const nowOnPath = this.currentPath[bot.row][bot.col] === 1;
            if (nowOnPath) {
                // Evitar doble conteo si ya se marcó antes
                if (!bot.hasReturned) {
                    bot.hasReturned = true;
                    this.score += this.completeBonus;
                    this.hud?.setScore?.(this.score);
                    this.hud?.message?.("¡Muy bien!", 1000);
                    //console.log(`[Lucumo] +${this.completeBonus} puntos → total: ${this.score}`);
                }

                // Verificar si todos los bots regresaron
                const allOnPath = this.bots.every(b => this.currentPath[b.row]?.[b.col] === 1);
                if (allOnPath) {
                    //console.log("[Lucumo] 🎯 Todos los bots regresaron al camino. Fin anticipado del juego.");
                    this._finishGameEarly();
                }
            }
        });
    }


    // ────────────────────────────── BOTS ──────────────────────────────

    async _spawnBots(path, wave = 1) {
        if (!this.botUrl) {
            console.warn("[Lucumo] _spawnBots: botUrl no definido; se omite spawn.");
            return;
        }

        this.wave = wave;
        //console.log(`[Lucumo] 🔄 Spawneando oleada #${wave}...`);

        // 1️⃣ Obtener celdas libres (no camino y sin bot)
        const libres = [];
        for (let i = 0; i < this.grid.length; i++) {
            const cell = this.grid[i];
            if (path[cell.row][cell.col] === 0 && !this._botAt(cell.row, cell.col)) {
                libres.push(cell);
            }
        }

        if (!libres.length) {
            console.warn("[Lucumo] _spawnBots: no hay celdas libres.");
            return;
        }

        // 2️⃣ Elegir hasta 5 sin repetir fila
        const seleccion = this._pickCellsNoRepeatRow(libres, this.botsPerWave);
        //console.log(`[Lucumo] Bots seleccionados (oleada #${wave}):`, seleccion.map(c => `(${c.row},${c.col})`).join(", "));

        // 3️⃣ Spawnear cada bot en esas posiciones
        for (let idx = 0; idx < seleccion.length; idx++) {
            const cell = seleccion[idx];
            //console.log(`[Lucumo] Cargando Y_Bot #${idx + 1} (oleada #${wave}) en celda (${cell.row},${cell.col}) ...`);

            const result = await SceneLoader.ImportMeshAsync(null, "", this.botUrl, this.scene);

            const root = new TransformNode(`ybot_root_${this.totalBotsSpawned + idx}`, this.scene);
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
            const yGround = 0;
            const yOffset = (yGround - minY2);
            root.position = new Vector3(cell.pos.x, yGround + yOffset, cell.pos.z);

            // Orientación base
            root.rotation.set(0, this.defaultBotRotationY, 0);

            const ags = result.animationGroups || [];
            this._playOnly(ags, g => /idle/i.test(g.name), true);

            this.bots.push({
                root,
                ags,
                row: cell.row,
                col: cell.col,
                defaultRotationY: this.defaultBotRotationY,
                isMoving: false,
                wave, // ← para saber a qué oleada pertenece
            });

            //console.log(`[Lucumo] ✓ Y_Bot #${idx + 1} spawn OK en (${cell.row},${cell.col}), scale=${scale.toFixed(3)}.`);
        }

        this.totalBotsSpawned += seleccion.length;
        this.projectiles?.registerTargets?.(this.bots.map(b => b.root));

        //console.log(`[Lucumo] ✅ Oleada #${wave} completada (${this.totalBotsSpawned} bots en total).`);
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
                //console.log("[Lucumo] Tap ignorado: bot ya se está moviendo.");
                return;
            }

            const row = bot.row;
            const nextCol = bot.col + 1;

            // Validaciones: dentro de la grilla, no camino, no ocupado
            if (nextCol >= this.gridSize) {
                //console.log(`[Lucumo] Bot (${row},${bot.col}) → derecha: fuera de la grilla.`);
                return;
            }
            if (!this.currentPath) {
                console.warn("[Lucumo] currentPath no definido.");
                return;
            }
            if (this.currentPath[row][nextCol] === 1) {
                //console.log(`[Lucumo] Bot (${row},${bot.col}) → derecha bloqueado (hay camino).`);
                return;
            }
            if (this._botAt(row, nextCol)) {
                //console.log(`[Lucumo] Bot (${row},${bot.col}) → derecha ocupada por otro bot.`);
                return;
            }

            const targetCell = this.grid[row * this.gridSize + nextCol];
            if (!targetCell) return;

            //console.log(`[Lucumo] Tap sobre bot en (${row},${bot.col}) → mover a (${row},${nextCol}).`);
            bot.isMoving = true;
            this._moveBotToCell(bot, targetCell).then(() => {
                bot.isMoving = false;
                //console.log(`[Lucumo] Bot llegó a (${row},${nextCol}).`);
            });
        });
        //console.log("[Lucumo] Tap → mover a derecha habilitado.");
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
        //console.log("[Lucumo] Tiempo finalizado");
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
        try { this.base?.dispose(); } catch { }

        // 1. Eliminar el camino antiguo
        try {
            const pathMeshes = this.scene.meshes.filter(m => m.name.startsWith("path_"));
            for (const m of pathMeshes) { try { m.dispose(); } catch { } }
        } catch { }

        // 2. Eliminar bots correctamente
        try {
            for (const b of this.bots) {
                try { b.root?.dispose(); } catch { }
                if (b.ags) for (const ag of b.ags) { try { ag.stop(); } catch { } }
            }
        } catch { }

        // 3. Limpiar estructuras
        this.bots = [];
        this.grid = [];
        this.currentPath = null;
        this.totalBotsSpawned = 0;
        this.wave = 1;
        this.finished = false;

        // 4. Limpiar observadores y proyectiles
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        try { this.projectiles?.dispose(); } catch { }

        // 5. Detener HUD y timer
        this.hud?.stopTimer?.();
        //console.log("[Lucumo] Recursos liberados y reiniciados correctamente");
    }


    _finishGameEarly() {
        if (this.finished) return;
        this.finished = true;
        this.isRunning = false;

        // Calcular tiempo restante
        const timeLeft = this.hud?.getRemainingTime?.() ?? 0;
        const timeBonus = Math.floor(timeLeft * this.timeBonusPerSec);
        this.score += timeBonus;

        this.hud?.stopTimer?.();
        this.hud?.setScore?.(this.score);

        this.hud?.showEndPopup?.({
            score: this.score,
            title: "¡Excelente trabajo!",
            message: `Todos los bots regresaron al camino.\nBonificación de tiempo: +${timeBonus} puntos`,
            onRetry: () => this._restart(),
            onContinue: () => this._endGame(),
            timeExpired: false
        });
    }

    _onTimeUp() {
        if (this.finished) return;
        this.finished = true;
        this.isRunning = false;

        this.hud?.stopTimer?.();
        this.hud?.showEndPopup?.({
            score: this.score,
            //title: "Tiempo agotado",
            //message: "Fin del minijuego Lucumo",
            onRetry: () => this._restart(),
            onContinue: () => this._endGame(),
            timeExpired: false
        });
    }

    _restart() {
        //console.log("[Lucumo] Reiniciando minijuego...");
        this.dispose();
        this.score = this.startingScore;
        this.hud?.updateScore?.(this.startingScore);
        this.hud?.setScore?.(this.startingScore);
        this.start();
    }

}
