import { withCallRange } from "@re-do/node"
import { SourceRange } from "@re-do/utils"
import { typeContext } from "./type"
import { ValueContext, valueContext } from "./value"

export type Checker = <T>(
    value: T
) => (result: { type: any; value: ValueContext<T> }) => any

export const check = withCallRange(
    (range: SourceRange, value: unknown) => {
        return {
            type: typeContext(range, value),
            value: valueContext(range, value)
        }
    },
    { allAsChainedFunction: true }
) as any as Checker
