import { fromPackageRoot, readJson } from "../runtime/fs.js"

// eslint-disable-next-line max-lines-per-function
export const denoTransformations = (contents: string) => {
    let transformedContents = contents.replaceAll(".js", ".ts")
    //Matching anything that isn't a path to a local file
    const nodeModuleImportsRegex = /import .+ from "[^.].*"/gm
    const nodeModuleImports = transformedContents.matchAll(
        nodeModuleImportsRegex
    )
    const devDependencies = readJson(fromPackageRoot("package.json"))[
        "devDependencies"
    ]

    for (const nodeModuleImport of nodeModuleImports) {
        const moduleImport = nodeModuleImport[0]
            .split(" ")
            .slice(-1)[0]
            .replaceAll(/"|'|`/g, "")

        const nodeImports = contents.matchAll(/node:\w+/g) ?? []
        for (const matchedExpressions of nodeImports) {
            const matchedExpression = matchedExpressions[0]
            const extractedNodeName = matchedExpression.split(":")[1]
            transformedContents = transformedContents.replaceAll(
                matchedExpression,
                denoImportTemplate(extractedNodeName)
            )
        }

        const moduleDependencyVersion = devDependencies[moduleImport]
        if (moduleImport === "ts-morph") {
            transformedContents = transformedContents.replaceAll(
                "ts-morph",
                `https://deno.land/x/ts_morph@${moduleDependencyVersion}/mod.ts`
            )
        }

        const mochaTest = `import {describe,it as test} from "https://deno.land/std@0.166.0/testing/bdd.ts"`
        if (moduleImport === "mocha") {
            transformedContents = transformedContents.replaceAll(
                nodeModuleImport[0],
                mochaTest
            )
        }
        if (moduleDependencyVersion !== undefined) {
            const transformedModule = `npm:${moduleImport}@${moduleDependencyVersion}`
            transformedContents = transformedContents.replaceAll(
                moduleImport,
                transformedModule
            )
        }
    }

    return transformedContents
}
const denoImportTemplate = (nodeName: string) => {
    return `https://deno.land/std@0.166.0/node/${nodeName}.ts`
}
