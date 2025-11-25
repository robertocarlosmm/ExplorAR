let e=null,t=null;function o(){const n=document.getElementById("hud-topbar")||document.querySelector("#hud .topbar");n&&t!==null&&(n.style.display=t,t=null),e&&(e.classList.add("hidden"),setTimeout(()=>e?.remove(),180),e=null)}function i(n,d){o();const l=document.getElementById("hud-topbar")||document.querySelector("#hud .topbar");l&&(t=l.style.display||"",l.style.display="none"),e=document.createElement("section"),e.id="minigame2-info-panel",e.className="panel panel-fullscreen panel-info fade-in",e.innerHTML=`
    <div class="panel-text">
      <h2>${n?.name??"Destino desconocido"}</h2>
      <p>${n?.description??"Descripción no disponible."}</p>
      <button id="btn-ready-m2" class="btn-primary">¡Listo!</button>
    </div>
  `,document.body.appendChild(e),e.style.zIndex="2147483647",e.querySelector("#btn-ready-m2").addEventListener("click",()=>{o(),d?.()})}const s={show:i,hide:o};export{s as Minigame2InfoPanel,o as hide,i as show};
