import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
    base: '/explorAR/',  
    plugins: [mkcert()],
    server: {
        https: true,
        host: true,                       // expone en la red local
    }
})