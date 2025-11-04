export const gameplayConfig = {
    // Reglas de puntuación por tipo de minijuego
    scoring: {
        puzzle3D: {
            base: 90,                   // puntaje fijo al completar
            perPiece: 10,               // bonus por pieza correctamente encajada
            timeBonusPerSec: 1,         // bonus por cada segundo sobrante
            pointsPenalty: 2,           // penalización por posición incorrecta
            timePenalty: 2,             // penalización por posición incorrecta
            dropPenalty: 0              // penalización al soltar fuera de lugar
        },
        // Aquí en el futuro puedes añadir más minijuegos:
        equipment: {
            base: 60,                   // puntaje fijo al completar
            timeBonusPerSec: 2,         // bonus por cada segundo sobrante
            dropPenalty: 0
        },
        m3Vicos: {
            base: 0,                    // No puntaje fijo inicial
            seedBonus: 10,              // Por germinación correcta
            waterBonus: 8,              // Por riego correcto
            overwaterPenalty: 5,        // Penalización leve
            wastedShotPenalty: 0,       // Sin penalizar lanzamientos fallidos
            timeBonusPerSec: 1,         // Bonus por tiempo sobrante
        },
        check: {
            base: 0,
            correctBonus: 10,
            wrongPenalty: 5,
            timeBonusPerSec: 1
        }
        // matching: { ... }
    },

// Configuración de tiempo por tipo de minijuego
timeSequence: [60, 60, 5, 40],

    // Thresholds globales para estrellas finales
    stars: {
    three: 3000,  // 3 estrellas si score total >= 3000
        two: 2000,    // 2 estrellas si score total >= 2000
            one: 1        // 1 estrella si score total >= 1
},

minigames: {
    minigame1: {
        tutorialTitle: "Descubre el lugar oculto",
            tutorialDesc: "Mueve las piezas para ver la imagen oculta",
                tutorialImage: "/assets/tutorial/minigame1Tutorial.png",
                    showInfoPanel: false, // Este NO usa panel de información
        },
    minigame2: {
        tutorialTitle: "Prepárate antes de viajar",
            tutorialDesc: "Elige bien tu equipamiento. Conoce el contexto para no olvidar nada.",
                tutorialImage: "/assets/tutorial/minigame2Tutorial.png",
                    showInfoPanel: true, // Este SÍ usa panel de información
        },
    minigame3: {
        tutorialTitle: "Título del minijuego 3",
            tutorialDesc: "Descripción...",
                tutorialImage: "/assets/tutorial/minigame3Tutorial.png",
                    showInfoPanel: false,
        },
    minigame4: {
        tutorialTitle: "Título del minijuego 4",
            tutorialDesc: "Descripción...",
                tutorialImage: "/assets/tutorial/minigame4Tutorial.png",
                    showInfoPanel: true,
        }
},

// Textos genéricos de interfaz (pueden reutilizarse en varios minijuegos)
uiText: {
    puzzle3D: {
        title: "Descubre el lugar oculto",
            startHint: "Mueve el dispositivo y toca para colocar el tablero.",
                success: "¡Puzzle completado!",
                    fail: "Se acabó el tiempo. Inténtalo de nuevo.",
                        retry: "Reintentar",
                            exit: "Salir"
    }
}
}
