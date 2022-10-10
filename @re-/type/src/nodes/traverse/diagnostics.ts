import type { Dictionary, Evaluate } from "@re-/tools"
import { keySet, toString, uncapitalize } from "@re-/tools"
import { isIntegerLike } from "../../parser/str/operand/numeric.js"
import { pathToString, shallowClone } from "../common.js"
import type { Base, Structure } from "../common.js"
import type { Union } from "../expression/branching/union.js"
import type { Bound } from "../expression/infix/bound.js"
import type { Divisibility } from "../expression/infix/divisibility.js"
import type { ObjectLiteral } from "../structure/objectLiteral.js"
import type { Tuple } from "../structure/tuple.js"
import type { RegexKeyword } from "../terminal/keyword/regex.js"
import type { TypeKeyword } from "../terminal/keyword/types/typeKeyword.js"
import type { PrimitiveLiteral } from "../terminal/primitiveLiteral.js"
import type { RegexLiteral } from "../terminal/regexLiteral.js"
import type { Check } from "./check.js"

export type DiagnosticCode = keyof RegisteredDiagnosticConfigs

export type Diagnostic<Code extends DiagnosticCode> = {
    code: Code
    options: CompileDiagnosticOptions<Code>
} & DiagnosticContextConfig<Code> &
    BaseDiagnosticContext<
        DiagnosticContextConfig<Code>["type"],
        DiagnosticContextConfig<Code>["data"]
    >

export type OptionsByDiagnostic = Evaluate<
    {
        $?: UniversalDiagnosticOptions
    } & {
        [Code in DiagnosticCode]?: CompileDiagnosticOptions<Code>
    }
>

export type UniversalDiagnosticOptions = {
    message?: WriteDiagnosticMessageFn<DiagnosticCode>
    omitActual?: boolean
}

export type InternalDiagnosticInput<Code extends DiagnosticCode> = Omit<
    DiagnosticContextConfig<Code>,
    "data"
> & {
    message: string
    details?: string
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

type BaseDiagnosticOptions<Code extends DiagnosticCode> = Evaluate<
    {
        message?: WriteDiagnosticMessageFn<Code>
    } & (Code extends DatalessCode ? {} : { omitActual?: boolean })
>

type WriteDiagnosticMessageFn<Code extends DiagnosticCode> = (
    context: Diagnostic<Code>
) => string

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

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })

export class Diagnostics extends Array<Diagnostic<DiagnosticCode>> {
    constructor(private state: Check.State) {
        super()
    }

    add<Code extends DiagnosticCode>(
        code: Code,
        context: DiagnosticContextConfig<Code>
    ) {
        const diagnostic = context as Diagnostic<Code>
        const raw = shallowClone(this.state.data)
        diagnostic.data = {
            raw,
            toString: () => stringifyData(raw)
        }
        diagnostic.path = [...this.state.path]
        const options = this.state.queryContext("errors", code) as
            | UniversalDiagnosticOptions
            | undefined
        if (!(code in datalessCodes) && !options?.omitActual) {
            const actual =
                "actual" in diagnostic
                    ? diagnostic.actual
                    : diagnostic.data.toString()
            diagnostic.message += ` (was ${actual})`
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
                    error.path.length === 1 && isIntegerLike(error.path[0])
                        ? `Value at index ${error.path[0]}`
                        : pathToString(error.path)
                return `${pathPrefix} ${uncapitalize(error.message)}`
            }
            return error.message
        }
        let aggregatedMessage = ""
        for (const error of this) {
            aggregatedMessage += `${pathToString(error.path)}: ${
                error.message
            }\n`
        }
        return aggregatedMessage.slice(0, -1)
    }

    throw() {
        throw new ArktypeError(this)
    }
}

export class ArktypeError extends TypeError {
    cause: Diagnostics

    constructor(diagnostics: Diagnostics) {
        super(diagnostics.summary)
        this.cause = diagnostics
    }
}
