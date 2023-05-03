import { configDefaults, defineConfig } from "vitest/config"
import { fromHere } from "../attest/main.js"

export default defineConfig({
    test: {
        globalSetup: fromHere("vitestSetup.ts"),
        exclude: [...configDefaults.exclude, "**/attest/**"]
    }
})
