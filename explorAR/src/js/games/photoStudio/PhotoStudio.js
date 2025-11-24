// src/js/game/photoStudio/PhotoStudio.js
import { experiencesConfig } from "../../../config/experienceConfig.js";

export class PhotoStudio {
    /**
     * @param {Object} opts
     * @param {any}    opts.hud            - Referencia opcional al HUD (para mensajes)
     * @param {number} opts.stars          - 1..3
     * @param {string} opts.experienceId   - id de la experiencia actual (vicos/taquile/...)
     * @param {Function} opts.onExit       - callback al cerrar
     */
    constructor({ hud = null, stars = 3, experienceId = null, onExit = null } = {}) {
        this.hud = hud;
        this.stars = Math.max(1, Math.min(3, stars || 3));
        this.experienceId = experienceId;
        this.onExit = onExit;

        // DOM refs
        this.root = null;          // #photo-studio
        this.videoEl = null;       // #photo-video
        this.layerEl = null;       // #sticker-layer
        this.controlsEl = null;    // #photo-controls
        this.styleEl = null;       // <style id="photo-studio-styles">

        // State
        this.stream = null;
        this.currentStickerIdx = 0;
        this.stickers = [];        // [{key,url}, ...]
        this.activeStickerEl = null;

        this._onPointerMove = null;
        this._onPointerUp = null;

        console.log("[PhotoStudio] init", { stars: this.stars, experienceId: this.experienceId });
    }

    // =========================
    // Public
    // =========================
    async start() {
        // Montar UI y estilos independientes del HUD
        this._injectStyles();
        this._createOverlay();

        // Cargar stickers desde config según estrellas
        this._resolveStickersFromConfig();

        // Iniciar cámara (selfie por defecto)
        await this._startCamera();

        // Mostrar primer sticker si hay
        if (this.stickers.length > 0) {
            this._showSticker(0);
        }

        console.log("[PhotoStudio] listo.");
    }

    cleanup() {
        try { this._stopCamera(); } catch { }
        try { this._removeOverlay(); } catch { }
        try { this._removeStyles(); } catch { }
        document.body.classList.remove("photo-mode");

        // Limpiar referencias y arrays para evitar residuos visuales
        this.activeStickerEl = null;
        this.stickers = [];
        this.stream = null;
        this.currentStickerIdx = 0;

        // Borrar cualquier canvas temporal (prevención por capturas)
        document.querySelectorAll("canvas").forEach(c => {
            if (c.width > window.innerWidth * 0.8 && c.height > window.innerHeight * 0.8)
                c.remove();
        });

        console.log("[PhotoStudio] cleanup ok");
        // Salida final al lobby (vía callback)
        this.onExit && this.onExit();
    }


    // =========================
    // UI: Overlay & Styles
    // =========================
    // =========================
    // UI: Overlay & Styles
    // =========================
    _injectStyles() {
        // Evita duplicar
        const existing = document.getElementById("photo-studio-styles");
        if (existing) existing.remove();

        const css = `
            /* Bloquear scroll y fondo mientras está activo */
            body.photo-mode {
            overflow: hidden;
            margin: 0;
            padding: 0;
            background: #000; /* evita fondo crema */
            }

            /* Overlay full-screen por encima de HUD/canvas */
            #photo-studio {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100dvh; /* altura dinámica: cubre toda la pantalla */
            z-index: 9999;
            background: #000;
            display: grid;
            grid-template-areas:
                "video"
                "controls";
            grid-template-rows: 1fr auto;
            overflow: hidden;
            }

            /* Video a pantalla completa (ocupa su celda) */
            #photo-studio #photo-video {
            grid-area: video;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scaleX(-1); /* espejo en preview */
            pointer-events: none;
            }

            /* Capa donde se colocan y mueven los stickers */
            #photo-studio #sticker-layer {
            position: fixed;
            inset: 0;
            z-index: 10001;
            touch-action: none; /* mejor control de pointer */
            }

            .movable-sticker {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            transform-origin: center center; /* <-- NUEVO: escala uniforme desde el centro */
            max-width: 28vw;
            max-height: 28vh;
            user-select: none;
            -webkit-user-drag: none;
            }

            /* Controles flotantes sobre el video */
            #photo-studio #photo-controls {
            grid-area: controls;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 14px;
            padding: 14px 16px;
            z-index: 10002;
            background: rgba(0, 0, 0, 0.25); /* visibilidad sobre el video */
            backdrop-filter: blur(2px);
            }

            #photo-studio .ctrl-btn {
            background: rgba(255,255,255,0.92);
            color: #222;
            border: none;
            border-radius: 9999px;
            width: 60px;
            height: 60px;
            font-size: 22px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,.35);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: transform .08s ease;
            }
            #photo-studio .ctrl-btn:active { transform: scale(0.96); }

            /* Botón de captura más grande y con anillo */
            #photo-studio #btn-capture {
            width: 72px;
            height: 72px;
            font-size: 26px;
            background: #fff;
            border: 3px solid #ddd;
            }

            /* === Botón Salir (estilo consistente con HUD) === */
            #photo-studio #photo-exit {
            position: absolute;
            top: calc(10px + env(safe-area-inset-top));
            right: 12px;
            background: rgba(255, 255, 255, 0.9);
            color: #000;
            border: none;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            font-size: 14px;            /* “Salir” legible dentro del círculo */
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,.35);
            z-index: 10003;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: transform .08s ease, background .15s ease;
            }
            #photo-studio #photo-exit:active { transform: scale(0.96); }

            /* Posición segura en pantallas con notch */
            @supports (padding: constant(safe-area-inset-bottom)) {
            #photo-studio #photo-controls {
                padding-bottom: calc(14px + constant(safe-area-inset-bottom));
            }
            }
            @supports (padding: env(safe-area-inset-bottom)) {
            #photo-studio #photo-controls {
                padding-bottom: calc(14px + env(safe-area-inset-bottom));
            }
            }
        `.trim();

        this.styleEl = document.createElement("style");
        this.styleEl.id = "photo-studio-styles";
        this.styleEl.textContent = css;
        document.head.appendChild(this.styleEl);

        // Bloquear scroll
        document.body.classList.add("photo-mode");
    }


