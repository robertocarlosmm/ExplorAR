import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig(({ mode }) => {
    const isProd = mode === 'production'

    return {
        base: '/ExplorAR/',   // <- en dev = '/', en build = '/explorAR/'
        plugins: [mkcert()],
        server: {
            https: true,
            host: true,
        },
    }
})
