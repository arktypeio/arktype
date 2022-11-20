import type { ScopeRoot } from "../../../scope.js"
import type { Attributes, CompiledAttributes } from "./attributes.js"
import { discriminate } from "./union/discriminate.js"

export const compile = (
    attributes: Attributes,
    scope: ScopeRoot
): CompiledAttributes => {
    return attributes
    // const compiled = discriminate(attributes, scope)
    // if (attributes.props) {
    //     for (const k in attributes.props) {
    //         compile(attributes.props[k], scope)
    //     }
    // }
    // return compiled
}
