import { experiencesConfig } from "../config/experienceConfig.js"
import { Experience } from "./models/Experience.js"
import { startXR } from "../features/xrExperience.js";

// Generar catálogo dinámico
const experiences = experiencesConfig.map(cfg =>
    new Experience(cfg.id, cfg.name, cfg.image, cfg.modelPath || null, cfg.description, cfg.minigames || [])
)

// Elementos principales
const gridContainer = document.getElementById("grid-container");
const experienceListScreen = document.getElementById("experience-list");
const experienceDetailScreen = document.getElementById("experience-detail");

// Elementos de detalle
const detailImage = document.getElementById("detail-image");
const detailTitle = document.getElementById("detail-title");

// Botones
const btnContinue = document.getElementById("btn-continue");
const btnBack = document.getElementById("btn-back");

function renderExperiences() {
    gridContainer.innerHTML = "";
    experiences.forEach((exp, index) => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.innerHTML = `
            <img src="${exp.imagePath}" alt="${exp.name}">
            <div class="card-title">${exp.name}</div>
            `;
        card.addEventListener("click", () => showDetail(index));
        gridContainer.appendChild(card);
    });
}

function showDetail(index) {
    const exp = experiences[index];
    detailImage.src = exp.imagePath;
    detailTitle.textContent = exp.name;

    experienceListScreen.classList.remove("active");
    experienceDetailScreen.classList.add("active");
}

// Volver atrás
btnBack.addEventListener("click", () => {
    experienceDetailScreen.classList.remove("active");
    experienceListScreen.classList.add("active");
});

// botón continuar
/*btnContinue.addEventListener("click", () => {
    if (!game.currentExperience) return;
    startXR(game.currentExperience); // pasa la experiencia activa
});*/

// Inicializar
renderExperiences();