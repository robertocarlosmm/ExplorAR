// InteractionManager.js
import { PointerEventTypes, Vector3, Plane, Ray, Matrix } from "@babylonjs/core";

/**
 * InteractionManager
 * -------------------
 * Gestor centralizado de interacciones táctiles / XR dentro de la escena.
 * En esta fase permite arrastrar objetos (piezas) sobre el plano visible del tablero.
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

        // Mapa de objetos arrastrables y sus configuraciones
        this.draggables = new Map();

        // Referencia al observador principal
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

    /** Registra un objeto como arrastrable */
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

    /** Maneja los eventos internos del puntero */
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

    /** Cuando el usuario toca una pieza */
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

    /** Cuando el usuario arrastra el dedo */
    _onPointerMove(pi) {
        if (!this.activeTarget) return;
        if (pi.event.pointerId !== this.activePointerId) return;

        const data = this.draggables.get(this.activeTarget);
        if (!data || !data.planeNode) return;

        // Crear un rayo desde la cámara hacia el puntero (según coordenadas de pantalla)
        const pickRay = this.scene.createPickingRay(
            pi.event.offsetX,
            pi.event.offsetY,
            Matrix.Identity(),
            this.scene.activeCamera,
            false
        );

        // ✅ Plano corregido: usamos el mismo plano del tablero (orientación frontal)
        const planeNormal = data.planeNode.forward;      // Normal del tablero
        const planePoint = data.planeNode.position;      // Un punto sobre el tablero
        const plane = Plane.FromPositionAndNormal(planePoint, planeNormal);

        const distance = pickRay.intersectsPlane(plane);

        if (distance) {
            // Calculamos el punto de intersección entre el rayo y el plano
            const hitPoint = pickRay.origin.add(pickRay.direction.scale(distance));

            // Actualizamos la posición de la pieza ligeramente sobre el tablero
            const offset = data.yOffset ?? 0.01;
            const newPos = hitPoint.add(planeNormal.scale(offset));

            this.activeTarget.position.copyFrom(newPos);
        }

        // Callback opcional de depuración
        const { onDrag } = data;
        onDrag?.(this.activeTarget, this.activeTarget.position);
    }

    /** Cuando el usuario suelta la pieza */
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

    /** Rotar manualmente la pieza activa (para botones ↺/↻ en fases posteriores) */
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
