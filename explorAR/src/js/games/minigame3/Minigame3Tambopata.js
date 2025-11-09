import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders";
import {
    MeshBuilder,
    StandardMaterial,
    Texture,
    Color3,
    Vector3,
    TransformNode,
} from "@babylonjs/core";
import { gameplayConfig } from "../../../config/gameplayConfig.js";
import { experiencesConfig } from "../../../config/experienceConfig.js";

/**
 * Minigame3Tambopata — versión final corregida
 * - 4 animales en el borde del tablero (6x6 por defecto)
 * - Cada animal con 3 luces PNG adyacentes (sin solaparse)
 * - Animales y luces anclados visualmente al suelo
 * - Todo inicial "oscurecido"; suelos gris oscuro
 */
export class Minigame3Tambopata {
    constructor({ scene, hud, experienceId, startingScore = 0 }) {
        this.scene = scene;
        this.hud = hud;
        this.experienceId = experienceId;
        this.score = startingScore;

        this.isRunning = false;
        this.base = null;

        this.gridSize = 6;
        this.gridPositions = [];
        this.spawnRadius = 1.8;
        this.cellSize = null;

        this.experience = null;
        this.miniConfig = null;
        this.assetMap = {};
        this.imageMap = {};
        this.modelMap = {};
        this.iconMap = {};

        this.currentAnimals = [];
        this.currentLightZones = [];
        this.currentGrounds = [];

        this.rondas = 0;
        this.maxRondas = 1;
        this._reserved = new Set();
    }

    async start() {
        console.log("[Minigame3Tambopata] Iniciando...");

        const ok = this._loadConfigForTambopata();
        if (!ok) {
            this._fail("No se encontró configuración para 'm3Tambopata'.");
            return;
        }

        this.hud?.show?.();
        const totalTime = gameplayConfig?.timeSequence?.[2] ?? 60;
        this.hud?.startTimer?.(totalTime, null, () => this._onTimeUp());
        this.hud?.updateScore?.(this.score);

        this._createBasePlane();
        this._generateGridPositions();

        this.isRunning = true;
        console.log("[Minigame3Tambopata] ✓ Base y grilla listas");

        await this._spawnNextRound();
    }

    _loadConfigForTambopata() {
        try {
            this.experience = experiencesConfig.find((e) => e.id === this.experienceId);
            if (!this.experience) return false;

            this.miniConfig = this.experience.minigames?.find((m) => m.id === "m3Tambopata");
            if (!this.miniConfig) return false;

            const p = this.miniConfig.params || {};
            if (Number.isFinite(p.gridSize) && p.gridSize >= 4) this.gridSize = p.gridSize;
            if (Number.isFinite(p.spawnRadius)) this.spawnRadius = p.spawnRadius;

            for (const a of this.miniConfig.assets || []) {
                this.assetMap[a.key] = a.url;
                if (a.type === "image") this.imageMap[a.key] = a.url;
                if (a.type === "model") this.modelMap[a.key] = a.url;
                if (a.type === "icon") this.iconMap[a.key] = a.url;
            }

            console.log("[Tambopata] Experiencia:", this.experienceId);
            console.log("[Tambopata] Models:", Object.keys(this.modelMap));
            console.log("[Tambopata] Images:", Object.keys(this.imageMap));
            return true;
        } catch (e) {
            console.error("[Minigame3Tambopata] Error cargando config:", e);
            return false;
        }
    }

