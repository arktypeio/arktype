import type {
	AbstractableConstructor,
	arraySubclassToReadonly,
	BuiltinObjectKind,
	conform,
	Constructor,
	Domain
} from "@arktype/util"
import {
	domainOf,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	stringify
} from "@arktype/util"
import { domainDescriptions } from "../bases/domain.js"
import {
	type BoundInner,
	type NumericallyBoundable
} from "../refinements/bounds.js"

export class ArkTypeError extends TypeError {
	override cause: Problems

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
		public rule: requirement,
		data: data,
		public path: string[]
	) {
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
			: `${this.path.join(".")} ${this.reason}`
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

class ProblemsArray extends Array<Problem> {
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

	override toString() {
		return this.join("\n")
	}

	throw(): never {
		throw new ArkTypeError(this)
	}
}

export const Problems: new () => Problems = ProblemsArray

export type Problems = arraySubclassToReadonly<ProblemsArray>

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

export const domainsToDescriptions = (domains: Domain[]) =>
	domains.map((objectKind) => domainDescriptions[objectKind])

export const objectKindsToDescriptions = (kinds: BuiltinObjectKind[]) =>
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

	override get message() {
		return this.path.length ? `At ${this.path}, ${this.reason}` : this.reason
	}

	get mustBe() {
		return "• " + this.rule.map(({ mustBe }) => mustBe).join("\n• ")
	}

	override get reason() {
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
							? describeBranches(problem.rule.map((part) => part.mustBe))
							: problem.mustBe
					}`
			)
		)
	}

	override get reason() {
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
		Constructor<{ readonly code: code }>
	>
}) => problems

export type KeyProblemKind = "missing" | "extraneous"

export class KeyProblem extends Problem<KeyProblemKind> {
	readonly code = "key"

	mustBe = this.rule === "missing" ? "defined" : "extraneous"
}

export class BoundProblem extends Problem<BoundInner, NumericallyBoundable> {
	readonly code = "bound"

	get mustBe() {
		return "within bounds"
		// return `${describeBound(this.rule)}${
		// 	this.data.units ? ` ${this.data.units}` : ""
		// }`
	}

	override get was() {
		return this.data.value instanceof Date
			? this.data.value.toDateString()
			: `${this.data.size}`
	}
}

export class RegexProblem extends Problem<string> {
	readonly code = "regex"

	get mustBe() {
		return `a string matching /${this.rule}/`
	}
}

export class ClassProblem extends Problem<AbstractableConstructor, object> {
	readonly code = "class"

	get mustBe() {
		const possibleObjectKind = getExactBuiltinConstructorName(this.rule)
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
	class: ClassProblem,
	key: KeyProblem,
	bound: BoundProblem,
	regex: RegexProblem,
	value: ValueProblem,
	custom: CustomProblem,
	intersection: ProblemIntersection,
	union: ProblemUnion
})

type ProblemClasses = typeof problemsByCode

export type ProblemCode = keyof ProblemClasses

export type ProblemFrom<code extends ProblemCode> = InstanceType<
	ProblemClasses[code]
>

export type ProblemRules = {
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

export const sizeOf = (data: unknown) =>
	typeof data === "string" || Array.isArray(data)
		? data.length
		: typeof data === "number"
		? data
		: data instanceof Date
		? data.valueOf()
		: 0

export const unitsOf = (data: unknown) =>
	typeof data === "string"
		? "characters"
		: Array.isArray(data)
		? "items long"
		: ""

export class DataWrapper<value = unknown> {
	constructor(public value: value) {}

	toString() {
		return stringify(this.value)
	}

	get domain() {
		return domainOf(this.value)
	}

	get size() {
		return sizeOf(this.value)
	}

	get units() {
		return unitsOf(this.value)
	}

	get className() {
		return Object(this.value).constructor.name
	}
}
