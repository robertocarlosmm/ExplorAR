import { Game } from "./core/game.js"
import { UIController } from "./ui/uiController.js"

const game = new Game()
const ui = new UIController()

document.getElementById("btn-start").addEventListener("click", () => {
  game.start("Roberto")
  ui.showHUD()

  // Simulación: sumamos puntos a Taquile
  const player = game.getPlayer()
  player.experiences.taquile.addPoints(80)
  player.experiences.taquile.setStars(2)

  ui.updateScore(player.getTotalScore())
})
