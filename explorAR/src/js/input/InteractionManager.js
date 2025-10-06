// src/js/input/InteractionManager.js
import { PointerDragBehavior, Vector3 } from "@babylonjs/core";

/**
 * InteractionManager
 * -------------------
 * Gestiona arrastre de piezas dentro de un plano (eje Y fijo),
 * usando PointerDragBehavior nativo de BabylonJS.
 */
export class InteractionManager {
    /**
     * @param {BABYLON.Scene} scene - Escena activa.
     */
    constructor(scene) {
        this.scene = scene;
        this.enabled = false;

        // Mapa de objetos arrastrables
        this.draggables = new Map();

        // Estado
        this._pointerObserver = null;
    }

    /** Activa el observador de punteros (por compatibilidad futura con XR/táctil) */
    enable() {
        if (this.enabled) return;
        this.enabled = true;
        console.log("[InteractionManager] Activado (modo PointerDragBehavior).");
    }

    /** Desactiva el observador */
    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        console.log("[InteractionManager] Desactivado.");
    }

    /** Limpieza total */
    dispose() {
        this.disable();
        this.draggables.forEach((data, mesh) => {
            if (data.behavior) {
                mesh.removeBehavior(data.behavior);
            }
        });
        this.draggables.clear();
        console.log("[InteractionManager] Recursos liberados");
    }

    /**
     * Registra un mesh como arrastrable dentro de un plano horizontal.
     * @param {BABYLON.Mesh} mesh 
     * @param {Object} options 
     */
    registerDraggable(mesh, options = {}) {
        const fixedY = options.fixedY ?? 0;
        const dragPlaneNormal = options.dragPlaneNormal ?? new Vector3(0, 1, 0);
        const behavior = new PointerDragBehavior({ dragPlaneNormal });

        // Ajuste del comportamiento del drag
        behavior.useObjectOrientationForDragging = false;
        behavior.moveAttached = false;

        // Evento: inicio del arrastre
        behavior.onDragStartObservable.add(() => {
            console.log(`[InteractionManager] START → ${mesh.name}`);
            options.onDragStart?.(mesh);
        });

        // Evento: durante arrastre
        behavior.onDragObservable.add((event) => {
            const pos = event.dragPlanePoint.clone();
            pos.y = fixedY; // mantener fijo el eje Y
            mesh.position.copyFrom(pos);
            options.onDrag?.(mesh, pos);
        });

        // Evento: fin del arrastre
        behavior.onDragEndObservable.add(() => {
            console.log(`[InteractionManager] END → ${mesh.name} @ ${mesh.position.toString()}`);
            options.onDragEnd?.(mesh);
        });

        mesh.addBehavior(behavior);
        this.draggables.set(mesh, { behavior, ...options });

        const p = mesh.position.clone();
        console.log(`[InteractionManager] Registrado: ${mesh.name} @ (${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})`);
    }

    /** Elimina un draggable */
    unregister(mesh) {
        const data = this.draggables.get(mesh);
        if (data?.behavior) mesh.removeBehavior(data.behavior);
        this.draggables.delete(mesh);
        console.log(`[InteractionManager] Eliminado: ${mesh.name}`);
    }

    unregisterAll() {
        this.draggables.forEach((data, mesh) => mesh.removeBehavior(data.behavior));
        this.draggables.clear();
        console.log("[InteractionManager] Todos los draggables eliminados");
    }
}
