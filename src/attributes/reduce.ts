import { isKeyOf, keysOf } from "../internal.js"
import type { DynamicParserContext } from "../parser/common.js"
import { parseString } from "../parser/string.js"
import { assignIntersection } from "./intersection.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes,
    AttributeTypes
} from "./shared.js"
import { atomicAttributes } from "./shared.js"

export const reduce = (root: Attributes, context: DynamicParserContext) => {
    if (root.aliases) {
        reduceAliasIntersection(root, root.aliases, context)
    }
    if (root.branches) {
        reduceBranches(root, root.branches, context)
    }
    return root
}

const reduceAliasIntersection = (
    root: Attributes,
    aliases: AttributeTypes["aliases"],
    context: DynamicParserContext
) => {
    const names = typeof aliases === "string" ? [aliases] : keysOf(aliases)
    for (const name of names) {
        const attributes = parseString(name, context)
        let k: AttributeKey
        for (k in attributes) {
            if (!isKeyOf(k, atomicAttributes)) {
                delete attributes[k]
            }
        }
        assignIntersection(root, attributes, context)
    }
}

const reduceBranches = (
    root: Attributes,
    branches: AttributeBranches,
    context: DynamicParserContext
) => {
    // Recurse to leaves first, which will always be unions. Compress those by
    // flattening/extracting shared attributes to base. Should be able to
    // "score" a compression based on the total recursive number of keys it
    // creates. For intersections of branches, can do the same. Can also
    // potentially check for certain types of conditions that can never be met,
    // e.g. "(string|number)&(boolean|undefined)". The only relevant keys
    // outside of deep equality would be the ContradictableKeys. We could check
    // the exclusive intersection, like the way TypeSet works now, to see if it
    // is possible to meet the condition. If it is, I don't think we can do any
    // reduction beyond deep equality stuff.
}
