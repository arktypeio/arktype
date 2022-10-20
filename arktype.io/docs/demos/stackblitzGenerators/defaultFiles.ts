import demoCssText from "../static/demoCss"
import indexHtml from "../static/indexHtml"
import populateDemoTsText from "../static/populateDemo"

const tsConfig = {
    compilerOptions: {
        module: "esnext",
        target: "esnext",
        strict: true
    }
}

export const defaultStaticFiles = {
    "index.html": indexHtml,
    "demo.css": demoCssText,
    "populateDemo.ts": populateDemoTsText,
    "tsconfig.json": JSON.stringify(tsConfig, null, 4)
}
