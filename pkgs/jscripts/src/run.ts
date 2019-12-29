import { readdirSync } from "fs-extra"
import { commandSync } from "execa"

const jscriptsConfigFile = readdirSync(process.cwd()).find(
    fileName => fileName === "jscripts.js" || fileName === "jscripts.ts"
)
if (!jscriptsConfigFile) {
    throw new Error(
        `Found no 'jscripts.js' or 'jscripts.ts' file in ${process.cwd()}.`
    )
}
const runner = jscriptsConfigFile === "jscripts.js" ? "node" : "npx ts-node"
commandSync(`${runner} ${jscriptsConfigFile}`)
process.argv0
