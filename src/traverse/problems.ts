import type { ClassProblemContext } from "../nodes/rules/class.ts"
import type { DivisibilityContext } from "../nodes/rules/divisor.ts"
import type { MissingKeyContext } from "../nodes/rules/props.ts"
import type { RangeProblemContext } from "../nodes/rules/range.ts"
import type { RegexProblemContext } from "../nodes/rules/regex.ts"
import type { TupleLengthProblemContext } from "../nodes/rules/subdomain.ts"
import type { Subdomain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type {
    defined,
    evaluate,
    extend,
    replaceProps
} from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type { DataTraversalState, ProblemsOptions } from "./check.ts"

export class ArktypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(problems.summary)
        this.cause = problems
    }
}

// TODO: make readonly
export class Problems extends Array<Problem> {
    byPath: Record<string, ProblemContexts[ProblemCode][]> = {}
    state: DataTraversalState | undefined

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

    get messages() {
        this.#assertHasState()
        const problems: Problem[] = []
        for (const path in this.byPath) {
            const contexts = this.byPath[path]
            const firstContext = contexts[0]
            if (contexts.length === 1) {
                problems.push({
                    path: firstContext.path,
                    reason: this.#writeMessage(firstContext)
                })
            } else {
                problems.push({
                    path: firstContext.path,
                    reason: this.#writeMessage({
                        code: "multi",
                        data: firstContext.data as any,
                        path: firstContext.path,
                        parts: contexts.map((context) =>
                            this.#writeMessage(context)
                        ),
                        description: "parts error"
                    })
                })
            }
        }
        return problems
    }

    addProblem<code extends ProblemCode>(input: ProblemInputs[code]) {
        this.#assertHasState()
        const data = new Stringifiable(input.data)
        // copy path so future mutations don't affect it
        const path = Path.from(this.state.path)
        const ctx = Object.assign(input, {
            data,
            path
        }) as unknown as ProblemContexts[ProblemCode]
        const pathKey = `${this.state.path}`
        const existing = this.byPath[pathKey]
        if (existing) {
            existing.push(ctx)
        } else {
            this.byPath[pathKey] = [ctx]
        }
    }

    throw(): never {
        throw new ArktypeError(this)
    }
}

export abstract class Problem<code extends ProblemCode> {
    path: Path
    config: ProblemsOptions[ProblemCode]

    abstract code: code

    constructor(
        private data: ProblemInputs[code]["data"],
        state: DataTraversalState
    ) {
        // copy path so future mutations don't affect it
        this.path = Path.from(state.path)
        this.config = state.config.problems?.[code]
    }

    get data() {
        return new Stringifiable(this.rawData)
    }

    get defaultMessage() {
        let message = `Must be ${this.type.description}`
        if (!this.config.omitActual) {
            if ("actual" in context) {
                message += ` (was ${context.actual})`
            } else if (
                !this.omitActualByDefault &&
                // If we're in a union, don't redundandtly include data (other
                // "actual" context is still included)
                !this.branchPath.length
            ) {
                message += ` (was ${this.data.toString()})`
            }
        }
        return message
    }

    get message() {
        const writer = (
            typeof this.config === "function"
                ? this.config
                : this.config?.message
        ) as ProblemMessageWriter | undefined
        let result = writer?.(this) ?? this.defaultMessage
        if (this.branchPath.length) {
            const branchIndentation = "  ".repeat(this.branchPath.length)
            result = branchIndentation + result
        }
        return result
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

export const describeSubdomains = (subdomains: Subdomain[]) => {
    if (subdomains.length === 1) {
        return subdomainDescriptions[subdomains[0]]
    }
    if (subdomains.length === 0) {
        return "never"
    }
    return describeBranches(
        subdomains.map((subdomain) => subdomainDescriptions[subdomain])
    )
}

const describeBranches = (descriptions: string[]) => {
    let description = "either "
    for (let i = 0; i < descriptions.length - 1; i++) {
        description += descriptions[i]
        if (i < descriptions.length - 2) {
            description += ", "
        }
    }
    description += ` or ${descriptions[descriptions.length - 1]}`
    return description
}

type DomainProblemContext = defineProblem<{
    code: "domain"
    data: unknown
    expected: Subdomain[]
}>

/** Each Subdomain's completion for the phrase "Must be _____" */
export const subdomainDescriptions = {
    bigint: "a bigint",
    boolean: "boolean",
    null: "null",
    number: "a number",
    object: "an object",
    string: "a string",
    symbol: "a symbol",
    undefined: "undefined",
    Array: "an array",
    Function: "a function",
    Date: "a Date",
    RegExp: "a RegExp",
    Error: "an Error",
    Map: "a Map",
    Set: "a Set"
} as const satisfies Record<Subdomain, string>

export type UnionProblemContext = defineProblem<{
    code: "union"
    data: unknown
    subproblems: Problems[]
}>

type ProblemDefinitions = {
    divisibility: DivisibilityContext
    domain: DomainProblemContext
    missing: MissingKeyContext
    range: RangeProblemContext
    class: ClassProblemContext
    regex: RegexProblemContext
    tupleLength: TupleLengthProblemContext
    union: UnionProblemContext
    value: ValueProblemContext
    multi: MultiPartContext
}

export type ProblemCode = keyof ProblemDefinitions

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type validateProblemDefinitions = extend<
    {
        [code in ProblemCode]: ProblemDefinition<code>
    },
    // if one or more codes is not mapped to a context including its own name,
    // there will be a type error here
    ProblemDefinitions
>

export type ProblemInputs = {
    [code in ProblemCode]: evaluate<
        ProblemDefinitions[code] & {
            description: string
        }
    >
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

type MultiPartContext = defineProblem<{
    code: "multi"
    data: unknown
    parts: string[]
}>

export const writeMultiPartError: ProblemMessageWriter<"multi"> = ({ parts }) =>
    "• " + parts.join("\n• ")

export type ProblemMessageWriter<code extends ProblemCode = any> = (
    context: ProblemContexts[code]
) => string

type ProblemDefinition<
    code extends ProblemCode = ProblemCode,
    data = unknown
> = {
    code: code
    data: data
}

export type defineProblem<input extends ProblemDefinition> = input
