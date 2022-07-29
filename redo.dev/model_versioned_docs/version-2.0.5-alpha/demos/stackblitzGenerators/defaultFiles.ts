import indexHtml from "raw-loader!../static/index.html"
import populateDemoTsText from "raw-loader!../static/populateDemo.ts"
import demoCssText from "!!raw-loader!../static/demo.css"

const tsConfig = {
    compilerOptions: {
        module: "esnext",
        target: "esnext",
        strict: true
    }
}

export const defaultFiles = {
    "index.html": indexHtml,
    "demo.css": demoCssText,
    "populateDemo.ts": populateDemoTsText,
    "tsconfig.json": JSON.stringify(tsConfig, null, 4)
}
