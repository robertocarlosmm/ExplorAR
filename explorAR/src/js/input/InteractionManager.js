// src/js/input/InteractionManager.js
import { Vector3, Matrix } from "@babylonjs/core";
import { PointerDragBehavior } from "@babylonjs/core/Behaviors/Meshes/pointerDragBehavior";

/**
 * InteractionManager
 * -------------------
 * Gestiona arrastres de objetos (meshes) sobre un plano base,
 * usando PointerDragBehavior, con posiciones locales al tablero.
 */
export class InteractionManager {
    constructor(scene) {
        this.scene = scene;
        this.enabled = false;
        this._draggables = new Map();
    }

    enable() {
        if (this.enabled) return;
        this.enabled = true;
        console.log("[InteractionManager] Activado (modo PointerDragBehavior).");
    }

    disable() {
        if (!this.enabled) return;
        for (const { behavior } of this._draggables.values()) {
            behavior.detach();
        }
        this._draggables.clear();
        this.enabled = false;
        console.log("[InteractionManager] Desactivado.");
    }

    dispose() {
        this.disable();
        console.log("[InteractionManager] Recursos liberados");
    }

    /**
     * Registra un mesh con arrastre sobre el plano del tablero.
     * options:
     *  - planeNode: TransformNode del tablero (obligatorio)
     *  - fixedYLocal: número (altura local constante, ej. 0.01)
     *  - bounds: {minX,maxX,minZ,maxZ} (opcional)
     *  - onDragStart(mesh)
     *  - onDragMove(mesh, localPos)
     *  - onDragEnd(mesh, localPos)
     */
    registerDraggable(mesh, options) {
        const opts = {
            planeNode: null,
            fixedYLocal: 0,
            bounds: null,
            onDragStart: null,
            onDragMove: null,
            onDragEnd: null,
            ...options
        };
        if (!opts.planeNode) {
            console.warn("[InteractionManager] planeNode requerido");
            return;
        }

        // ðŸ”¹ Usa la orientación real del tablero como plano de arrastre
        const boardNormal = opts.planeNode.up.clone();
        const behavior = new PointerDragBehavior({
            dragPlaneNormal: boardNormal,
            useObjectOrientationForDragging: false
        });
        behavior.updateDragPlane = false; // plano fijo

        mesh.addBehavior(behavior);

        let invBoardWorld = null;

        behavior.onDragStartObservable.add(() => {
            // matriz inversa del tablero: mundo â†’ local
            opts.planeNode.computeWorldMatrix(true);
            invBoardWorld = opts.planeNode.getWorldMatrix().invert();
            opts.onDragStart?.(mesh);
            console.log("[InteractionManager] START â†’", mesh.name);
        });

        behavior.onDragObservable.add((evt) => {
            if (!invBoardWorld) return;

            // Punto en mundo reportado por el behavior
            const world = evt.dragPlanePoint ?? evt.draggedPosition ?? mesh.getAbsolutePosition();

            // Convertir a coordenadas locales del tablero
            const local = Vector3.TransformCoordinates(world, invBoardWorld);
            local.y = opts.fixedYLocal ?? 0;

            // Aplicar lí­mites si se definieron
            if (opts.bounds) {
                const b = opts.bounds;
                if (local.x < b.minX) local.x = b.minX;
                if (local.x > b.maxX) local.x = b.maxX;
                if (local.z < b.minZ) local.z = b.minZ;
                if (local.z > b.maxZ) local.z = b.maxZ;
            }

            // Aplicar la posición en el sistema local del tablero
            mesh.position.copyFrom(local);
            opts.onDragMove?.(mesh, local);
        });

        behavior.onDragEndObservable.add(() => {
            const local = mesh.position.clone(); // ya en local
            opts.onDragEnd?.(mesh, local);
            console.log("[InteractionManager] END â†’", mesh.name, "@", local);
        });

        // Log inicial
        const abs = mesh.getAbsolutePosition();
        console.log(
            `[InteractionManager] Registrado: ${mesh.name} @ (${abs.x.toFixed(3)}, ${abs.y.toFixed(3)}, ${abs.z.toFixed(3)})`
        );

        this._draggables.set(mesh, { behavior, options: opts });
    }
}