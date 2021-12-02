import { SourcePosition, SourceRange } from "@re-do/node"
import { getAbsolutePositions, toString } from "@re-do/utils"
import { getTsContext } from "./ts.js"
import ts from "typescript"

export type CheckTypesInRangeOptions = {
    allowMultiple?: boolean
    includeNested?: boolean
    includeAny?: boolean
}

export const typesInRange =
    ({ file, from, to }: SourceRange) =>
    (options: CheckTypesInRangeOptions = {}) => {
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
                    return [
                        nodeType,
                        ...(options.includeNested ? getNested() : [])
                    ]
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
    includeAny?: boolean
}

export const nextType =
    ({ file, line, column }: SourcePosition) =>
    ({ includeAny }: NextTypeOptions = {}) => {
        const { ts, sources } = getTsContext()
        const checker = ts.getTypeChecker()
        const [afterPosition] = getAbsolutePositions(sources[file], [
            { line, column }
        ])
        const noTypesFoundError = `Found no valid types in ${file} after line ${line} column ${column}.`
        const firstTypeAfter = (node: ts.Node): string => {
            // For compatibility with 1-based positions
            const start = node.getStart()
            const end = node.getEnd() - 1
            const getFirstChildAfter = () =>
                node
                    .getChildren()
                    .find((child) => child.getStart() > afterPosition)

            const getType = () => {
                try {
                    return checker.typeToString(checker.getTypeAtLocation(node))
                } catch (e) {
                    return "any"
                }
            }
            if (end > afterPosition) {
                if (start > afterPosition) {
                    const nodeType = getType()
                    if (nodeType !== "any" || includeAny) {
                        return nodeType
                    }
                    throw new Error(noTypesFoundError)
                }
                const nextChild = getFirstChildAfter()
                if (!nextChild) {
                    throw new Error(noTypesFoundError)
                }
                return firstTypeAfter(nextChild)
            }
            throw new Error(noTypesFoundError)
        }
        return firstTypeAfter(ts.getSourceFile(file)!)
    }
