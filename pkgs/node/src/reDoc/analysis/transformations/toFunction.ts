import { DocNode, DocInlineTag, DocBlock } from "@microsoft/tsdoc"
import { ReDocContext } from "../../reDoc.js"
import { PackageApi } from "../getPackageApi.js"
import { PackageContext } from "../getPackageContext.js"

export const transformToFunction = (
    member: any,
    api: PackageApi,
    ctx: PackageContext,
    { tsDocParser }: ReDocContext
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