    _removeStyles() {
        if (this.styleEl) {
            this.styleEl.remove();
            this.styleEl = null;
        }
    }

    _createOverlay() {
        // Evita duplicar
        const prev = document.getElementById("photo-studio");
        if (prev) prev.remove();

        this.root = document.createElement("div");
        this.root.id = "photo-studio";
        this.root.innerHTML = `
            <!-- Botón salir flotante -->
            <button id="photo-exit" aria-label="Salir">Salir</button>

            <video id="photo-video" autoplay playsinline muted></video>
            <div id="sticker-layer"></div>
            <div id="photo-controls">
            <button id="btn-prev" class="ctrl-btn" aria-label="Anterior">◀</button>
            <button id="btn-capture" class="ctrl-btn" aria-label="Capturar">📸</button>
            <button id="btn-next" class="ctrl-btn" aria-label="Siguiente">▶</button>
            </div>
        `;
        document.body.appendChild(this.root);

        this.videoEl = this.root.querySelector("#photo-video");
        this.layerEl = this.root.querySelector("#sticker-layer");
        this.controlsEl = this.root.querySelector("#photo-controls");

        // Controles
        this.root.querySelector("#btn-prev").addEventListener("click", () => this._prevSticker());
        this.root.querySelector("#btn-next").addEventListener("click", () => this._nextSticker());
        this.root.querySelector("#btn-capture").addEventListener("click", () => this._capture());

        // Salir (limpieza completa y retorno al flujo)
        this.root.querySelector("#photo-exit").addEventListener("click", () => this.cleanup());
    }

    _removeOverlay() {
        if (this.root) {
            // Remover event listeners antes de eliminar el DOM
            const btnPrev = this.root.querySelector("#btn-prev");
            const btnNext = this.root.querySelector("#btn-next");
            const btnCapture = this.root.querySelector("#btn-capture");
            const btnExit = this.root.querySelector("#photo-exit");

            // Los listeners se limpiarán automáticamente al remover el elemento,
            // pero es buena práctica hacerlo explícito si guardaste referencias

            // Remover el overlay del DOM
            this.root.remove();
            this.root = null;
            this.videoEl = null;
            this.layerEl = null;
            this.controlsEl = null;
        }
    }

    // =========================
    // Stickers desde config
    // =========================
    _resolveStickersFromConfig() {
        // Buscar experiencia
        const exp = experiencesConfig.find(e => e.id === this.experienceId);
        const photoMini = exp?.minigames?.find(m => m.id === "photo" || m.type === "photo");

        if (!photoMini) {
            console.warn("[PhotoStudio] No se encontró minigame 'photo' en la experiencia:", this.experienceId);
            this.stickers = [];
            return;
        }

        // Tolerante a nombres de params:
        // Preferencia: star1/star2/star3 → fallback: oneStar/twoStars/threeStars
        const p = photoMini.params || {};
        const key1 = p.star1 ?? p.oneStar;
        const key2 = p.star2 ?? p.twoStars;
        const key3 = p.star3 ?? p.threeStars;

        // Filtrar assets por keys
        const assets = photoMini.assets || [];
        const chosenKeys = [];
        if (this.stars >= 1 && key1) chosenKeys.push(key1);
        if (this.stars >= 2 && key2) chosenKeys.push(key2);
        if (this.stars >= 3 && key3) chosenKeys.push(key3);

        this.stickers = assets.filter(a => chosenKeys.includes(a.key) && a.type === "sticker");
        console.log("[PhotoStudio] stickers", this.stickers);
    }

