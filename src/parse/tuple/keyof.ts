import type { Branch } from "../../nodes/predicate.ts"
import { resolutionExtendsDomain } from "../../nodes/predicate.ts"
import { throwParseError } from "../../utils/errors.ts"
import { hasKey, listFrom } from "../../utils/generics.ts"
import { parseDefinition } from "../definition.ts"
import type { PrefixParser } from "./tuple.ts"

// Should accept a def, parse it, then return the "keys" of that def according
// to the same logic as TypeScript. Some cases to consider:

// If the type is a union, either of multiple domains or within a single domain,
// the only keys that get returned are the keys that are present on every branch
// of the union

// First, check if the node (i.e. parse result) has any domains other than
// object. If so, return never. Otherwise, iterate over all object branches,
// maintaining a keySet of the required+optional props that have existed on
// every branch. Once you get to the last branch, return a new node representing
// a string union of the remaining keys.
//string version is operand - parse unenclosed
export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) => {
    const resolution = ctx.type.scope.resolveNode(parseDefinition(def[1], ctx))

    if (!resolutionExtendsDomain(resolution, "object")) {
        return throwParseError("never")
    }
    if (resolution.object === true) {
        return { string: true }
    }

    const keysOfBranches: string[][] = []

    for (const branch of listFrom(resolution.object)) {
        if (hasKey(branch, "props")) {
            keysOfBranches.push(getPropsFromBranch(branch.props))
        }
    }
    const initialValue = [...keysOfBranches[0]]
    const result: string[] = []
    initialValue.forEach((key) => {
        const hasKey = keysOfBranches.every((keySet) => keySet.includes(key))
        if (hasKey) {
            result.push(key)
        }
    })

    return {
        string: result.map((key) => ({
            value: key
        }))
    }
}

const getPropsFromBranch = (branch: Branch) => Object.keys(branch)
