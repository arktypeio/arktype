// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import type {
	ArkErrorCode,
	CompactApply,
	FailureContext,
	FailureSite,
	SiteContext
} from "@ark/schema/runtime"
import type { Fn } from "@ark/util"
import { failsAt, failsIn } from "./runtime.ts"

// a size build's validators are composed of these, each a node: it allows
// data passed none, and passed one, reports to its ctx as an Apply does

/** a node a size build composes, reporting to a ctx it's passed */
export interface Checker {
	(data: unknown, ctx?: FailureContext | number): boolean
	/** where it transforms, e.g. by writing a default, data it allows */
	t?: ((data: any) => unknown) | undefined
}

/** a site, and the checker of the test data passes to avoid it */
export interface Check extends SiteContext, Checker {
	test: (data: any) => boolean
}

export const check = ((
	code: ArkErrorCode,
	description: string | undefined,
	test: (data: any) => boolean
): Check => {
	const checker = ((data, ctx) =>
		test(data) || !failsAt(ctx as never, checker, data)) as Check
	checker.code = code
	checker.description = description
	checker.test = test
	return checker
}) satisfies Fn

export const stringCheck: Check = /* @__PURE__ */ check(
	"domain",
	"a string",
	data => typeof data === "string"
)

export const numberCheck: Check = /* @__PURE__ */ check(
	"domain",
	"a number",
	data => Number.isFinite(data)
)

export const objectCheck: Check = /* @__PURE__ */ check(
	"domain",
	"an object",
	data =>
		typeof data === "object" ? data !== null : typeof data === "function"
)

export const arrayCheck: Check = /* @__PURE__ */ check(
	"proto",
	"an array",
	data => Array.isArray(data)
)

// a bound's description, as arktype writes it
export const min = ((
	rule: number,
	exclusive?: 1,
	description = rule === 0 ?
		exclusive ? "positive"
		:	"non-negative"
	:	`${exclusive ? "more than" : "at least"} ${rule}`
): Check =>
	check(
		"min",
		description,
		exclusive ? data => data > rule : data => data >= rule
	)) satisfies Fn

export const max = ((
	rule: number,
	exclusive?: 1,
	description = rule === 0 ?
		exclusive ? "negative"
		:	"non-positive"
	:	`${exclusive ? "less than" : "at most"} ${rule}`
): Check =>
	check(
		"max",
		description,
		exclusive ? data => data < rule : data => data <= rule
	)) satisfies Fn

export const minLength = ((
	rule: number,
	description = rule === 1 ? "non-empty" : `at least length ${rule}`
): Check =>
	check("minLength", description, data => data.length >= rule)) satisfies Fn

export const maxLength = ((
	rule: number,
	description = `at most length ${rule}`
): Check =>
	check("maxLength", description, data => data.length <= rule)) satisfies Fn

export const exactLength = ((
	rule: number,
	description = `exactly length ${rule}`
): Check =>
	check("exactLength", description, data => data.length === rule)) satisfies Fn

export const divisor = ((
	rule: number,
	description = rule === 1 ? "an integer"
	: rule === 2 ? "even"
	: `a multiple of ${rule}`
): Check =>
	check("divisor", description, data => data % rule === 0)) satisfies Fn

// a pattern without g or y, whose test reads no lastIndex
export const pattern = ((
	instance: RegExp,
	description = `matched by ${instance.source}`
): Check =>
	check("pattern", description, data => instance.test(data))) satisfies Fn

const printValue = (value: unknown): string =>
	typeof value === "string" ? JSON.stringify(value) : `${value}`

// values as arktype lists them, e.g. "a", "b" or "c"
export const describeValues = (values: readonly unknown[]): string => {
	const printed = values.map(printValue)
	const last = printed.pop()!
	return printed.length ? `${printed.join(", ")} or ${last}` : last
}

export const unit = ((
	value: unknown,
	description = printValue(value)
): Checker => check("unit", description, data => data === value)) satisfies Fn

export const booleanChecker: Checker = /* @__PURE__ */ check(
	"union",
	"boolean",
	data => typeof data === "boolean"
)

// a basis failing stops the node, as do refinements failing together, before
// what it checks within, e.g. its structure
export const intersection = ((
	basis: Check | 0,
	refinements: readonly Check[],
	within?: Checker
): Checker => {
	const checker: Checker = (data, ctx) => {
		if (basis && !basis.test(data)) return !failsAt(ctx as never, basis, data)
		let passed = true
		for (const refinement of refinements) {
			if (!refinement.test(data)) {
				if (failsAt(ctx as never, refinement, data)) return false
				passed = false
			}
		}
		return !passed || !within || within(data, ctx)
	}
	checker.t = within?.t
	return checker
}) satisfies Fn

type Props = Record<string, Checker>

// a missing key, as runtime's requiredSite without siteOf
const requiredSite: FailureSite = { m: { code: "required" } }

// an object's keys, each checked in the order declared
export const props = ((declared: Props, optional?: string[]): Checker =>
	(data: any, ctx) => {
		if (!objectCheck.test(data))
			return !failsAt(ctx as never, objectCheck, data)
		for (const k in declared) {
			const value = data[k]
			if (
				value === undefined && !(k in data) ?
					!optional?.includes(k) && failsAt(ctx as never, requiredSite, data, k)
				:	failsIn(ctx as never, declared[k] as CompactApply, value, k)
			)
				return false
		}
		return true
	}) satisfies Fn

