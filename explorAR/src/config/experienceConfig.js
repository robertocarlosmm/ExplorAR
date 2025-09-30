// src/config/experienceConfig.js
export const experiencesConfig = [
    {
        id: "taquile",
        name: "Taquile",
        image: "/assets/images/taquile_foto.jpg",
        description: "Isla en el lago Titicaca, conocida por su textilería.",
        minigames: [
            { type: "puzzle3D", image: "/assets/images/puzzles/taquile_puzzle.jpg", gridSize: 3, timeLimit: 60 }
        ]
    },
    {
        id: "vicos",
        name: "Vicos",
        image: "/assets/images/vicos_foto.jpg",
        description: "Comunidad campesina en el Parque Huascarán.",
        minigames: [
            { type: "puzzle3D", image: "/assets/images/puzzles/vicos_puzzle.jpg", gridSize: 3, timeLimit: 60 }
        ]
    },
    {
        id: "tambopata",
        name: "Tambopata",
        image: "/assets/images/tambopata_foto.jpg",
        description: "Reserva amazónica con gran biodiversidad.",
        minigames: [
            { type: "puzzle3D", image: "/assets/images/puzzles/tambopata_puzzle.jpg", gridSize: 3, timeLimit: 60 }
        ]
    },
    {
        id: "lucumo",
        name: "Lomas de Lúcumo",
        image: "/assets/images/lomasLucumo_foto.jpg",
        description: "Ecosistema de lomas costeras cerca de Lima.",
        minigames: [
            { type: "puzzle3D", image: "/assets/images/puzzles/lomas_puzzle.jpg", gridSize: 3, timeLimit: 60 }
        ]
    }
]
