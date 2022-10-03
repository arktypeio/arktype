import type { Dictionary } from "@re-/tools"
import { isKeyOf, keySet, uncapitalize } from "@re-/tools"
import type { Base } from "../../base.js"
import { pathToString } from "../../common.js"
import type { Bound } from "../../expression/bound.js"
import type { Divisibility } from "../../expression/divisibility.js"
import type { Union } from "../../expression/union.js"
import type { ObjectLiteral } from "../../structure/objectLiteral.js"
import type { Tuple } from "../../structure/tuple.js"
import type { TypeKeyword } from "../../terminal/keyword/keyword.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { RegexKeyword, RegexLiteral } from "../../terminal/regex.js"
import type { Check } from "./check.js"
import type { Structure } from "./common.js"
import { stringifyData } from "./common.js"

export type DiagnosticCode = keyof RegisteredDiagnosticConfigs

export type Diagnostic<Code extends DiagnosticCode> = {
    code: Code
    options: CompileDiagnosticOptions<Code>
} & DiagnosticContextConfig<Code> &
    BaseDiagnosticContext<
        DiagnosticContextConfig<Code>["type"],
        DiagnosticContextConfig<Code>["data"]
    >

export type OptionsByDiagnostic = {
    [Code in DiagnosticCode]?: CompileDiagnosticOptions<Code>
}

export type InternalDiagnosticArgs<Code extends DiagnosticCode> = Omit<
    DiagnosticContextConfig<Code>,
    "data"
> & {
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
    path: string[]
    message: string
}

type CompileDiagnosticOptions<Code extends DiagnosticCode> =
    BaseDiagnosticOptions<Code> & DiagnosticOptionsConfig<Code>

type BaseDiagnosticOptions<Code extends DiagnosticCode> = {
    message?: (context: Diagnostic<Code>) => string
} & (Code extends DatalessCode ? {} : { omitActual?: boolean })

type DiagnosticOptionsConfig<Code extends DiagnosticCode> =
    RegisteredDiagnosticConfigs[Code]["options"]

type RegisteredDiagnosticConfigs = {
    typeKeyword: TypeKeyword.Diagnostic
    primitiveLiteral: PrimitiveLiteral.Diagnostic
    structure: Structure.Diagnostic
    bound: Bound.Diagnostic
    extraneousKeys: ObjectLiteral.ExtraneousKeysDiagnostic
    missingKey: ObjectLiteral.MissingKeyDiagnostic
    regexLiteral: RegexLiteral.Diagnostic
    regexKeyword: RegexKeyword.Diagnostic
    tupleLength: Tuple.LengthDiagnostic
    union: Union.Diagnostic
    divisibility: Divisibility.Diagnostic
}

const datalessCodes = keySet({
    missingKey: 1,
    extraneousKeys: 1
})

type DatalessCode = keyof typeof datalessCodes

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
        const options = this.state.queryContext("errors", code)
        if (!(code in datalessCodes)) {
            const actual =
                "actual" in diagnostic
                    ? diagnostic.actual
                    : diagnostic.data.toString()
            diagnostic.message += ` (was ${actual})`
        }
        if (options?.message) {
            diagnostic.message = options?.message(diagnostic)
        }
        this.push(diagnostic as any)
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
