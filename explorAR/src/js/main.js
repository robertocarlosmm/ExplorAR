import { Game } from "./core/Game.js"
import { Experience } from "./models/Experience.js"
import { UIController } from "./ui/UIController.js"

const experiences = [
    new Experience("taquile", "Taquile", "/assets/images/taquile_foto.jpg", "", "Isla del Titicaca."),
    new Experience("vicos", "Vicos", "/assets/images/vicos_foto.jpg", "", "Comunidad campesina en Áncash."),
    new Experience("tambopata", "Tambopata", "/assets/images/tambopata_foto.jpg", "", "Reserva natural en la Amazonía."),
    new Experience("lucumo", "Lomas de Lúcumo", "/assets/images/lomasLucumo_foto.jpg", "", "Área natural de lomas costeras.")
]

const game = new Game(experiences)
const ui = new UIController(game)
ui.init()
//comentario de prueba