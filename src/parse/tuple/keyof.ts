import { compileNode, compileNodes } from "../../nodes/node.ts"
import {
    domainsOfNode,
    resolutionExtendsDomain,
    resolveIfIdentifier
} from "../../nodes/resolve.ts"
import { throwParseError } from "../../utils/errors.ts"
import { listFrom } from "../../utils/generics.ts"
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
export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, $) => {
    const resolution = resolveIfIdentifier(parseDefinition(def[1], $), $)

    if (!resolutionExtendsDomain(resolution, "object", $)) {
        return throwParseError("never")
    }
    if (resolution.object === true) {
        return { string: true }
    }
    const keys = []
    for (const branch of listFrom(resolution)) {
        console.log("")
    }
    // listFrom
    // Object.keys()
    return {}
}
// tuple maybe poogers
// arr => numberLiteral
