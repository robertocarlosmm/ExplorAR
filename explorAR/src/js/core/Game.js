import { Player } from "../models/Player.js"

export class Game {
    constructor() {
        this.player = null
    }

    start(playerName) {
        this.player = new Player(playerName)
        console.log(`Juego iniciado con: ${this.player.name}`)
    }

    getPlayer() {
        return this.player
    }
}
