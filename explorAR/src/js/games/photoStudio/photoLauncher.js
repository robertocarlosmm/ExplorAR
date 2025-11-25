// src/js/game/photoStudio/photoLauncher.js
import { PhotoStudio } from "./PhotoStudio.js";

/**
 * Lanza el Estudio de Fotos (post-minijuego final).
 * @param {any} gameManager
 * @param {number} stars
 * @param {string} experienceId
 */
export async function startPhotoStudio(gameManager) {
    ////console.log("[PhotoLauncher] Start", { stars, experienceId });
    const score = gameManager.getCarryScore?.() || 0;
    let stars = 3;
    if (score < 250) stars = 1;
    else if (score < 350) stars = 2;
    //console.log(`[PhotoLauncher] Puntaje ${score} → ${stars} estrella(s)`);
    const exp = gameManager?.experienceManager?.currentExperience ?? gameManager?.game?.currentExperience;
    const experienceId = exp?.id || "default";
    //console.log(`[Minigame4Launcher] Experiencia actual: ${experienceId}`);

    // 1) Cerrar XR por si el minijuego dejó sesión activa (liberar cámara)
    try {
        if (gameManager?.xrSession?.isActive) {
            //console.log("[PhotoLauncher] Cerrando XRSession previa...");
            await gameManager.closeXRSession();
            await new Promise(r => setTimeout(r, 200)); // breve espera para liberar dispositivo
        }
    } catch (e) {
        console.warn("[PhotoLauncher] Error cerrando XRSession (continuo):", e);
    }

    // 2) HUD - ocultar para no interferir visualmente
    try {
        gameManager?.hud?.stopTimer?.();
        gameManager?.hud?.hide?.();
        const hudEl = document.getElementById("hud");
        if (hudEl) hudEl.style.display = "none";
    } catch { }

    // 3) Crear instancia del estudio
    const studio = new PhotoStudio({
        hud: gameManager?.hud || null,
        stars,
        experienceId,
        onExit: () => {
            // Restaurar HUD al salir
            try {
                const hudEl = document.getElementById("hud");
                if (hudEl) hudEl.style.display = ""; // aseguramos que no quede oculto permanentemente
                gameManager?.hud?.hide?.(); // no lo mostramos, solo limpiamos estado
                document.body.classList.remove("photo-mode");
            } catch (err) {
                console.warn("[PhotoLauncher] Error limpiando HUD o clases:", err);
            }

            //console.log("[PhotoLauncher] Saliendo al lobby desde PhotoStudio...");
            // Cierre ordenado del flujo (idéntico a otros minijuegos)
            gameManager?.onExit?.();
        }
    });

    // 4) Iniciar
    try {
        await studio.start();
        //console.log("[PhotoLauncher] PhotoStudio iniciado.");
    } catch (e) {
        console.error("[PhotoLauncher] No se pudo iniciar el estudio:", e);
        gameManager?.hud?.message?.("No se pudo iniciar la cámara", 2000);
        // Restaurar HUD en caso de error
        const hudEl = document.getElementById("hud");
        if (hudEl) hudEl.style.display = "";
        gameManager?.hud?.show?.();
    }
}
