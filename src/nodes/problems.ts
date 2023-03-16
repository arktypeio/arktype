import type { RangeProblem } from "../nodes/rules/range.ts"
import { DataWrapper } from "../utils/data.ts"
import type { Domain } from "../utils/domains.ts"
import { domainDescriptions } from "../utils/domains.ts"
import type {
    arraySubclassToReadonly,
    conform,
    evaluate
} from "../utils/generics.ts"
import { isWellFormedInteger } from "../utils/numericLiterals.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { objectKindDescriptions } from "../utils/objectKinds.ts"
import type { Path } from "../utils/paths.ts"
import type { DivisorProblem } from "./rules/divisor.ts"
import type { InstanceProblem } from "./rules/instance.ts"
import type { ExtraneousProblem, MissingProblem } from "./rules/props.ts"
import type { RegexProblem } from "./rules/regex.ts"
import type { ValueProblem } from "./rules/value.ts"

export class ArkTypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(`${problems}`)
        this.cause = problems
    }
}

export abstract class Problem<data = unknown> {
    data: DataWrapper<data>

    abstract readonly code: ProblemCode
    abstract mustBe: string

    constructor(data: data, public path: Path) {
        this.data = new DataWrapper(data)
    }

    hasCode<code extends ProblemCode>(
        code: code
    ): this is ProblemsByCode[code] {
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

type ProblemsByCode = defineProblemsByCode<{
    divisor: DivisorProblem
    instance: InstanceProblem
    missing: MissingProblem
    extraneous: ExtraneousProblem
    range: RangeProblem
    regex: RegexProblem
    value: ValueProblem
}>

type defineProblemsByCode<
    problems extends {
        [code in keyof problems]: conform<
            problems[code],
            { readonly code: code }
        >
    }
> = problems

type ProblemInput = {
    domain: [domain: Domain]
    intersection: [parts: (string | Problem)[]]
    union: [parts: (string | Problem)[]]
    custom: [mustBe: string]
}

export type ProblemCode = evaluate<keyof ProblemsByCode>

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
