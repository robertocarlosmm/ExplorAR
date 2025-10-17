// game/registry.js
import { startPuzzleGame } from "./minigame1/puzzleLauncher.js";
import { startEquipmentGame } from "./minigame2/equipmentLauncher.js";

export const MINIGAME_REGISTRY = {
    minigame1: startPuzzleGame,
    minigame2: startEquipmentGame,
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
