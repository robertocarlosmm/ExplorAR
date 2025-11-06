// game/registry.js
import { startPuzzleGame } from "./minigame1/puzzleLauncher.js";
import { startEquipmentGame } from "./minigame2/equipmentLauncher.js";
import { startMinigame3 } from "./minigame3/minigame3Launcher.js";
import { startMinigame4 } from "./minigame4/checkLauncher.js";
import { startPhotoStudio } from "./photoStudio/photoLauncher.js";

export const MINIGAME_REGISTRY = {
    minigame1: startPuzzleGame,
    minigame2: startEquipmentGame,
    minigame3: startMinigame3,
    minigame4: startMinigame4,
    photostudio: startPhotoStudio,
};

export function launchMinigame(id, gameManager) {
    const fn = MINIGAME_REGISTRY[id];
    if (!fn) {
        console.warn(`[MinigameRegistry] No se encontró un minijuego con ID: ${id}`);
        return false;
    }

    console.log(`[MinigameRegistry] Lanzando ${id}...`);
    fn(gameManager);
    return true;
}
