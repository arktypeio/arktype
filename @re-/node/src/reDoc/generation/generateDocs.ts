import { readFileSync, rmSync, writeFileSync } from "fs"
import { ApiModel } from "@microsoft/api-extractor-model"
import { MarkdownDocumenter } from "@microsoft/api-documenter/lib/documenters/MarkdownDocumenter.js"
import prettier from "prettier"
import { basename, join } from "path"
import { walkPaths, fileName, ensureDir } from "../../index.js"
import { PackageData } from "../analysis/index.js"
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

type QualifiedMember = {
    packageName: string
    memberName: string
}

const extractNamesFromDocPath = (docPath: string): QualifiedMember => {
    const parts = basename(docPath).split(".")
    if (parts[0] === "index") {
        // "index.md" is the only generated file with no associated package
        return {
            packageName: "",
            memberName: "index"
        }
    }
    // The first part will always be the package name
    const packageName = parts[0]
    if (parts.length === 3) {
        // Like most docs, e.g. `model.create.md`
        return {
            packageName,
            memberName: parts[1]
        }
    } else if (parts.length === 2) {
        // Root package doc, e.g. `model.md`
        return {
            packageName,
            memberName: ""
        }
    } else {
        throw new Error(
            `Unable to rewrite imports for unexpected doc path '${docPath}'.`
        )
    }
}

const transformMarkdown = (
    packages: PackageData[],
    { baseOutputDir, rewriteExternalImports, excludeIndexMd }: ReDocContext
) => {
    const prettierOptions = {
        ...prettier.resolveConfig.sync(fileName()),
        parser: "markdown"
    }
    walkPaths(baseOutputDir, { excludeDirs: true }).forEach((currentPath) => {
        const { packageName, memberName } = extractNamesFromDocPath(currentPath)
        let outputPath = currentPath
        let contents = readFileSync(currentPath).toString()
        if (packageName) {
            // packageName will always be defined unless it's "index.md", in which case we skip these transformations
            const associatedPackageData = packages.find(
                (pkg) => pkg.ctx.packageName === packageName
            )
            if (!associatedPackageData) {
                throw new Error(
                    `Unable to determine the package associated with '${currentPath}'.`
                )
            }
            if (memberName in associatedPackageData.transformations) {
                const { kind } =
                    associatedPackageData.transformations[memberName]
                if (kind === "toFunction") {
                    // The signature for variable funtions is garbage, so remove it
                    contents = contents.replace(
                        /<b>Signature(\s|\S)*(?=##)/,
                        ""
                    )
                } else {
                    throw new Error(`Unknown transformation kind '${kind}'.`)
                }
            }
            if (rewriteExternalImports) {
                // Find relative links to markdown files enclosed in parentheses
                contents.replace(/\(\.\/.*?\.md\)/, (match) => {
                    // Extract the import by removing the parentheses
                    const importPath = match.slice(1, -1)
                    const {
                        packageName: importedPackageName,
                        memberName: importedMemberName
                    } = extractNamesFromDocPath(importPath)
                    if (packageName === importedPackageName) {
                        // If the import is internal, return it unmodified
                        return match
                    }
                    return rewriteExternalImports(
                        importedPackageName,
                        importedMemberName
                    )
                })
            }
            if (
                associatedPackageData.ctx.outputDir &&
                associatedPackageData.ctx.outputDir !== baseOutputDir
            ) {
                ensureDir(associatedPackageData.ctx.outputDir)
                outputPath = join(
                    associatedPackageData.ctx.outputDir,
                    basename(currentPath)
                )
                rmSync(currentPath)
            }
        } else if (excludeIndexMd) {
            // The only time packageName is undefined is index.md
            rmSync(currentPath)
            return
        }
        if (excludeIndexMd) {
            // By default, all files start with this reference to index.md, so just remove it directly
            contents = contents.replace("[Home](./index.md) &gt; ", "")
        }
        // Remove html-style comments from api-documenter
        contents = contents.replace(/<!--[\s\S]*?-->/g, "")
        contents = prettier.format(contents, prettierOptions)
        writeFileSync(outputPath, contents)
    })
}
