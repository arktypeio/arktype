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
import type { KeyProblem } from "./rules/props.ts"
import type { RegexProblem } from "./rules/regex.ts"
import type { ValueProblem } from "./rules/value.ts"

export class ArkTypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(`${problems}`)
        this.cause = problems
    }
}

export abstract class Problem<requirement = unknown, data = unknown> {
    data: DataWrapper<data>

    abstract readonly code: ProblemCode
    abstract mustBe: string

    constructor(
        public requirement: requirement,
        data: data,
        public path: Path
    ) {
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
                existing.requirement.push(problem)
            } else {
                const problemIntersection = new ProblemIntersection(
                    [existing, problem],
                    problem.data,
                    problem.path
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
    domain: DomainProblem
    divisor: DivisorProblem
    instance: InstanceProblem
    key: KeyProblem
    range: RangeProblem
    regex: RegexProblem
    value: ValueProblem
    custom: CustomProblem
    intersection: ProblemIntersection
    union: ProblemUnion
}>

type defineProblemsByCode<
    problems extends {
        [code in keyof problems]: conform<
            problems[code],
            { readonly code: code }
        >
    }
> = problems

export type ProblemCode = evaluate<keyof ProblemsByCode>

export class ProblemIntersection extends Problem<Problem[]> {
    readonly code = "intersection"

    get message() {
        return this.path.length
            ? `At ${this.path}, ${this.reason}`
            : this.reason
    }

    get mustBe() {
        return "• " + this.requirement.map(({ mustBe }) => mustBe).join("\n• ")
    }

    get reason() {
        return `${this.data} must be...\n${this.mustBe}`
    }
}

export class DomainProblem extends Problem<Domain> {
    readonly code = "domain"

    get mustBe() {
        return domainDescriptions[this.requirement]
    }
}

export class ProblemUnion extends Problem<Problem[]> {
    readonly code = "union"

    get mustBe() {
        return describeBranches(
            this.requirement.map(
                (problem) =>
                    `${problem.path} must be ${
                        problem.hasCode("intersection")
                            ? describeBranches(
                                  problem.requirement.map((part) => part.mustBe)
                              )
                            : problem.mustBe
                    }`
            )
        )
    }

    get reason() {
        return this.path.length
            ? `At ${this.path}, ${this.mustBe} (was ${this.was})`
            : `${this.mustBe} (was ${this.was})`
    }
}

export class CustomProblem extends Problem<string> {
    readonly code = "custom"

    get mustBe() {
        return this.requirement
    }
}
