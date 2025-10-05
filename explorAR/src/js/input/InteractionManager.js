// src/js/input/InteractionManager.js
import { PointerEventTypes, Vector3, Plane } from "@babylonjs/core";

/**
 * InteractionManager
 * -------------------
 * Gestor centralizado de interacciones táctiles / XR dentro de la escena.
 * En esta fase solo detecta eventos DOWN / MOVE / UP y muestra logs.
 */
export class InteractionManager {
    /**
     * @param {BABYLON.Scene} scene - Escena Babylon activa.
     */
    constructor(scene) {
        this.scene = scene;
        this.enabled = false;

        // Estado interno
        this.activePointerId = null;
        this.activeTarget = null;
        this.dragOffset = new Vector3(0, 0, 0);

        // Mapa de elementos arrastrables registrados
        this.draggables = new Map();

        // Referencia para remover observadores
        this._pointerObserver = null;
    }

    /** Activa el escuchador principal de punteros */
    enable() {
        if (this.enabled) return;
        this.enabled = true;

        this._pointerObserver = this.scene.onPointerObservable.add(
            (pi) => this._handlePointerEvent(pi)
        );

        console.log("[InteractionManager] Activado y escuchando eventos XR");
    }

    /** Desactiva el escuchador */
    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        if (this._pointerObserver) {
            this.scene.onPointerObservable.remove(this._pointerObserver);
            this._pointerObserver = null;
        }
        console.log("[InteractionManager] Desactivado");
    }

    /** Limpieza total */
    dispose() {
        this.disable();
        this.draggables.clear();
        this.activePointerId = null;
        this.activeTarget = null;
        console.log("[InteractionManager] Recursos liberados");
    }

    /** Registra un objeto como arrastrable (por ahora, solo logs) */
    registerDraggable(mesh, options = {}) {
        this.draggables.set(mesh, options);
        console.log(`[InteractionManager] Registrado: ${mesh.name}`);
    }

    unregister(mesh) {
        this.draggables.delete(mesh);
        console.log(`[InteractionManager] Eliminado: ${mesh.name}`);
    }

    unregisterAll() {
        this.draggables.clear();
        console.log("[InteractionManager] Todos los draggables eliminados");
    }

    /** Eventos internos del puntero */
    _handlePointerEvent(pi) {
        switch (pi.type) {
            case PointerEventTypes.POINTERDOWN:
                this._onPointerDown(pi);
                break;
            case PointerEventTypes.POINTERMOVE:
                this._onPointerMove(pi);
                break;
            case PointerEventTypes.POINTERUP:
                this._onPointerUp(pi);
                break;
        }
    }

    _onPointerDown(pi) {
        const pick = pi.pickInfo;
        if (!pick?.hit) return;

        const mesh = pick.pickedMesh;
        if (!this.draggables.has(mesh)) return; // No es arrastrable

        this.activePointerId = pi.event.pointerId;
        this.activeTarget = mesh;
        this.dragOffset = pick.pickedPoint.subtract(mesh.position);

        console.log(`[InteractionManager] DOWN en ${mesh.name}`);
        const { onDragStart } = this.draggables.get(mesh);
        onDragStart?.(mesh, pick.pickedPoint);
    }

    _onPointerMove(pi) {
        if (!this.activeTarget) return;
        if (pi.event.pointerId !== this.activePointerId) return;

        const { onDrag } = this.draggables.get(this.activeTarget) || {};
        const pick = pi.pickInfo;
        if (pick?.hit) {
            console.log(`[InteractionManager] MOVE id=${pi.event.pointerId}`);
            onDrag?.(this.activeTarget, pick.pickedPoint);
        }
    }

    _onPointerUp(pi) {
        if (pi.event.pointerId !== this.activePointerId) return;
        const mesh = this.activeTarget;
        if (!mesh) return;

        console.log(`[InteractionManager] UP en ${mesh.name}`);
        const { onDragEnd } = this.draggables.get(mesh) || {};
        onDragEnd?.(mesh);

        // Reset
        this.activePointerId = null;
        this.activeTarget = null;
    }

    /** Permite rotar manualmente la pieza activa (para botones ↺/↻) */
    rotateActive(stepRadians) {
        if (this.activeTarget) {
            this.activeTarget.rotation.y += stepRadians;
            console.log(
                `[InteractionManager] Rotado ${this.activeTarget.name} en ${stepRadians.toFixed(2)} rad`
            );
        }
    }

    /** Forzar selección programática */
    setActive(mesh) {
        this.activeTarget = mesh;
        console.log(`[InteractionManager] Activo forzado: ${mesh.name}`);
    }

    clearActive() {
        this.activeTarget = null;
        console.log("[InteractionManager] Activo limpiado");
    }
}
