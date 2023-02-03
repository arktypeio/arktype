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
    requireKeys
} from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"

export class ArkTypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(problems.summary)
        this.cause = problems
    }
}

// TODO: convert to class with toString?
export type Problem = {
    path: Path
    code: ProblemCode
    reason: string
}

export class Problems extends Array<Problem> {
    byPath: Record<string, Problem> = {}

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

type ProblemInputs = {
    divisibility: {
        data: number
        divisor: number
    }

    class: {
        class: constructor
        data: object
    }
    domain: {
        domains: Subdomain[]
        data: unknown
    }
    missing: {
        domains: Domain[]
    }
    range: {
        comparator: Scanner.Comparator
        limit: number
        data: unknown
        size?: number
        units?: string
    }
    regex: {
        regex: RegExp
        data: string
    }
    tupleLength: {
        length: number
        data: readonly unknown[]
    }
    union: {
        data: unknown
    }
    value: {
        value: unknown
        data: unknown
    }
    multi: {
        data: unknown
        problems: ProblemInput[]
    }
}

export type ProblemInput<code extends ProblemCode = ProblemCode> =
    ProblemInputs[code]

export type ProblemCode = evaluate<keyof ProblemInputs>

export type ProblemContexts = {
    [code in ProblemCode]: evaluate<
        StateDerivedProblemContext<code> & Omit<ProblemInputs[code], "data">
    >
}

export type StateDerivedProblemContext<code extends ProblemCode> = {
    code: code
    type: Type
    data: DataWrapper<
        "data" extends keyof ProblemInputs[code]
            ? ProblemInputs[code]["data"]
            : undefined
    >
}

export const addStateDerivedContext = <code extends ProblemCode>(
    code: code,
    input: ProblemInput<code>,
    type: Type
) => {
    const result = input as ProblemContext
    result.code = code
    result.type = type
    result.data = new DataWrapper("data" in input ? input.data : undefined)
    return result as ProblemContext<code>
}

export type ProblemContext<code extends ProblemCode = ProblemCode> =
    ProblemContexts[code]

export type DescribedProblemContexts = {
    [code in ProblemCode]: ProblemContexts[code] & {
        mustBe: string
        was?: string
    }
}

export const writeMessage = <code extends ProblemCode>(
    context: ProblemContext<code>
) => {
    const writers = context.type.config.problems[context.code]
    return writers.message(
        writers.mustBe(context as never),
        writers.was?.(context as never)
    )
}

export type ProblemOptions<code extends ProblemCode> = {
    mustBe: ProblemDescriptionWriter<code>
    was?: ProblemDescriptionWriter<code> | "omit"
    message?: ProblemMessageWriter
}

type ProblemDefinition<code extends ProblemCode> = requireKeys<
    ProblemOptions<code>,
    "mustBe"
>

export type ProblemWriterConfig<code extends ProblemCode> = extend<
    ProblemOptions<code>,
    {
        mustBe: ProblemDescriptionWriter<code>
        was?: ProblemDescriptionWriter<code>
        message: ProblemMessageWriter
    }
>

export type ProblemDescriptionWriter<code extends ProblemCode> = (
    input: ProblemContexts[code]
) => string

export type ProblemMessageWriter = (
    mustBe: string,
    was: string | undefined
) => string

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

const writeDefaultWasDescription: ProblemDescriptionWriter<ProblemCode> = (
    context
) => `${context.data}`

const writeDefaultProblemMessage: ProblemMessageWriter = (mustBe, was) =>
    `Must be ${mustBe}${was ? ` (was ${was})` : ""}`

const compileDefaultProblemWriters = (definitions: {
    [code in ProblemCode]: ProblemDefinition<code>
}) => {
    let code: ProblemCode
    for (code in definitions) {
        definitions[code].was ??= writeDefaultWasDescription
        definitions[code].message = writeDefaultProblemMessage
    }
    return definitions as ProblemsConfig
}

export const defaultProblemWriters = compileDefaultProblemWriters({
    divisibility: {
        mustBe: (input) =>
            input.divisor === 1 ? `an integer` : `divisible by ${input.divisor}`
    },
    class: {
        mustBe: (input) => `an instance of ${input.class.name}`,
        was: (input) => input.data.className
    },
    domain: {
        mustBe: (input) => describeSubdomains(input.domains),
        was: (input) => input.data.domain
    },
    missing: {
        mustBe: (input) => describeSubdomains(input.domains),
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
        mustBe: (input) => `exactly ${input.length} items`,
        was: (input) => `${input.data.value.length}`
    },
    union: {
        mustBe: () => `branches`
    },
    value: {
        mustBe: (input) => stringify(input.value)
    },
    multi: {
        mustBe: (ctx) => "...\n• " + ctx.problems.join("\n• ")
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
