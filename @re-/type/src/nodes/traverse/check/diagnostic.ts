import type { Evaluate } from "@re-/tools"
import type { Base } from "../../base.js"
import type { Path } from "../../common.js"
import type { Bound } from "../../nonTerminal/binary/bound.js"
import type { Divisibility } from "../../nonTerminal/binary/divisibility.js"
import type { Union } from "../../nonTerminal/nary/union.js"
import type { StructureDiagnostic } from "../../nonTerminal/structural/common.js"
import type { ObjectLiteral } from "../../nonTerminal/structural/objectLiteral.js"
import type { Tuple } from "../../nonTerminal/structural/tuple.js"
import type { TypeKeyword } from "../../terminal/keyword/keyword.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { Regex } from "../../terminal/regex.js"
import type { Check } from "./check.js"
import type { CustomDiagnostic } from "./customValidator.js"

export type OptionsByDiagnostic = {
    [Code in DiagnosticCode]?: DiagnosticOptions<Code>
}

export type DiagnosticCode = keyof RegisteredDiagnostics

type BaseDiagnosticOptions<Code extends DiagnosticCode> = {
    message?: (context: Diagnostic<Code>) => string
} & ("actual" extends keyof RegisteredDiagnostics[Code]["context"]
    ? { omitActualFromMessage?: boolean }
    : {})

type RegisteredDiagnostics = {
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

export type DiagnosticData<Code extends DiagnosticCode> =
    RegisteredDiagnostics[Code]["context"]

type DiagnosticOptions<Code extends DiagnosticCode> = Evaluate<
    RegisteredDiagnostics[Code]["options"] & BaseDiagnosticOptions<Code>
>

export class Diagnostics extends Array<DiagnosticData<DiagnosticCode>> {
    add<Code extends DiagnosticCode>(
        code: Code,
        context: DiagnosticData<Code>
    ) {
        context.code
        this.push()
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
