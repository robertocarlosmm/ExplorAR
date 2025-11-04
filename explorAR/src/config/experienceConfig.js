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
                    information:
                        "Isla del Lago Titicaca (3937 m s. n. m.), reconocida por su tradición textil declarada Patrimonio de la UNESCO. El acceso es en bote desde Puno y luego una caminata de más de 500 gradas. El clima frío y la fuerte radiación exigen buena condición física, ropa abrigadora, calzado adecuado e hidratación. La visita se centra en la convivencia con familias locales y la valoración de sus costumbres.",
                    correctos: ["ticket_lancha", "casaca", "calzado_trekking", "protector_solar"],
                    incorrectos: ["sandalias", "botas_caucho", "guantes_trabajo", "paraguas"],
                    feedbacks: {
                        ticket_lancha: "Necesitarás un pase para llegar a la isla.",
                        casaca: "Las temperaturas son frías, conviene abrigarse.",
                        calzado_trekking: "El recorrido incluye muchas gradas, usa calzado firme.",
                        protector_solar: "La radiación es intensa, debes protegerte del sol."
                    }
                },
                assets: [
                    //mochila
                    { type: "model", key: "backpack", url: "/assets/games/Minigame2/backpack.glb" },

                    // Correctos
                    { type: "image", key: "ticket_lancha", url: "/assets/games/Minigame2/ticket_lancha.png" },
                    { type: "image", key: "casaca", url: "/assets/games/Minigame2/casaca.png" },
                    { type: "image", key: "calzado_trekking", url: "/assets/games/Minigame2/calzado_trekking.png" },
                    { type: "image", key: "protector_solar", url: "/assets/games/Minigame2/protector_solar.png" },

                    // Incorrectos
                    { type: "image", key: "sandalias", url: "/assets/games/Minigame2/sandalias.png" },
                    { type: "image", key: "botas_caucho", url: "/assets/games/Minigame2/botas_caucho.png" },
                    { type: "image", key: "guantes_trabajo", url: "/assets/games/Minigame2/guantes_trabajo.png" },
                    { type: "image", key: "paraguas", url: "/assets/games/Minigame2/paraguas.png" }
                ]
            },
            {
                id: "check",
                type: "check",
                panel: "check",
                params: {
                    spawnRadius: 1.2,
                    singlespeed: 0.02,
                },
                assets: [
                    { type: "image", key: "check_icon", url: "/assets/games/Minigame4/check_icon.png" },
                    { type: "image", key: "wrong_icon", url: "/assets/games/Minigame4/wrong_icon.png" },
                    { type: "image", key: "p1", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p2", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p3", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p4", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p5", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p6", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p7", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p8", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p9", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p10", url: "/assets/default/default2.jpg" },
                ]
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
                    information:
                        "Comunidad andina en Áncash con turismo vivencial coordinado con la Asociación Cuyayqui Wayi; estadía en casas familiares de servicios básicos y participación en faenas agrícolas y caminatas en terreno irregular. La iluminación nocturna es no uniforme en la zona y las noches son frías, por lo que la planificación y la coordinación previas son parte de la experiencia.",
                    correctos: ["comunicacion", "bolsa_dormir", "linterna", "baston_trekking"],
                    incorrectos: ["sandalias", "vinoculares", "protector_solar", "poncho_impermeable"],
                    feedbacks: {
                        comunicacion: "Conviene estar en contacto con la comunidad local.",
                        bolsa_dormir: "Pasarás la noche en condiciones sencillas, algo para dormir será útil.",
                        linterna: "La iluminación no siempre está disponible, podrías necesitar luz.",
                        baston_trekking: "El terreno es irregular, algo de apoyo te ayudará a avanzar."
                    }
                },
                assets: [
                    //mochila
                    { type: "model", key: "backpack", url: "/assets/games/Minigame2/backpack.glb" },

                    // Correctos
                    { type: "image", key: "comunicacion", url: "/assets/games/Minigame2/comunicacion.png" },
                    { type: "image", key: "bolsa_dormir", url: "/assets/games/Minigame2/bolsa_de_dormir.png" },
                    { type: "image", key: "linterna", url: "/assets/games/Minigame2/linterna.png" },
                    { type: "image", key: "baston_trekking", url: "/assets/games/Minigame2/baston_trekking.png" },

                    // Incorrectos
                    { type: "image", key: "sandalias", url: "/assets/games/Minigame2/sandalias.png" },
                    { type: "image", key: "vinoculares", url: "/assets/games/Minigame2/vinoculares.png" },
                    { type: "image", key: "protector_solar", url: "/assets/games/Minigame2/protector_solar.png" },
                    { type: "image", key: "poncho_impermeable", url: "/assets/games/Minigame2/poncho_impermeable.png" }
                ]
            },
            {
                id: "m3Vicos",
                type: "throw",
                panel: "throw",
                params: {
                    numberOfPlots: 6,
                    spawnRadius: 1.2,
                    dryChance: 0.4,
                    plotSize: 0.38,
                    randomSeed: true,
                },
                assets: [
                    { type: "image", key: "dry_soil", url: "/assets/games/Minigame3/Vicos/dry_soil.png" },
                    { type: "image", key: "soil_base", url: "/assets/games/Minigame3/Vicos/soil_base.png" },
                    { type: "image", key: "soil_wet1", url: "/assets/games/Minigame3/Vicos/soil_wet1.png" },
                    { type: "image", key: "icon_seed", url: "/assets/games/Minigame3/Vicos/icon_seed.png" },
                    { type: "image", key: "icon_water", url: "/assets/games/Minigame3/Vicos/icon_water.png" },
                    { type: "model", key: "plant_sprout", url: "/assets/games/Minigame3/Vicos/plant_sprout.glb" },
                ]
            },
            {
                id: "check",
                type: "check",
                panel: "check",
                params: {
                    spawnRadius: 1.2,
                    singlespeed: 0.02,
                },
                assets: [
                    { type: "image", key: "check_icon", url: "/assets/games/Minigame4/check_icon.png" },
                    { type: "image", key: "wrong_icon", url: "/assets/games/Minigame4/wrong_icon.png" },
                    { type: "image", key: "p1", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p2", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p3", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p4", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p5", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p6", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p7", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p8", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p9", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p10", url: "/assets/default/default2.jpg" },
                ]
            }
        ]
    },
    {
        id: "tambopata",
        name: "Corredor Ecoturístico Tambopata",
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
                    information:
                        "Destino amazónico cercano a Puerto Maldonado, al que se accede en pocos minutos desde la ciudad y con traslados que combinan tramos fluviales y caminatas por senderos húmedos. El clima es lluvioso y caluroso, con abundante presencia de mosquitos. La experiencia incluye guías locales, observación responsable de fauna, convivencia con comunidades amazónicas y actividades de aventura como zipline.",
                    correctos: ["ticket", "botas_caucho", "repelente", "poncho_impermeable"],
                    incorrectos: ["casaca", "bufanda", "guantes_trabajo", "bolsa_dormir"],
                    feedbacks: {
                        ticket: "Necesitarás un pase para el transporte fluvial.",
                        botas_caucho: "El terreno es húmedo y fangoso, las botas te serán útiles.",
                        repelente: "En la selva abundan mosquitos, protégete de ellos.",
                        poncho_impermeable: "Las lluvias son frecuentes, te conviene llevar protección."
                    }
                },
                assets: [
                    //mochila
                    { type: "model", key: "backpack", url: "/assets/games/Minigame2/backpack.glb" },

                    // Correctos
                    { type: "image", key: "ticket", url: "/assets/games/Minigame2/ticket.png" },
                    { type: "image", key: "botas_caucho", url: "/assets/games/Minigame2/botas_caucho.png" },
                    { type: "image", key: "repelente", url: "/assets/games/Minigame2/repelente.png" },
                    { type: "image", key: "poncho_impermeable", url: "/assets/games/Minigame2/poncho_impermeable.png" },

                    // Incorrectos
                    { type: "image", key: "casaca", url: "/assets/games/Minigame2/casaca.png" },
                    { type: "image", key: "bufanda", url: "/assets/games/Minigame2/bufanda.png" },
                    { type: "image", key: "guantes_trabajo", url: "/assets/games/Minigame2/guantes_trabajo.png" },
                    { type: "image", key: "bolsa_dormir", url: "/assets/games/Minigame2/bolsa_de_dormir.png" }
                ]
            },
            {
                id: "check",
                type: "check",
                panel: "check",
                params: {
                    spawnRadius: 1.2,
                    singlespeed: 0.02,
                },
                assets: [
                    { type: "image", key: "check_icon", url: "/assets/games/Minigame4/check_icon.png" },
                    { type: "image", key: "wrong_icon", url: "/assets/games/Minigame4/wrong_icon.png" },
                    { type: "image", key: "p1", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p2", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p3", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p4", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p5", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p6", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p7", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p8", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p9", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p10", url: "/assets/default/default2.jpg" },
                ]
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
                    information:
                        "Área natural cercana a Lima que se cubre de vegetación durante la temporada de lomas, usualmente entre agosto y diciembre, aunque puede variar según el clima de cada año. El ingreso es regulado por la comunidad y el recorrido implica senderos empinados, caminatas largas y fuerte radiación solar, lo que exige buena preparación física. La experiencia se complementa con guías locales y talleres ambientales que promueven la conservación del entorno.",
                    correctos: ["ticket", "calzado_trekking", "protector_solar", "termo_agua"],
                    incorrectos: ["botas_caucho", "poncho_impermeable", "bufanda", "casaca"],
                    feedbacks: {
                        ticket: "El ingreso requiere un boleto, no olvides llevarlo.",
                        calzado_trekking: "Los senderos son empinados, usa calzado firme.",
                        protector_solar: "El sol es intenso, protégelo con bloqueador y gorra.",
                        termo_agua: "Necesitarás mantenerte hidratado durante la caminata."
                    }
                },
                assets: [
                    //mochila
                    { type: "model", key: "backpack", url: "/assets/games/Minigame2/backpack.glb" },

                    // Correctos
                    { type: "image", key: "ticket", url: "/assets/games/Minigame2/ticket.png" },
                    { type: "image", key: "calzado_trekking", url: "/assets/games/Minigame2/calzado_trekking.png" },
                    { type: "image", key: "protector_solar", url: "/assets/games/Minigame2/protector_solar.png" },
                    { type: "image", key: "termo_agua", url: "/assets/games/Minigame2/termo_agua.png" },

                    // Incorrectos
                    { type: "image", key: "botas_caucho", url: "/assets/games/Minigame2/botas_caucho.png" },
                    { type: "image", key: "poncho_impermeable", url: "/assets/games/Minigame2/poncho_impermeable.png" },
                    { type: "image", key: "bufanda", url: "/assets/games/Minigame2/bufanda.png" },
                    { type: "image", key: "casaca", url: "/assets/games/Minigame2/casaca.png" }
                ]
            },
            {
                id: "check",
                type: "check",
                panel: "check",
                params: {
                    spawnRadius: 1.2,
                    singlespeed: 0.02,
                },
                assets: [
                    { type: "image", key: "check_icon", url: "/assets/games/Minigame4/check_icon.png" },
                    { type: "image", key: "wrong_icon", url: "/assets/games/Minigame4/wrong_icon.png" },
                    { type: "image", key: "p1", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p2", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p3", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p4", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p5", url: "/assets/default/default.jpg" },
                    { type: "image", key: "p6", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p7", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p8", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p9", url: "/assets/default/default2.jpg" },
                    { type: "image", key: "p10", url: "/assets/default/default2.jpg" },
                ]
            },

        ]
    }
]
