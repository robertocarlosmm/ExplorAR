// src/js/core/xr/planeDetection.js
import { WebXRFeatureName } from "@babylonjs/core/XR";

/**
 * Inicializa la detección de planos AR en una sesión XR activa.
 * @param {BABYLON.WebXRFeaturesManager} featuresManager - El gestor de características de WebXR.
 * @returns {BABYLON.WebXRPlaneDetector | null} Instancia del detector o null si no se pudo habilitar.
 */
export function setupPlaneDetection(featuresManager) {
    try {
        const feature = featuresManager.enableFeature(WebXRFeatureName.PLANE_DETECTION, "latest", {
            // Si tu dispositivo soporta mallas, se pueden visualizar:
            worldParentNode: undefined, // se puede pasar un nodo si se quiere agrupar las mallas
            doNotRemovePlanesOnSessionEnded: false,
        });

        // Observadores básicos
        feature.onPlaneAddedObservable.add((plane) => {
            console.log("[PlaneDetection] Nuevo plano detectado:", plane.id);
        });

        feature.onPlaneUpdatedObservable.add((plane) => {
            console.log("[PlaneDetection] Plano actualizado:", plane.id);
        });

        feature.onPlaneRemovedObservable.add((plane) => {
            console.log("[PlaneDetection] Plano eliminado:", plane.id);
        });

        console.log("[PlaneDetection] Detección de planos habilitada correctamente.");
        return feature;
    } catch (err) {
        console.warn("[PlaneDetection] No se pudo habilitar Plane Detection:", err.message);
        return null;
    }
}
