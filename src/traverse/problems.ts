import type { FlatBound } from "../nodes/rules/range.ts"
import { Scanner } from "../parse/string/shift/scanner.ts"
import { DataWrapper } from "../utils/data.ts"
import type { Domain } from "../utils/domains.ts"
import { domainDescriptions } from "../utils/domains.ts"
import type {
    arraySubclassToReadonly,
    constructor,
    evaluate,
    instanceOf,
    keyOf,
    RegexLiteral,
    requireKeys
} from "../utils/generics.ts"
import { isWellFormedInteger } from "../utils/numericLiterals.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { objectKindDescriptions } from "../utils/objectKinds.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type {
    ConstrainedRuleTraversalData,
    TraversalState
} from "./traverse.ts"

export class ArkTypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(problems.summary)
        this.cause = problems
    }
}

export class Problem<code extends ProblemCode = any> {
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
        return this.writers.mustBe(this.source)
    }
}

export type AddProblemOptions<code extends ProblemCode = ProblemCode> = {
    data?: ProblemData<code>
    path?: Path
}

class ProblemArray extends Array<Problem> {
    byPath: Record<string, Problem> = {}
    #state: TraversalState

    constructor(state: TraversalState) {
        super()
        this.#state = state
    }

    create<code extends ProblemCode>(
        code: code,
        source: ProblemSource<code>,
        opts?: AddProblemOptions<code>
    ): false {
        // copy the path to avoid future mutations affecting it
        const path = opts?.path ?? Path.from(this.#state.path)
        const data =
            // we have to check for the presence of the key explicitly since the
            // data could be undefined or null
            opts && "data" in opts
                ? opts.data
                : (this.#state.data as ProblemData<code>)
        return this.add(
            new Problem(
                code,
                path,
                data,
                source,
                this.#state.getConfigForProblemCode(code)
            )
        )
    }

    add(problem: Problem): false {
        const pathKey = `${problem.path}`
        const existing = this.byPath[pathKey]
        if (existing) {
            if (existing.parts) {
                existing.parts.push(problem)
            } else {
                const problemIntersection = new Problem(
                    "multi",
                    existing.path,
                    (existing as any).data,
                    [existing, problem],
                    this.#state.getConfigForProblemCode("multi")
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
        return false
    }

    get summary() {
        return this.join("\n")
    }

    toString() {
        return this.summary
    }

    throw(): never {
        throw new ArkTypeError(this)
    }
}

export const Problems: new (
    state: TraversalState
) => arraySubclassToReadonly<ProblemArray> = ProblemArray

export type Problems = instanceOf<typeof Problems>

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

export const describeDomains = (domains: Domain[]) => {
    if (domains.length === 1) {
        return domainDescriptions[domains[0]]
    }
    if (domains.length === 0) {
        return "never"
    }
    return describeBranches(
        domains.map((objectKind) => domainDescriptions[objectKind])
    )
}

export const describeBranches = (descriptions: string[]) => {
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
    class: DefaultObjectKind | constructor
    domain: Domain
    domainBranches: Domain[]
    missing: undefined
    bound: FlatBound
    regex: RegexLiteral
    value: unknown
    valueBranches: unknown[]
    multi: Problem[]
    branches: readonly Problem[]
}

export type ProblemCode = keyOf<ProblemSources>

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

export type MustBeWriter<code extends ProblemCode> = (
    source: ProblemSources[code]
) => string

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

const compileDefaultProblemWriters = (definitions: {
    [code in ProblemCode]: ProblemDefinition<code>
}) => {
    let code: ProblemCode
    for (code in definitions) {
        definitions[code].writeReason ??= writeDefaultReason
        definitions[code].addContext ??= addDefaultContext
    }
    return definitions as DefaultProblemsWriters
}

export const defaultProblemWriters = compileDefaultProblemWriters({
    divisor: {
        mustBe: (divisor) =>
            divisor === 1 ? `an integer` : `a multiple of ${divisor}`
    },
    class: {
        mustBe: (expected) =>
            typeof expected === "string"
                ? objectKindDescriptions[expected]
                : `an instance of ${expected.name}`,
        writeReason: (mustBe, data) =>
            writeDefaultReason(mustBe, data.className)
    },
    domain: {
        mustBe: (domain) => domainDescriptions[domain],
        writeReason: (mustBe, data) => writeDefaultReason(mustBe, data.domain)
    },
    domainBranches: {
        mustBe: (domains) => describeDomains(domains),
        writeReason: (mustBe, data) => writeDefaultReason(mustBe, data.domain)
    },
    missing: {
        mustBe: () => "defined",
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
    valueBranches: {
        mustBe: (values) => describeBranches(values.map(stringify))
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
    }
})

export type ProblemOptions<code extends ProblemCode = ProblemCode> = {
    mustBe?: MustBeWriter<code>
    writeReason?: ReasonWriter<code>
    addContext?: ContextWriter
}

export type ProblemsConfig = evaluate<
    { defaults?: ProblemOptions<ProblemCode> } & {
        [code in ProblemCode]?: ProblemOptions<code>
    }
>

export type DefaultProblemsWriters = {
    [code in ProblemCode]: ProblemWriters<code>
}

export type ProblemWriters<code extends ProblemCode> = Required<
    ProblemOptions<code>
>
