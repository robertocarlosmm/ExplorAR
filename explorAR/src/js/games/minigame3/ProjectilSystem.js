import {
    MeshBuilder,
    StandardMaterial,
    Texture,
    Color3,
    Vector3,
} from "@babylonjs/core";

/**
 * Sistema genérico y reutilizable de proyectiles con trayectoria parabólica.
 * Controla creación, movimiento, colisión, alternancia de tipo, gravedad y limpieza.
 *
 * Usado en los minijuegos 3 (Vicos, Taquile, Tambopata, Lúcumo)
 *
 */
export class ProjectileSystem {
    /**
     * @param {Object} opts - Opciones de configuración.
     * @param {Scene} opts.scene - Escena Babylon.js activa.
     * @param {Object} opts.hud - HUD del juego (opcional, para mostrar íconos).
     * @param {Array<string>} opts.projectileTypes - Tipos de proyectil (ej. ["seed", "water"]).
     * @param {Object} opts.assetMap - Mapa de assets del minijuego.
     * @param {Function} opts.onHit - Callback al impactar un objetivo.
     * @param {number} [opts.speed=2.8] - Velocidad inicial del proyectil.
     * @param {number} [opts.cooldown=400] - Tiempo mínimo entre lanzamientos (ms).
     * @param {number} [opts.gravity=-2.5] - Aceleración de caída vertical.
     * @param {number} [opts.range=5.0] - Distancia máxima antes de destruir proyectil (m).
     */
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

        // Estado interno
        this.currentIndex = 0;
        this.lastShotTime = 0;
        this.activeProjectiles = [];
        this.targets = [];

        // Mostrar íconos iniciales en el HUD (si aplica)
        this._updateHUDIcons();
    }

    // ================================
    // LANZAMIENTO PRINCIPAL
    // ================================
    launch() {
        const now = performance.now();
        if (now - this.lastShotTime < this.cooldown) return; // cooldown activo
        this.lastShotTime = now;

        const type = this.projectileTypes[this.currentIndex];
        const projectile = this._createProjectile(type);

        // Configurar velocidad inicial con dirección curva (tipo “Pokébola”)
        const cam = this.scene.activeCamera;
        const direction = cam.getDirection(Vector3.Forward())
            .add(new Vector3(0, 0.25, 0)) // leve inclinación ascendente
            .normalize();

        projectile.metadata = {
            active: true,
            type,
            startPos: projectile.position.clone(),
            velocity: direction.scale(this.speed),
            gravity: new Vector3(0, this.gravity, 0),
        };

        this.activeProjectiles.push(projectile);

        // Movimiento parabólico frame a frame
        projectile.registerBeforeRender(() => {
            if (!projectile.metadata.active) return;

            const dt = this.scene.getEngine().getDeltaTime() / 1000;

            // Física simplificada: posición = posición + v*dt ; v.y += g*dt
            projectile.metadata.velocity.addInPlace(
                projectile.metadata.gravity.scale(dt)
            );
            projectile.position.addInPlace(
                projectile.metadata.velocity.scale(dt)
            );

            // Destruir si sale del rango
            const traveled = Vector3.Distance(
                projectile.metadata.startPos,
                projectile.position
            );
            if (traveled > this.range) {
                this._disposeProjectile(projectile);
                return;
            }

            // Verificar colisión con objetivos
            for (const target of this.targets) {
                if (!target || target._isDisposed) continue;
                const dist = Vector3.Distance(projectile.position, target.position);
                if (dist < 0.18) {
                    this._handleImpact(projectile, target);
                    break;
                }
            }
        });

        // Alternar tipo y actualizar HUD
        this._switchType();
    }

    // ================================
    // REGISTRO DE OBJETIVOS
    // ================================
    registerTargets(meshes) {
        if (!Array.isArray(meshes)) meshes = [meshes];
        this.targets = meshes.filter(Boolean);
    }

    // ================================
    // CREACIÓN VISUAL DEL PROYECTIL
    // ================================
    _createProjectile(type) {
        const cam = this.scene.activeCamera;

        // Punto de origen: parte baja del campo de visión (tipo Pokébola)
        const start = cam.position
            .add(cam.getDirection(Vector3.Forward()).scale(0.15))
            .add(new Vector3(0, -0.25, 0));

        const sphere = MeshBuilder.CreateSphere(
            `proj_${type}_${Date.now()}`,
            { diameter: 0.06 },
            this.scene
        );
        sphere.position.copyFrom(start);

        // Material (usa íconos de assetMap si existen)
        const mat = new StandardMaterial(`projMat_${type}`, this.scene);
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
        mat.emissiveColor = new Color3(0.05, 0.05, 0.05);
        mat.backFaceCulling = false;
        sphere.material = mat;

        return sphere;
    }

    // ================================
    // IMPACTO / COLISIÓN
    // ================================
    _handleImpact(projectile, target) {
        this._disposeProjectile(projectile);
        if (typeof this.onHit === "function") {
            try {
                this.onHit(projectile.metadata.type, target);
            } catch (err) {
                console.warn("[ProjectileSystem] Error en callback onHit:", err);
            }
        }
    }

    // ================================
    // ALTERNANCIA DE TIPO
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
    // LIMPIEZA DE PROYECTILES
    // ================================
    _disposeProjectile(proj) {
        if (!proj || proj._isDisposed) return;
        proj.metadata.active = false;
        try {
            proj.dispose();
        } catch (e) {
            console.warn("[ProjectileSystem] Error al eliminar proyectil:", e);
        }
        this.activeProjectiles = this.activeProjectiles.filter(
            (p) => p !== proj
        );
    }

    dispose() {
        for (const p of this.activeProjectiles) this._disposeProjectile(p);
        this.activeProjectiles = [];
        this.targets = [];
    }
}
