import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import {
    TSDocParser,
    TSDocConfiguration,
    DocNode,
    DocInlineTag,
    DocBlock
} from "@microsoft/tsdoc"
import { ApiModel } from "@microsoft/api-extractor-model"
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor"
import { MarkdownDocumenter } from "@microsoft/api-documenter/lib/documenters/MarkdownDocumenter.js"
import { TSDocConfigFile } from "@microsoft/tsdoc-config"
import { transform } from "@re-/tools"
import prettier from "prettier"
import { join, resolve } from "path"
import {
    readJson,
    writeJson,
    walkPaths,
    fileName,
    fromPackageRoot,
    findPackageRoot
} from "../index.js"
import { findPackageName } from "../ts.js"

export type GenerateDocsOptions = {
    packageRoots?: string[]
    outputRoot?: string
}

export const generateDocs = (options: GenerateDocsOptions = {}) => {
    const cwd = process.cwd()
    const packageRoots = options.packageRoots ?? [findPackageRoot(cwd)]
    const docsOutputDir = options.outputRoot ?? join(cwd, "docs")
    const tempDir = mkdtempSync("reDoc")
    console.group(
        `reDoc: Generating docs for ${packageRoots.length} package(s)...✍️`
    )
    try {
        // Keep track of the JSON files representing the API for each package root
        const apiFiles: string[] = []
        // Keep track of transformations across packages
        const transformations: Transformation[] = []
        packageRoots.forEach((root) => {
            console.group(`Extracting your API from ${root}...`)
            const ctx = loadContext(root, tempDir)
            const api = getApi(ctx)
            transformations.push(...transformApiData(api, ctx))
            writeJson(ctx.apiExtractorOutputPath, api.root)
            apiFiles.push(ctx.apiExtractorOutputPath)
            console.groupEnd()
        })

        console.log(`Creating markdown docs for your APIs...`)
        const docsCtx: DocsContext = {
            apiFiles,
            docsOutputDir,
            transformations
        }
        writeMarkdown(docsCtx)
        transformMarkdown(docsCtx)
    } finally {
        cleanup(tempDir)
    }
    console.log(`reDoc: Enjoy your new docs at ${docsOutputDir}! 📚`)
    console.groupEnd()
}

type PackageContext = ReturnType<typeof loadContext>

type ApiData = ReturnType<typeof getApi>

const loadContext = (packageRoot: string, tempDir: string) => {
    const packageSpecifier = findPackageName(packageRoot)
    // In case the package is scoped to an org (e.g. "@re-/node"), extract the portion following "/"
    const packageName = packageSpecifier.split("/").slice(-1)[0]

    const tsDocConfigPath = fromPackageRoot("tsdoc.json")

    const apiExtractorConfigPath = resolve(
        tempDir,
        `${packageName}-api-extractor.json`
    )
    const apiExtractorOutputPath = resolve(tempDir, `${packageName}.api.json`)
    writeJson(
        apiExtractorConfigPath,
        createApiExtractorConfig(packageRoot, apiExtractorOutputPath)
    )

    const tsDocConfiguration = new TSDocConfiguration()
    const tsDocLoadedConfiguration = TSDocConfigFile.loadFile(tsDocConfigPath)
    tsDocLoadedConfiguration.configureParser(tsDocConfiguration)
    const tsDocParser = new TSDocParser(tsDocConfiguration)
    return {
        packageRoot,
        packageSpecifier,
        packageName,
        tsDocConfigPath,
        tsDocLoadedConfiguration,
        apiExtractorConfigPath,
        apiExtractorOutputPath,
        tsDocParser,
        tempDir
    }
}

const cleanup = (tempDir: string) => {
    rmSync(tempDir, { recursive: true, force: true })
}

const getApi = ({
    apiExtractorConfigPath,
    apiExtractorOutputPath,
    tsDocLoadedConfiguration,
    packageRoot,
    packageName
}: PackageContext) => {
    const extractorConfig = ExtractorConfig.prepare({
        configObject: ExtractorConfig.loadFile(apiExtractorConfigPath),
        tsdocConfigFile: tsDocLoadedConfiguration,
        packageJsonFullPath: join(packageRoot, "package.json"),
        configObjectFullPath: undefined
    })
    const result = Extractor.invoke(extractorConfig)
    // if (!result.succeeded) {
    //     throw new Error(
    //         `API extractor failed with errors that are hopefully above this one.`
    //     )
    // }
    const root = readJson(apiExtractorOutputPath)
    const getMembers = () => {
        const members = root.members?.[0]?.members
        if (!Array.isArray(members)) {
            throw new Error(
                `Unable to determine the API from members of ${packageName}.`
            )
        }
        return members
    }
    const setMembers = (value: any[]) => {
        // Check to make sure the data is of the expected shape
        getMembers()
        root.members[0].members = value
    }
    return {
        root,
        getMembers,
        setMembers,
        references: transform(getMembers(), ([i, member]) => [
            member.name,
            member.canonicalReference
        ]) as Record<string, string>
    }
}

