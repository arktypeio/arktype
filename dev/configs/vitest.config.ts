import { configDefaults, defineConfig } from "vitest/config"
import { fromHere } from "../attest/main.js"

export default defineConfig({
    test: {
        watch: false,
        globalSetup: process.argv.includes("--skipTypes")
            ? []
            : [fromHere("vitestSetup.ts")],
        exclude: [...configDefaults.exclude, "**/attest/**"]
    }
})
