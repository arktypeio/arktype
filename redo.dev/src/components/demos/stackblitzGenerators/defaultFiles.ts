import html from "raw-loader!/stackblitz/index.html"
import populateDemo from "raw-loader!/stackblitz/populateDemo.ts"
import css from "!!raw-loader!/stackblitz/demo.css"

const tsConfig = {
    compilerOptions: {
        module: "esnext",
        target: "esnext",
        strict: true
    }
}

export const defaultFiles = {
    "index.html": html,
    "demo.css": css,
    "populateDemo.ts": populateDemo,
    "tsconfig.json": JSON.stringify(tsConfig, null, 4)
}