type TransformationKind = "toFunction"

type Transformation = {
    name: string
    packageName: string
    kind: TransformationKind
}

//** Transforms api by mutating its members */
const transformApiData = (api: ApiData, ctx: PackageContext) => {
    const transformations: Transformation[] = []
    const members = api.getMembers().map((member) => {
        const memberData = {
            name: member.name,
            packageName: ctx.packageName
        }
        // Treat non-functional values with @param tags like functions
        if (
            member.kind !== "Function" &&
            member.docComment?.includes("@param")
        ) {
            transformations.push({ ...memberData, kind: "toFunction" })
            return transformVariableToFunction(member, api, ctx)
        }
        return member
    })
    api.root.members[0].members = members
    return transformations
}

const transformVariableToFunction = (
    member: any,
    api: ApiData,
    { tsDocParser }: PackageContext
) => {
    const { docComment, log } = tsDocParser.parseString(member.docComment)
    if (log.messages.length) {
        throw new Error(log.messages[0].text)
    }
    const returnTypeName = typeOfBlock(docComment.returnsBlock)
    // Store the @as type of return, and then parameters in sequential order
    const typeNames = [returnTypeName]
    const parameters = docComment.params.blocks.map((param, index) => {
        let paramTypeName = typeOfBlock(param)
        let isOptional = false
        if (paramTypeName.endsWith("?")) {
            paramTypeName = paramTypeName.slice(0, -1)
            isOptional = true
        }
        typeNames.push(paramTypeName)
        return {
            parameterName: param.parameterName,
            parameterTypeTokenRange: {
                startIndex: index + 1,
                endIndex: index + 2
            },
            isOptional
        }
    })
    // Use excerptTokens to store @as types of return and parameters
    // That way, we can force api-documenter to use them to populate type information
    const excerptTokens = typeNames.map((name) => {
        // If the type is part of our API, add a link
        if (name in api.references) {
            return {
                kind: "Reference",
                text: name,
                canonicalReference: api.references[name]
            }
        }
        // Otherwise it should be a built-in type like "string", so just return it as a text value
        return {
            kind: "Content",
            text: name
        }
    })
    return {
        ...member,
        kind: "Function",
        overloadIndex: 1,
        returnTypeTokenRange: {
            startIndex: 0,
            endIndex: 1
        },
        parameters,
        excerptTokens
    }
}

const typeOfBlock = (block: DocBlock | undefined) => {
    const nodes = block?.content.nodes?.[0].getChildNodes()
    const asNode = nodes?.find(
        (node: DocNode | DocInlineTag) =>
            "tagName" in node && node.tagName === "@as"
    ) as DocInlineTag | undefined
    return asNode?.tagContent ?? ""
}

type DocsContext = {
    apiFiles: string[]
    docsOutputDir: string
    transformations: Transformation[]
}

const writeMarkdown = ({ apiFiles, docsOutputDir }: DocsContext) => {
    const apiModel = new ApiModel()
    apiFiles.forEach((path) => apiModel.loadPackage(path))
    const documenter = new MarkdownDocumenter({
        apiModel,
        outputFolder: docsOutputDir,
        documenterConfig: undefined
    })
    documenter.generateFiles()
}

const transformMarkdown = ({ docsOutputDir, transformations }: DocsContext) => {
    const transformationsByPath = transform(transformations, ([i, data]) => [
        join(
            docsOutputDir,
            `${data.packageName}.${data.name}.md`.toLowerCase()
        ),
        data
    ])
    const prettierOptions = {
        ...prettier.resolveConfig.sync(fileName()),
        parser: "markdown"
    }
    walkPaths(docsOutputDir, { excludeDirs: true }).forEach((path) => {
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

const createApiExtractorConfig = (
    projectFolder: string,
    apiJsonFilePath: string
) => ({
    $schema:
        "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
    projectFolder,
    mainEntryPointFilePath: `${projectFolder}/out/types/index.d.ts`,
    apiReport: {
        enabled: false
    },
    docModel: {
        enabled: true,
        apiJsonFilePath
    },
    dtsRollup: {
        enabled: false
    },
    tsdocMetadata: {
        enabled: false
    }
})
