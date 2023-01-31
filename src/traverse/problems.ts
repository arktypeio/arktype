import type { ClassProblemContext } from "../nodes/rules/class.ts"
import { writeClassProblem } from "../nodes/rules/class.ts"
import type { DivisibilityContext } from "../nodes/rules/divisor.ts"
import { writeDivisorError } from "../nodes/rules/divisor.ts"
import type { MissingKeyContext } from "../nodes/rules/props.ts"
import { writeMissingKeyError } from "../nodes/rules/props.ts"
import type { RangeProblemContext } from "../nodes/rules/range.ts"
import { writeRangeError } from "../nodes/rules/range.ts"
import type { RegexProblemContext } from "../nodes/rules/regex.ts"
import { writeRegexError } from "../nodes/rules/regex.ts"
import type { TupleLengthProblemContext } from "../nodes/rules/subdomain.ts"
import { writeTupleLengthError } from "../nodes/rules/subdomain.ts"
import type { Subdomain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import type { replaceProps } from "../utils/generics.ts"
import type { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"

export type Problem = {
    path: Path
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
            if (problem.path.length) {
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
}

export class Stringifiable<data = unknown> {
    constructor(public raw: data) {}

    get domain() {
        return domainOf(this.raw)
    }

    toString() {
        return stringify(this.raw)
    }
}

const uncapitalize = (s: string) => s[0].toLowerCase() + s.slice(1)

const writeDomainError: ProblemMessageWriter<"domain"> = ({ data, expected }) =>
    `Must ${describeSubdomains(expected)} (was ${data.domain})`

const describeSubdomains = (subdomains: Subdomain[]) => {
    if (subdomains.length === 1) {
        return subdomainDescriptions[subdomains[0]]
    }
    if (subdomains.length === 0) {
        return "never"
    }
    let description = "either "
    for (let i = 0; i < subdomains.length - 1; i++) {
        description += subdomainDescriptions[subdomains[i]]
        if (i < subdomains.length - 2) {
            description += ", "
        }
    }
    description += ` or ${
        subdomainDescriptions[subdomains[subdomains.length - 1]]
    }`
    return description
}

type DomainProblemContext = defineProblem<{
    code: "domain"
    data: unknown
    expected: Subdomain[]
}>

/** Each Subdomain's completion for the phrase "Must _____" */
const subdomainDescriptions = {
    bigint: "be a bigint",
    boolean: "be boolean",
    null: "be null",
    number: "be a number",
    object: "be an object",
    string: "be a string",
    symbol: "be a symbol",
    undefined: "be undefined",
    Array: "be an array",
    Function: "be a function",
    Date: "extend Date",
    RegExp: "extend RegExp",
    Error: "extend Error",
    Map: "extend Map",
    Set: "extend Set"
} as const satisfies Record<Subdomain, string>

export const writeUnionError: ProblemMessageWriter<"union"> = ({ data }) =>
    `${data} does not satisfy any branches`

export type UnionProblemContext = defineProblem<{
    code: "union"
    data: unknown
    subproblems: Problems[]
}>

export type ProblemInputs = {
    divisibility: DivisibilityContext
    domain: DomainProblemContext
    missing: MissingKeyContext
    range: RangeProblemContext
    class: ClassProblemContext
    regex: RegexProblemContext
    tupleLength: TupleLengthProblemContext
    union: UnionProblemContext
    value: ValueProblemContext
    multi: MultiProblemContext
}

export type BaseProblemInput<
    code extends ProblemCode = ProblemCode,
    data = unknown
> = {
    code: code
    data: data
}

export type ProblemContexts = {
    [k in keyof ProblemInputs]: replaceProps<
        ProblemInputs[k],
        { data: Stringifiable<ProblemInputs[k]["data"]> }
    > & {
        path: Path
    }
}

export type ValueProblemContext = defineProblem<{
    code: "value"
    data: unknown
    expected: Stringifiable
}>

// TODO: write in parts (expected, actual)
const writeValueProblem: ProblemMessageWriter<"value"> = ({ data, expected }) =>
    `Must be ${expected} (was ${data})`

type MultiProblemContext = defineProblem<{
    code: "multi"
    data: unknown
    parts: string[]
}>

const writeMultiError: ProblemMessageWriter<"multi"> = ({ parts }) =>
    "• " + parts.join("\n• ")

export type ProblemCode = keyof ProblemInputs

export type ProblemMessageWriter<code extends ProblemCode = any> = (
    context: ProblemContexts[code]
) => string

export const defaultMessagesByCode = {
    divisibility: writeDivisorError,
    domain: writeDomainError,
    missing: writeMissingKeyError,
    range: writeRangeError,
    class: writeClassProblem,
    regex: writeRegexError,
    tupleLength: writeTupleLengthError,
    union: writeUnionError,
    value: writeValueProblem,
    multi: writeMultiError
} satisfies {
    [code in ProblemCode]: ProblemMessageWriter<code>
} as {
    [code in ProblemCode]: ProblemMessageWriter<any>
}

export type defineProblem<input extends BaseProblemInput> = input
