import type { FlatBound } from "../nodes/rules/range.ts"
import { Scanner } from "../parse/string/shift/scanner.ts"
import { DataWrapper } from "../utils/data.ts"
import type { Domain } from "../utils/domains.ts"
import { domainDescriptions } from "../utils/domains.ts"
import type {
    arraySubclassToReadonly,
    constructor,
    evaluate,
    RegexLiteral,
    requireKeys
} from "../utils/generics.ts"
import { objectKeysOf } from "../utils/generics.ts"
import { isWellFormedInteger } from "../utils/numericLiterals.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import {
    getExactObjectKind,
    objectKindDescriptions
} from "../utils/objectKinds.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type {
    ConstrainedRuleTraversalData,
    TraversalState
} from "./traverse.ts"

export class ArkTypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(`${problems}`)
        this.cause = problems
    }
}

export class Problem<code extends ProblemCode = ProblemCode> {
    parts?: Problem[]

    constructor(
        public code: code,
        public path: Path,
        private data: ProblemData<code>,
        private source: ProblemSource<code>,
        private writers: ProblemWriters<code>
    ) {
        if (this.code === "multi") {
            this.parts = this.source as any
        }
    }

    toString() {
        return this.message
    }

    get message() {
        return this.writers.addContext(this.reason, this.path)
    }

    get reason() {
        return this.writers.writeReason(
            this.mustBe,
            new DataWrapper(this.data) as never
        )
    }

    get mustBe() {
        return typeof this.writers.mustBe === "string"
            ? this.writers.mustBe
            : this.writers.mustBe(this.source)
    }
}

export type AddProblemOptions<data = unknown> = {
    data?: data
    path?: Path
}

class ProblemArray extends Array<Problem> {
    byPath: Record<string, Problem> = {}
    count = 0
    #state: TraversalState

    constructor(state: TraversalState) {
        super()
        this.#state = state
    }

    mustBe(description: string, opts?: AddProblemOptions) {
        return this.add("custom", description, opts)
    }

