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
import type { constructor, evaluate, replaceProps } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"

// export class ArkTypeError extends TypeError {
//     cause: Problems

//     constructor(problems: Problems) {
//         super(problems.summary)
//         this.cause = problems
//     }
// }

// // TODO: to readonly
// export class Problems extends Array<Problem> {
//     byPath: Record<string, Problem> = {}

//     get summary() {
//         if (this.length === 1) {
//             const problem = this[0]
//             return problem.path.length
//                 ? `${problem.path} ${uncapitalize(`${problem}`)}`
//                 : `${problem}`
//         }
//         return this.map((problem) => `${problem.path}: ${problem}`).join("\n")
//     }

//     toString() {
//         return this.summary
//     }

//     throw(): never {
//         throw new ArkTypeError(this)
//     }
// }

// export abstract class Problem<
//     code extends ProblemCode = ProblemCode,
//     data = any
// > {
//     path: Path
//     config: ProblemsConfig | undefined
//     data: DataWrapper<data>

//     abstract mustBe: string
//     was?: string

//     constructor(code: code, initial: Problem)
//     constructor(code: code, state: TraversalState, rawData: data)
//     constructor(
//         public code: code,
//         contextSource: Problem | TraversalState,
//         data?: data
//     ) {
//         if (contextSource instanceof Problem) {
//             this.path = contextSource.path
//             this.config = contextSource.config
//             this.data = contextSource.data as DataWrapper<data>
//         } else {
//             // copy path so future mutations don't affect it
//             this.path = Path.from(contextSource.path)
//             this.config = contextSource.config.problems
//             this.data = new DataWrapper(data as data)
//         }
//     }

//     toString() {
//         return this.message
//     }

//     hasCode<name extends code>(name: name): this is ProblemsByCode[name] {
//         return this.code === name
//     }

//     get defaultMessage() {
//         let message = `Must be ${this.mustBe}`
//         // TODO: Distribute config to codes
//         if (!this.config?.[this.code]?.omitActual) {
//             message += ` (was ${this.was ?? this.data})`
//         }
//         return message
//     }

//     get message() {
//         // const writer = (
//         //     typeof this.config === "function"
//         //         ? this.config
//         //         : this.config?.message
//         // ) as ProblemMessageWriter | undefined
//         // let result = writer?.(this) ?? this.defaultMessage
//         // if (this.branchPath.length) {
//         //     const branchIndentation = "  ".repeat(this.branchPath.length)
//         //     result = branchIndentation + result
//         // }
//         // return result
//         return this.defaultMessage
//     }
// }

// const uncapitalize = (s: string) => s[0].toLowerCase() + s.slice(1)

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
    divisibility: DivisibilityProblemInput
    class: ClassProblemInput
    domain: DomainProblemInput
    missing: MissingKeyProblemInput
    range: RangeProblemInput
    regex: RegexProblemInput
    tupleLength: TupleLengthProblemInput
    union: UnionProblemInput
    value: ValueProblemInput
    multi: MultiProblemInput
}

export type ProblemCode = evaluate<keyof ProblemInputs>

export type ProblemContexts = {
    [code in ProblemCode]: problemInputToContext<code, ProblemInputs[code]>
}

type problemInputToContext<code extends ProblemCode, input> = evaluate<
    StateDerivedProblemContext<code> & Omit<input, "data">
>

export type StateDerivedProblemContext<code extends ProblemCode> = {
    code: code
    type: Type
    path: Path
    data: DataWrapper<
        "data" extends keyof ProblemInputs[code]
            ? ProblemInputs[code]["data"]
            : undefined
    >
}

export const addStateDerivedContext = <code extends ProblemCode>(
    code: code,
    input: ProblemInput<code>,
    type: Type,
    path: Path
) => {
    const context = input as ProblemContext
    context.code = code
    context.type = type
    // copy path so future mutations don't affect it
    context.path = Path.from(path)
    context.data = new DataWrapper("data" in input ? input.data : undefined)
    return context as ProblemContext<code>
}

export type ProblemContext<code extends ProblemCode = ProblemCode> =
    ProblemContexts[code]

export type DescribedProblemContexts = {
    [code in ProblemCode]: ProblemContexts[code] & {
        mustBe: string
        was?: string
    }
}

export type DescribedProblemContext<code extends ProblemCode = ProblemCode> =
    DescribedProblemContexts[code]

export type ProblemWriterDefinition<code extends ProblemCode> = {
    mustBe: ProblemDescriptionWriter<code>
    was?: ProblemDescriptionWriter<code> | "omit"
    message?: ProblemMessageWriter<code>
}

export type ProblemWriters<code extends ProblemCode> = {
    [k in keyof ProblemWriterDefinition<code>]-?: ProblemWriterDefinition<code>[k]
}

export type ProblemDescriptionWriter<code extends ProblemCode> = (
    input: ProblemContexts[code]
) => string

export type ProblemMessageWriter<code extends ProblemCode> = (
    context: DescribedProblemContexts[code]
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

export type Problem<code extends ProblemCode = ProblemCode> =
    ProblemInputs[code]

export type ProblemInput<code extends ProblemCode = ProblemCode> =
    ProblemInputs[code]

export type MultiProblemInput = {
    data: unknown
    problems: ProblemInput[]
}

export type DomainProblemInput = {
    domains: Subdomain[]
    data: unknown
}

export type ValueProblemInput = {
    value: unknown
    data: unknown
}

export type UnionProblemInput = {
    data: unknown
}

export type TupleLengthProblemInput = {
    length: number
    data: readonly unknown[]
}

export type MissingKeyProblemInput = {
    domains: Domain[]
}

export type RangeProblemInput = {
    comparator: Scanner.Comparator
    limit: number
    data: unknown
    size?: number
    units?: string
}

export type RegexProblemInput = {
    regex: RegExp
    data: string
}

export type DivisibilityProblemInput = {
    data: number
    divisor: number
}

export type ClassProblemInput = {
    class: constructor
    data: object
}

const writeDefaultWasDescription: ProblemDescriptionWriter<ProblemCode> = (
    context
) => `${context.data}`

const writeDefaultProblemMessage: ProblemMessageWriter<ProblemCode> = (
    context
) => `Must be ${context.mustBe}${context.was ? ` (was ${context.was})` : ""}`

const compileProblemWriters = (definitions: {
    [code in ProblemCode]: ProblemWriterDefinition<code>
}) => {
    let code: ProblemCode
    const result = {} as { [code in ProblemCode]: ProblemWriters<code> }
    for (code in definitions) {
        result[code].was ??= writeDefaultWasDescription
        result[code].message = writeDefaultProblemMessage
    }
    return result
}

export const defaultProblemWriters = compileProblemWriters({
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