    _createBasePlane() {
        const size = Math.max(2.5, this.spawnRadius * 2);
        const base = MeshBuilder.CreateGround("tambo_base", { width: size, height: size }, this.scene);

        const mat = new StandardMaterial("tambo_grid_mat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        mat.alpha = 0.15;
        mat.specularColor = new Color3(0, 0, 0);
        base.material = mat;

        base.position = new Vector3(0, 0, 0);
        this.base = base;
    }

    _generateGridPositions() {
        this.gridPositions = [];
        this.cellSize = this.spawnRadius / (this.gridSize / 2);
        let idx = 0;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = (c - (this.gridSize / 2 - 0.5)) * this.cellSize;
                const z = (r - (this.gridSize / 2 - 0.5)) * this.cellSize;
                this.gridPositions.push({
                    index: idx++,
                    row: r,
                    col: c,
                    pos: new Vector3(x, 0, z),
                    available: true,
                });
            }
        }
    }

    _cellKey(r, c) {
        return `${r},${c}`;
    }

    _cellAt(r, c) {
        return this.gridPositions[r * this.gridSize + c];
    }

    _isInside(r, c) {
        return r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize;
    }

    _isReserved(r, c) {
        return this._reserved.has(this._cellKey(r, c));
    }

    _reserve(r, c) {
        this._reserved.add(this._cellKey(r, c));
    }

    _getAdjacentCells(r, c) {
        const cells = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const rr = r + dr, cc = c + dc;
                if (!this._isInside(rr, cc)) continue;
                if (!this._isReserved(rr, cc)) cells.push(this._cellAt(rr, cc));
            }
        }
        return cells;
    }

    _getRandomSubset(array, count) {
        if (!array?.length || count <= 0) return [];
        if (array.length <= count) return [...array];
        const pool = [...array];
        const out = [];
        while (out.length < count && pool.length) {
            const i = Math.floor(Math.random() * pool.length);
            out.push(pool.splice(i, 1)[0]);
        }
        return out;
    }

    _pickFourBorderCellsOnePerSide() {
        const n = this.gridSize - 1;

        // Candidatos por lado
        const top = []; const bottom = []; const left = []; const right = [];
        for (let c = 0; c < this.gridSize; c++) { top.push(this._cellAt(0, c)); bottom.push(this._cellAt(n, c)); }
        for (let r = 1; r < this.gridSize - 1; r++) { left.push(this._cellAt(r, 0)); right.push(this._cellAt(r, n)); }

        // Helper: set de claves de {celda + todas sus adyacentes}
        const neighKeys = (cell) => {
            const keys = new Set([`${cell.row},${cell.col}`]);
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const rr = cell.row + dr, cc = cell.col + dc;
                    if (this._isInside(rr, cc)) keys.add(`${rr},${cc}`);
                }
            }
            return keys;
        };

        // Utilidad para barajar
        const shuffle = (arr) => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };

        const sides = [top, bottom, left, right];

        // Intentos para encontrar un conjunto válido (evita backtracking complejo)
        for (let attempt = 0; attempt < 50; attempt++) {
            const taken = new Set();         // celdas prohibidas (animales + adyacentes)
            const chosen = [];
            const sidesOrder = shuffle(sides);

            let ok = true;
            for (const sideCells of sidesOrder) {
                const pool = shuffle(sideCells);
                let picked = null;
                for (const cand of pool) {
                    const nk = neighKeys(cand);
                    // ¿choca con algún tomado?
                    let clash = false;
                    for (const k of nk) { if (taken.has(k)) { clash = true; break; } }
                    if (!clash) {
                        picked = cand;
                        // reserva su anillo (para evitar compartir adyacentes con otros animales)
                        for (const k of nk) taken.add(k);
                        break;
                    }
                }
                if (!picked) { ok = false; break; }
                chosen.push(picked);
            }

            if (ok && chosen.length === 4) {
                console.log("[Tambopata] Celdas animales sin adyacentes compartidos:",
                    chosen.map(c => `(${c.row},${c.col})`).join(", "));
                return chosen;
            }
        }

        // Fallback (muy raro): vuelve al método simple pero avisa
        console.warn("[Tambopata] No se encontró combinación perfecta tras varios intentos; usando selección simple.");
        const fallback = [];
        const topAny = top[Math.floor(Math.random() * top.length)];
        const bottomAny = bottom[Math.floor(Math.random() * bottom.length)];
        const leftAny = left[Math.floor(Math.random() * left.length)];
        const rightAny = right[Math.floor(Math.random() * right.length)];
        fallback.push(topAny, bottomAny, leftAny, rightAny);
        return fallback;
    }


    async _spawnNextRound() {
        if (!this.isRunning) return;
        await this._clearCurrentCluster();
        this._reserved.clear();

        const animalCells = this._pickFourBorderCellsOnePerSide();
        const modelKeys = Object.keys(this.modelMap);
        const cycle = (i) => (modelKeys.length ? modelKeys[i % modelKeys.length] : null);

        // Spawnea animales y reserva solo su celda
        for (let i = 0; i < animalCells.length; i++) {
            const cell = animalCells[i];
            const key = cycle(i);
            await this._spawnAnimalAt(cell, key);
            this._reserve(cell.row, cell.col);
        }

        // Luego genera las luces
        for (const a of this.currentAnimals) {
            const adjs = this._getAdjacentCells(a.row, a.col).filter(
                (c) => !this._isReserved(c.row, c.col)
            );
            const lightCells = this._getRandomSubset(adjs, 3);
            await this._spawnLightZones(lightCells);
            for (const lc of lightCells) this._reserve(lc.row, lc.col);
        }

        this.rondas++;
        console.log(`[Minigame3Tambopata] ✓ Ronda ${this.rondas}/${this.maxRondas}`);
    }

    _createCellGround(cell) {
        const plotSize = this.miniConfig?.params?.plotSize || 0.28;
        const ground = MeshBuilder.CreateGround(
            `cell_ground_${cell.row}_${cell.col}`,
            { width: plotSize, height: plotSize },
            this.scene
        );
        ground.position = new Vector3(cell.pos.x, 0.002, cell.pos.z);
        const mat = new StandardMaterial(`groundMat_${cell.row}_${cell.col}`, this.scene);
        mat.diffuseColor = new Color3(0.2, 0.2, 0.2);
        mat.alpha = 1.0;
        ground.material = mat;
        ground.metadata = { plotSize };
        this.currentGrounds.push(ground);
        return ground;
    }

    _computeHierarchyBounds(node) {
        node.computeWorldMatrix(true);
        const children = node.getChildMeshes ? node.getChildMeshes() : [];
        let min = new Vector3(+Infinity, +Infinity, +Infinity);
        let max = new Vector3(-Infinity, -Infinity, -Infinity);
        const consider = children.length ? children : [node];
        for (const m of consider) {
            if (!m.getBoundingInfo) continue;
            m.computeWorldMatrix(true);
            const bb = m.getBoundingInfo().boundingBox;
            min = Vector3.Minimize(min, bb.minimumWorld);
            max = Vector3.Maximize(max, bb.maximumWorld);
        }
        return { min, max, size: max.subtract(min) };
    }

    _splitUrl(url) {
        if (!url) return { root: "", file: "" };
        const idx = url.lastIndexOf("/");
        if (idx === -1) return { root: "", file: url };
        return { root: url.slice(0, idx + 1), file: url.slice(idx + 1) };
    }

    async _spawnAnimalAt(cell, modelKey) {
        const url = modelKey ? this.modelMap[modelKey] : null;
        const ground = this._createCellGround(cell);
        if (!url) return;

        const { root, file } = this._splitUrl(url);
        try {
            const result = await SceneLoader.ImportMeshAsync("", root, file, this.scene);

            // Mallas renderizables reales
            const renderables = result.meshes.filter(m => m.getTotalVertices && m.getTotalVertices() > 0);
            console.log(`[Tambopata] Renderables importados (${modelKey}):`, renderables.map(m => m.name));

            const nodeRoot = new TransformNode(`animalRoot_${modelKey}_${cell.row}_${cell.col}`, this.scene);

            // Parentar todas las mallas al nuevo nodo raíz
            for (const m of result.meshes) {
                if (m !== nodeRoot) m.setParent(nodeRoot);
            }

            // Ocultar __root__ solo si no tiene geometría (vacío)
            const maybeRoot = result.meshes.find(m => m.name === "__root__");
            if (maybeRoot && !(maybeRoot.getTotalVertices && maybeRoot.getTotalVertices() > 0)) {
                maybeRoot.isVisible = false;
            }

            // Garantizar que al menos una malla visible esté parentada correctamente
            if (renderables.length) {
                renderables.forEach(m => m.setParent(nodeRoot));
            }

            // Ajustar posición y escalar
            this._attachAnimalToCell(nodeRoot, ground);

            this.currentAnimals.push({
                mesh: nodeRoot,
                row: cell.row,
                col: cell.col,
                key: modelKey
            });

            console.log(`[Tambopata] 🐾 Animal '${modelKey}' en (${cell.row},${cell.col})`);
        } catch (e) {
            console.error("[Tambopata] Error importando modelo:", e);
        }
    }


    _attachAnimalToCell(root, ground) {
        const plotSize = ground.metadata?.plotSize || 0.28;
        root.parent = ground;
        root.position.set(0, 0, 0);
        root.rotation.set(0, 0, 0);
        root.scaling.set(1, 1, 1);

        root.computeWorldMatrix(true);
        const { size } = this._computeHierarchyBounds(root);
        const scaleFactor = (plotSize * 0.9) / Math.max(size.x, size.z, 1e-6);
        root.scaling.set(scaleFactor, scaleFactor, scaleFactor);

        root.computeWorldMatrix(true);
        const { min } = this._computeHierarchyBounds(root);
        root.position.set(0, -min.y + 0.002, 0);
        root.renderingGroupId = 2;

        const dark = new Color3(0.2, 0.2, 0.2);
        const emit = new Color3(0.01, 0.01, 0.01);
        const meshes = root.getChildMeshes ? root.getChildMeshes() : [root];
        for (const m of meshes) {
            const mat = m.material;
            if (mat) {
                if ("emissiveColor" in mat) mat.emissiveColor = emit;
                if ("albedoColor" in mat) mat.albedoColor = dark;
                else if ("diffuseColor" in mat) mat.diffuseColor = dark;
                if ("alpha" in mat) mat.alpha = 1.0;
            }
        }
    }

    async _spawnLightZones(cells) {
        const lightKeys = Object.keys(this.imageMap);
        const lightUrl = lightKeys.length ? this.imageMap[lightKeys[0]] : null;
        for (const cell of cells) {
            const size = this.miniConfig?.params?.plotSize || 0.28;
            const plane = MeshBuilder.CreateGround(
                `tambo_light_${cell.row}_${cell.col}`,
                { width: size, height: size },
                this.scene
            );
            plane.position = new Vector3(cell.pos.x, 0.006, cell.pos.z);
            const mat = new StandardMaterial(`lightMat_${cell.row}_${cell.col}`, this.scene);
            mat.diffuseColor = new Color3(0.15, 0.15, 0.15);
            mat.emissiveColor = new Color3(0.18, 0.18, 0.18);
            mat.alpha = 1.0;
            if (lightUrl) {
                const tex = new Texture(lightUrl, this.scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
                tex.hasAlpha = false;
                mat.diffuseTexture = tex;
            }
            plane.material = mat;
            this.currentLightZones.push({ mesh: plane, row: cell.row, col: cell.col });
        }
        console.log(`[Tambopata] 💡 Luces creadas: ${cells.length}`);
    }

    async _clearCurrentCluster() {
        for (const z of this.currentLightZones) z.mesh?.dispose();
        for (const a of this.currentAnimals) a.mesh?.dispose();
        for (const g of this.currentGrounds) g.dispose();
        this.currentLightZones = [];
        this.currentAnimals = [];
        this.currentGrounds = [];
    }

    _onTimeUp() {
        console.log("[Minigame3Tambopata] ⏰ Tiempo finalizado");
        this.hud?.stopTimer?.();
        this.hud?.showEndPopup?.({
            score: this.score,
            onRetry: () => this._restart(),
            onContinue: () => this._endGame(),
            timeExpired: true,
        });
    }

    _restart() {
        this.dispose();
        this.score = 0;
        this.hud?.updateScore?.(0);
        this.start();
    }

    _endGame() {
        this.isRunning = false;
        this.dispose();
        this.onGameEnd?.();
    }

    dispose() {
        this._clearCurrentCluster();
        this.base?.dispose();
        this.hud?.stopTimer?.();
    }

    _fail(msg) {
        console.error("[Minigame3Tambopata] " + msg);
        this.hud?.showPopup?.({
            title: "Configuración faltante",
            message: msg,
            buttonText: "Salir",
            onClose: () => this._endGame(),
        });
    }
}
