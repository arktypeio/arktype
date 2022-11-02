import type { DynamicParserContext } from "../parser/common.js"
import { assignIntersection } from "./intersection.js"
import type { Attributes } from "./shared.js"

export const reduce = (root: Attributes, context: DynamicParserContext) => {
    // if (root.alias) {
    //     const aliasAttributes = root.alias
    //         .split("&")
    //         .map((name) => context.spaceRoot.parseAlias(name))
    //     while (aliasAttributes.length > 1) {
    //         const right = aliasAttributes.pop()!
    //         const left = aliasAttributes.pop()!
    //         aliasAttributes.unshift(assignIntersection(left, right, context))
    //     }
    //     assignIntersection(root, aliasAttributes[0], context)
    //     delete root.alias
    // }
    return root
}
