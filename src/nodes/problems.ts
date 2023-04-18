import type { SizedData } from "../utils/data.js"
import { DataWrapper } from "../utils/data.js"
import type { Domain } from "../utils/domains.js"
import { domainDescriptions } from "../utils/domains.js"
import type {
    arraySubclassToReadonly,
    conform,
    constructor,
    instanceOf
} from "../utils/generics.js"
import type { DefaultObjectKind } from "../utils/objectKinds.js"
import {
    getExactConstructorObjectKind,
    objectKindDescriptions
} from "../utils/objectKinds.js"
import type { Segments } from "../utils/paths.js"
import { Path } from "../utils/paths.js"
import { stringify } from "../utils/serialize.js"
import type { BoundContextWithUnits } from "./range.js"
import { comparatorDescriptions } from "./range.js"

export class ArkTypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(`${problems}`)
        this.cause = problems
    }
}

export abstract class Problem<requirement = unknown, data = unknown> {
    data: DataWrapper<data>
    path: Path

    abstract readonly code: ProblemCode
    abstract mustBe: string

    constructor(public rule: requirement, data: data, segments: Segments) {
        this.path = new Path(...segments)
        this.data = new DataWrapper(data)
    }

    hasCode<code extends ProblemCode>(code: code): this is ProblemFrom<code> {
        return this.code === code
    }

    get message() {
        return this.path.length === 0
            ? capitalize(this.reason)
            : this.path.length === 1 && typeof this.path[0] === "number"
            ? `Item at index ${this.path[0]} ${this.reason}`
            : `${this.path} ${this.reason}`
    }

    get reason() {
        return `must be ${this.mustBe}${this.was ? ` (was ${this.was})` : ""}`
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
        return problem
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

    override get was() {
        return this.data.domain
    }
}

export class ProblemUnion extends Problem<Problems> {
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

// TODO: split up

export type KeyProblemKind = "missing" | "extraneous"

export class KeyProblem extends Problem<KeyProblemKind> {
    readonly code = "key"

    mustBe = this.rule === "missing" ? "defined" : "extraneous"
}

export class RangeProblem extends Problem<BoundContextWithUnits, SizedData> {
    readonly code = "range"

    get mustBe() {
        return `${comparatorDescriptions[this.rule.comparator]} ${
            this.rule.limit
        }${this.data.units ? ` ${this.data.units}` : ""}`
    }

    get was() {
        return `${this.data.size}`
    }
}

export class RegexProblem extends Problem<string> {
    readonly code = "regex"

    get mustBe() {
        return `a string matching /${this.rule}/`
    }
}

export class InstanceProblem extends Problem<constructor, object> {
    readonly code = "instance"

    get mustBe() {
        const possibleObjectKind = getExactConstructorObjectKind(this.rule)
        return possibleObjectKind
            ? objectKindDescriptions[possibleObjectKind]
            : `an instance of ${this.rule.name}`
    }

    override get was() {
        return this.data.className
    }
}

export class DivisorProblem extends Problem<number, number> {
    readonly code = "divisor"

    get mustBe() {
        return this.rule === 1 ? `an integer` : `a multiple of ${this.rule}`
    }
}

export class ValueProblem extends Problem {
    readonly code = "value"

    get mustBe() {
        return stringify(this.rule)
    }
}

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
    ProblemClasses[code]
>

export type ProblemOptions = { mustBe?: string }

export type ProblemOptionsByCode = { [code in ProblemCode]?: ProblemOptions }
