import type { Evaluate } from "@re-/tools"
import { uncapitalize } from "@re-/tools"
import type { Path } from "../../common.js"
import { pathToString } from "../../common.js"
import type { Bound } from "../../nonTerminal/binary/bound.js"
import type { Divisibility } from "../../nonTerminal/binary/divisibility.js"
import type { Union } from "../../nonTerminal/nary/union.js"
import type { StructureDiagnostic } from "../../nonTerminal/structural/common.js"
import type { ObjectLiteral } from "../../nonTerminal/structural/objectLiteral.js"
import type { Tuple } from "../../nonTerminal/structural/tuple.js"
import type { TypeKeyword } from "../../terminal/keyword/keyword.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { Regex } from "../../terminal/regex.js"
import type { CheckState } from "./check.js"
import type { CustomDiagnosticResult } from "./customValidator.js"

export type BaseDiagnosticOptions<Code extends DiagnosticCode> = {
    message?: (context: Diagnostic<Code>) => string
} & ("actual" extends keyof RegisteredDiagnostics[Code]["context"]
    ? { omitActualFromMessage?: boolean }
    : {})

export type OptionsByDiagnostic = {
    [Code in DiagnosticCode]?: DiagnosticOptions<Code>
}

export type DiagnosticConfig<
    Context extends Record<string, unknown>,
    Options extends Record<string, unknown> = {}
> = {
    context: Context
    options: Options
}

export type CustomDiagnostic = DiagnosticConfig<
    Omit<CustomDiagnosticResult, "reason">
>

export type RegisteredDiagnostics = {
    custom: CustomDiagnostic
    typeKeyword: TypeKeyword.Diagnostic
    primitiveLiteral: PrimitiveLiteral.Diagnostic
    structure: StructureDiagnostic
    bound: Bound.Diagnostic
    extraneousKeys: ObjectLiteral.ExtraneousKeysDiagnostic
    missingKey: ObjectLiteral.MissingKeyDiagnostic
    regex: Regex.Diagnostic
    tupleLength: Tuple.LengthDiagnostic
    union: Union.Diagnostic
    divisibility: Divisibility.Diagnostic
}

export type DiagnosticContext<Code extends DiagnosticCode> =
    RegisteredDiagnostics[Code]["context"]

export type ExternalDiagnosticContext<Code extends DiagnosticCode> = Omit<
    DiagnosticContext<Code>,
    "reason"
>

export type DiagnosticOptions<Code extends DiagnosticCode> = Evaluate<
    RegisteredDiagnostics[Code]["options"] & BaseDiagnosticOptions<Code>
>

export type DiagnosticCode = keyof RegisteredDiagnostics

export type DiagnosticArgs<Code extends DiagnosticCode> = [
    code: Code,
    input: InternalDiagnosticInput,
    context: DiagnosticContext<Code>
]

export type InternalDiagnosticInput = {
    state: CheckState
    reason: string
    suffix?: string
}

// TODO: Automatically include definition?
export class Diagnostic<Code extends DiagnosticCode> {
    message: string
    path: Path
    context: ExternalDiagnosticContext<Code>
    options: DiagnosticOptions<Code>

    constructor(
        public readonly code: Code,
        { reason, state, suffix }: InternalDiagnosticInput,
        context: DiagnosticContext<Code>
    ) {
        // TODO: Idea of freezing current? Probably could be built into traversal?
        this.path = [...state.path]
        this.context = context
        // TODO: Figure out how to reconcile this and other context sources (config vs context.modelConfig?)
        const options = state.options.errors?.[code]
        this.options = { ...options } as any
        this.message = reason
        if (
            "actual" in context &&
            !(this.options as any)?.omitActualFromMessage
        ) {
            this.message += ` (was ${context.actual})`
        }
        if (suffix) {
            this.message += suffix
        }
        if (this.options.message) {
            this.message = this.options.message(this as any)
        }
    }
}

export class ValidationError extends Error {}

export class Diagnostics extends Array<Diagnostic<DiagnosticCode>> {
    add<Code extends DiagnosticCode>(
        code: Code,
        input: InternalDiagnosticInput,
        context: DiagnosticContext<Code>
    ) {
        this.push(new Diagnostic(code, input, context) as any)
    }

    get summary() {
        if (this.length === 1) {
            const error = this[0]
            if (error.path.length) {
                const pathPrefix =
                    error.path.length === 1 && typeof error.path[0] === "number"
                        ? `Value at index ${error.path[0]}`
                        : pathToString(error.path)
                return `${pathPrefix} ${uncapitalize(error.message)}`
            }
            return error.message
        }
        let aggregatedMessage = "Encountered errors at the following paths:\n"
        for (const error of this) {
            aggregatedMessage += `  ${pathToString(error.path)}: ${
                error.message
            }\n`
        }
        return aggregatedMessage
    }
}
