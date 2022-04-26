import { existsSync, readFileSync, writeFileSync } from "fs"
import {
    TSDocParser,
    TSDocConfiguration,
    DocNode,
    DocInlineTag
} from "@microsoft/tsdoc"
import { ApiModel } from "@microsoft/api-extractor-model"
import { Extractor, ExtractorResult } from "@microsoft/api-extractor"
import { DocumenterConfig } from "@microsoft/api-documenter/lib/documenters/DocumenterConfig.js"
import { MarkdownDocumenter } from "@microsoft/api-documenter/lib/documenters/MarkdownDocumenter.js"
import { TSDocConfigFile } from "@microsoft/tsdoc-config"
import { readJson, writeJson } from "@re-/node"
import { transform } from "@re-/tools"

// Invoke API Extractor
const extractorResult: ExtractorResult =
    Extractor.loadConfigAndInvoke("api-extractor.json")

const tsDocConfiguration = new TSDocConfiguration()
TSDocConfigFile.loadFile("tsdoc.json").configureParser(tsDocConfiguration)
const tsDocParser = new TSDocParser(tsDocConfiguration)

const apiJson = readJson("temp/model.api.json")
// Keep track of the names we modify so we can access the files later
const variableFunctions: string[] = []

const exportReferences = transform(
    apiJson.members[0].members,
    ([i, member]) => [member.name, member.canonicalReference]
)

for (const item of apiJson.members[0].members) {
    // If ApiItem is classified as variable but includes @param references,
    // treat it as a function.
    if (item.kind === "Variable" && item.docComment?.includes("@param")) {
        const { docComment, log } = tsDocParser.parseString(item.docComment)
        if (log.messages.length) {
            throw new Error(log.messages[0].text)
        }
        variableFunctions.push(item.name)
        item.kind = "Function"
        item.overloadIndex = 1
        item.returnTypeTokenRange = {
            startIndex: 0,
            endIndex: 1
        }
        const getCastType = (nodes: readonly (DocNode | DocInlineTag)[]) => {
            const asNode = nodes.find(
                (node: DocNode | DocInlineTag, index) =>
                    "tagName" in node && node.tagName === "@as"
            ) as DocInlineTag | undefined
            return asNode?.tagContent ?? ""
        }
        const returnTypeName = getCastType(
            docComment.returnsBlock.content.nodes[0].getChildNodes()
        )
        const typeNames = [returnTypeName]
        item.parameters = docComment.params.blocks.map((param, index) => {
            let paramTypeName = getCastType(
                param.content.nodes[0].getChildNodes()
            )
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
        item.excerptTokens = typeNames.map((name) => {
            if (name in exportReferences) {
                return {
                    kind: "Reference",
                    text: name,
                    canonicalReference: exportReferences[name]
                }
            }
            return {
                kind: "Content",
                text: name
            }
        })
    }
}

writeJson("temp/model.api.json", apiJson)

const apiModel = new ApiModel()
apiModel.loadPackage("temp/model.api.json")

const documenter = new MarkdownDocumenter({
    apiModel,
    outputFolder: "docs",
    documenterConfig: DocumenterConfig.loadFile("api-documenter.json")
})

documenter.generateFiles()

variableFunctions.forEach((name) => {
    const expectedPath = `docs/model.${name}.md`
    if (!existsSync(expectedPath)) {
        throw new Error(
            `Unable to locate the output file for variable function '${name}'.`
        )
    }
    const contents = readFileSync(expectedPath).toString()
    const contentsWithoutSignature = contents.replace(
        /<b>Signature(\s|\S)*(?=##)/,
        ""
    )
    writeFileSync(expectedPath, contentsWithoutSignature)
})
