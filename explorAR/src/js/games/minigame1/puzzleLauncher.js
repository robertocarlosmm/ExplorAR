import { PuzzleGame } from "./PuzzleGame.js";

export function startPuzzleGame(gameManager) {
    const exp = gameManager.game?.currentExperience;
    const minigameId = "minigame1";

    const puzzle = new PuzzleGame({
        scene: gameManager.xrSession?.scene,
        hud: gameManager.hud,
        grid: 3,
        imageUrl:
            exp?.minigames?.[0]?.assets?.find((a) => a.key === "board")?.url || null,
    });

    // Maneja el evento de finalización del puzzle.
    puzzle.onGameEnd = async () => {
        //console.log("[PuzzleGame] Finalizado. Cerrando XR y buscando siguiente...");
        //gameManager.game?.completeMinigame?.(puzzle.score);
        gameManager.setCarryScore?.(puzzle.score);
        //console.log("Puntaje llevado al GameManager:", gameManager.getCarryScore());

        await gameManager.closeXRSession();
        await new Promise(r => setTimeout(r, 150)); 

        // Intentar obtener el siguiente minijuego desde la experiencia actual.
        let nextId = exp?.getNextMinigameId?.(minigameId);

        // Si no existe método o devuelve vacío, usar un valor por defecto.
        if (!nextId) {
            console.warn(
                "[PuzzleGame] No se encontró siguiente ID en getNextMinigameId(). Se usará 'minigame2'."
            );
            nextId = "minigame2";
        }

        // Llama al siguiente minijuego a través del GameManager.
        gameManager.launchNextMinigame(nextId);
    };

    puzzle.start();
}