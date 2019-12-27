import { copySync } from "fs-extra"
import { join } from "path"

copySync(join(__dirname, "node_modules"), join(__dirname, ".build"), {
    dereference: true,
    filter: file => !file.indexOf(".vscode")
})
