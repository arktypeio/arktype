import type { Attributes } from "../../../attributes/shared.js"
import { throwInternalError } from "../../../internal.js"
import type { DynamicParserContext } from "../../common.js"
import { throwParseError } from "../../common.js"
import { Root } from "../../root.js"

export namespace Alias {
    export const resolveAttributes = (
        name: string,
        context: DynamicParserContext
    ): Attributes => {
        if (!context.spaceRoot?.aliases[name]) {
            return throwInternalError(
                `Unexpectedly failed to resolve alias ${name}`
            )
        }
        const { aliases, attributes } = context.spaceRoot
        if (!attributes[name]) {
            if (name in context.seen) {
                if (context.path === context.seen[name]) {
                    return throwParseError(
                        `Alias ${name} shallowly references itself at ${context.path}`
                    )
                }
            }
            context.seen[name] = context.path
            attributes[name] = Root.parse(aliases[name], context)
            delete context.seen[name]
        }
        // TODO: Convert to deep copy
        return { ...attributes[name] }
    }
}
