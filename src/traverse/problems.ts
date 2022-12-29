import {
    DivisorErrorContext,
    buildDivisorError
} from "../nodes/rules/divisor.ts"
import { RangeErrorContext, buildRangeError } from "../nodes/rules/range.ts"
import { RegexErrorContext, buildRegexError } from "../nodes/rules/regex.ts"
import { type } from "../type.ts"
import { domainOf } from "../utils/domains.ts"
import { CheckState } from "./check.ts"

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
                return `${problem.path} ${uncapitalize(problem.reason)}`
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
        state: CheckState,
        context: DiagnosticsByCode[code]
    ) {
        state.problems.push({
            path: state.path.join(),
            reason: defaultMessagesByCode[code]
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

// export type DiagnosticsByCode = {
//     ExtraneousKeys: ExtraneousKeysDiagnostic
//     MissingKey: MissingKeyDiagnostic
//     Custom: CustomDiagnostic
//     NumberSubtype: NumberSubtypeDiagnostic
//     TupleLength: TupleLengthDiagnostic
//     Union: UnionDiagnostic
// }

type UnassignableErrorContext = {
    actual: unknown
    expected: unknown
}

const buildUnassignableError: DiagnosticMessageBuilder<"Unassignable"> = ({
    actual,
    expected
}) =>
    `${new Stringifiable(actual).toString()} is not assignable to ${expected}.`

const buildCustomError: DiagnosticMessageBuilder<"Custom"> = ({
    message,
    args
}) => {}

type CustomErrorContext = { message: string; args?: { [k: string]: unknown } }

// type("3<number<5").check(0, {
//     diagnostics: {
//         BoundViolation: {
//             message: ({ data, comparator, limit }) =>
//                 `${data} not ${comparator}${limit}`
//         }
//     }
// })
export type DiagnosticsByCode = {
    DivisorViolation: DivisorErrorContext
    RangeViolation: RangeErrorContext
    RegexMismatch: RegexErrorContext
    Unassignable: UnassignableErrorContext
    Custom: CustomErrorContext
}

export type DiagnosticCode = keyof DiagnosticsByCode

export type DiagnosticMessageBuilder<code extends DiagnosticCode> = (
    context: DiagnosticsByCode[code]
) => string

const defaultMessagesByCode: {
    [code in DiagnosticCode]: DiagnosticMessageBuilder<code>
} = {
    DivisorViolation: buildDivisorError,
    RangeViolation: buildRangeError,
    RegexMismatch: buildRegexError,
    Unassignable: buildUnassignableError,
    Custom: buildCustomError
}
