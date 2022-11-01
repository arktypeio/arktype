import type { Attributes } from "../../../attributes/shared.js"
import { throwInternalError } from "../../../internal.js"
import type { DynamicParserContext } from "../../common.js"

export namespace Alias {
    export const resolveAttributes = (
        name: string,
        context: DynamicParserContext
    ): Attributes => {
        if (!context.spaceRoot.aliases[name]) {
            return throwInternalError(
                `Unexpectedly failed to resolve alias ${name}`
            )
        }
        return { alias: name }
    }
}