// whether data's prototypes include a builtin's, so it keeps state in
// internal slots: one its native constructor creates, other than a realm's
// Object.prototype
const isBuiltin = (data: object): boolean => {
	for (
		let prototype = Object.getPrototypeOf(data);
		prototype && Object.getPrototypeOf(prototype);
		prototype = Object.getPrototypeOf(prototype)
	) {
		const { constructor } = prototype
		if (
			typeof constructor === "function" &&
			constructor.prototype === prototype &&
			/\[native code]\s*}$/.test(Function.prototype.toString.call(constructor))
		)
			return true
	}
	return false
}

// a copy of data to write to, keeping its prototype and enumerable keys,
// unless it's a builtin, which is written in place
const copyForWriting = (data: any): any => {
	const prototype = Object.getPrototypeOf(data)
	return (
		Array.isArray(data) ? Object.assign(Array.prototype.slice.call(data), data)
		: prototype === Object.prototype ? { ...data }
		: isBuiltin(data) ? data
		: Object.setPrototypeOf({ ...data }, prototype)
	)
}

// props whose values transform or default, copied where one is written and
// keeping each declared key data holds
export const transformingProps = ((
	declared: Props,
	optional?: string[],
	defaults: Record<string, unknown> = {}
): Checker => {
	const checker = props(declared, optional)
	checker.t = data => {
		let out = data
		for (const k in declared) {
			const holds = k in data
			const value = holds ? declared[k].t?.(data[k]) : defaults[k]
			// a default is written even where it's undefined
			if (holds ? value !== undefined && value !== data[k] : k in defaults) {
				if (out === data) out = copyForWriting(data)
				out[k] = value
			}
		}
		if (out !== data)
			for (const k in declared) if (!(k in out) && k in data) out[k] = data[k]
		return out
	}
	return checker
}) satisfies Fn

// an array's elements, each checked at its index
export const elementsOf = ((element: Checker): Checker =>
	(data: any, ctx) => {
		for (let i = 0; i < data.length; i++) {
			if (failsIn(ctx as never, element as CompactApply, data[i], i))
				return false
		}
		return true
	}) satisfies Fn

export const transformingElementsOf = ((element: Checker): Checker => {
	const checker = elementsOf(element)
	checker.t = data => {
		let out = data
		for (let i = 0; i < data.length; i++) {
			const value = element.t!(data[i])
			if (value === data[i]) continue
			if (out === data) out = copyForWriting(data)
			out[i] = value
		}
		return out
	}
	return checker
}) satisfies Fn

// read as a node's Transform, unless it's unread
export const transformOf = ((checker: Checker) => checker.t!) satisfies Fn

// a union of values, each compared by identity, which a discriminant tells
// apart unless it's two
export const units = ((
	values: readonly unknown[],
	code: ArkErrorCode = "discriminant",
	description = describeValues(values)
): Checker =>
	check(code, description, data => values.includes(data))) satisfies Fn

// a union told apart by data's domain, which a branch of 1 alone decides
export const domains = ((
	cases: Record<string, Checker | 1>,
	description: string
): Checker => {
	const site: FailureSite = { code: "discriminant", description }
	const caseOf = (data: unknown) =>
		cases[
			data === null ? "null"
			: typeof data === "function" ? "object"
			: typeof data
		]
	const checker: Checker = (data, ctx) => {
		const branch = caseOf(data)
		return branch ?
				branch === 1 || branch(data, ctx)
			:	!failsAt(ctx as never, site, data)
	}
	if (Object.values(cases).some(branch => (branch as Checker).t))
		checker.t = data => (caseOf(data) as Checker).t?.(data) ?? data
	return checker
}) satisfies Fn

// a union of objects told apart by the string at one key; data that isn't an
// object, or holds no case at the key, fails the union or that key
export const discriminate = ((
	key: string,
	cases: Record<string, Checker | 1>,
	description = describeValues(Object.keys(cases)),
	missed: FailureSite = { code: "union", description: "an object" },
	// a described union misses at its own path
	isOwn?: 1
): Checker => {
	// keyed by string, so no other value is a case
	const byValue = new Map(Object.entries(cases))
	const site: SiteContext = { code: "discriminant", description }
	const checker: Checker = (data: any, ctx) => {
		const branch = byValue.get(data?.[key])
		return (
			branch ? branch === 1 || branch(data, ctx)
			: objectCheck.test(data) ?
				!failsAt(ctx as never, site, data, isOwn ? undefined : key)
			:	!failsAt(ctx as never, missed, data)
		)
	}
	if (Object.values(cases).some(branch => (branch as Checker).t))
		checker.t = data => (byValue.get(data[key]) as Checker).t?.(data) ?? data
	return checker
}) satisfies Fn

// branches told apart by trying each, which fail as one issue: data failing
// each branch's basis fails them, as bases describes them
export const union = ((
	branches: readonly Checker[],
	description: string,
	bases?: readonly Check[],
	basesDescription?: string
): Checker => {
	const site: FailureSite = { code: "union", description }
	const basesSite: FailureSite = {
		code: "union",
		description: basesDescription
	}
	const checker: Checker = (data, ctx) =>
		branches.some(branch => branch(data)) ||
		!failsAt(
			ctx as never,
			bases && !bases.some(basis => basis.test(data)) ? basesSite : site,
			data
		)
	if (branches.some(branch => branch.t))
		checker.t = data => branches.find(branch => branch(data))!.t?.(data) ?? data
	return checker
}) satisfies Fn
