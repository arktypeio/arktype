import type { BenchAssertionContext } from "../../dev/attest/src/bench/bench.ts"
import type { UnionErrorContext } from "../nodes/branches.ts"
import { buildUnionError } from "../nodes/branches.ts"
import type { DivisorErrorContext } from "../nodes/rules/divisor.ts"
import { buildDivisorError } from "../nodes/rules/divisor.ts"
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
import { hasKey } from "../utils/generics.ts"
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
        state: CheckState<DiagnosticsByCode[code]["data"]["raw"]>
    ) {
        let customMessage
        if (hasKey(state.config.problems, code)) {
            customMessage = state.config.problems[code].message(context as any)
        }
        state.problems.push({
            path: [...state.path].join("."),
            reason: customMessage ?? defaultMessagesByCode[code](context)
        })
    }
}

export class Stringifiable<Data = unknown> {
    constructor(public raw: Data) {}

    get typeOf() {
        return domainOf(this.raw)
    }

    // TODO: Fix
    toString() {
        return JSON.stringify(this.raw)
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
}) => `${data.toString()} is not assignable to ${expected}.`

export type DiagnosticsByCode = {
    DivisorViolation: DivisorErrorContext
    MissingKey: MissingKeyContext
    RangeViolation: RangeErrorContext
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
    DivisorViolation: buildDivisorError,
    MissingKey: buildMissingKeyError,
    RangeViolation: buildRangeError,
    RegexMismatch: buildRegexError,
    TupleLength: buildTupleLengthError,
    Unassignable: buildUnassignableError,
    Union: buildUnionError
}

export type defineDiagnostic<data, customContext = {}> = evaluate<
    BaseDiagnosticContext<data> & customContext
>

type BaseDiagnosticContext<data = unknown> = { data: Stringifiable<data> }
