import { stringify } from "@re-do/utils"
import { stdout } from "process"
import ts from "typescript"

stdout.write("Validating types...")
const options = ts.parseJsonSourceFileConfigFileContent(
    ts.readJsonConfigFile("tsconfig.json", ts.sys.readFile),
    ts.sys,
    process.cwd()
).options

const files = ["src/__tests__/compile.test.ts"]

const program = ts.createProgram({
    rootNames: files,
    options
})
const errors = program
    .getSemanticDiagnostics()
    .concat(program.getSyntacticDiagnostics())
    .filter((e) => {
        return files.includes(e.file.fileName)
    })
    .map((e) => e.messageText)
console.log(stringify(errors))
stdout.write("✅\n")
