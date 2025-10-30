import {
    MeshBuilder,
    StandardMaterial,
    Texture,
    Color3,
    Vector3,
} from "@babylonjs/core";

export class ProjectileSystem {
    constructor({
        scene,
        hud = null,
        projectileTypes = [],
        projectileConfig = {}, // NUEVO: parámetros opcionales por tipo
        assetMap = {},
        onHit = null,
        speed = 2.8,
        cooldown = 400,
        gravity = -2.5,
        range = 5.0,
        tapsToLaunch = 1,
        getNextType = null, // lógica externa personalizada
    }) {
        this.scene = scene;
        this.hud = hud;
        this.assetMap = assetMap;
        this.projectileTypes = projectileTypes;
        this.projectileConfig = projectileConfig;
        this.onHit = onHit;
        this.speed = speed;
        this.cooldown = cooldown;
        this.gravity = gravity;
        this.range = range;
        this.tapsToLaunch = Math.max(1, Math.floor(tapsToLaunch));
        this._tapCounter = 0;
        this.getNextType = getNextType;
        this.currentIndex = 0;
        this.lastShotTime = 0;
        this.activeProjectiles = [];
        this.targets = [];
        this.readyProjectile = null;

        this._createReadyProjectile();
        this._updateHUDIcons();

        console.log(`[ProjectileSystem] Inicializado con ${projectileTypes.length} tipos`);
    }

    tap() {
        this._tapCounter++;
        if (this._tapCounter >= this.tapsToLaunch) {
            this._tapCounter = 0;
            this.launch();
        }
    }

    _createReadyProjectile() {
        if (this.readyProjectile && !this.readyProjectile.metadata?.active) {
            try { this.readyProjectile.dispose(); } catch { }
        }

        const type = this.projectileTypes[this.currentIndex] || "default";
        const cam = this.scene.activeCamera;
        if (!cam) return;

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

        const mat = new StandardMaterial(`mat_${type}`, this.scene);
        const tex = this.assetMap[`icon_${type}`];
        if (tex) {
            const texture = new Texture(tex, this.scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
            texture.hasAlpha = true;
            mat.diffuseTexture = texture;
            mat.opacityTexture = texture;
            mat.useAlphaFromDiffuseTexture = true;
            mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
        } else {
            mat.diffuseColor = new Color3(0.4, 0.7, 1.0);
        }

        mat.specularColor = new Color3(0, 0, 0);
        sphere.material = mat;

        const beforeRender = () => {
            if (!sphere || sphere._isDisposed) return;
            const t = performance.now() / 1000;
            sphere.position.y = readyPos.y + Math.sin(t * 2) * 0.02;
            const cam2 = this.scene.activeCamera;
            if (cam2) {
                const newPos = cam2.position.add(cam2.getDirection(Vector3.Forward()).scale(0.4)).add(new Vector3(0.15, -0.2, 0));
                sphere.position.x = newPos.x;
                sphere.position.z = newPos.z;
            }
        };
        sphere.registerBeforeRender(beforeRender);
        sphere.metadata = { type, isReady: true, _beforeRenderFn: beforeRender };

        this.readyProjectile = sphere;
    }

    launch() {
        const now = performance.now();
        if (now - this.lastShotTime < this.cooldown) return;
        if (!this.readyProjectile) return;
        this.lastShotTime = now;

        const projectile = this.readyProjectile;
        const type = projectile.metadata?.type || "unknown";

        try { projectile.unregisterBeforeRender(projectile.metadata._beforeRenderFn); } catch { }

        const cam = this.scene.activeCamera;
        if (!cam) return;
        const typeCfg = this.projectileConfig[type] || {};
        const pitch = typeCfg.pitchOffset ?? 0.25;
        const dir = cam.getDirection(Vector3.Forward()).add(new Vector3(0, pitch, 0)).normalize();

        projectile.metadata = {
            active: true,
            type,
            startPos: projectile.position.clone(),
            velocity: dir.scale(typeCfg.speed ?? this.speed),
            gravity: new Vector3(0, typeCfg.gravity ?? this.gravity, 0),
        };

        projectile.name = `proj_${type}_${Date.now()}`;
        this.activeProjectiles.push(projectile);
        this.readyProjectile = null;

        this._switchType();
        this._createReadyProjectile();

        projectile.registerBeforeRender(() => {
            if (!projectile.metadata?.active) return;
            const dt = this.scene.getEngine().getDeltaTime() / 1000;
            projectile.metadata.velocity.addInPlace(projectile.metadata.gravity.scale(dt));
            projectile.position.addInPlace(projectile.metadata.velocity.scale(dt));

            const traveled = Vector3.Distance(projectile.metadata.startPos, projectile.position);
            if (traveled > (typeCfg.range ?? this.range)) {
                this._disposeProjectile(projectile);
                return;
            }

            for (const target of this.targets) {
                const dist = Vector3.Distance(projectile.position, target.position);
                const hitRadius = typeCfg.hitRadius ?? 0.18;
                if (dist < hitRadius) {
                    this._handleImpact(projectile, target);
                    break;
                }
            }
        });
    }

    registerTargets(meshes) {
        this.targets = Array.isArray(meshes) ? meshes.filter(Boolean) : [meshes];
    }

    _handleImpact(projectile, target) {
        const type = projectile.metadata?.type;
        this._disposeProjectile(projectile);
        if (typeof this.onHit === "function") {
            this.onHit(type, target);
        }
    }

    _switchType() {
        if (!this.projectileTypes.length) return;

        if (typeof this.getNextType === "function") {
            const current = this.projectileTypes[this.currentIndex];
            const next = this.getNextType(current, {
                index: this.currentIndex,
                types: this.projectileTypes
            });
            const idx = this.projectileTypes.indexOf(next);
            this.currentIndex = idx >= 0 ? idx : 0;
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.projectileTypes.length;
        }

        this._updateHUDIcons();
    }

    _updateHUDIcons() {
        if (!this.hud?.updateProjectileIcons) return;
        const cur = this.projectileTypes[this.currentIndex];
        const next = this.projectileTypes[(this.currentIndex + 1) % this.projectileTypes.length];
        this.hud.updateProjectileIcons(
            this.assetMap[`icon_${cur}`],
            this.assetMap[`icon_${next}`]
        );
    }

    _disposeProjectile(p) {
        try { p.dispose(); } catch { }
        this.activeProjectiles = this.activeProjectiles.filter(x => x !== p);
    }

    dispose() {
        this.readyProjectile?.dispose?.();
        this.activeProjectiles.forEach(p => p.dispose?.());
        this.activeProjectiles = [];
        this.targets = [];
        this.readyProjectile = null;
    }
}
