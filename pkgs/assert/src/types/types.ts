import { SourceRange } from "@re-do/node"
import { getAbsolutePositions } from "@re-do/utils"
import { memoize, stringify } from "@re-do/utils"
import ts from "typescript"
import { getTsContext, TsContext } from "./ts.js"

export type CheckTypesOptions = {
    allowMultiple?: boolean
    includeNested?: boolean
    includeAny?: boolean
}

export const typeChecker =
    ({ file, from, to }: SourceRange) =>
    (options: CheckTypesOptions = {}) => {
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
                `${baseTypeErrorMessage()}. Found multiple top-level types:\n${stringify(
                    types
                )}`
            )
        }
        return types[0]
    }
