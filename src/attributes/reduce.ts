import { isKeyOf } from "../internal.js"
import type { DynamicParserContext } from "../parser/common.js"
import { assignIntersection } from "./intersection.js"
import type { AttributeKey, Attributes } from "./shared.js"
import { atomicAttributes } from "./shared.js"

export const reduce = (root: Attributes, context: DynamicParserContext) => {
    if (root.alias) {
        reduceAliases(root, root.alias.split("&"), context)
    }
    return root
}

const reduceAliases = (
    root: Attributes,
    names: string[],
    context: DynamicParserContext
) => {
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
