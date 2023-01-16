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
import type { Domain } from "../utils/domains.ts"
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
        context: Omit<ProblemContexts[code], keyof BaseProblemContext>,
        state: CheckState<codeToData<code>>
    ) {
        const compiledContext = Object.assign(context, {
            data: new Stringifiable(state.data)
        }) as ProblemContexts[code]
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

type UnassignableErrorContext = defineProblem<
    unknown,
    {
        expected: unknown
    }
>

const buildUnassignableError: ProblemMessageBuilder<"Unassignable"> = ({
    data,
    expected
}) => `${data} is not assignable to ${expected}.`

type DomainContext = defineProblem<unknown, { expected: Domain[] }>

const buildDomainError: ProblemMessageBuilder<"domain"> = ({
    data,
    expected
}) => `Must be ${describeDomains(expected)} (was ${data.domain})`

const describeDomains = (domains: Domain[]) => {
    if (domains.length === 1) {
        return domainDescriptions[domains[0]]
    }
    if (domains.length === 0) {
        return "never"
    }
    let description = "either "
    for (let i = 0; i < domains.length - 1; i++) {
        description += domainDescriptions[domains[i]]
        if (i < domains.length - 2) {
            description += ", "
        }
    }
    description += `or ${domainDescriptions[domains[domains.length - 1]]}`
    return description
}

/** Each domain's completion for the phrase "Must be _____" */
const domainDescriptions: Record<Domain, string> = {
    bigint: "a bigint",
    boolean: "boolean",
    null: "null",
    number: "a number",
    object: "an object",
    string: "a string",
    symbol: "a symbol",
    undefined: "undefined"
}

export type ProblemContexts = {
    divisibility: DivisibilityContext
    domain: DomainContext
    MissingKey: MissingKeyContext
    range: RangeErrorContext
    instanceof: InstanceOfErrorContext
    RegexMismatch: RegexErrorContext
    TupleLength: TupleLengthErrorContext
    Unassignable: UnassignableErrorContext
    Union: UnionErrorContext
}

export type ProblemCode = keyof ProblemContexts

export type ProblemMessageBuilder<code extends ProblemCode> = (
    context: ProblemContexts[code]
) => string

const defaultMessagesByCode: {
    [code in ProblemCode]: ProblemMessageBuilder<code>
} = {
    divisibility: buildDivisorError,
    domain: buildDomainError,
    MissingKey: buildMissingKeyError,
    range: buildRangeError,
    instanceof: buildInstanceOfError,
    RegexMismatch: buildRegexError,
    TupleLength: buildTupleLengthError,
    Unassignable: buildUnassignableError,
    Union: buildUnionError
}

export type defineProblem<data, customContext = {}> = evaluate<
    BaseProblemContext<data> & customContext
>

type BaseProblemContext<data = unknown> = { data: Stringifiable<data> }
