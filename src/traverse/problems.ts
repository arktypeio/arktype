import type { ClassProblem } from "../nodes/rules/class.ts"
import type { DivisibilityProblem } from "../nodes/rules/divisor.ts"
import type { RangeProblem } from "../nodes/rules/range.ts"
import type { RegexProblem } from "../nodes/rules/regex.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import type { evaluate, extend } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import type { SerializablePrimitive } from "../utils/serialize.ts"
import { stringify } from "../utils/serialize.ts"
import type {
    MissingKeyProblem,
    ProblemsConfig,
    TraversalState,
    TupleLengthProblem,
    UnionProblem,
    ValueProblem
} from "./check.ts"

export class ArktypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(problems.summary)
        this.cause = problems
    }
}

// TODO: to readonly
export class Problems extends Array<Problem> {
    byPath: Record<string, Problem> = {}

    get summary() {
        if (this.length === 1) {
            const problem = this[0]
            return problem.path.length
                ? `${problem.path} ${uncapitalize(`${problem}`)}`
                : `${problem}`
        }
        return this.map((problem) => `${problem.path}: ${problem}`).join("\n")
    }

    add(problem: Problem) {
        const pathKey = `${problem.path}`
        const existing = this.byPath[pathKey]
        if (existing) {
            if (existing.hasCode("compound")) {
                existing.subproblems.push(problem)
            } else {
                this.byPath[pathKey] = new CompoundProblem(existing, problem)
            }
        } else {
            this.byPath[pathKey] = problem
        }
        // TODO: Should we include multi-part in lists?
        this.push(problem)
    }

    toString() {
        return this.summary
    }

    throw(): never {
        throw new ArktypeError(this)
    }
}

export abstract class Problem<
    code extends ProblemCode = ProblemCode,
    data = any
> {
    path: Path
    config: ProblemsConfig | undefined
    data: Stringifiable<data>

    abstract description: string
    actual?: SerializablePrimitive | Stringifiable

    constructor(code: code, initial: Problem)
    constructor(code: code, state: TraversalState, data: data)
    constructor(
        public code: code,
        contextSource: Problem | TraversalState,
        data?: data
    ) {
        if (contextSource instanceof Problem) {
            this.path = contextSource.path
            this.config = contextSource.config
            this.data = contextSource.data as Stringifiable<data>
        } else {
            // copy path so future mutations don't affect it
            this.path = Path.from(contextSource.path)
            this.config = contextSource.config.problems
            this.data = new Stringifiable(data as data)
        }
    }

    get defaultMessage() {
        let message = `Must be ${this.description}`
        // TODO: Distribute config to codes
        if (!this.config?.[this.code]?.omitActual) {
            message += ` (was ${this.actual ?? this.data})`
        }
        return message
    }

    toString() {
        return this.message
    }

    hasCode<name extends code>(name: name): this is ProblemsByCode[name] {
        return this.code === name
    }

    get message() {
        // const writer = (
        //     typeof this.config === "function"
        //         ? this.config
        //         : this.config?.message
        // ) as ProblemMessageWriter | undefined
        // let result = writer?.(this) ?? this.defaultMessage
        // if (this.branchPath.length) {
        //     const branchIndentation = "  ".repeat(this.branchPath.length)
        //     result = branchIndentation + result
        // }
        // return result
        return this.defaultMessage
    }
}

export class CompoundProblem extends Problem<"compound"> {
    subproblems: Problem[]

    constructor(initial: Problem, intersected: Problem) {
        super("compound", initial)
        this.subproblems = [initial, intersected]
    }

    get description() {
        return "...\n• " + this.subproblems.join("\n• ")
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

type ProblemsByCode = {
    divisibility: DivisibilityProblem
    domain: DomainProblem
    missing: MissingKeyProblem
    range: RangeProblem
    class: ClassProblem
    regex: RegexProblem
    tupleLength: TupleLengthProblem
    union: UnionProblem
    value: ValueProblem
    compound: CompoundProblem
}

export type ProblemCode = evaluate<keyof ProblemsByCode>

export class DomainProblem extends Problem<"domain"> {
    actual: Domain

    constructor(
        public expected: Subdomain[],
        state: TraversalState,
        data: unknown
    ) {
        super("domain", state, data)
        this.actual = domainOf(data)
    }

    get description() {
        return describeSubdomains(this.expected)
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type validateProblems = extend<
    {
        [code in ProblemCode]: Problem<code>
    },
    // if one or more codes is not mapped to a context including its own name,
    // there will be a type error here
    ProblemsByCode
>

export type ProblemMessageWriter<code extends ProblemCode = any> = (
    context: Omit<ProblemsByCode[code], "message">
) => string
