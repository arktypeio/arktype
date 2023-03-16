import type { BoundWithUnits } from "../nodes/rules/range.ts"
import type { SizedData } from "../utils/data.ts"
import { DataWrapper } from "../utils/data.ts"
import type { Domain } from "../utils/domains.ts"
import { domainDescriptions } from "../utils/domains.ts"
import type {
    arraySubclassToReadonly,
    constructor,
    evaluate,
    optionalizeKeys,
    requireKeys
} from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import { isWellFormedInteger } from "../utils/numericLiterals.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { objectKindDescriptions } from "../utils/objectKinds.ts"
import type { Path } from "../utils/paths.ts"

export class ArkTypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(`${problems}`)
        this.cause = problems
    }
}

export abstract class Problem<data = unknown> {
    data: DataWrapper<data>

    abstract mustBe: string

    constructor(public code: ProblemCode, data: data, public path: Path) {
        this.data = new DataWrapper(data)
    }

    hasCode<code extends ProblemCode>(code: code): this is Problem<code> {
        // doesn't make much sense we have to cast this, but alas
        return this.code === (code as ProblemCode)
    }

    get message() {
        return this.path.length === 0
            ? capitalize(this.reason)
            : this.path.length === 1 && isWellFormedInteger(this.path[0])
            ? `Item at index ${this.path[0]} ${this.reason}`
            : `${this.path} ${this.reason}`
    }

    get reason() {
        return `must be ${this.mustBe}${this.was ? ` ( was ${this.was})` : ""}`
    }

    get was() {
        return `${this.data}`
    }

    toString() {
        return this.message
    }
}

class ProblemArray extends Array<Problem> {
    byPath: Record<string, Problem> = {}
    count = 0

    add(problem: Problem) {
        const pathKey = `${problem.path}`
        const existing = this.byPath[pathKey]
        if (existing) {
            if (existing.hasCode("intersection")) {
                existing.context.parts.push(problem)
                existing.reason += "also"
            } else {
                const problemIntersection = new Problem(
                    "intersection",
                    "multi",
                    { ...existing.context, parts: [existing, problem] }
                )
                const existingIndex = this.indexOf(existing)
                // If existing is found (which it always should be unless this was externally mutated),
                // replace it with the new problem intersection. In case it isn't for whatever reason,
                // just append the intersection.
                this[existingIndex === -1 ? this.length : existingIndex] =
                    problemIntersection
                this.byPath[pathKey] = problemIntersection
            }
        } else {
            this.byPath[pathKey] = problem
            this.push(problem)
        }
        this.count++
    }

    get summary() {
        return this.toString()
    }

    toString() {
        return this.join("\n")
    }

    throw(): never {
        throw new ArkTypeError(this)
    }
}

export const Problems: new () => Problems = ProblemArray

export type Problems = arraySubclassToReadonly<ProblemArray>

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

export const domainsToDescriptions = (domains: Domain[]) =>
    domains.map((objectKind) => domainDescriptions[objectKind])

export const objectKindsToDescriptions = (kinds: DefaultObjectKind[]) =>
    kinds.map((objectKind) => objectKindDescriptions[objectKind])

export const describeBranches = (descriptions: string[]) => {
    if (descriptions.length === 0) {
        return "never"
    }
    if (descriptions.length === 1) {
        return descriptions[0]
    }
    let description = ""
    for (let i = 0; i < descriptions.length - 1; i++) {
        description += descriptions[i]
        if (i < descriptions.length - 2) {
            description += ", "
        }
    }
    description += ` or ${descriptions[descriptions.length - 1]}`
    return description
}

type ProblemInput = {
    divisor: [divisor: number]
    instanceOf: [constructor: constructor]
    domain: [domain: Domain]
    missing: []
    extraneous: []
    range: [bound: BoundWithUnits]
    regex: [source: string]
    value: [expectedValue: unknown]
    intersection: [parts: (string | Problem)[]]
    union: [parts: (string | Problem)[]]
    custom: [mustBe: string]
}

type ProblemPrerequisites = {
    divisor: number
    instanceOf: object
    range: SizedData
    regex: string
}

type ProblemData<code extends ProblemCode> =
    code extends keyof ProblemPrerequisites
        ? ProblemPrerequisites[code]
        : unknown

type ProblemContext = {
    mustBe: string
    was: string
}

