const e={id:"tutorial",template({title:t,description:a,imageUrl:r,buttonText:l="Listo"}){return`
        <div class="panel panel-fullscreen panel-tutorial">
            <h2 class="tutorial-title">${t}</h2>
            <p class="tutorial-desc">${a}</p>
            <div class="tutorial-image">
            <img src="${r}" 
                alt="tutorial"
                onerror="console.error('[TutorialPanel] No se pudo cargar la imagen:', this.src); this.style.display='none';" />
            </div>
            <button id="btn-start">${l}</button>
        </div>
        `},mount(t,a={}){t.querySelector("#btn-start")?.addEventListener("click",a.onStart)},unmount(t){}};export{e as TutorialPanel};
