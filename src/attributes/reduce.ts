import { isKeyOf, keysOf } from "../internal.js"
import type { DynamicParserContext } from "../parser/common.js"
import { assignIntersection } from "./intersection.js"
import type { AttributeKey, Attributes, AttributeTypes } from "./shared.js"
import { atomicAttributes } from "./shared.js"

export const reduce = (root: Attributes, context: DynamicParserContext) => {
    if (root.aliases) {
        reduceAliases(root, root.aliases, context)
    }
    return root
}

const reduceAliases = (
    root: Attributes,
    aliases: AttributeTypes["aliases"],
    context: DynamicParserContext
) => {
    const names = typeof aliases === "string" ? [aliases] : keysOf(aliases)
    for (const name of names) {
        const attributes = context.spaceRoot.parseAlias(name)
        let k: AttributeKey
        for (k in attributes) {
            if (!isKeyOf(k, atomicAttributes)) {
                delete attributes[k]
            }
        }
        assignIntersection(root, attributes, context)
    }
}
