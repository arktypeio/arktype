import type { FlatBound } from "../nodes/rules/range.ts"
import { Scanner } from "../parse/string/shift/scanner.ts"
import type { Domain } from "../utils/domains.ts"
import { domainDescriptions, domainOf } from "../utils/domains.ts"
import type {
    constructor,
    evaluate,
    evaluateObject,
    instanceOf,
    requireKeys
} from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { objectKindDescriptions, objectKindOf } from "../utils/objectKinds.ts"
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

export class Problem {
    constructor(
        public code: ProblemCode,
        public path: Path,
        private data: ProblemDataInput,
        private rule: ProblemRuleInput,
        private writers: ProblemWriterConfig<any>
    ) {}

    toString() {
        return this.message
    }

    get message() {
        return this.writers.message(this.reason, this.path)
    }

    get reason() {
        return this.writers.reason(this.mustBe, this.was)
    }

    get mustBe() {
        return this.writers.mustBe(this.rule)
    }

    get was() {
        return this.writers.was(new DataWrapper(this.data) as never)
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
        const problem: Problem = new Problem(
            code,
            // copy the path to avoid future mutations affecting it
            Path.from(this.state.path),
            data,
            input,
            this.state.type.meta.problems[code]
        )
        const pathKey = `${this.state.path}`
        // TODO: Fix multi
        // const existing = this.byPath[pathKey]
        // if (existing) {
        //     if (existing.code === "multi") {
        //         existing.message += `\n• ${problem.message}`
        //     } else {
        //         this.byPath[pathKey] = new Problem(
        //             "multi",
        //             existing.path,
        //             `• ${existing.message}\n• ${problem.message}`
        //         )
        //     }
        // } else {
        // }
        this.byPath[pathKey] = problem
        this.push(problem)
    }

    get summary() {
        if (this.length === 1) {
            return this[0].message
        }
        return this.join("\n")
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

type ProblemRuleInputs = {
    divisor: number
    class: constructor
    domain: Domain
    domainBranches: Domain[]
    objectKind: DefaultObjectKind
    missing: undefined
    bound: FlatBound
    regex: RegExp
    value: unknown
    valueBranches: unknown[]
    multi: string[]
    branches: Problem[]
}

export type ProblemCode = evaluate<keyof ProblemRuleInputs>

export type ProblemRuleInput<code extends ProblemCode = ProblemCode> =
    ProblemRuleInputs[code]

type ProblemDataInputs = {
    [code in ProblemCode]: code extends keyof ConstrainedRuleTraversalData
        ? ConstrainedRuleTraversalData[code]
        : unknown
}

export type ProblemDataInput<code extends ProblemCode = ProblemCode> =
    ProblemDataInputs[code]

export type ProblemOptions<code extends ProblemCode> = {
    mustBe?: RuleWriter<code>
    was?: DataWriter<code>
    reason?: ReasonWriter
    message?: MessageWriter
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
        code extends keyof ConstrainedRuleTraversalData
            ? ConstrainedRuleTraversalData[code]
            : unknown
    >
) => string

export type ReasonWriter = (rule: string, data: string) => string

export type MessageWriter = (reason: string, path: Path) => string

export class DataWrapper<value = unknown> {
    constructor(public value: value) {}

    toString() {
        return stringify(this.value)
    }

    get domain() {
        return domainOf(this.value)
    }

    get objectKind() {
        return objectKindOf(this.value) ?? "non-object"
    }

    get size() {
        return typeof this.value === "string" || Array.isArray(this.value)
            ? this.value.length
            : typeof this.value === "number"
            ? this.value
            : 0
    }

    get units() {
        return typeof this.value === "string"
            ? "characters"
            : Array.isArray(this.value)
            ? "items"
            : ""
    }

    get className() {
        return Object(this.value).constructor.name
    }
}

const writeDefaultWasDescription: DataWriter<any> = (data) => `${data}`

const writeDefaultProblemReason: ReasonWriter = (mustBe, was) =>
    `must be ${mustBe}${was && ` (was ${was})`}`

const writeDefaultProblemMessage: MessageWriter = (reason, path) =>
    path.length ? `${path} ${reason}` : capitalize(reason)

const compileDefaultProblemWriters = (definitions: {
    [code in ProblemCode]: ProblemDefinition<code>
}) => {
    let code: ProblemCode
    for (code in definitions) {
        definitions[code].was ??= writeDefaultWasDescription
        definitions[code].reason ??= writeDefaultProblemReason
        definitions[code].message ??= writeDefaultProblemMessage
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
        mustBe: (domain) => domainDescriptions[domain],
        was: (data) => data.domain
    },
    domainBranches: {
        mustBe: (domains) => describeDomains(domains),
        was: (data) => data.domain
    },
    objectKind: {
        mustBe: (kind: DefaultObjectKind) => objectKindDescriptions[kind],
        was: (data) => data.objectKind
    },
    missing: {
        mustBe: () => "defined",
        was: () => ""
    },
    bound: {
        mustBe: (bound) =>
            `${Scanner.comparatorDescriptions[bound.comparator]} ${
                bound.limit
            }${bound.units ? ` ${bound.units}` : ""}`,

        was: (data) => `${data.size}`
    },
    regex: {
        mustBe: (regex) => `a string matching /${regex.source}/`
    },
    value: {
        mustBe: stringify
    },
    valueBranches: {
        mustBe: (values) => describeBranches(values.map(stringify))
    },
    branches: {
        mustBe: (branchProblems) => {
            const clausesByPath: Record<string, string[]> = {}
            for (const problem of branchProblems) {
                const pathKey = `${problem.path}`
                clausesByPath[pathKey] ??= []
                clausesByPath[pathKey].push(problem.mustBe)
            }
            return describeBranches(
                Object.entries(clausesByPath).map(
                    ([path, clauses]) =>
                        `${path} must be ${
                            clauses.length === 1
                                ? clauses[0]
                                : describeBranches(clauses)
                        }`
                )
            )
        },
        reason: (mustBe, data) => `${mustBe} (was ${data})`,
        message: (reason, path) =>
            path.length ? `At ${path}, ${reason}` : reason
    },
    multi: {
        mustBe: (problems) => "• " + problems.join("\n• "),
        reason: (mustBe) => mustBe
    }
})

export type ProblemsOptions = evaluateObject<
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
