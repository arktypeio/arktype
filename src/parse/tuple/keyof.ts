import type { Branch } from "../../nodes/predicate.ts"
import { resolutionExtendsDomain } from "../../nodes/predicate.ts"
import { throwParseError } from "../../utils/errors.ts"
import { hasKey, listFrom } from "../../utils/generics.ts"
import { parseDefinition } from "../definition.ts"
import type { PrefixParser } from "./tuple.ts"

export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) => {
    const resolution = ctx.type.scope.resolveNode(parseDefinition(def[1], ctx))

    if (!resolutionExtendsDomain(resolution, "object")) {
        return throwParseError("never")
    }
    if (resolution.object === true) {
        return { string: true }
    }

    const branchKeys: string[][] = []

    const objectBranches = listFrom(resolution.object)
    const initialKeys = getPropsFromBranch(objectBranches[0])

    for (let i = 1; i < objectBranches.length; i++) {
        const keys = getPropsFromBranch(objectBranches[i])
        if (!keys.length) {
            return throwParseError("never")
        }
        branchKeys.push(keys)
    }

    const result: Branch[] = []

    initialKeys.forEach((key) => {
        const hasKey = branchKeys.every((keySet) => keySet.includes(key))
        if (hasKey) {
            result.push({ value: key })
        }
    })

    return {
        string: result
    }
}

const getPropsFromBranch = (branch: Branch) =>
    hasKey(branch, "props") ? Object.keys(branch.props) : []
