import { Vector3 } from "@babylonjs/core";

/**
 * Vincula el tablero del juego a la primera superficie detectada (plane detection).
 * @param {BABYLON.WebXRPlaneDetector} planeDetector
 * @param {BABYLON.Scene} scene
 * @param {function(Vector3):void} onPositionFixed - callback cuando se fija la posición.
 */
export function attachBoardToFirstPlane(planeDetector, scene, onPositionFixed) {
    if (!planeDetector) {
        console.warn("[anchorBoard] Plane detection no disponible.");
        return;
    }

    let fixed = false;

    planeDetector.onPlaneAddedObservable.add((plane) => {
        if (fixed) return;

        try {
            // Calcular posición promedio del plano detectado
            const mesh = plane.polygonMesh;
            if (!mesh) return;

            const pos = mesh.getBoundingInfo().boundingBox.centerWorld.clone();
            onPositionFixed(pos);
            fixed = true;

            console.log("[anchorBoard] Tablero fijado en plano detectado:", pos.toString());
        } catch (err) {
            console.warn("[anchorBoard] Error al fijar tablero:", err);
        }
    });
}
