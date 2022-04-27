import { readFileSync, writeFileSync } from "fs"
import { ApiModel } from "@microsoft/api-extractor-model"
import { MarkdownDocumenter } from "@microsoft/api-documenter/lib/documenters/MarkdownDocumenter.js"
import { transform } from "@re-/tools"
import prettier from "prettier"
import { join } from "path"
import { walkPaths, fileName } from "../../index.js"
import { PackageData, TransformationData } from "../analysis/index.js"
import { ReDocContext } from "../reDoc.js"

export const generateDocs = (packages: PackageData[], ctx: ReDocContext) => {
    console.log(`Creating markdown docs for your APIs...`)
    writeMarkdown(packages, ctx)
    transformMarkdown(packages, ctx)
}

const writeMarkdown = (packages: PackageData[], ctx: ReDocContext) => {
    const apiModel = new ApiModel()
    packages.forEach((pkg) =>
        apiModel.loadPackage(pkg.ctx.apiExtractorOutputPath)
    )
    const documenter = new MarkdownDocumenter({
        apiModel,
        outputFolder: ctx.baseOutputDir,
        documenterConfig: undefined
    })
    documenter.generateFiles()
}

const transformMarkdown = (
    packages: PackageData[],
    { baseOutputDir }: ReDocContext
) => {
    const transformationsByPath = packages.reduce((result, pkg) => {
        return {
            ...result,
            ...transform(pkg.transformations, ([name, transformation]) => [
                join(
                    baseOutputDir,
                    `${pkg.ctx.packageName}.${name}.md`.toLowerCase()
                ),
                transformation
            ])
        }
    }, {} as Record<string, TransformationData>)
    const prettierOptions = {
        ...prettier.resolveConfig.sync(fileName()),
        parser: "markdown"
    }
    walkPaths(baseOutputDir, { excludeDirs: true }).forEach((path) => {
        let contents = readFileSync(path).toString()
        if (path in transformationsByPath) {
            if (transformationsByPath[path].kind === "toFunction") {
                // The signature for variable funtions is garbage, so remove it
                contents = contents.replace(/<b>Signature(\s|\S)*(?=##)/, "")
            } else {
                throw new Error(
                    `Unknown transformation kind '${transformationsByPath[path].kind}'.`
                )
            }
            delete transformationsByPath[path]
        }
        // Remove html-style comments from api-documenter
        contents = contents.replace(/<!--[\s\S]*?-->/g, "")
        contents = prettier.format(contents, prettierOptions)
        writeFileSync(path, contents)
    })
    if (Object.keys(transformationsByPath).length) {
        throw new Error(
            `Unable to find docs corresponding to the following modified paths:\n${Object.keys(
                transformationsByPath
            ).join("\n")}`
        )
    }
}
