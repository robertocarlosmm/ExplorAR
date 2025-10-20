export const experiencesConfig = [
    {
        id: "taquile",
        name: "Isla Taquile",
        image: "/assets/images/taquile_foto.jpg",
        description: "Isla del Lago Titicaca, famosa por su textilería artesanal.",
        minigames: [
            {
                id: "puzzle1",
                type: "puzzle3D",
                panel: "puzzle",
                params: { grid: 3 },
                assets: [
                        { type: "image", key: "board", url: "/assets/games/Minigame1/Taquile_minijuego1.jpg" }
                    ]
            },
            {
                id: "equipment",
                type: "choose",
                panel: "equipment",
                params: {
                    information: "Isla del Lago Titicaca (3937 m s. n. m.), reconocida por su tradición textil declarada Patrimonio de la UNESCO. El acceso es en bote desde Puno y luego una caminata de más de 500 gradas. El clima frío y la fuerte radiación exigen buena condición física, ropa abrigadora, calzado adecuado e hidratación. La visita se centra en la convivencia con familias locales y la valoración de sus costumbres."
                },
                assets: []   
            }
        ]
    },
    {
        id: "vicos",
        name: "Vicos",
        image: "/assets/images/vicos_foto.jpg",
        description: "Comunidad andina en Áncash, con turismo vivencial en el Callejón de Huaylas.",
        minigames: [
            {
                id: "puzzle1",
                type: "puzzle3D",
                panel: "puzzle",
                params: { grid: 3 },
                assets: [
                        { type: "image", key: "board", url: "/assets/games/Minigame1/vicos_minijuego1.jpg" }
                    ]
            },
            {
                id: "equipment",
                type: "choose",
                panel: "equipment",
                params: {
                    information: "Comunidad andina en Áncash con turismo vivencial coordinado con la Asociación Cuyayqui Wayi; estadía en casas familiares de servicios básicos y participación en faenas agrícolas y caminatas en terreno irregular. La iluminación nocturna es no uniforme en la zona y las noches son frías, por lo que la planificación y la coordinación previas son parte de la experiencia."
                },
                assets: []    
            }
        ]
    },
    {
        id: "tambopata",
        name: "Tambopata",
        image: "/assets/images/tambopata_foto.jpg",
        description: "Reserva amazónica del Madre de Dios, con gran biodiversidad.",
        minigames: [
            {
                id: "puzzle1",
                type: "puzzle3D",
                panel: "puzzle",
                params: { grid: 3 },
                assets: [
                        { type: "image", key: "board", url: "/assets/games/Minigame1/tambopata_minijuego1.jpg" }
                    ]
            },
            {
                id: "equipment",
                type: "choose",
                panel: "equipment",
                params: {
                    information: "Destino amazónico cercano a Puerto Maldonado, al que se accede en pocos minutos desde la ciudad y con traslados que combinan tramos fluviales y caminatas por senderos húmedos. El clima es lluvioso y caluroso, con abundante presencia de mosquitos. La experiencia incluye guías locales, observación responsable de fauna, convivencia con comunidades amazónicas y actividades de aventura como zipline."
                },
                assets: []
            }
        ]
    },
    {
        id: "lucumo",
        name: "Lomas de Lúcumo",
        image: "/assets/images/lomasLucumo_foto.jpg",
        description: "Áreas verdes en Lima con senderos de trekking y avistamiento de aves.",
        minigames: [
            {
                id: "puzzle1",
                type: "puzzle3D",
                panel: "puzzle",
                params: { grid: 3 },
                assets: [
                        { type: "image", key: "board", url: "/assets/games/Minigame1/LomasLucumo_minijuego1.jpg" }
                    ]
            },
            {
                id: "equipment",
                type: "choose",
                panel: "equipment",
                params: {
                    information: "Área natural cercana a Lima que se cubre de vegetación durante la temporada de lomas, usualmente entre agosto y diciembre, aunque puede variar según el clima de cada año. El ingreso es regulado por la comunidad y el recorrido implica senderos empinados, caminatas largas y fuerte radiación solar, lo que exige buena preparación física. La experiencia se complementa con guías locales y talleres ambientales que promueven la conservación del entorno."
                },
                assets: []
            }
        ]
    } 
]
