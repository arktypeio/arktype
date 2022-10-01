import type { Dictionary } from "@re-/tools"
import { uncapitalize } from "@re-/tools"
import type { Base } from "../../base.js"
import { pathToString } from "../../common.js"
import type { Bound } from "../../nonTerminal/binary/bound.js"
import type { Divisibility } from "../../nonTerminal/binary/divisibility.js"
import type { Union } from "../../nonTerminal/nary/union.js"
import type { StructureDiagnostic } from "../../structural/common.js"
import type { ObjectLiteral } from "../../structural/objectLiteral.js"
import type { Tuple } from "../../structural/tuple.js"
import type { TypeKeyword } from "../../terminal/keyword/keyword.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { RegexLiteral } from "../../terminal/regex.js"
import type { Check } from "./check.js"
import { stringifyData } from "./common.js"

export type DiagnosticCode = keyof RegisteredDiagnosticConfigs

export type Diagnostic<Code extends DiagnosticCode> = {
    code: Code
    options: CompileDiagnosticOptions<Code>
} & DiagnosticContextConfig<Code> &
    BaseDiagnosticContext<
        DiagnosticContextConfig<Code>["node"],
        DiagnosticContextConfig<Code>["data"]
    >

export type OptionsByDiagnostic = {
    [Code in DiagnosticCode]?: CompileDiagnosticOptions<Code>
}

export type InternalDiagnosticInput<Code extends DiagnosticCode> = Omit<
    DiagnosticContextConfig<Code>,
    "data"
> & {
    options: DiagnosticOptionsConfig<Code>
    message: string
}

export type Stringifiable<Data> = {
    raw: Data
    toString(): string
}

export type DiagnosticConfig = {
    type: Base.Node
    data: unknown
    context: Dictionary
    options: Dictionary
}

type DiagnosticContextConfig<Code extends DiagnosticCode> =
    RegisteredDiagnosticConfigs[Code]["context"]

type BaseDiagnosticContext<Node extends Base.Node, Data> = {
    type: Pick<Node, "toString" | "toAst" | "toDefinition">
    data: Stringifiable<Data>
    message: string
}

type CompileDiagnosticOptions<Code extends DiagnosticCode> =
    BaseDiagnosticOptions<Code> & DiagnosticOptionsConfig<Code>["options"]

type BaseDiagnosticOptions<Code extends DiagnosticCode> = {
    message?: (context: Diagnostic<Code>) => string
} & ("actual" extends keyof DiagnosticContextConfig<Code>
    ? { omitActual?: boolean }
    : {})

type DiagnosticOptionsConfig<Code extends DiagnosticCode> =
    RegisteredDiagnosticConfigs[Code]["options"]

type RegisteredDiagnosticConfigs = {
    typeKeyword: TypeKeyword.Diagnostic
    primitiveLiteral: PrimitiveLiteral.Diagnostic
    structure: StructureDiagnostic
    bound: Bound.Diagnostic
    extraneousKeys: ObjectLiteral.ExtraneousKeysDiagnostic
    missingKey: ObjectLiteral.MissingKeyDiagnostic
    regexLiteral: RegexLiteral.Diagnostic
    tupleLength: Tuple.LengthDiagnostic
    union: Union.Diagnostic
    divisibility: Divisibility.Diagnostic
}

export class Diagnostics extends Array<Diagnostic<DiagnosticCode>> {
    constructor(private state: Check.State) {
        super()
    }

    add<Code extends DiagnosticCode>(
        code: Code,
        context: DiagnosticContextConfig<Code>
    ) {
        const diagnostic = context as Diagnostic<Code>
        const raw = this.state.data
        diagnostic.data = {
            raw,
            toString: () => stringifyData(raw)
        }
        diagnostic.path = this.state.path
        const options = this.state.options.errors?.[code]
        if ("actual" in diagnostic && !options?.omitActual) {
            diagnostic.message += ` (was ${diagnostic.actual})`
        }
        if (options?.message) {
            diagnostic.message = options?.message(diagnostic)
        }
        this.push(diagnostic)
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
