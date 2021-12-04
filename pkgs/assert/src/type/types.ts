import { caller, SourcePosition, SourceRange } from "@re-do/node"
import { getAbsolutePositions, getLinePositions, toString } from "@re-do/utils"
import { getTsContext, TsContext } from "./ts.js"
import ts from "typescript"
import { getTypeErrors, typeErrorsInRange } from "./errors.js"

export type CheckTypesInRangeOptions = {
    allowMultiple?: boolean
    includeNested?: boolean
    includeAny?: boolean
}

export const typesInRange = (
    { file, from, to }: SourceRange,
    options: CheckTypesInRangeOptions = {}
) => {
    const { ts, sources } = getTsContext()
    const checker = ts.getTypeChecker()
    const [fromPos, toPos] = getAbsolutePositions(sources[file], [from, to])
    const findTypes = (node: ts.Node): string[] => {
        // For compatibility with 1-based positions
        const start = node.getStart()
        const end = node.getEnd() - 1
        const getNested = () =>
            node.getChildren().flatMap((child) => findTypes(child))

        const getType = () => {
            try {
                return checker.typeToString(checker.getTypeAtLocation(node))
            } catch (e) {
                return "any"
            }
        }
        if (start > toPos || end < fromPos) {
            return []
        }
        if (start >= fromPos && end <= toPos) {
            const nodeType = getType()
            if (nodeType !== "any" || options.includeAny) {
                return [nodeType, ...(options.includeNested ? getNested() : [])]
            }
            return getNested()
        } else {
            return getNested()
        }
    }
    const types = findTypes(ts.getSourceFile(file)!)
    const baseTypeErrorMessage = () =>
        `Unable to identify the type in ${file} from ${from.line}:${from.column} to ${to.line}:${to.column}.`
    if (types.length === 0) {
        throw new Error(`${baseTypeErrorMessage()} No valid types found.`)
    }
    if (!options.allowMultiple && types.length > 1) {
        throw new Error(
            `${baseTypeErrorMessage()}. Found multiple top-level types:\n${toString(
                types
            )}`
        )
    }
    return types[0]
}

export type NextTypeOptions = {
    skipPositions?: number
}

const typeToString = (checker: ts.TypeChecker, node: ts.Node) => {
    try {
        return checker.typeToString(checker.getTypeAtLocation(node))
    } catch (e) {
        return "any"
    }
}

export const errorsOfNextType = (
    position: SourcePosition,
    options: NextTypeOptions = {}
) => {
    const context = getTsContext()
    const typeToCheck = nextTypedNode(context, position, options)
    const [typeStart, typeEnd] = getLinePositions(
        context.sources[position.file],
        [typeToCheck.getStart(), typeToCheck.getEnd() - 1]
    )
    return typeErrorsInRange({
        file: position.file,
        from: typeStart,
        to: typeEnd
    }).join("\n")
}

export const nextTypeToString = (
    position: SourcePosition,
    options: NextTypeOptions = {}
) => {
    const context = getTsContext()
    const node = nextTypedNode(context, position, options)
    return typeToString(context.ts.getTypeChecker(), node)
}

const nextTypedNode = (
    context: TsContext,
    { file, line, column }: SourcePosition,
    { skipPositions = 0 }: NextTypeOptions = {}
): ts.Node => {
    const { ts, sources } = context
    const checker = ts.getTypeChecker()
    const afterPosition =
        getAbsolutePositions(sources[file], [{ line, column }])[0] +
        skipPositions
    const firstTypeAfter = (node: ts.Node): ts.Node | null => {
        if (node.getStart() > afterPosition) {
            const nodeType = typeToString(checker, node)
            if (nodeType !== "any") {
                return node
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
