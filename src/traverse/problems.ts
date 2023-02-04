import type { FlatBound } from "../nodes/rules/range.ts"
import { Scanner } from "../parse/string/shift/scanner.ts"
import type { Subdomain } from "../utils/domains.ts"
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
    instanceOf,
    requireKeys
} from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type { ConstrainedRuleData, TraversalState } from "./check.ts"

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

    add<code extends ProblemCode>(
        code: code,
        data: ProblemDataInput<code>,
        input: ProblemRuleInput<code>
    ) {
        const problem: Problem = {
            code,
            // copy the path to avoid mutations affecting it
            path: Path.from(this.state.path),
            reason: writeReason(
                data,
                input,
                this.state.type.config.problems[code]
            )
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

type ProblemRuleInputs = {
    divisor: number
    class: constructor
    domain: Subdomain
    domains: Subdomain[]
    missing: undefined
    range: FlatBound
    regex: RegExp
    value: unknown
    multi: Problem[]
    branches: Problem[]
}

export type ProblemCode = evaluate<keyof ProblemRuleInputs>

export type ProblemRuleInput<code extends ProblemCode = ProblemCode> =
    ProblemRuleInputs[code]

type ProblemDataInputs = {
    [code in ProblemCode]: code extends keyof ConstrainedRuleData
        ? ConstrainedRuleData[code]
        : unknown
}

export type ProblemDataInput<code extends ProblemCode = ProblemCode> =
    ProblemDataInputs[code]

export const writeReason = <code extends ProblemCode>(
    data: ProblemDataInput<code>,
    rule: ProblemRuleInput<code>,
    writers: ProblemWriterConfig<code>
) => {
    return writers.reason(
        writers.mustBe(rule as never),
        writers.was(new DataWrapper(data) as never)
    )
}

export type ProblemOptions<code extends ProblemCode> = {
    mustBe?: RuleWriter<code>
    was?: DataWriter<code>
    reason?: ReasonWriter
}

type ProblemDefinition<code extends ProblemCode> = requireKeys<
    ProblemOptions<code>,
    "mustBe"
>

export type ProblemWriterConfig<code extends ProblemCode> = Required<
    ProblemOptions<code>
>

export type RuleWriter<code extends ProblemCode> = (
    context: ProblemRuleInputs[code]
) => string

export type DataWriter<code extends ProblemCode> = (
    data: DataWrapper<
        code extends keyof ConstrainedRuleData
            ? ConstrainedRuleData[code]
            : unknown
    >
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

const writeDefaultWasDescription: DataWriter<any> = (data) => `${data}`

const writeDefaultProblemMessage: ReasonWriter = (mustBe, was) =>
    `Must be ${mustBe}${was && ` (was ${was})`}`

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
    divisor: {
        mustBe: (divisor) =>
            divisor === 1 ? `an integer` : `divisible by ${divisor}`
    },
    class: {
        mustBe: (constructor) => `an instance of ${constructor.name}`,
        was: (data) => data.className
    },
    domain: {
        mustBe: (domain) => subdomainDescriptions[domain],
        was: (data) => data.domain
    },
    domains: {
        mustBe: (domains) => describeSubdomains(domains),
        was: (data) => data.domain
    },
    missing: {
        mustBe: () => "defined",
        was: () => ""
    },
    range: {
        mustBe: (bound) =>
            `${Scanner.comparatorDescriptions[bound.comparator]} ${
                bound.limit
            }${bound.units && " " + bound.units}`,

        was: (data) => `${data.size}`
    },
    regex: {
        mustBe: (regex) => `a string matching /${regex.source}/`
    },
    branches: {
        mustBe: () => `branches`
    },
    value: {
        mustBe: (value) => stringify(value)
    },
    multi: {
        mustBe: (problems) => "...\n• " + problems.join("\n• ")
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
            } as ProblemWriterConfig<any>
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
            ) as ProblemWriterConfig<any>
        }
    }
    return result
}
