import {
    MeshBuilder,
    StandardMaterial,
    Texture,
    Color3,
    Vector3,
} from "@babylonjs/core";

/**
 * Sistema genérico y reutilizable de proyectiles con trayectoria parabólica.
 * Correcciones y mejoras:
 * - Evita dispose accidental del proyectil activo (bug que causaba "desaparición")
 * - Soporta `tapsToLaunch` (n taps para lanzar)
 * - Logs de depuración detallados
 * - Modular para futuras mejoras (pokeball, angrybird, etc.)
 */
export class ProjectileSystem {
    constructor({
        scene,
        hud = null,
        projectileTypes = [],
        assetMap = {},
        onHit = null,
        speed = 2.8,
        cooldown = 400,
        gravity = -2.5,
        range = 5.0,
        tapsToLaunch = 1, // cuantos taps se requieren para lanzar
        getNextType = null,
    }) {
        this.scene = scene;
        this.hud = hud;
        this.assetMap = assetMap;
        this.projectileTypes = projectileTypes;
        this.onHit = onHit;
        this.speed = speed;
        this.cooldown = cooldown;
        this.gravity = gravity;
        this.range = range;

        // Config taps
        this.tapsToLaunch = Math.max(1, Math.floor(tapsToLaunch));
        this._tapCounter = 0;

        // Sigueinte proyectil
        this.getNextType = getNextType;

        // Estado interno
        this.currentIndex = 0;
        this.lastShotTime = 0;
        this.activeProjectiles = [];
        this.targets = [];

        // Proyectil en espera (previsualización)
        this.readyProjectile = null;

        // Inicializar primera previsualización
        this._createReadyProjectile();
        this._updateHUDIcons();

        console.log(`[ProjectileSystem] Inicializado (speed=${this.speed}, gravity=${this.gravity}, range=${this.range}, tapsToLaunch=${this.tapsToLaunch})`);
    }

    // ================================
    // Manejo de taps (soporta n taps to launch)
    // ================================
    tap() {
        this._tapCounter++;
        console.log(`[ProjectileSystem] tap #${this._tapCounter}/${this.tapsToLaunch}`);
        if (this._tapCounter >= this.tapsToLaunch) {
            this._tapCounter = 0;
            this.launch();
        }
    }

    // ================================
    // Crear proyectil en espera (previsual)
    // ================================
    _createReadyProjectile() {
        // Si existe un readyProjectile y está activo (promovido a activo) NO lo disposeamos.
        if (this.readyProjectile) {
            const rp = this.readyProjectile;
            if (rp.metadata && rp.metadata.active) {
                // Este readyProjectile ya es un proyectil activo (edge-case) -> lo dejamos
                console.log("[ProjectileSystem] _createReadyProjectile: existente y activo, no lo disposeo (seguro).");
            } else {
                try {
                    rp.dispose();
                } catch (e) {
                    console.warn("[ProjectileSystem] Error limpiando proyectil listo previo:", e);
                }
            }
        }

        const type = this.projectileTypes[this.currentIndex] || "default";
        const cam = this.scene.activeCamera;
        if (!cam) {
            console.warn("[ProjectileSystem] No hay cámara activa para posicionar el proyectil listo.");
            return;
        }

        // Posición frente a la cámara, ligeramente abajo y adelante
        const forward = cam.getDirection(Vector3.Forward());
        const readyPos = cam.position
            .add(forward.scale(0.4))
            .add(new Vector3(0.15, -0.2, 0));

        const sphere = MeshBuilder.CreateSphere(
            `ready_proj_${type}_${Date.now()}`,
            { diameter: 0.08 },
            this.scene
        );
        sphere.position.copyFrom(readyPos);

        // Material con textura o color
        const mat = new StandardMaterial(`readyProjMat_${type}_${Date.now()}`, this.scene);
        const texKey = `icon_${type}`;
        const texUrl = this.assetMap[texKey];

        if (texUrl) {
            const tex = new Texture(
                texUrl,
                this.scene,
                false,
                false,
                Texture.TRILINEAR_SAMPLINGMODE
            );
            tex.hasAlpha = true;
            mat.diffuseTexture = tex;
            mat.opacityTexture = tex;
            mat.useAlphaFromDiffuseTexture = true;
            mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
        } else {
            mat.diffuseColor =
                type === "seed"
                    ? new Color3(0.2, 0.8, 0.3)
                    : new Color3(0.3, 0.4, 1.0);
        }

        mat.specularColor = new Color3(0, 0, 0);
        mat.emissiveColor = new Color3(0.1, 0.1, 0.1);
        mat.backFaceCulling = false;
        sphere.material = mat;

        // Animation: mantiene la posición relativa a la cámara y flota suavemente
        const beforeRender = () => {
            if (!sphere || sphere._isDisposed) return;
            const t = performance.now() / 1000;
            sphere.position.y = readyPos.y + Math.sin(t * 2) * 0.02;

            const cam2 = this.scene.activeCamera;
            if (!cam2) return;
            const newPos = cam2.position
                .add(cam2.getDirection(Vector3.Forward()).scale(0.4))
                .add(new Vector3(0.15, -0.2, 0));
            sphere.position.x = newPos.x;
            sphere.position.z = newPos.z;
        };
        sphere.registerBeforeRender(beforeRender);

        // Guardar metadata
        sphere.metadata = {
            type: type,
            isReady: true,
            _beforeRenderFn: beforeRender
        };

        this.readyProjectile = sphere;

        console.log(`[ProjectileSystem] Created ready projectile (type=${type}) at ${sphere.position.toString()}`);
    }

