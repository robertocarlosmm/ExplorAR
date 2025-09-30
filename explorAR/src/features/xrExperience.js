import { Engine, Scene, Vector3, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";

export async function startXR(experience) {
    const canvas = document.querySelector("#canvas");
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    // Material genérico para el cubo
    const mat = new StandardMaterial("mat", scene);
    mat.diffuseColor = Color3.Teal();

    // Cubo genérico
    const box = MeshBuilder.CreateBox("box", { size: 0.2 }, scene);
    box.position = new Vector3(0, 0, 1); // 1 metro al frente
    box.material = mat;

    // Texto con el nombre de la experiencia
    const div = document.createElement("div");
    div.textContent = experience.name;
    div.style.position = "absolute";
    div.style.top = "20px";
    div.style.left = "50%";
    div.style.transform = "translateX(-50%)";
    div.style.fontSize = "24px";
    div.style.fontWeight = "bold";
    div.style.color = "white";
    document.body.appendChild(div);

    // Activar XR
    const xr = await scene.createDefaultXRExperienceAsync({
        uiOptions: {
            sessionMode: "immersive-ar",
            referenceSpaceType: "local-floor",
        },
        optionalFeatures: true,
    });

    engine.runRenderLoop(() => {
        scene.render();
    });
}
