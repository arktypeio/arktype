import type { Evaluate } from "@re-/tools"
import type { Base } from "../../base.js"
import type { Path } from "../../common.js"
import type { CheckArgs } from "./check.js"
import { Diagnostics } from "./diagnostics.js"

export type CustomDiagnosticResult = {
    id: string
    reason: string
    additionalContext?: Record<string, unknown>
}

export type CustomValidator = (
    args: CustomValidatorArgs
) =>
    | undefined
    | string
    | string[]
    | CustomDiagnosticResult
    | CustomDiagnosticResult[]

export type CustomDiagnosticContext = {
    definition: Base.RootDefinition
    data: unknown
    path: Path
}

export type CustomValidatorArgs = Evaluate<
    CustomDiagnosticContext & {
        getOriginalErrors: () => Diagnostics
    }
>

export const checkCustomValidator = (
    validator: CustomValidator,
    node: Base.node,
    args: CheckArgs
) => {
    const context: CustomDiagnosticContext = {
        definition: node.definition,
        data: args.data,
        path: args.context.path
    }
    const result = getCustomValidationResult(validator, context, node, args)
    if (result === undefined) {
        return
    }
    const resultsList = !Array.isArray(result) ? [result] : result
    for (const messageOrCustomResult of resultsList) {
        if (typeof messageOrCustomResult === "string") {
            args.diagnostics.add(
                "custom",
                { reason: messageOrCustomResult, args },
                {
                    id: "anonymous"
                }
            )
        } else {
            const { reason, ...context } = messageOrCustomResult
            args.diagnostics.add("custom", { reason, args }, context)
        }
    }
}

const getCustomValidationResult = (
    validator: CustomValidator,
    context: CustomDiagnosticContext,
    node: Base.node,
    args: CheckArgs
) =>
    validator({
        ...context,
        getOriginalErrors: () => {
            const diagnostics = new Diagnostics()
            node.check({
                ...args,
                cfg: { ...args.cfg, validator: "default" },
                diagnostics
            })
            return diagnostics
        }
    })
