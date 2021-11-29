import { withCallRange } from "@re-do/node"
import { SourceRange } from "@re-do/utils"
import { typeContext } from "./types/context.js"

export const check = withCallRange((range: SourceRange, value: unknown) => {
    return {
        type: typeContext(range, value),
        value: () => value
    }
})
