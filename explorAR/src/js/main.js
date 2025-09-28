const experiences = [
    { id: "taquile", name: "Taquile", image: "/assets/images/taquile_foto.jpg" },
    { id: "vicos", name: "Vicos", image: "/assets/images/vicos_foto.jpg" },
    { id: "tambopata", name: "Tambopata", image: "/assets/images/tambopata_foto.jpg" },
    { id: "lucumo", name: "Lomas de Lúcumo", image: "/assets/images/lomasLucumo_foto.jpg" },
]

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

// Renderizar cards en la grilla
function renderExperiences() {
    gridContainer.innerHTML = "";
    experiences.forEach((exp, index) => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.innerHTML = `
            <img src="${exp.image}" alt="${exp.name}">
            <div class="card-title">${exp.name}</div>
            `;
        card.addEventListener("click", () => showDetail(index));
        gridContainer.appendChild(card);
    });
}

// Mostrar detalle
function showDetail(index) {
    const exp = experiences[index];
    detailImage.src = exp.image;
    detailTitle.textContent = exp.name;

    experienceListScreen.classList.remove("active");
    experienceDetailScreen.classList.add("active");
}

// Volver atrás
btnBack.addEventListener("click", () => {
    experienceDetailScreen.classList.remove("active");
    experienceListScreen.classList.add("active");
});

// Inicializar
renderExperiences();