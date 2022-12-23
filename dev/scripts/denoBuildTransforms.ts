import { fromPackageRoot, readJson } from "../runtime/fs.ts"

export const denoTransformations = (contents: string) => {
    let transformedContents = contents.replaceAll(".ts", ".ts")
    const nodeModuleImportsRegex = /import .+ from "[^.].*"/gm
    const nodeModuleImports = transformedContents.matchAll(
        nodeModuleImportsRegex
    )

    for (const nodeModuleImport of nodeModuleImports) {
        const nodeImports = contents.matchAll(/node:\w+/g) ?? []
        for (const matchedExpressions of nodeImports) {
            const matchedExpression = matchedExpressions[0]
            const extractedNodeName = matchedExpression.split(":")[1]
            transformedContents = transformedContents.replaceAll(
                matchedExpression,
                denoImportTemplate(extractedNodeName)
            )
        }

        const importName = nodeModuleImport[0]
            .split(" ")
            .slice(-1)[0]
            .replaceAll(/"|'|`/g, "")

        transformedContents = replaceImports(
            transformedContents,
            importName,
            nodeModuleImport[0]
        )
    }

    return transformedContents
}

const mochaTest = `import {describe,it as test} from "https://deno.land/std@0.166.0/testing/bdd.ts"`

const denoImportTemplate = (nodeName: string) => {
    return `https://deno.land/std@0.166.0/node/${nodeName}.ts`
}

const devDependencies = readJson(fromPackageRoot("package.json"))[
    "devDependencies"
]

const replaceImports = (
    contents: string,
    moduleImport: string,
    nodeImport: string
) => {
    const moduleDependencyVersion = devDependencies[moduleImport]

    if (moduleImport === "ts-morph") {
        contents = contents.replaceAll(
            "ts-morph",
            `https://deno.land/x/ts_morph@${moduleDependencyVersion}/mod.ts`
        )
    }
    if (moduleImport === "mocha") {
        contents = contents.replaceAll(nodeImport, mochaTest)
    }
    if (moduleDependencyVersion !== undefined) {
        const transformedModule = `npm:${moduleImport}@${moduleDependencyVersion}`
        contents = contents.replaceAll(moduleImport, transformedModule)
    }
    return contents
}
