import { existsSync, readFileSync, writeFileSync } from "fs"
import {
    TSDocParser,
    TSDocConfiguration,
    DocNode,
    DocInlineTag
} from "@microsoft/tsdoc"
import { ApiModel } from "@microsoft/api-extractor-model"
import { Extractor } from "@microsoft/api-extractor"
import { DocumenterConfig } from "@microsoft/api-documenter/lib/documenters/DocumenterConfig.js"
import { MarkdownDocumenter } from "@microsoft/api-documenter/lib/documenters/MarkdownDocumenter.js"
import { TSDocConfigFile } from "@microsoft/tsdoc-config"
import {
    readJson,
    writeJson,
    fromHere,
    shell,
    walkPaths,
    fileName
} from "@re-/node"
import { transform } from "@re-/tools"
import prettier from "prettier"
import { join } from "path"

const apiExtractorConfigPath = fromHere("api-extractor.json")
const apiDocumenterConfigPath = fromHere("api-documenter.json")
const tsDocConfigPath = fromHere("..", "tsdoc.json")
const apiExtractorOutputPath = fromHere("model.api.json")
const docsOutputDir = fromHere("..", "docs")

const tsDocConfiguration = new TSDocConfiguration()
TSDocConfigFile.loadFile(tsDocConfigPath).configureParser(tsDocConfiguration)
const tsDocParser = new TSDocParser(tsDocConfiguration)

// Keep track of the names of items we modify so we can access the files later
const modifiedNames: string[] = []

const generateDocs = () => {
    const api = getApi()
    transformApiData(api)
    writeJson(apiExtractorOutputPath, api.root)
    writeMarkdown()
    transformMarkdown()
}

type ApiData = {
    root: any
    members: any[]
    references: Record<string, string>
}

const getApi = (): ApiData => {
    const result = Extractor.loadConfigAndInvoke(apiExtractorConfigPath)
    // if (!result.succeeded) {
    //     throw new Error(
    //         `API extractor failed with errors that are hopefully above this one.`
    //     )
    // }
    const root = readJson(apiExtractorOutputPath)
    const entryPoint = root.members[0]
    const members = entryPoint.members as any[]
    return {
        root,
        members,
        references: transform(members, ([i, member]) => [
            member.name,
            member.canonicalReference
        ])
    }
}

//** Transforms api by mutating its members */
const transformApiData = (api: ApiData) => {
    const transformedMembers = api.members.map((member) => {
        // Treat variables with @param tags like functions
        if (
            member.kind === "Variable" &&
            member.docComment?.includes("@param")
        ) {
            return transformVariableToFunction(member, api)
        }
        return member
    })
    api.members = transformedMembers
    api.root.members[0].members = transformedMembers
}

const transformVariableToFunction = (member: any, api: ApiData) => {
    const { docComment, log } = tsDocParser.parseString(member.docComment)
    if (log.messages.length) {
        throw new Error(log.messages[0].text)
    }
    const returnTypeName = getCastType(
        docComment.returnsBlock.content.nodes[0].getChildNodes()
    )
    // Store the @as type of return, and then parameters in sequential order
    const typeNames = [returnTypeName]
    const parameters = docComment.params.blocks.map((param, index) => {
        let paramTypeName = getCastType(param.content.nodes[0].getChildNodes())
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

const getCastType = (nodes: readonly (DocNode | DocInlineTag)[]) => {
    const asNode = nodes.find(
        (node: DocNode | DocInlineTag, index) =>
            "tagName" in node && node.tagName === "@as"
    ) as DocInlineTag | undefined
    return asNode?.tagContent ?? ""
}

const writeMarkdown = () => {
    const apiModel = new ApiModel()
    apiModel.loadPackage(apiExtractorOutputPath)
    const documenter = new MarkdownDocumenter({
        apiModel,
        outputFolder: "docs",
        documenterConfig: DocumenterConfig.loadFile(apiDocumenterConfigPath)
    })
    documenter.generateFiles()
}

const transformMarkdown = () => {
    const remainingModifiedPaths = modifiedNames.map((name) =>
        join(docsOutputDir, `model.${name}.md`)
    )
    const prettierOptions = {
        ...prettier.resolveConfig.sync(fileName()),
        parser: "markdown"
    }
    walkPaths(docsOutputDir, { excludeDirs: true }).forEach((path) => {
        let contents = readFileSync(path).toString()
        if (remainingModifiedPaths.includes(path)) {
            // The signature for variable funtions is garbage, so remove it
            contents = contents.replace(/<b>Signature(\s|\S)*(?=##)/, "")
        }
        contents = prettier.format(contents, prettierOptions)
        writeFileSync(path, contents)
    })
}
// This file is used as a script, so run the main function
generateDocs()
