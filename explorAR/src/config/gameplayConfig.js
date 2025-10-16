export const gameplayConfig = {
    // Reglas de puntuación por tipo de minijuego
    scoring: {
        puzzle3D: {
            base: 200,               // puntaje fijo al completar
            perPiece: 50,            // bonus por pieza correctamente encajada
            timeBonusPerSec: 2,      // bonus por cada segundo sobrante
            wrongRotationPenalty: 10,// penalización por rotación incorrecta
            dropPenalty: 0           // penalización al soltar fuera de lugar
        },
        // Aquí en el futuro puedes añadir más minijuegos:
        // trivia: { ... },
        // matching: { ... }
    },

    // Configuración de tiempo por tipo de minijuego
    timeSequence: [65, 45, 50, 40],

    // Thresholds globales para estrellas finales
    stars: {
        three: 3000,  // 3 estrellas si score total >= 3000
        two: 2000,    // 2 estrellas si score total >= 2000
        one: 1        // 1 estrella si score total >= 1
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
