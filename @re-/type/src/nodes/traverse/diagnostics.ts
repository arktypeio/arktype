import type { Evaluate } from "@re-/tools"
import { toString, uncapitalize } from "@re-/tools"
import { isIntegerLike } from "../../parser/str/operand/numeric.js"
import { pathToString } from "../base.js"
import type { Base, ObjectKind } from "../base.js"
import type { Bound } from "../expression/bound.js"
import type { Union } from "../expression/branching/union.js"
import type { Divisibility } from "../expression/divisibility.js"
import type { ObjectLiteral } from "../structure/objectLiteral.js"
import type { Tuple } from "../structure/tuple.js"
import type { RegexKeyword } from "../terminal/keyword/regex.js"
import type { TypeKeyword } from "../terminal/keyword/types/typeKeyword.js"
import type { PrimitiveLiteral } from "../terminal/primitiveLiteral.js"
import type { RegexLiteral } from "../terminal/regexLiteral.js"
import type { Check } from "./check.js"

export type DiagnosticCode = keyof RegisteredDiagnosticConfigs

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

export type Stringifiable<Data> = {
    raw: Data
    toString(): string
}

const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })

const stringifiableFrom = <Data>(raw: Data) => ({
    raw,
    toString: () => stringifyData(raw)
})

type DeepSimplifyNode<Node extends Base.Node> = Pick<
    Node,
    "toString" | "ast" | "definition"
> & { children: SimplifyChildren<Node["children"]> }

type SimplifyChildren<Children extends Base.Node[]> = {
    [I in keyof Children]: DeepSimplifyNode<Children[I]>
}

type CompileDiagnosticOptions<Code extends DiagnosticCode> =
    BaseDiagnosticOptions<Code> & DiagnosticOptionsConfig<Code>

type BaseDiagnosticOptions<Code extends DiagnosticCode> = Evaluate<{
    message?: WriteDiagnosticMessageFn<Code>
    omitActual?: boolean
}>

type WriteDiagnosticMessageFn<Code extends DiagnosticCode> = (
    context: Diagnostic<Code>
) => string

type DiagnosticOptionsConfig<Code extends DiagnosticCode> =
    RegisteredDiagnosticConfigs[Code]["options"]

type RegisteredDiagnosticConfigs = {
    typeKeyword: TypeKeyword.Diagnostic
    primitiveLiteral: PrimitiveLiteral.Diagnostic
    structure: ObjectKind.Diagnostic
    bound: Bound.Diagnostic
    extraneousKeys: ObjectLiteral.ExtraneousKeysDiagnostic
    missingKey: ObjectLiteral.MissingKeyDiagnostic
    regexLiteral: RegexLiteral.Diagnostic
    regexKeyword: RegexKeyword.Diagnostic
    tupleLength: Tuple.LengthDiagnostic
    union: Union.Diagnostic
    divisibility: Divisibility.Diagnostic
}

export abstract class Diagnostic<
    Code extends DiagnosticCode,
    CustomOptions,
    Node extends Base.Node,
    Data
> {
    data: Stringifiable<Data>
    path: string[]
    private unionDepth: number
    protected omitActualByDefault?: true
    options: BaseDiagnosticOptions<Code> & CustomOptions

    constructor(
        public readonly code: Code,
        public type: DeepSimplifyNode<Node>,
        state: Check.State
    ) {
        this.data = stringifiableFrom(state.data as Data)
        this.path = [...state.path]
        this.unionDepth = state.unionDepth
        this.options = (state.queryContext("errors", this.code) as any) ?? {}
    }

    abstract get conditionDescription(): string

    get defaultMessage() {
        let message = `Must be ${this.conditionDescription}`
        if (!this.options.omitActual) {
            if ("actual" in context) {
                message += ` (was ${context.actual})`
            } else if (
                !this.omitActualByDefault &&
                // If we're in a union, don't redundandtly include data (other
                // "actual" context is still included)
                !this.unionDepth
            ) {
                message += ` (was ${this.data.toString()})`
            }
        }
        return message
    }

    get message() {
        let result = this.options.message?.(this) ?? this.defaultMessage
        if (this.unionDepth) {
            const branchIndentation = "  ".repeat(this.unionDepth)
            result = branchIndentation + result
        }
        return result
    }
}

export class UnionDiagnostic extends Diagnostic<
    "union",
    {
        explainBranches: boolean
    },
    Base.Node,
    unknown
> {
    readonly code = "union"

    get conditionDescription() {
        return ""
    }
}

export class Diagnostics extends Array<Diagnostic<DiagnosticCode>> {
    constructor(private state: Check.State) {
        super()
    }

    add<Code extends DiagnosticCode>(
        code: Code,
        context: DiagnosticContextConfig<Code>
    ) {
        const raw = this.state.data
        const baseContext: BaseDiagnosticContext<Base.Node, unknown> = {
            path: [...this.state.path],
            data: stringifiableFrom(raw)
        }
        const options = this.state.queryContext("errors", code) as
            | UniversalDiagnosticOptions
            | undefined

        if (options?.message) {
            context.message = options?.message(context)
        }

        this.push(context)
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
