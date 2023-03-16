import { RangeProblem } from "../nodes/rules/range.ts"
import { DataWrapper } from "../utils/data.ts"
import type { Domain } from "../utils/domains.ts"
import { domainDescriptions } from "../utils/domains.ts"
import type {
    arraySubclassToReadonly,
    conform,
    constructor,
    instanceOf
} from "../utils/generics.ts"
import { isWellFormedInteger } from "../utils/numericLiterals.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { objectKindDescriptions } from "../utils/objectKinds.ts"
import type { Path } from "../utils/paths.ts"
import { DivisorProblem } from "./rules/divisor.ts"
import { InstanceProblem } from "./rules/instance.ts"
import { KeyProblem } from "./rules/props.ts"
import { RegexProblem } from "./rules/regex.ts"
import { ValueProblem } from "./rules/value.ts"

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

    constructor(public rule: requirement, data: data, public path: Path) {
        this.data = new DataWrapper(data)
    }

    hasCode<code extends ProblemCode>(code: code): this is ProblemFrom<code> {
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
                existing.rule.push(problem)
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

export class ProblemIntersection extends Problem<Problem[]> {
    readonly code = "intersection"

    get message() {
        return this.path.length
            ? `At ${this.path}, ${this.reason}`
            : this.reason
    }

    get mustBe() {
        return "• " + this.rule.map(({ mustBe }) => mustBe).join("\n• ")
    }

    get reason() {
        return `${this.data} must be...\n${this.mustBe}`
    }
}

export class DomainProblem extends Problem<Domain> {
    readonly code = "domain"

    get mustBe() {
        return domainDescriptions[this.rule]
    }
}

export class ProblemUnion extends Problem<Problem[]> {
    readonly code = "union"

    get mustBe() {
        return describeBranches(
            this.rule.map(
                (problem) =>
                    `${problem.path} must be ${
                        problem.hasCode("intersection")
                            ? describeBranches(
                                  problem.rule.map((part) => part.mustBe)
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
        return this.rule
    }
}

export const defineProblemsCode = <problems>(problems: {
    [code in keyof problems]: conform<
        problems[code],
        constructor<{ readonly code: code }>
    >
}) => problems

export const problemsByCode = defineProblemsCode({
    domain: DomainProblem,
    divisor: DivisorProblem,
    instance: InstanceProblem,
    key: KeyProblem,
    range: RangeProblem,
    regex: RegexProblem,
    value: ValueProblem,
    custom: CustomProblem,
    intersection: ProblemIntersection,
    union: ProblemUnion
})

type ProblemClasses = typeof problemsByCode

export type ProblemCode = keyof ProblemClasses

export type ProblemFrom<code extends ProblemCode> = instanceOf<
    ProblemClasses[code]
>

export type ProblemRules = {
    // we shouldn't have to intersect keyof ProblemFrom<code> here, seems like a TS bug
    [code in ProblemCode]: ProblemFrom<code>["rule" & keyof ProblemFrom<code>]
}

export type ProblemData = {
    [code in ProblemCode]: ProblemFrom<code>["data" & keyof ProblemFrom<code>]
}

export type ProblemParameters<code extends ProblemCode> = ConstructorParameters<
    typeof Problem<ProblemRules[code], ProblemData[code]>
>
