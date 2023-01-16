import type { UnionErrorContext } from "../nodes/branches.ts"
import { buildUnionError } from "../nodes/branches.ts"
import type { DivisibilityContext } from "../nodes/rules/divisor.ts"
import { buildDivisorError } from "../nodes/rules/divisor.ts"
import type { InstanceOfErrorContext } from "../nodes/rules/instanceof.ts"
import { buildInstanceOfError } from "../nodes/rules/instanceof.ts"
import type { MissingKeyContext } from "../nodes/rules/props.ts"
import { buildMissingKeyError } from "../nodes/rules/props.ts"
import type { RangeErrorContext } from "../nodes/rules/range.ts"
import { buildRangeError } from "../nodes/rules/range.ts"
import type { RegexErrorContext } from "../nodes/rules/regex.ts"
import { buildRegexError } from "../nodes/rules/regex.ts"
import type { TupleLengthErrorContext } from "../nodes/rules/subdomain.ts"
import { buildTupleLengthError } from "../nodes/rules/subdomain.ts"
import { domainOf } from "../utils/domains.ts"
import type { evaluate } from "../utils/generics.ts"
import { stringSerialize } from "../utils/serialize.ts"
import type { CheckState } from "./check.ts"

export type BaseProblemConfig = {
    omitActual?: boolean
}

export type Problem = {
    path: string
    reason: string
    parts?: string[]
}

export class ArktypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(problems.summary)
        this.cause = problems
    }
}

export class Problems extends Array<Problem> {
    byPath: Record<string, Problem> = {}

    get summary() {
        if (this.length === 1) {
            const problem = this[0]
            if (problem.path !== "") {
                return `${problem.path}: ${uncapitalize(problem.reason)}`
            }
            return problem.reason
        }
        return this.map((problem) => `${problem.path}: ${problem.reason}`).join(
            "\n"
        )
    }

    throw(): never {
        throw new ArktypeError(this)
    }

    addProblem<code extends DiagnosticCode>(
        code: code,
        context: Omit<DiagnosticsByCode[code], keyof BaseDiagnosticContext>,
        state: CheckState<dataTypeOfCode<code>>
    ) {
        const compiledContext = Object.assign(context, {
            data: new Stringifiable(state.data)
        }) as DiagnosticsByCode[code]
        const problem = {
            // TODO: default delimiter?
            path: [...state.path].join("/"),
            reason:
                state.config.problems?.[code]?.message(compiledContext) ??
                defaultMessagesByCode[code](compiledContext)
        }
        state.problems.push(problem)
        // TODO: migrate multi-part errors
        this.byPath[problem.path] = problem
    }
}

type dataTypeOfCode<code extends DiagnosticCode> =
    DiagnosticsByCode[code]["data"]["raw"]

export class Stringifiable<Data = unknown> {
    constructor(public raw: Data) {}

    get domain() {
        return domainOf(this.raw)
    }

    toString() {
        return stringSerialize(this.raw)
    }
}

const uncapitalize = (s: string) => s[0].toLowerCase() + s.slice(1)

type UnassignableErrorContext = defineDiagnostic<
    unknown,
    {
        expected: unknown
    }
>

const buildUnassignableError: DiagnosticMessageBuilder<"Unassignable"> = ({
    data,
    expected
}) => `${data} is not assignable to ${expected}.`

type DomainsErrorContext = defineDiagnostic<unknown, { expected: unknown }>

const buildDomainsError: DiagnosticMessageBuilder<"Domains"> = ({
    data,
    expected
}) =>
    `${data} is not assignable to ${
        typeof expected === "object"
            ? Object.keys(expected!).join("|")
            : expected
    }`

export type DiagnosticsByCode = {
    divisibility: DivisibilityContext
    Domains: DomainsErrorContext
    MissingKey: MissingKeyContext
    range: RangeErrorContext
    instanceof: InstanceOfErrorContext
    RegexMismatch: RegexErrorContext
    TupleLength: TupleLengthErrorContext
    Unassignable: UnassignableErrorContext
    Union: UnionErrorContext
}

export type DiagnosticCode = keyof DiagnosticsByCode

export type DiagnosticMessageBuilder<code extends DiagnosticCode> = (
    context: DiagnosticsByCode[code]
) => string

const defaultMessagesByCode: {
    [code in DiagnosticCode]: DiagnosticMessageBuilder<code>
} = {
    divisibility: buildDivisorError,
    Domains: buildDomainsError,
    MissingKey: buildMissingKeyError,
    range: buildRangeError,
    instanceof: buildInstanceOfError,
    RegexMismatch: buildRegexError,
    TupleLength: buildTupleLengthError,
    Unassignable: buildUnassignableError,
    Union: buildUnionError
}

export type defineDiagnostic<data, customContext = {}> = evaluate<
    BaseDiagnosticContext<data> & customContext
>

type BaseDiagnosticContext<data = unknown> = { data: Stringifiable<data> }
