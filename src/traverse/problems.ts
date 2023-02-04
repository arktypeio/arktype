import type { Type } from "../main.ts"
import { Scanner } from "../parse/string/shift/scanner.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import {
    classNameOf,
    domainOf,
    sizeOf,
    subdomainOf,
    unitsOf
} from "../utils/domains.ts"
import type {
    constructor,
    evaluate,
    extend,
    instanceOf,
    requireKeys
} from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type { TraversalState } from "./check.ts"

export class ArkTypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(problems.summary)
        this.cause = problems
    }
}

export class Problem {
    constructor(
        public code: ProblemCode,
        public path: Path,
        public reason: string
    ) {}

    toString() {
        return this.reason
    }
}

class ProblemArray extends Array<Problem> {
    byPath: Record<string, Problem> = {}

    constructor(private state: TraversalState) {
        super()
    }

    add<code extends ProblemCode>(code: code, input: ProblemInput<code>) {
        const context = addStateDerivedContext(code, input, this.state.type)
        const problem: Problem = {
            code,
            // copy the path to avoid mutations affecting it
            path: Path.from(this.state.path),
            reason: writeMessage(context)
        }
        const pathKey = `${this.state.path}`
        const existing = this.byPath[pathKey]
        if (existing) {
            if (existing.code === "multi") {
                existing.reason += `\n• ${problem.reason}`
            } else {
                this.byPath[pathKey] = new Problem(
                    "multi",
                    existing.path,
                    `• ${existing.reason}\n• ${problem.reason}`
                )
            }
        } else {
            this.byPath[pathKey] = problem
        }
        this.push(problem)
    }

    // TODO: add some customization options for this
    get summary() {
        if (this.length === 1) {
            const problem = this[0]
            return problem.path.length
                ? `${problem.path} ${uncapitalize(`${problem.reason}`)}`
                : `${problem.reason}`
        }
        return this.map((problem) => `${problem.path}: ${problem.reason}`).join(
            "\n"
        )
    }

    toString() {
        return this.summary
    }

    throw(): never {
        throw new ArkTypeError(this)
    }
}

export const Problems: new (state: TraversalState) => readonly Problem[] & {
    [k in Exclude<keyof ProblemArray, keyof unknown[]>]: ProblemArray[k]
} = ProblemArray

export type Problems = instanceOf<typeof Problems>

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

// TODO: Split up inputs. Take multiple args, or have data in state?
type ProblemInputs = {
    divisibility: {
        data: number
        rule: {
            divisor: number
        }
    }
    class: {
        data: object
        rule: {
            class: constructor
        }
    }
    domain: {
        data: unknown
        rule: {
            domains: Subdomain[]
        }
    }
    missing: {
        data: undefined
        rule: {
            domains: Domain[]
        }
    }
    range: {
        data: unknown
        rule: {
            comparator: Scanner.Comparator
            limit: number
            size?: number
            units?: string
        }
    }
    regex: {
        data: string
        rule: { regex: RegExp }
    }
    value: {
        data: unknown
        rule: { value: unknown }
    }
    union: {
        data: unknown
        rule: { branches: string }
    }
    multi: {
        data: unknown
        rule: { problems: Problem[] }
    }
}

export type ProblemCode = evaluate<keyof ProblemInputs>

export type ProblemInput<code extends ProblemCode = ProblemCode> =
    ProblemInputs[code]

export const addStateDerivedContext = <code extends ProblemCode>(
    code: code,
    input: ProblemInput<code>,
    type: Type
) => {
    const result = input as ProblemContext
    result.code = code
    result.type = type
    return result as ProblemContext<code>
}

export const writeMessage = <code extends ProblemCode>(
    context: ProblemContext<code>
) => {
    const writers = context.type.config.problems[context.code]
    return writers.reason(
        writers.mustBe(context as never),
        writers.was?.(context as never)
    )
}

export type ProblemOptions<code extends ProblemCode> = {
    mustBe?: RuleWriter<code>
    was?: DataWriter<code> | "omit"
    reason?: ReasonWriter
}

