import { defineConfig } from "vite"

// eslint-disable-next-line import/no-default-export
export default defineConfig({
    build: {
        outDir: "out",
        sourcemap: true,
        lib: {
            entry: "src/index.ts",
            formats: ["es"]
        }
    }
})
