import type { Evaluate } from "@re-/tools"
import { uncapitalize } from "@re-/tools"
import type { Path } from "../../common.js"
import { pathToString } from "../../common.js"
import type { BoundDiagnostic as BoundDiagnostic } from "../../constraints/bounds.js"
import type { UnionDiagnostic } from "../../expressions/branches/union.js"
import type {
    ExtraneousKeysDiagnostic,
    MissingKeyDiagnostic
} from "../../structs/dictionary.js"
import type { StructureDiagnostic } from "../../structs/struct.js"
import type { TupleLengthDiagnostic } from "../../structs/tuple.js"
import type { KeywordTypeDiagnostic } from "../../terminals/keywords/common.js"
import type { NumberSubtypeDiagnostic } from "../../terminals/keywords/number.js"
import type { RegexDiagnostic } from "../../terminals/keywords/string.js"
import type { LiteralDiagnostic } from "../../terminals/literal.js"
import type { CheckArgs } from "./check.js"
import type { CustomDiagnosticResult } from "./customValidator.js"

export type BaseDiagnosticOptions<Code extends DiagnosticCode> = {
    message?: (context: Diagnostic<Code>) => string
    omitActualFromMessage?: boolean
}

export type OptionsByDiagnostic = {
    [Code in DiagnosticCode]?: RegisteredDiagnostics[Code]["options"]
}

export type DefineDiagnostic<
    Code extends DiagnosticCode,
    Context extends Record<string, unknown>,
    Options extends Record<string, unknown> = {}
> = {
    context: Context
    options: Evaluate<BaseDiagnosticOptions<Code> & Options>
}

export type CustomDiagnostic = DefineDiagnostic<
    "custom",
    Omit<CustomDiagnosticResult, "reason">
>

export type RegisteredDiagnostics = {
    custom: CustomDiagnostic
    keyword: KeywordTypeDiagnostic
    literal: LiteralDiagnostic
    structure: StructureDiagnostic
    bound: BoundDiagnostic
    extraneousKeys: ExtraneousKeysDiagnostic
    missingKey: MissingKeyDiagnostic
    regex: RegexDiagnostic
    numberSubtype: NumberSubtypeDiagnostic
    tupleLength: TupleLengthDiagnostic
    union: UnionDiagnostic
}

export type DiagnosticContext<Code extends DiagnosticCode> =
    RegisteredDiagnostics[Code]["context"]

export type ExternalDiagnosticContext<Code extends DiagnosticCode> = Omit<
    DiagnosticContext<Code>,
    "reason"
>

export type DiagnosticOptions<Code extends DiagnosticCode> =
    RegisteredDiagnostics[Code]["options"]

export type DiagnosticCode = keyof RegisteredDiagnostics

export type DiagnosticArgs<Code extends DiagnosticCode> = [
    code: Code,
    input: InternalDiagnosticInput,
    context: DiagnosticContext<Code>
]

export type InternalDiagnosticInput = {
    args: CheckArgs
    reason: string
    suffix?: string
}

export class Diagnostic<Code extends DiagnosticCode> {
    message: string
    path: Path
    context: ExternalDiagnosticContext<Code>
    options: DiagnosticOptions<Code>

    constructor(
        public readonly code: Code,
        { reason, args, suffix }: InternalDiagnosticInput,
        context: DiagnosticContext<Code>
    ) {
        this.path = args.context.path
        this.context = context
        // TODO: Figure out how to reconcile this and other context sources (cfg vs context.modelCfg?)
        this.options = {
            ...args.cfg.diagnostics?.[code],
            ...args.context.modelCfg.diagnostics?.[code]
        }
        this.message = reason
        if (!this.options?.omitActualFromMessage) {
            if ("actual" in context) {
                this.message += ` (was ${context.actual})`
            }
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
        this.push(new Diagnostic(code, input, context))
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
