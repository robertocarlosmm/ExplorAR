export class Experience {
    constructor(id, name, imagePath, modelPath, description, minigames = []) {
        this.id = id;
        this.name = name;
        this.imagePath = imagePath;
        this.modelPath = modelPath;
        this.description = description;

        this.minigames = Array.isArray(minigames)
            ? minigames.map((mg, idx) => ({
                id: mg.id ?? `mg-${idx}`,
                type: mg.type,                // requerido
                panel: mg.panel ?? null,
                duration: mg.duration ?? 0,
                params: mg.params ?? {},
                assets: Array.isArray(mg.assets) ? mg.assets.map(a => ({
                    type: a.type,               // "image" | "texture" | "audio" | "model" ...
                    key: a.key,                // identificador único dentro del minijuego
                    url: a.url,
                    feedback: a.feedback ?? {},
                    meta: a.meta ?? {},
                })) : [],
            }))
            : [];
    }

    getMinigames() { return this.minigames; }
    getMinigame(i = 0) { return this.minigames[i] ?? null; }
    getMinigameById(id) { return this.minigames.find(m => m.id === id) ?? null; }
    getNextMinigameId(currentId) {
        const currentIndex = this.minigames.findIndex(m => m.id === currentId);
        
        // Si no se encuentra o es el último, retornar null
        if (currentIndex === -1 || currentIndex >= this.minigames.length - 1) {
            return null;
        }
        
        return this.minigames[currentIndex + 1].id;
    }

    // Helpers de assets
    getAssetsOf(mgId, type) {
        return this.getMinigameById(mgId)?.assets?.filter(a => a.type === type) ?? [];
    }
    getAsset(mgId, key) {
        return this.getMinigameById(mgId)?.assets?.find(a => a.key === key) ?? null;
    }

    // Compat: puzzle 1
    getPuzzleImage() {
        const mg = this.getMinigame(0);
        return mg?.assets?.find(a => a.type === "image")?.url ?? null;
    }
    getPuzzleGrid() {
        return this.getMinigame(0)?.params?.grid ?? 3;
    }
}
