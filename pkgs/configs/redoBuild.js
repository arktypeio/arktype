#!/usr/bin/env node

import { basename, join } from "path"
import { rmSync } from "fs"
import { walkPaths, shellAsync } from "@re-do/node-utils"
import { createCompilerHost, createProgram } from "typescript"

const compile = (fileNames, options) => {
    // Create a Program with an in-memory emit
    const createdFiles = {}
    const host = createCompilerHost(options)
    host.writeFile = (fileName, contents) => (createdFiles[fileName] = contents)

    // Prepare and emit the d.ts files
    const program = createProgram(fileNames, options, host)
    program.emit()

    // Loop through all the input files
    fileNames.forEach((file) => {
        console.log("### JavaScript\n")
        console.log(host.readFile(file))

        console.log("### Type Definition\n")
        const dts = file.replace(".js", ".d.ts")
        console.log(createdFiles[dts])
    })
}
// // Run the compiler
// compile(process.argv.slice(2), {
//     allowJs: true,
//     declaration: true,
//     emitDeclarationOnly: true
// })

compile(["./src/index.ts"], {
    allowJs: true,
    delcaration: true,
    emitDeclarationOnly: true
})

const cwd = process.cwd()
const pkg = basename(cwd)
const outDir = join(cwd, "out")
const tsc = join(cwd, "node_modules", ".bin", "tsc")

// const addTypeToPackageJson = (name) => {
//     const packageJsonPath = join(outDir, name, "package.json")
//     const existingContent = existsSync(packageJsonPath)
//         ? JSON.parse(readFileSync(packageJsonPath).toString())
//         : {}
//     writeFileSync(
//         packageJsonPath,
//         JSON.stringify(
//             {
//                 ...existingContent,
//                 type: name === "cjs" ? "commonjs" : "module"
//             },
//             null,
//             4
//         )
//     )
// }

const build = async () => {
    try {
        console.log(`redo-build🔨: Building ${pkg}...`)
        await shellAsync("tsc --module esnext --outDir out/esm")
        await shellAsync("tsc --module commonjs --outDir out/cjs")
        await shellAsync("tsc ")
        walkPaths(outDir)
            .filter(
                (path) =>
                    basename(path) === "__tests__" ||
                    basename(path).endsWith(".stories.tsx")
            )
            .forEach((path) => rmSync(path, { recursive: true, force: true }))
        console.log(`redo-build🔨: Finished building ${pkg}.`)
    } catch (e) {
        console.log(
            "redo-build🔨:❗️Build failed due to the following error:❗️"
        )
        console.log(e)
        process.exit(1)
    }
}

build()
