import {
    DivisorErrorContext,
    buildDivisorError
} from "../nodes/rules/divisor.ts"
import { RangeErrorContext, buildRangeError } from "../nodes/rules/range.ts"
import { RegexErrorContext, buildRegexError } from "../nodes/rules/regex.ts"
import {
    MissingKeyDiagnostic,
    buildMissingKeyError
} from "../nodes/rules/subdomain.ts"
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
            reason: defaultMessagesByCode["DivisorViolation"](context as never)
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

type UnassignableErrorContext = {
    actual: unknown
    expected: unknown
}

const buildUnassignableError: DiagnosticMessageBuilder<"Unassignable"> = ({
    actual,
    expected
}) =>
    `${new Stringifiable(actual).toString()} is not assignable to ${expected}.`

// export type DiagnosticsByCode = {
//     Extraneous
//     Custom: CustomDiagnostic
//     TupleLength: TupleLengthDiagnostic
//     Union: UnionDiagnostic
// }

export type DiagnosticsByCode = {
    DivisorViolation: DivisorErrorContext
    MissingKey: MissingKeyDiagnostic
    RangeViolation: RangeErrorContext
    RegexMismatch: RegexErrorContext
    Unassignable: UnassignableErrorContext
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
    Unassignable: buildUnassignableError
}
//TODO custom error
// type("3<number<5").check(0, {
//     diagnostics: {
//         BoundViolation: {
//             message: ({ data, comparator, limit }) =>
//                 `${data} not ${comparator}${limit}`
//         }
//     }
// })