    _showSticker(index) {
        if (!this.stickers.length) return;
        this.currentStickerIdx = (index + this.stickers.length) % this.stickers.length;

        // Limpiar capa
        this.layerEl.innerHTML = "";

        // Crear el sticker actual
        const data = this.stickers[this.currentStickerIdx];
        const img = document.createElement("img");
        img.src = data.url;
        img.alt = data.key || "sticker";
        img.className = "movable-sticker";
        img.draggable = false;

        // ===== ESTADO GESTOS =====
        const activePointers = new Map(); // pointerId -> { x, y }

        // Arrastre (1 dedo)
        let isDragging = false;
        let dragPointerId = null;
        let dragOffsetCenterX = 0;
        let dragOffsetCenterY = 0;

        // Pinch + rotación (2 dedos)
        let isGesturing = false;
        let pinchStartDistance = 0;
        let gestureStartAngle = 0;
        let baseScale = 1;
        let baseRotation = 0;

        // Escala y rotación actuales del sticker
        let currentScale = 1;
        let currentRotation = 0; // en radianes

        const MIN_SCALE = 0.3;
        const MAX_SCALE = 8;

        const updateTransform = () => {
            img.style.transform = `translate(-50%, -50%) rotate(${currentRotation}rad) scale(${currentScale})`;
        };

        const getDistance = () => {
            const pts = Array.from(activePointers.values());
            if (pts.length < 2) return 0;
            const [p1, p2] = pts;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            return Math.hypot(dx, dy);
        };

        const getAngle = () => {
            const pts = Array.from(activePointers.values());
            if (pts.length < 2) return 0;
            const [p1, p2] = pts;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            return Math.atan2(dy, dx); // ángulo entre los dos dedos
        };

        const startDrag = (pointerId, clientX, clientY) => {
            const rect = img.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            dragPointerId = pointerId;
            isDragging = true;
            isGesturing = false;

            // diferencia dedo–centro para mantener el “agarre”
            dragOffsetCenterX = clientX - centerX;
            dragOffsetCenterY = clientY - centerY;
        };

        const applyDrag = (ev) => {
            if (!isDragging || ev.pointerId !== dragPointerId) return;

            const parentRect = this.layerEl.getBoundingClientRect();

            // Centro nuevo, basado en el dedo menos el offset
            let centerX = ev.clientX - dragOffsetCenterX;
            let centerY = ev.clientY - dragOffsetCenterY;

            // Mantener el CENTRO dentro del viewport (el sticker puede sobresalir)
            const minCX = parentRect.left;
            const maxCX = parentRect.left + parentRect.width;
            const minCY = parentRect.top;
            const maxCY = parentRect.top + parentRect.height;

            centerX = Math.max(minCX, Math.min(maxCX, centerX));
            centerY = Math.max(minCY, Math.min(maxCY, centerY));

            // Convertimos a coords locales del layer
            const localX = centerX - parentRect.left;
            const localY = centerY - parentRect.top;

            img.style.left = `${localX}px`;
            img.style.top = `${localY}px`;

            updateTransform();
        };

        const startGesture = () => {
            if (activePointers.size < 2) return;

            const dist = getDistance();
            if (!dist) return;

            pinchStartDistance = dist;
            gestureStartAngle = getAngle();

            baseScale = currentScale;
            baseRotation = currentRotation;

            isGesturing = true;
            isDragging = false;
            dragPointerId = null;
        };

        const applyGesture = () => {
            if (!isGesturing || activePointers.size < 2) return;

            const dist = getDistance();
            const angle = getAngle();
            if (!dist) return;

            // Escala
            let factor = dist / (pinchStartDistance || 1);
            let newScale = baseScale * factor;
            newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

            // Rotación
            const deltaAngle = angle - gestureStartAngle;
            let newRotation = baseRotation + deltaAngle;

            currentScale = newScale;
            currentRotation = newRotation;

            updateTransform();
        };

        const onDown = (ev) => {
            ev.preventDefault();

            activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
            img.setPointerCapture?.(ev.pointerId);

            if (activePointers.size === 1) {
                // 1 dedo → drag
                startDrag(ev.pointerId, ev.clientX, ev.clientY);
            } else if (activePointers.size === 2) {
                // 2 dedos → pinch + rotate
                startGesture();
            }
        };

        const onMove = (ev) => {
            if (!activePointers.has(ev.pointerId)) return;

            activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

            if (isGesturing && activePointers.size >= 2) {
                applyGesture();
            } else if (isDragging) {
                applyDrag(ev);
            }
        };

        const onUpOrCancel = (ev) => {
            if (activePointers.has(ev.pointerId)) {
                activePointers.delete(ev.pointerId);
            }
            img.releasePointerCapture?.(ev.pointerId);

            if (activePointers.size === 0) {
                isDragging = false;
                isGesturing = false;
                dragPointerId = null;
            } else if (activePointers.size === 1) {
                // Si veníamos de gesto con 2 dedos y queda 1, volvemos a drag con ese dedo
                const [remainingId, pt] = activePointers.entries().next().value;
                startDrag(remainingId, pt.x, pt.y);
            }
        };

        img.addEventListener("pointerdown", onDown);
        img.addEventListener("pointermove", onMove);
        img.addEventListener("pointerup", onUpOrCancel);
        img.addEventListener("pointercancel", onUpOrCancel);
        img.addEventListener("dragstart", (e) => e.preventDefault());

        this.layerEl.appendChild(img);
        this.activeStickerEl = img;

        // Transform inicial: centrado, sin rotación, sin escala extra
        currentScale = 1;
        currentRotation = 0;
        updateTransform();
    }


