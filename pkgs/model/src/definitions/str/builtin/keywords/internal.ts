import { Evaluate, Narrow } from "@re-/tools"
import { InheritableMethodContext } from "../internal.js"

export * from "../internal.js"

export const defineKeywords = <
    T extends Record<
        string,
        {
            generate: (ctx: InheritableMethodContext<string, unknown>[0]) => any
            allows: (
                valueType: unknown,
                ctx: InheritableMethodContext<string, unknown>[0]
            ) => boolean
        }
    >
>(
    types: Narrow<T>
) => types as Evaluate<T>
