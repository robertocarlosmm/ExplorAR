// src/js/core/assetLoader.js
import { Texture } from "@babylonjs/core";

const _cache = new Map(); // url -> recurso ya cargado

export async function preloadAssets(scene, assets) {
    const result = { images: {}, textures: {}, audio: {}, models: {} };

    const tasks = (assets || []).map(async (a) => {
        if (!a?.type || !a?.key || !a?.url) return;

        // evita recargar misma URL
        if (_cache.has(a.url)) {
            const res = _cache.get(a.url);
            attach(result, a, res);
            return;
        }

        switch (a.type) {
            case "image":
            case "texture": {
                const tex = new Texture(a.url, scene, false, false);
                // espera a que esté lista (opcional pero útil)
                await new Promise((resolve, reject) => {
                    tex.onLoadObservable.addOnce(() => resolve());
                    tex.onErrorObservable.addOnce((_t, m, e) => reject(e || new Error(m)));
                });
                _cache.set(a.url, tex);
                attach(result, a, tex);
                break;
            }
            // case "audio": {/* TODO: BABYLON.Sound */}
            // case "model": {/* TODO: SceneLoader.ImportMeshAsync */}
            default:
                console.warn("Tipo de asset no soportado todavía:", a.type, a.url);
        }
    });

    await Promise.all(tasks);
    return result; // { textures: { [key]: Texture }, ... }
}

function attach(bucket, asset, resource) {
    if (asset.type === "image" || asset.type === "texture") {
        bucket.textures[asset.key] = resource;
    } else if (asset.type === "audio") {
        bucket.audio[asset.key] = resource;
    } else if (asset.type === "model") {
        bucket.models[asset.key] = resource;
    }
}
