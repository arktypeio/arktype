import type { Bound } from "../nodes/rules/range.ts"
import { Scanner } from "../parse/string/shift/scanner.ts"
import type { SizedData } from "../utils/data.ts"
import { DataWrapper, unitsOf } from "../utils/data.ts"
import type { Domain } from "../utils/domains.ts"
import { domainDescriptions } from "../utils/domains.ts"
import type {
    arraySubclassToReadonly,
    constructor,
    evaluate,
    extend,
    merge,
    optionalizeKeys,
    replaceProps,
    requireKeys,
    valueOf
} from "../utils/generics.ts"
import { ObjectKeys } from "../utils/generics.ts"
import { isWellFormedInteger } from "../utils/numericLiterals.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import {
    getExactConstructorObjectKind,
    objectKindDescriptions
} from "../utils/objectKinds.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type { TraversalState } from "./traverse.ts"

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
        private source: ProblemContextInput<code>,
        private writers: ProblemWriters<code>
    ) {
        if (this.code === "intersection") {
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

    addNew(...args: ConstructorParameters<typeof Problem>) {
        return this.addProblem(new Problem(...args))
    }

    add<code extends ProblemCode>(
        code: code,
        input: ProblemParams<code>
    ): Problem {
        // copy the path to avoid future mutations affecting it
        const path = input?.path ?? Path.from(this.#state.path)
        const data =
            // we have to check for the presence of the key explicitly since the
            // data could be undefined or null
            "data" in input ? input.data : (this.#state.data as any)

        const problem = new Problem(
            // avoid a bunch of errors from TS trying to discriminate the
            // problem input based on the code
            code as any,
            path,
            data,
            input,
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

type ProblemDefinitions = {
    divisor: { divisor: number; data: number }
    constructor: { constructor: constructor; data: object }
    domain: { domain: Domain }
    missing: { data: undefined }
    extraneous: {}
    size: { comparator: Scanner.Comparator; limit: number; data: SizedData }
    regex: { source: string; data: string }
    value: { required: unknown }
    intersection: { problems: (string | Problem)[] }
    union: { problems: (string | Problem)[] }
    custom: { mustBe: string }
}

export type ProblemCode = evaluate<keyof ProblemDefinitions>

type ProblemContextInput<code extends ProblemCode = ProblemCode> = {
    data?: "data" extends keyof ProblemDefinitions[code]
        ? ProblemDefinitions[code]["data"]
        : unknown
    was?: string
    path?: Path
}

type ProblemParams<code extends ProblemCode> = [
    ...requirement: {} extends extractRequirement<code>
        ? []
        : [requirement: valueOf<extractRequirement<code>>],
    ctx?: ProblemContextInput<code>
]

type extractRequirement<code extends ProblemCode> = Omit<
    ProblemDefinitions[code],
    keyof ProblemContextInput
>

type ProblemContext<code extends ProblemCode = ProblemCode> = evaluate<
    extractRequirement<code> & {
        data: DataWrapper<ProblemContextInput<code>["data"]>
        was: string
        path: Path
    }
>

type DefaultProblemConfig<code extends ProblemCode> = requireKeys<
    ProblemOptions<code>,
    "mustBe"
>

export type DescribeRequirement<code extends ProblemCode = ProblemCode> =
    | string
    | ((ctx: ProblemContext<code>) => string)

export type DescribeWas<code extends ProblemCode = ProblemCode> =
    | string
    | ((data: ProblemContext<code>["data"]) => string)

export type WriteReason<code extends ProblemCode = ProblemCode> =
    | string
    | ((
          ctx: ProblemContext<code> & {
              mustBe: string
              was: string
          }
      ) => string)

const describeDefaultWas: DescribeWas = (data) => `${data}`

const writeDefaultReason: WriteReason<ProblemCode> = ({ mustBe, was, path }) =>
    addDefaultPathContext(writeDefaultDescription(mustBe, was), path)

const writeDefaultDescription = (mustBe: string, was: string) =>
    `must be ${mustBe} ${` (was ${was})`}` as const

const addDefaultPathContext = (description: string, path: Path) =>
    path.length === 0
        ? capitalize(description)
        : path.length === 1 && isWellFormedInteger(path[0])
        ? `Item at index ${path[0]} ${description}`
        : `${path} ${description}`

const defaultProblemConfig: {
    [code in ProblemCode]: DefaultProblemConfig<code>
} = {
    divisor: {
        mustBe: ({ divisor }) =>
            divisor === 1 ? `an integer` : `a multiple of ${divisor}`
    },
    constructor: {
        mustBe: ({ constructor }) => {
            const possibleObjectKind =
                getExactConstructorObjectKind(constructor)
            return possibleObjectKind
                ? objectKindDescriptions[possibleObjectKind]
                : `an instance of ${constructor.name}`
        },
        was: ({ className }) => className
    },
    domain: {
        mustBe: ({ domain }) => domainDescriptions[domain],
        was: ({ domain }) => domain
    },
    missing: {
        mustBe: () => "defined",
        was: ""
    },
    extraneous: {
        mustBe: () => "removed",
        was: ""
    },
    size: {
        mustBe: ({ comparator, limit, data }) => {
            const units = unitsOf(data)
            return `${Scanner.comparatorDescriptions[comparator]} ${limit}${
                units ? ` ${units}` : ""
            }`
        },
        was: ({ size }) => `${size}`
    },
    regex: {
        mustBe: (expression) => `a string matching ${expression}`
    },
    value: {
        mustBe: stringify
    },
    union: {
        mustBe: ({ problems }) =>
            describeBranches(
                problems.map((problem) =>
                    typeof problem === "string"
                        ? `must be ${problem}`
                        : `${problem.path} must be ${
                              problem.parts
                                  ? describeBranches(
                                        problem.parts.map((part) => part.mustBe)
                                    )
                                  : problem.mustBe
                          }`
                )
            ),
        writeReason: ({ mustBe, path, was }) =>
            path.length
                ? `At ${path}, ${mustBe} (was ${was})`
                : `${mustBe} (was ${was})`
    },
    intersection: {
        mustBe: ({ problems }) =>
            "• " +
            problems
                .map((problem) =>
                    typeof problem === "string" ? problem : problem.mustBe
                )
                .join("\n• "),
        writeReason: ({ mustBe, data, path }) => {
            const description = `${data} must be...\n${mustBe}`
            return path.length ? `At ${path}, ${description}` : description
        }
    },
    custom: {
        mustBe: ({ mustBe }) => mustBe
    }
}

export const problemCodes: readonly ProblemCode[] =
    ObjectKeys(defaultProblemConfig)

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
