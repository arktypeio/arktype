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
import type { evaluate } from "../utils/generics.ts"
import { stringSerialize } from "../utils/serialize.ts"
import type { CheckState } from "./check.ts"

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

    addProblem<code extends ProblemCode>(
        code: code,
        data: unknown,
        context: Omit<ProblemContexts[code], keyof BaseProblemContext>,
        state: CheckState
    ) {
        const compiledContext = Object.assign(context, {
            data: new Stringifiable(data)
        }) as ProblemContexts[code]
        const problemConfig = state.config.problems?.[code]
        const customMessageWriter =
            typeof problemConfig === "function"
                ? (problemConfig as ProblemMessageWriter<code>)
                : problemConfig?.message
        const problem = {
            path: state.path,
            reason:
                customMessageWriter?.(compiledContext) ??
                defaultMessagesByCode[code](compiledContext)
        }
        state.problems.push(problem)
        // TODO: migrate multi-part errors
        this.byPath[problem.path] = problem
    }
}

type codeToData<code extends ProblemCode> = ProblemContexts[code]["data"]["raw"]

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

type DomainProblemContext = defineProblem<
    unknown,
    {
        expected: Subdomain[]
    }
>

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

export type UnionProblemContext = defineProblem<unknown, {}>

export type ProblemContexts = {
    divisibility: DivisibilityContext
    domain: DomainProblemContext
    missing: MissingKeyContext
    range: RangeProblemContext
    class: ClassProblemContext
    regex: RegexProblemContext
    tupleLength: TupleLengthProblemContext
    union: UnionProblemContext
    value: ValueProblemContext
}

export type ValueProblemContext = defineProblem<
    unknown,
    {
        expected: Stringifiable
    }
>

const writeValueProblem: ProblemMessageWriter<"value"> = ({ data, expected }) =>
    `Must be ${expected} (was ${data})`

export type ProblemCode = keyof ProblemContexts

export type ProblemMessageWriter<code extends ProblemCode> = (
    context: ProblemContexts[code]
) => string

const defaultMessagesByCode: {
    [code in ProblemCode]: ProblemMessageWriter<code>
} = {
    divisibility: writeDivisorError,
    domain: writeDomainError,
    missing: writeMissingKeyError,
    range: writeRangeError,
    class: writeClassProblem,
    regex: writeRegexError,
    tupleLength: writeTupleLengthError,
    union: writeUnionError,
    value: writeValueProblem
}

export type defineProblem<data, customContext = {}> = evaluate<
    BaseProblemContext<data> & customContext
>

type BaseProblemContext<data = unknown> = { data: Stringifiable<data> }
