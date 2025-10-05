// src/js/core/xr/anchors.js
import { WebXRFeatureName } from "@babylonjs/core/XR";

/**
 * Inicializa el sistema de anclas AR (anchors) en una sesión XR activa.
 * @param {BABYLON.WebXRFeaturesManager} featuresManager - Gestor de características WebXR.
 * @returns {BABYLON.WebXRAnchorSystem | null} Sistema de anclaje o null si no se pudo activar.
 */
export function setupAnchors(featuresManager) {
    try {
        const anchors = featuresManager.enableFeature(WebXRFeatureName.ANCHOR_SYSTEM, "latest", {
            doNotRemoveAnchorsOnSessionEnded: false,
        });

        // Evento: cuando se crea un ancla
        anchors.onAnchorAddedObservable.add((anchor) => {
            console.log("[Anchors] Nuevo ancla creada:", anchor.id);
        });

        // Evento: cuando se actualiza un ancla existente
        anchors.onAnchorUpdatedObservable.add((anchor) => {
            console.log("[Anchors] Ancla actualizada:", anchor.id);
        });

        // Evento: cuando se elimina un ancla
        anchors.onAnchorRemovedObservable.add((anchor) => {
            console.log("[Anchors] Ancla eliminada:", anchor.id);
        });

        console.log("[Anchors] Sistema de anclaje habilitado correctamente.");
        return anchors;
    } catch (err) {
        console.warn("[Anchors] No se pudo habilitar Anchor System:", err.message);
        return null;
    }
}