    // ================================
    // Lanzamiento (single shot) — protegido contra dispose accidental
    // ================================
    launch() {
        const now = performance.now();
        if (now - this.lastShotTime < this.cooldown) {
            console.log("[ProjectileSystem] En cooldown, ignorando launch.");
            return;
        }

        if (!this.readyProjectile || this.readyProjectile._isDisposed) {
            console.warn("[ProjectileSystem] launch(): No hay proyectil listo para lanzar.");
            return;
        }

        this.lastShotTime = now;

        // Promover readyProjectile a proyectil activo
        const projectile = this.readyProjectile;
        const type = projectile.metadata?.type || "unknown";
        const startPos = projectile.position.clone();

        // Detener animación de flotación (si existe)
        try {
            if (projectile.metadata?._beforeRenderFn) {
                projectile.unregisterBeforeRender(projectile.metadata._beforeRenderFn);
            } else {
                projectile.unregisterBeforeRender();
            }
        } catch (e) {
            // unregisterBeforeRender puede variar según versión; toleramos ambos.
        }

        // Preparar metadata de movimiento
        const cam = this.scene.activeCamera;
        if (!cam) {
            console.warn("[ProjectileSystem] No hay cámara activa — lanzamiento fallido.");
            return;
        }
        const direction = cam.getDirection(Vector3.Forward())
            .add(new Vector3(0, 0.25, 0))
            .normalize();

        projectile.metadata = {
            active: true,
            type,
            startPos,
            velocity: direction.scale(this.speed),
            gravity: new Vector3(0, this.gravity, 0),
        };

        projectile.name = `proj_${type}_${Date.now()}`;
        this.activeProjectiles.push(projectile);

        console.log(`[ProjectileSystem] Lanzado proyectil tipo=${type} desde ${startPos.toString()} con vel=${projectile.metadata.velocity.toString()}`);

        // IMPORTANT: separar referencia readyProjectile del proyectil activo antes de crear nueva previsualización
        this.readyProjectile = null;

        // Alternar tipo para el siguiente proyectil y crear nueva previsualización
        this._switchType();
        this._createReadyProjectile();

        // Movimiento parabólico frame a frame
        projectile.registerBeforeRender(() => {
            if (!projectile.metadata || !projectile.metadata.active) return;

            const dt = this.scene.getEngine().getDeltaTime() / 1000;

            // Actualizar velocidad y posición
            // Nota: usamos clones para evitar mutar objetos compartidos por error
            const gravStep = projectile.metadata.gravity.scale(dt);
            projectile.metadata.velocity.addInPlace(gravStep);
            projectile.position.addInPlace(projectile.metadata.velocity.scale(dt));

            // Log ligero (cada pocos frames para no spamear)
            if (!projectile._lastLogTime || performance.now() - projectile._lastLogTime > 300) {
                projectile._lastLogTime = performance.now();
                console.log(`[ProjectileSystem] proyectil[${projectile.name}] pos=${projectile.position.toString()}`);
            }

            // Destruir si sale del rango
            const traveled = Vector3.Distance(projectile.metadata.startPos, projectile.position);
            if (traveled > this.range) {
                console.log(`[ProjectileSystem] proyectil[${projectile.name}] excedió rango (${traveled.toFixed(2)}m) -> eliminar`);
                this._disposeProjectile(projectile);
                return;
            }

            // Verificar colisión con objetivos (distancia simple)
            for (const target of this.targets) {
                if (!target || target._isDisposed) continue;
                const dist = Vector3.Distance(projectile.position, target.position);
                if (dist < 0.18) {
                    console.log(`[ProjectileSystem] proyectil[${projectile.name}] colision con target=${target.name} (dist=${dist.toFixed(3)})`);
                    this._handleImpact(projectile, target);
                    break;
                }
            }
        });
    }

