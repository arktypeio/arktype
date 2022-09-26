import type { Evaluate } from "@re-/tools"
import type { Base } from "../../base.js"
import type { Path } from "../../common.js"
import type { CheckState } from "./check.js"

export type CustomDiagnosticResult = {
    id: string
    reason: string
    additionalContext?: Record<string, unknown>
}

export type NarrowFn<Data = unknown> = (
    args: CustomValidatorArgs<Data>
) =>
    | undefined
    | string
    | string[]
    | CustomDiagnosticResult
    | CustomDiagnosticResult[]

export type CustomConstraintContext<Data = unknown> = {
    data: Data
    path: Path
}

export type CustomValidatorArgs<Data = unknown> = Evaluate<
    CustomConstraintContext<Data>
>

export const checkCustomValidator = (
    narrow: NarrowFn,
    node: Base.node,
    state: CheckState
) => {
    const context: CustomConstraintContext = {
        data: state.data,
        path: state.path
    }
    const result = narrow(context)
    if (result === undefined) {
        return
    }
    const resultsList = !Array.isArray(result) ? [result] : result
    for (const messageOrCustomResult of resultsList) {
        if (typeof messageOrCustomResult === "string") {
            state.errors.add(
                "custom",
                { reason: messageOrCustomResult, state: state },
                {
                    id: "anonymous"
                }
            )
        } else {
            const { reason, ...context } = messageOrCustomResult
            state.errors.add("custom", { reason, state: state }, context)
        }
    }
}
