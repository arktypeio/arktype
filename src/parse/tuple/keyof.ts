import { resolutionExtendsDomain } from "../../nodes/predicate.ts"
import { domainOf } from "../../utils/domains.ts"
// import {
//     domainsOfNode,
//     resolutionExtendsDomain,
//     resolveIfIdentifier
// } from "../../nodes/resolve.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { CollapsibleList } from "../../utils/generics.ts"
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
export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, $) => {
    const resolution = parseDefinition(def[1], $)

    if (!resolutionExtendsDomain(resolution, "object")) {
        return throwParseError("never")
    }
    if (resolution.object === true) {
        return { string: true }
    }
    const keys: string[] = []
    for (const branch of listFrom(resolution)) {
        if (hasKey(branch.object, "props")) {
            keys.push(...Object.keys(branch.object.props))
        }
    }
    return { object: { value: keys } }
}
// tuple maybe poogers
// arr => numberLiteral