    // ================================
    // Registro de objetivos
    // ================================
    registerTargets(meshes) {
        if (!Array.isArray(meshes)) meshes = [meshes];
        this.targets = meshes.filter(Boolean);
        console.log(`[ProjectileSystem] Registered ${this.targets.length} targets.`);
    }

    // ================================
    // Impacto / Colisión
    // ================================
    _handleImpact(projectile, target) {
        const projType = projectile.metadata?.type || "unknown";
        console.log(`[ProjectileSystem] Impacto detectado: tipo=${projType}, target=${target?.name}`);

        // eliminar proyectil antes de callback para evitar reentradas
        this._disposeProjectile(projectile);

        if (typeof this.onHit === "function" && projType !== "unknown") {
            try {
                this.onHit(projType, target);
            } catch (err) {
                console.warn("[ProjectileSystem] Error en callback onHit:", err);
            }
        }
    }

    // ================================
    // Switch de tipo / HUD
    // ================================
    _switchType() {
        if (this.projectileTypes.length < 2) return;
        this.currentIndex = (this.currentIndex + 1) % this.projectileTypes.length;
        this._updateHUDIcons();
    }

    _updateHUDIcons() {
        if (!this.hud || !this.hud.updateProjectileIcons) return;

        const current = this.projectileTypes[this.currentIndex];
        const next =
            this.projectileTypes[
            (this.currentIndex + 1) % this.projectileTypes.length
            ];
        const currentIcon = this.assetMap[`icon_${current}`];
        const nextIcon = this.assetMap[`icon_${next}`];

        this.hud.updateProjectileIcons(currentIcon, nextIcon);
    }

    // ================================
    // Dispose proyectil
    // ================================
    _disposeProjectile(proj) {
        if (!proj || proj._isDisposed) return;
        try {
            // proteger contra eliminar proyectiles que todavía tengan metadata.active = true en edge-case
            proj.metadata = null;
            proj.dispose();
        } catch (e) {
            console.warn("[ProjectileSystem] Error al eliminar proyectil:", e);
        }
        this.activeProjectiles = this.activeProjectiles.filter(p => p !== proj);
    }

    // ================================
    // Limpieza general
    // ================================
    dispose() {
        console.log("[ProjectileSystem] dispose(): limpiando proyectiles y readyProjectile");
        // Limpiar readyProjectile (si existe y no es activo)
        if (this.readyProjectile && !this.readyProjectile.metadata?.active) {
            try {
                this.readyProjectile.dispose();
            } catch (e) {
                console.warn("[ProjectileSystem] Error limpiando readyProjectile:", e);
            }
        }
        // Limpiar proyectiles activos
        for (const p of [...this.activeProjectiles]) this._disposeProjectile(p);

        this.activeProjectiles = [];
        this.targets = [];
        this.readyProjectile = null;
    }
}
