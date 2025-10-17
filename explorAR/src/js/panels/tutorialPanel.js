export const TutorialPanel = {
    id: "tutorial",
    template({ title, description, imageUrl, buttonText = "Listo" }) {
        return `
        <div class="panel panel-fullscreen panel-tutorial">
            <h2 class="tutorial-title">${title}</h2>
            <p class="tutorial-desc">${description}</p>
            <div class="tutorial-image">
            <img src="${imageUrl}" 
                alt="tutorial"
                onerror="console.error('[TutorialPanel] No se pudo cargar la imagen:', this.src); this.style.display='none';" />
            </div>
            <button id="btn-start">${buttonText}</button>
        </div>
        `;
    },
    mount(root, actions = {}) {
        root.querySelector("#btn-start")?.addEventListener("click", actions.onStart);
    },
    unmount(root) {
        // No hay listeners adicionales, pero aquí podrías limpiar si se agrega algo más
    },
};
