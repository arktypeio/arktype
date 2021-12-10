import { SourcePosition } from "@re-do/node"
import { getAbsolutePositions, print, toString } from "@re-do/utils"
import { getTsContext, TsContext } from "./ts.js"
import ts from "typescript"

export type NodeFilter = (node: ts.Node) => boolean

export type NextTypeOptions = {
    positionOffset?: number
    returnsCount?: number
    findParentMatching?: NodeFilter
    nodeFilter?: NodeFilter
}

export const errorsOfNextType = (
    position: SourcePosition,
    options: NextTypeOptions = {}
) => {
    const context = getTsContext()
    return nextTypedNode(context, position, options).errors.join("\n")
}

export const nextTypeToString = (
    position: SourcePosition,
    options: NextTypeOptions = {}
) => {
    const context = getTsContext()
    const { type } = nextTypedNode(context, position, options)
    return context.ts.getTypeChecker().typeToString(type)
}

const nextTypedNode = (
    context: TsContext,
    { file, line, column }: SourcePosition,
    {
        positionOffset = 0,
        findParentMatching = () => true,
        returnsCount = 0,
        nodeFilter = () => true
    }: NextTypeOptions = {}
): { node: ts.Node; type: ts.Type; errors: string[] } => {
    const { ts, sources } = context
    if (!(file in sources)) {
        throw new Error(
            `File '${file}' was unexpected. Files in context are:\n\n${Object.keys(
                sources
            ).join("\n")}`
        )
    }
    const checker = ts.getTypeChecker()
    const errors: ts.Diagnostic[] = ts
        // @ts-ignore
        .getDiagnosticsProducingTypeChecker()
        .getDiagnostics()
    const errorsInFile = errors.filter((error) => error.file?.fileName === file)
    const afterPosition =
        getAbsolutePositions(sources[file], [{ line, column }])[0] +
        positionOffset
    const firstTypeAfter = (
        node: ts.Node
    ): { node: ts.Node; type: ts.Type; errors: string[] } | null => {
        if (node.getStart() > afterPosition) {
            while (!findParentMatching(node)) {
                node = node.parent
            }
            let nodeType = checker.getTypeAtLocation(node)
            const errorMessages = errorsInFile
                .filter(
                    (e) =>
                        (e.start ?? -1) >= node.getStart() &&
                        (e.start ?? -1) + (e.length ?? 0) <= node.getEnd()
                )
                .map((e) =>
                    typeof e.messageText === "string"
                        ? e.messageText
                        : e.messageText.messageText
                )
            if (
                // If intrinsic name is error but there are no corresponding
                // diagnostics, node should not have a type (e.g. something like "(")
                // so get the next match
                ((nodeType as any).intrinsicName !== "error" ||
                    errorMessages.length) &&
                nodeFilter(node)
            ) {
                while (returnsCount) {
                    const signatures = checker
                        .getTypeAtLocation(node)
                        .getCallSignatures()
                    if (!signatures.length) {
                        throw new Error(
                            `Cannot get return type of ${checker.typeToString(
                                nodeType
                            )}.`
                        )
                    }
                    nodeType = signatures[0].getReturnType()
                    returnsCount--
                }
                return { node, type: nodeType, errors: errorMessages }
            }
        }
        for (const child of node.getChildren()) {
            if (child.getEnd() >= afterPosition) {
                const result = firstTypeAfter(child)
                if (result) {
                    return result
                }
            }
        }
        return null
    }
    const result = firstTypeAfter(ts.getSourceFile(file)!)
    if (!result) {
        throw new Error(
            `Found no valid types in ${file} after line ${line} column ${column}.`
        )
    }
    return result
}
