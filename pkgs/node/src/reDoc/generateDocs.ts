import { readFileSync, writeFileSync } from "fs"
import {
    TSDocParser,
    TSDocConfiguration,
    DocNode,
    DocInlineTag,
    DocBlock
} from "@microsoft/tsdoc"
import { ApiModel } from "@microsoft/api-extractor-model"
import { Extractor } from "@microsoft/api-extractor"
import { MarkdownDocumenter } from "@microsoft/api-documenter/lib/documenters/MarkdownDocumenter.js"
import { TSDocConfigFile } from "@microsoft/tsdoc-config"
import { transform } from "@re-/tools"
import prettier from "prettier"
import { join } from "path"
import { tmpdir } from "os"
import {
    readJson,
    writeJson,
    fromHere,
    walkPaths,
    fileName,
    fromPackageRoot,
    fromCwd,
    findPackageRoot
} from "../index.js"
import { findPackageName } from "../ts.js"

export type GenerateDocsOptions = {
    dir?: string
}

export const generateDocs = ({ dir }: GenerateDocsOptions = {}) => {
    const ctx = loadContext(dir ?? process.cwd())
    const api = getApi(ctx)
    transformApiData(api, ctx)
    writeJson(ctx.apiExtractorOutputPath, api.root)
    writeMarkdown(ctx)
    transformMarkdown(ctx)
}

type Api = {
    root: any
    members: any[]
    references: Record<string, string>
}

type ApiContext = ReturnType<typeof loadContext>

const loadContext = (dir: string) => {
    const packageRoot = findPackageRoot(dir)
    const packageName = findPackageName(packageRoot)
    const docsOutputDir = join(packageRoot, "docs")

    const tsDocConfigPath = fromPackageRoot("tsdoc.json")

    const apiExtractorConfigPath = join(tmpdir(), "api-extractor.json")
    const apiExtractorOutputPath = fromHere(`${packageName}.api.json`)

    const tsDocConfiguration = new TSDocConfiguration()
    TSDocConfigFile.loadFile(tsDocConfigPath).configureParser(
        tsDocConfiguration
    )
    const tsDocParser = new TSDocParser(tsDocConfiguration)

    // Keep track of the names of items we modify so we can access the files later
    const modifiedNames: string[] = []
    return {
        packageRoot,
        packageName,
        tsDocConfigPath,
        apiExtractorConfigPath,
        apiExtractorOutputPath,
        docsOutputDir,
        modifiedNames,
        tsDocParser
    }
}

const getApi = ({
    apiExtractorConfigPath,
    apiExtractorOutputPath
}: ApiContext): Api => {
    const result = Extractor.loadConfigAndInvoke(apiExtractorConfigPath)
    // if (!result.succeeded) {
    //     throw new Error(
    //         `API extractor failed with errors that are hopefully above this one.`
    //     )
    // }
    const data = readJson(apiExtractorOutputPath)
    const entryPoint = data.members[0]
    const members = entryPoint.members as any[]
    return {
        root: data,
        members,
        references: transform(members, ([i, member]) => [
            member.name,
            member.canonicalReference
        ])
    }
}

//** Transforms api by mutating its members */
const transformApiData = (api: Api, ctx: ApiContext) => {
    const transformedMembers = api.members.map((member) => {
        // Treat variables with @param tags like functions
        if (
            member.kind === "Variable" &&
            member.docComment?.includes("@param")
        ) {
            return transformVariableToFunction(member, api, ctx)
        }
        return member
    })
    api.members = transformedMembers
    api.root.members[0].members = transformedMembers
}

const transformVariableToFunction = (
    member: any,
    api: Api,
    { tsDocParser, modifiedNames }: ApiContext
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
    modifiedNames.push(member.name)
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

const writeMarkdown = ({ apiExtractorOutputPath }: ApiContext) => {
    const apiModel = new ApiModel()
    apiModel.loadPackage(apiExtractorOutputPath)
    const documenter = new MarkdownDocumenter({
        apiModel,
        outputFolder: "docs",
        documenterConfig: undefined
    })
    documenter.generateFiles()
}

const transformMarkdown = ({ docsOutputDir, modifiedNames }: ApiContext) => {
    const remainingModifiedPaths = modifiedNames.map((name) =>
        join(docsOutputDir, `model.${name}.md`)
    )
    const prettierOptions = {
        ...prettier.resolveConfig.sync(fileName()),
        parser: "markdown"
    }
    walkPaths(docsOutputDir, { excludeDirs: true }).forEach((path) => {
        let contents = readFileSync(path).toString()
        const modifiedPathIndex = remainingModifiedPaths.findIndex(
            (_) => _ === path
        )
        if (modifiedPathIndex !== -1) {
            // The signature for variable funtions is garbage, so remove it
            contents = contents.replace(/<b>Signature(\s|\S)*(?=##)/, "")
            remainingModifiedPaths.splice(modifiedPathIndex, 1)
        }
        contents = prettier.format(contents, prettierOptions)
        writeFileSync(path, contents)
    })
    if (remainingModifiedPaths.length) {
        throw new Error(
            `Unable to find docs corresponding to the following modified paths:\n${remainingModifiedPaths.join(
                "\n"
            )}`
        )
    }
}