    _nextSticker() {
        if (!this.stickers.length) return;
        this._showSticker(this.currentStickerIdx + 1);
    }
    _prevSticker() {
        if (!this.stickers.length) return;
        this._showSticker(this.currentStickerIdx - 1);
    }

    // =========================
    // Cámara
    // =========================
    async _startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "user" } },
                audio: false
            });
            this.videoEl.srcObject = this.stream;
            await this.videoEl.play().catch(() => { });
        } catch (e) {
            console.error("[PhotoStudio] Error getUserMedia:", e);
            // Mensaje amigable (si HUD disponible)
            this.hud?.message?.("No se pudo acceder a la cámara", 2000);
            throw e;
        }
    }

    _stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
    }

    // =========================
    // Captura (video + sticker)
    // =========================
    _capture() {
        const video = this.videoEl;
        if (!video.videoWidth || !video.videoHeight) {
            console.warn("[PhotoStudio] video no listo para capturar");
            return;
        }

        // Canvas con tamaño del viewport (igual al overlay)
        const parentRect = this.root.getBoundingClientRect();
        const cw = Math.round(parentRect.width);
        const ch = Math.round(parentRect.height);

        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");

        // 1) Dibujar el video con COVER + espejo horizontal (solo el video)
        this._drawVideoCoverMirrored(ctx, video, cw, ch);

        // 2) Dibujar sticker en la misma coordenada de pantalla
        if (this.activeStickerEl) {
            const sRect = this.activeStickerEl.getBoundingClientRect();
            const rRect = this.root.getBoundingClientRect();
            const sx = Math.round(sRect.left - rRect.left);
            const sy = Math.round(sRect.top - rRect.top);
            const sw = Math.round(sRect.width);
            const sh = Math.round(sRect.height);

            // Cargar imagen desde el mismo src
            // (Como ya existe en DOM, debería estar cacheada)
            const img = this.activeStickerEl;
            // Ojo: al haber espejado solo el video, el sticker se dibuja normal (como lo ve el usuario)
            ctx.drawImage(img, sx, sy, sw, sh);
        }

        // 3) Descargar automáticamente
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.download = `foto_${Date.now()}.png`;
        a.href = url;
        a.click();

        // (Opcional) feedback
        this.hud?.message?.("📸 Foto guardada", 1500);
    }

    /**
     * Dibuja el video con efecto "cover" dentro del canvas (cw x ch),
     * aplicando espejo horizontal SOLO al video para que coincida con el preview selfie.
     * No voltea el sistema de coordenadas de stickers.
     */
    _drawVideoCoverMirrored(ctx, video, cw, ch) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        // Calcular escalado tipo "cover"
        const canvasRatio = cw / ch;
        const videoRatio = vw / vh;

        let dw, dh; // dimensiones de destino (canvas)
        let sx, sy, sw, sh; // recorte del video (source rect)

        if (videoRatio > canvasRatio) {
            // el video es "más ancho": recortar lados
            dh = ch;
            dw = Math.round(ch * videoRatio);
            sw = Math.round(vh * canvasRatio);
            sh = vh;
            sx = Math.round((vw - sw) / 2);
            sy = 0;
        } else {
            // el video es "más alto": recortar arriba/abajo
            dw = cw;
            dh = Math.round(cw / videoRatio);
            sw = vw;
            sh = Math.round(vw / canvasRatio);
            sx = 0;
            sy = Math.round((vh - sh) / 2);
        }

        // Espejar solo el video:
        ctx.save();
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
        // Dibujo cubriendo todo el canvas
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
        ctx.restore();
    }
}