    add<code extends ProblemCode>(
        code: code,
        source: ProblemSource<code>,
        opts?: AddProblemOptions<ProblemData<code>>
    ): Problem {
        // copy the path to avoid future mutations affecting it
        const path = opts?.path ?? Path.from(this.#state.path)
        const data =
            // we have to check for the presence of the key explicitly since the
            // data could be undefined or null
            opts && "data" in opts
                ? opts.data
                : (this.#state.data as ProblemData<code>)

        const problem = new Problem(
            // avoid a bunch of errors from TS trying to discriminate the
            // problem input based on the code
            code as any,
            path,
            data,
            source,
            this.#state.getProblemConfig(code)
        )
        this.addProblem(problem)
        return problem
    }

    addProblem(problem: Problem) {
        const pathKey = `${problem.path}`
        const existing = this.byPath[pathKey]
        if (existing) {
            if (existing.parts) {
                existing.parts.push(problem)
            } else {
                const problemIntersection = new Problem(
                    "multi" as any,
                    existing.path,
                    (existing as any).data,
                    [existing, problem],
                    this.#state.getProblemConfig("multi")
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

    get summary(): string {
        return `${this}`
    }

    toString() {
        return this.join("\n")
    }

    throw(): never {
        throw new ArkTypeError(this)
    }
}

export const Problems: new (state: TraversalState) => Problems = ProblemArray

export type Problems = arraySubclassToReadonly<ProblemArray>

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

export const domainsToDescriptions = (domains: Domain[]) =>
    domains.map((objectKind) => domainDescriptions[objectKind])

export const objectKindsToDescriptions = (kinds: DefaultObjectKind[]) =>
    kinds.map((objectKind) => objectKindDescriptions[objectKind])

export const describeBranches = (descriptions: string[]) => {
    if (descriptions.length === 0) {
        /* c8 ignore start */
        return "never"
    }
    /* c8 ignore stop */
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

type ProblemSources = {
    divisor: number
    class: constructor
    domain: Domain
    missing: undefined
    extraneous: unknown
    bound: FlatBound
    regex: RegexLiteral
    value: unknown
    multi: Problem[]
    branches: readonly Problem[]
    custom: string
    cases: string[]
}

export type ProblemCode = evaluate<keyof ProblemSources>

export type ProblemSource<code extends ProblemCode = ProblemCode> =
    ProblemSources[code]

type ProblemDataByCode = {
    [code in ProblemCode]: code extends keyof ConstrainedRuleTraversalData
        ? ConstrainedRuleTraversalData[code]
        : unknown
}

export type ProblemData<code extends ProblemCode = ProblemCode> =
    ProblemDataByCode[code]

type ProblemDefinition<code extends ProblemCode> = requireKeys<
    ProblemOptions<code>,
    "mustBe"
>

export type MustBeWriter<code extends ProblemCode> =
    | string
    | ((source: ProblemSources[code]) => string)

export type ReasonWriter<code extends ProblemCode = ProblemCode> = (
    mustBe: string,
    data: DataWrapper<
        code extends keyof ConstrainedRuleTraversalData
            ? ConstrainedRuleTraversalData[code]
            : unknown
    >
) => string

export type ContextWriter = (reason: string, path: Path) => string

const writeDefaultReason = (mustBe: string, was: DataWrapper | string) =>
    `must be ${mustBe}${was && ` (was ${was})`}`

const addDefaultContext: ContextWriter = (reason, path) =>
    path.length === 0
        ? capitalize(reason)
        : path.length === 1 && isWellFormedInteger(path[0])
        ? `Item at index ${path[0]} ${reason}`
        : `${path} ${reason}`

const defaultProblemConfig: {
    [code in ProblemCode]: ProblemDefinition<code>
} = {
    divisor: {
        mustBe: (divisor) =>
            divisor === 1 ? `an integer` : `a multiple of ${divisor}`
    },
    class: {
        mustBe: (expected) => {
            const possibleObjectKind = getExactObjectKind(expected)
            return possibleObjectKind
                ? objectKindDescriptions[possibleObjectKind]
                : `an instance of ${expected.name}`
        },
        writeReason: (mustBe, data) =>
            writeDefaultReason(mustBe, data.className)
    },
    domain: {
        mustBe: (domain) => domainDescriptions[domain],
        writeReason: (mustBe, data) => writeDefaultReason(mustBe, data.domain)
    },
    missing: {
        mustBe: () => "defined",
        writeReason: (mustBe) => writeDefaultReason(mustBe, "")
    },
    extraneous: {
        mustBe: () => "removed",
        writeReason: (mustBe) => writeDefaultReason(mustBe, "")
    },
    bound: {
        mustBe: (bound) =>
            `${Scanner.comparatorDescriptions[bound.comparator]} ${
                bound.limit
            }${bound.units ? ` ${bound.units}` : ""}`,
        writeReason: (mustBe, data) =>
            writeDefaultReason(mustBe, `${data.size}`)
    },
    regex: {
        mustBe: (expression) => `a string matching ${expression}`
    },
    value: {
        mustBe: stringify
    },
    branches: {
        mustBe: (branchProblems) =>
            describeBranches(
                branchProblems.map(
                    (problem) =>
                        `${problem.path} must be ${
                            problem.parts
                                ? describeBranches(
                                      problem.parts.map((part) => part.mustBe)
                                  )
                                : problem.mustBe
                        }`
                )
            ),
        writeReason: (mustBe, data) => `${mustBe} (was ${data})`,
        addContext: (reason, path) =>
            path.length ? `At ${path}, ${reason}` : reason
    },
    multi: {
        mustBe: (problems) => "• " + problems.map((_) => _.mustBe).join("\n• "),
        writeReason: (mustBe, data) => `${data} must be...\n${mustBe}`,
        addContext: (reason, path) =>
            path.length ? `At ${path}, ${reason}` : reason
    },
    custom: {
        mustBe: (mustBe) => mustBe
    },
    cases: {
        mustBe: (cases) => describeBranches(cases)
    }
}

export const problemCodes: readonly ProblemCode[] =
    objectKeysOf(defaultProblemConfig)

const compileDefaultProblemWriters = () => {
    const result = {} as ProblemWritersByCode
    let code: ProblemCode
    for (code of problemCodes) {
        result[code] = {
            mustBe: defaultProblemConfig[code].mustBe as any,
            writeReason:
                defaultProblemConfig[code].writeReason ??
                (writeDefaultReason as any),
            addContext:
                defaultProblemConfig[code].addContext ?? addDefaultContext
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
            writeReason:
                input[code]?.writeReason ??
                defaultProblemConfig[code].writeReason ??
                input.writeReason ??
                (writeDefaultReason as any),
            addContext:
                input[code]?.addContext ??
                defaultProblemConfig[code].addContext ??
                input.addContext ??
                addDefaultContext
        }
    }
    return result
}

export type ProblemOptions<code extends ProblemCode = ProblemCode> = {
    mustBe?: MustBeWriter<code>
    writeReason?: ReasonWriter<code>
    addContext?: ContextWriter
}

export type ProblemsConfig = evaluate<
    {
        writeReason?: ReasonWriter
        addContext?: ContextWriter
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
