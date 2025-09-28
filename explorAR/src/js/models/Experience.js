export class Experience {
    constructor(id, name, imagePath, modelPath, description, minigames = []) {
        this.id = id                 // Unique identifier (e.g. "taquile")
        this.name = name             // Display name
        this.imagePath = imagePath   // Path to preview image
        this.modelPath = modelPath   // Path to 3D model
        this.description = description // Text description
        this.minigames = minigames   // List of minigames for this experience
    }

    addMinigame(minigame) {
        this.minigames.push(minigame)
    }

    getMinigames() {
        return this.minigames
    }
}