type ProblemDefinition<code extends ProblemCode> = requireKeys<
    ProblemOptions<code>,
    "mustBe"
>

export type ProblemWriterConfig<code extends ProblemCode> = extend<
    Required<ProblemOptions<code>>,
    {
        mustBe: RuleWriter<code>
        was: DataWriter<code>
        reason: ReasonWriter
    }
>

export type RuleWriter<code extends ProblemCode> = (
    context: ProblemInputs[code]["rule"]
) => string

export type DataWriter<code extends ProblemCode> = (
    data: DataWrapper<ProblemInputs[code]["data"]>
) => string

export type ReasonWriter = (rule: string, data: string) => string

export class DataWrapper<value = unknown> {
    constructor(public value: value) {}

    toString() {
        return stringify(this.value)
    }

    get domain() {
        return domainOf(this.value)
    }

    // TODO: object kind?
    get subdomain() {
        return subdomainOf(this.value)
    }

    get size() {
        return sizeOf(this.value)
    }

    get units() {
        return unitsOf(this.value)
    }

    get className() {
        return classNameOf(this.value)
    }
}

const writeDefaultWasDescription: DataWriter<ProblemCode> = (context) =>
    `${context.data}`

const writeDefaultProblemMessage: ReasonWriter = (mustBe, was) =>
    `Must be ${mustBe}${was ? ` (was ${was})` : ""}`

const compileDefaultProblemWriters = (definitions: {
    [code in ProblemCode]: ProblemDefinition<code>
}) => {
    let code: ProblemCode
    for (code in definitions) {
        definitions[code].was ??= writeDefaultWasDescription
        definitions[code].reason = writeDefaultProblemMessage
    }
    return definitions as ProblemsConfig
}

export const defaultProblemWriters = compileDefaultProblemWriters({
    divisibility: {
        mustBe: (input) =>
            input.rule === 1 ? `an integer` : `divisible by ${input.rule}`
    },
    class: {
        mustBe: (rule) => `an instance of ${rule.class.name}`,
        was: (input) => input.data.className
    },
    domain: {
        mustBe: (input) => describeSubdomains(input.rule),
        was: (input) => input.data.domain
    },
    missing: {
        mustBe: (input) => describeSubdomains(input.rule),
        was: "omit"
    },
    range: {
        mustBe: (input) => {
            let description = `${
                Scanner.comparatorDescriptions[input.comparator]
            } ${input.limit}`
            const units = input.units ?? input.data.units
            if (units) {
                description += ` ${units}`
            }
            return description
        },
        was: (input) => `${input.size ?? input.data.size}`
    },
    regex: {
        mustBe: (input) => `a string matching /${input.regex.source}/`
    },
    tupleLength: {
        mustBe: (input) => `exactly ${input.rule} items`,
        was: (input) => `${input.data.value.length}`
    },
    union: {
        mustBe: () => `branches`
    },
    value: {
        mustBe: (input) => stringify(input.rule)
    },
    multi: {
        mustBe: (ctx) => "...\n• " + ctx.rule.join("\n• ")
    }
})

export type ProblemsOptions = evaluate<
    { all?: ProblemOptions<ProblemCode> } & {
        [code in ProblemCode]?: ProblemOptions<code>
    }
>

export type ProblemsConfig = {
    [code in ProblemCode]: ProblemWriterConfig<code>
}

const codes = keysOf(defaultProblemWriters)

// TODO: remove all copy from codes?
export const compileProblemOptions = (
    opts: ProblemsOptions | undefined,
    base = defaultProblemWriters
) => {
    if (!opts) {
        return base
    }
    const { all, ...byCode } = opts
    const result = {} as ProblemsConfig
    let code: ProblemCode
    if (all) {
        for (code of codes) {
            result[code] = {
                ...base[code],
                ...all,
                ...byCode[code]
            } as ProblemWriterConfig<ProblemCode>
        }
    } else {
        for (code of codes) {
            result[code] = (
                byCode[code]
                    ? {
                          ...base[code],
                          ...byCode[code]
                      }
                    : base[code]
            ) as ProblemWriterConfig<ProblemCode>
        }
    }
    return result
}