export type ProblemCode = evaluate<keyof ProblemInput>

export type ProblemWriter<code extends ProblemCode> = {
    mustBe: (...args: ProblemInput[code]) => string
    was: undefined | ((data: DataWrapper<ProblemData<code>>) => string)
    join: (mustBe: string, was: string) => string
}

export type ProblemWriterConfig<code extends ProblemCode> = optionalizeKeys<
    ProblemWriter<code>,
    "was" | "join"
>

export const defineProblemConfig = <code extends ProblemCode>(
    code: code,
    writers: ProblemWriterConfig<code>
): ProblemWriter<code> => ({
    was: (data) => `${data}`,
    join: (mustBe, was) => `must be ${mustBe}${was ? ` ( was ${was})` : ""}`,
    ...writers
})

export type DefaultProblemConfig<code extends ProblemCode> = requireKeys<
    ProblemOptions<code>,
    "mustBe"
>

// const defaultProblemConfig: {
//     [code in ProblemCode]: DefaultProblemConfig<code>
// } = {
//     domain: {
//         mustBe: ({ domain }) => domainDescriptions[domain],
//         was: ({ domain }) => domain
//     },
//     union: {
//         mustBe: ({ parts: problems }) =>
//             describeBranches(
//                 problems.map((problem) =>
//                     typeof problem === "string"
//                         ? `must be ${problem}`
//                         : `${problem.path} must be ${
//                               problem.hasCode("intersection")
//                                   ? describeBranches(
//                                         problem.context.parts.map((part) =>
//                                             typeof part === "string"
//                                                 ? part
//                                                 : part.context.mustBe
//                                         )
//                                     )
//                                   : problem.context.mustBe
//                           }`
//                 )
//             ),
//         writeReason: ({ mustBe, path, was }) =>
//             path.length
//                 ? `At ${path}, ${mustBe} (was ${was})`
//                 : `${mustBe} (was ${was})`
//     },
//     intersection: {
//         mustBe: ({ parts }) =>
//             "• " +
//             parts
//                 .map((part) =>
//                     typeof part === "string" ? part : part.context.mustBe
//                 )
//                 .join("\n• "),
//         writeReason: ({ mustBe, data, path }) => {
//             const description = `${data} must be...\n${mustBe}`
//             return path.length ? `At ${path}, ${description}` : description
//         }
//     },
//     custom: {
//         mustBe: ({ mustBe }) => mustBe
//     }
// }

export const problemCodes: readonly ProblemCode[] = keysOf(defaultProblemConfig)

const compileDefaultProblemWriters = () => {
    const result = {} as ProblemWritersByCode
    let code: ProblemCode
    for (code of problemCodes) {
        result[code] = {
            mustBe: defaultProblemConfig[code].mustBe as any,
            writeReason:
                defaultProblemConfig[code].writeReason ??
                (writeDefaultReason as any),
            was: (defaultProblemConfig[code].was as any) ?? describeDefaultWas
        }
    }
    return result
}

export const defaultProblemWriters = compileDefaultProblemWriters()

export const compileProblemWriters = (
    input: ProblemsConfig | undefined
): ProblemWritersByCode => {
    if (!input) {
        return defaultProblemWriters
    }
    const result = {} as ProblemWritersByCode
    for (const code of problemCodes) {
        result[code] = {
            mustBe:
                input[code]?.mustBe ??
                (defaultProblemConfig[code].mustBe as any),
            was:
                input[code]?.was ??
                defaultProblemConfig[code].was ??
                (describeDefaultWas as any),
            writeReason:
                input[code]?.writeReason ??
                input.writeReason ??
                defaultProblemConfig[code].writeReason ??
                (writeDefaultReason as any)
        }
    }
    return result
}

export type ProblemOptions<code extends ProblemCode = ProblemCode> = {
    mustBe?: DescribeRequirement<code>
    writeReason?: WriteReason<code>
    was?: DescribeWas<code>
}

export type ProblemsConfig = evaluate<
    {
        writeReason?: WriteReason
    } & ProblemsConfigByCode
>

export type ProblemsConfigByCode = {
    [code in ProblemCode]?: ProblemOptions<code>
}

export type ProblemWritersByCode = {
    [code in ProblemCode]: ProblemWriters<code>
}

export type ProblemWriters<code extends ProblemCode = ProblemCode> = Required<
    ProblemOptions<code>
>
