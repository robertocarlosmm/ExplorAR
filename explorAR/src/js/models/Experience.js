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
                    meta: a.meta ?? {},
                })) : [],
            }))
            : [];
    }

    getMinigames() { return this.minigames; }
    getMinigame(i = 0) { return this.minigames[i] ?? null; }
    getMinigameById(id) { return this.minigames.find(m => m.id === id) ?? null; }
    getNextMinigameId(currentId) {
        const i = this.minigames.findIndex(m => m.id === currentId);
        return (i >= 0 && i + 1 < this.minigames.length) ? this.minigames[i + 1].id : null;
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
