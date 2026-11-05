// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import type {
	ArkErrorCode,
	CompactApply,
	FailureContext,
	FailureSite,
	SiteContext
} from "@ark/schema/runtime"
import { hasOwn, type Fn } from "@ark/util"
import {
	addErrors,
	addMorphErrs,
	allowsInBranchBy,
	allowsInContext,
	allowsUntracked,
	ArkErrors,
	copyOf,
	describePredicate,
	enterApplied,
	exitApplied,
	failsAt,
	failsBranches,
	pipeApplied,
	pipeChecked,
	pipeTransformed,
	requiredSiteOf,
	runtimeConfig,
	runtimeScope,
	silentCtx,
	siteOf,
	transformedInApply,
	TransformErrors,
	transformIfAllowed,
	transformResolution,
	transformsValid
} from "./runtime.ts"

/** a node a size build composes, reporting to a ctx it's passed */
export interface Checker {
	(data: unknown, ctx?: FailureContext | number): boolean
	/** what a key it's the value of expects where the key is missing */
	description?: string | undefined
	/** where it transforms, e.g. by writing a default, data it allows */
	t?: Transform | undefined
	/** where it checks a key that may be absent */
	o?: 1
	/** the default of a key that may be absent, if it has one */
	d?: [value?: unknown]
	/** where its default replaces undefined too */
	u?: 1 | undefined
	/** where a morph writes its default, as a function's may fail */
	w?: DefaultWrite
	/** where it holds a callback reading its ctx, its Allows at the key ctx is at */
	a?: (data: unknown, ctx: any) => boolean
	/** where it holds an alias, how a key applies it */
	m?: ApplyAt
}

type DefaultWrite = (data: any, ctx?: any) => unknown

interface Transform {
	(data: any, ctx?: any): unknown
	/** where it holds a morph, how a key applies what it's the transform of */
	m?: ApplyAt
	/** where it reports to a ctx, rather than returning what fails */
	c?: 1
}

type ApplyAt = (
	ctx: any,
	checker: Checker,
	value: unknown,
	k: PropertyKey
) => boolean

const transformedBy = ({ t }: Checker, data: unknown, ctx: unknown) =>
	!t ? data
	: t.c ? t(data, ctx)
	: t(data)

// what holds a morph holds what it reads of it
const holdingMorphs = (t: Transform, held: readonly Checker[]): Transform => {
	for (const checker of held) {
		t.m ??= checker.t?.m
		t.c ??= checker.t?.c
	}
	return t
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

// a callback a build proved reads only data, read where it's called, as its
// variable may be set once this has loaded
export const narrowedBy = ((
	read: () => (data: any) => boolean,
	description?: string
): Checker => {
	const checker: Checker = (data, ctx) =>
		// `allows` answers this, and a narrow cast to return a boolean may not
		!!read()(data) ||
		!failsAt(
			ctx as never,
			siteOf(
				"predicate",
				description ?? describePredicate({ predicate: read() })
			),
			data
		)
	checker.description = description
	return checker
}) satisfies Fn

// a callback a build proved only returns what it reports, passed a ctx to report
// to where there is one
export const narrowedWithCtx = ((
	read: () => (data: any, ctx: any) => boolean,
	description?: string
): Checker => {
	const checker: Checker = (data, ctx: any) => {
		if (!ctx?._at) return !!read()(data, silentCtx)
		const errN = ctx.errN
		if (!read()(data, ctx) && ctx.errN === errN) {
			return !failsAt(
				ctx,
				siteOf(
					"predicate",
					description ?? describePredicate({ predicate: read() })
				),
				data
			)
		}
		return !ctx.failFast || ctx.errN === errN
	}
	checker.description = description
	return checker
}) satisfies Fn

const stops = () => true

const allowingCtx = (data: any, ctx: any, checker: Checker) => {
	if (ctx._at === stops) return checker(data, ctx)
	const { chkOnly } = ctx
	ctx.chkOnly = true
	ctx._at = ctx.failsUnion = stops
	const allowed = checker(data, ctx)
	delete ctx._at
	delete ctx.failsUnion
	ctx.chkOnly = chkOnly
	return allowed
}

// a node holding a callback that may read its ctx runs what Apply does, with a
// ctx finding no issues, stopping at the first as Allows does. Read through a
// node as its Allows, and read by a key where data's checked first
export const readingCtx = ((checker: Checker): Checker => {
	const allows = (data: unknown, ctx: any) => allowingCtx(data, ctx, checker)
	checker.a = (data, ctx) => allowsInBranchBy(ctx, allows, data)
	return checker
}) satisfies Fn

/** Allows of a node reading its ctx, or passed a depth by an alias it holds */
export const allowsReadingCtx = ((checker: Checker) =>
	(data: unknown, ctx: any) =>
		typeof ctx === "object" ?
			allowingCtx(data, ctx, checker)
		:	checker(data)) satisfies Fn

/** what a checker reads of a node compiled since it's in a cycle, or holding one */
interface AliasedNode {
	id: string
	tfs?: true
	tfsById?: true
	tAllows: (data: unknown, ctx: any) => boolean
	tApply: Checker
	tTransform?: Transform
}

// a node in a cycle, tracking data as only compiled traversals do. Only where
// data's reached by what holds it does Allows start at no depth, which a cycle
// isn't in, so can't reach this node again
export const compiled = ((node: AliasedNode, transforms?: 1): Checker => {
	const checker: Checker = (data, ctx: any) =>
		!ctx ? node.tAllows(data, 0)
		: ctx._at === stops ? node.tAllows(data, ctx)
		: node.tApply(data, ctx)
	if (transforms) {
		checker.t = (data, ctx) => node.tTransform!(data, ctx)
		checker.t.c = 1
	}
	return checker
}) satisfies Fn

const wrapping = (checker: Checker): Checker => {
	const wrapped: Checker = (data, ctx) => checker(data, ctx)
	wrapped.description = checker.description
	wrapped.t = checker.t
	wrapped.a = checker.a
	wrapped.m = checker.m
	return wrapped
}

// tracked as what holds its id, which a unit's shape fills in once it's created
const resolvedBy = (node: { id: string }, t: Transform): Transform => {
	const resolved: Transform = (data, ctx) =>
		transformResolution(ctx, node.id, data, t)
	resolved.c = 1
	return resolved
}

// a key's value holding an alias: only what Apply finds valid is transformed, and
// one tracked as its node keys what it's applied to by id
export const aliasedValue = ((
	checker: Checker,
	node: AliasedNode,
	// 1 where it enters an alias, 2 where its transform's tracked by id. Read
	// off the node they'd be where a unit's shape fills in once it's created
	flags?: 1 | 2 | 3
): Checker => {
	const wrapped = wrapping(checker)
	const enters = flags! & 1
	wrapped.m = (ctx, _, value, k) => {
		ctx.path.push(k)
		const passes =
			ctx._at === stops ?
				checker(value, ctx)
			:	(node.tfs && transformIfAllowed(ctx, node as never, value)) ||
				(enters ?
					(enterApplied(ctx, node.id, value) ??
					exitApplied(ctx, checker(value, ctx)))
				:	checker(value, ctx))
		ctx.path.pop()
		return !passes
	}
	if (checker.t && flags! & 2) wrapped.t = resolvedBy(node, checker.t)
	return wrapped
}) satisfies Fn

// a case of a union entered as the branch it was pruned from, holding an alias
export const aliasedMember = ((checker: Checker, id: string): Checker => {
	const entered: Checker = (data, ctx: any) =>
		ctx?._at && ctx._at !== stops ?
			(enterApplied(ctx, id, data) ?? exitApplied(ctx, checker(data, ctx)))
		:	checker(data, ctx)
	entered.description = checker.description
	entered.a = checker.a
	if (checker.t) entered.t = resolvedBy({ id }, checker.t)
	return entered
}) satisfies Fn

// a structure read by Allows alone, as a root is, where a narrow's read after it
export const holdingAlias = ((checker: Checker): Checker => {
	const node = { tAllows: allowsReadingCtx(checker) } as never
	checker.a = data =>
		allowsUntracked(node, data) ?? allowsInContext(node, data, runtimeConfig)
	return checker
}) satisfies Fn

// a callback that may read its ctx, which can add an issue and still return true
export const narrowedInCtx = ((
	read: () => (data: any, ctx: any) => boolean,
	description?: string
): Checker => {
	const checker: Checker = (data, ctx: any) => {
		if (ctx._at === stops) return !!read()(data, ctx)
		const errN = ctx.errN
		if (!read()(data, ctx) && ctx.errN === errN) {
			return !failsAt(
				ctx,
				siteOf(
					"predicate",
					description ?? describePredicate({ predicate: read() })
				),
				data
			)
		}
		return !ctx.failFast || ctx.errN === errN
	}
	checker.description = description
	return checker
}) satisfies Fn

const issuesIn = (ctx: any): number => ctx.errN ?? ctx.count

// a structure's issues stop its predicates, and one that transforms is only
// checked before them, as what they're passed is data as it came
export const narrowedAfter = ((
	structure: Checker,
	narrowed: Checker
): Checker => {
	const checker: Checker = (data, ctx: any) => {
		if (!ctx?._at || ctx._at === stops)
			return structure(data, ctx) && narrowed(data, ctx)
		if (structure.t) {
			if (!(structure.a ? structure.a(data, ctx) : structure(data)))
				return structure(data, ctx)
		} else {
			const issues = issuesIn(ctx)
			if (!structure(data, ctx)) return false
			if (issuesIn(ctx) > issues) return true
		}
		return narrowed(data, ctx)
	}
	checker.t = structure.t
	checker.description = structure.description
	return checker
}) satisfies Fn

// predicates in turn, the first to fail stopping those after it
export const narrowedByEach = ((checkers: readonly Checker[]): Checker => {
	const checker: Checker = (data, ctx: any) => {
		const issues = ctx?._at && issuesIn(ctx)
		for (const narrowed of checkers) {
			if (!narrowed(data, ctx)) return false
			if (ctx?._at && issuesIn(ctx) > issues) return true
		}
		return true
	}
	checker.description = checkers[0].description
	return checker
}) satisfies Fn

/** the checker a validator is created from, as a call a bundler may drop */
export const allowsOf = ((validator: { allows: Checker }): Checker =>
	validator.allows) satisfies Fn

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

// the intersections most nodes are; a bound left undefined never fails

// a string whose length is at most max and at least min
export const stringRange = ((max?: number, min?: number): Checker => {
	const tooLong = max === undefined ? stringCheck : maxLength(max)
	const tooShort = min === undefined ? stringCheck : minLength(min)
	const checker: Checker = (data: any, ctx) =>
		typeof data !== "string" ? !failsAt(ctx as never, stringCheck, data)
		: data.length > max! ? !failsAt(ctx as never, tooLong, data)
		: !(data.length < min!) || !failsAt(ctx as never, tooShort, data)
	checker.description = stringCheck.description
	return checker
}) satisfies Fn

// an integer from least to most, inclusive
export const integerRange = ((least?: number, most?: number): Checker => {
	const integer = divisor(1)
	const tooSmall = least === undefined ? numberCheck : min(least)
	const tooLarge = most === undefined ? numberCheck : max(most)
	const checker: Checker = (data: any, ctx) =>
		Number.isFinite(data) ?
			(data % 1 === 0 || !failsAt(ctx as never, integer, data)) &&
			(!(data > most!) || !failsAt(ctx as never, tooLarge, data)) &&
			(!(data < least!) || !failsAt(ctx as never, tooSmall, data))
		:	!failsAt(ctx as never, numberCheck, data)
	checker.description = numberCheck.description
	return checker
}) satisfies Fn

// an array of element, which transforms nothing
export const arrayOf = ((
	element: Checker,
	max?: number,
	min?: number
): Checker => {
	const tooLong = max === undefined ? arrayCheck : maxLength(max)
	const tooShort = min === undefined ? arrayCheck : minLength(min)
	const within = elementsOf(element)
	const checker: Checker = (data: any, ctx) =>
		!Array.isArray(data) ? !failsAt(ctx as never, arrayCheck, data)
		: data.length > max! ? !failsAt(ctx as never, tooLong, data)
		: data.length < min! ? !failsAt(ctx as never, tooShort, data)
		: within(data, ctx)
	checker.description = arrayCheck.description
	return checker
}) satisfies Fn

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
	"discriminant",
	"boolean",
	data => typeof data === "boolean"
)

// a failed basis or refinement stops the node before its structure
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
	// its brief: its basis's description, or "present" without one
	checker.description = basis ? basis.description : "present"
	checker.t = within?.t
	return checker
}) satisfies Fn

// written as value where value is passed, even undefined
export const optional = ((checker: Checker, ...value: [unknown?]): Checker => {
	const wrapped = wrapping(checker)
	wrapped.o = 1
	wrapped.d = value
	return wrapped
}) satisfies Fn

// a default that's a function's, or that its value transforms, read where it's
// written as it may be declared once this has loaded
export const writtenBy = ((
	checker: Checker,
	write: DefaultWrite,
	replacesUndefined?: 1
): Checker => {
	const wrapped = optional(checker)
	wrapped.w = write
	wrapped.u = replacesUndefined
	return wrapped
}) satisfies Fn

export const replacingUndefined = ((
	checker: Checker,
	value: unknown
): Checker => {
	const wrapped = optional(checker, value)
	wrapped.u = 1
	return wrapped
}) satisfies Fn

// a required key's checker whose description isn't what the key expects where missing
export const required = ((checker: Checker, description: string): Checker => {
	const wrapped = wrapping(checker)
	wrapped.description = description
	return wrapped
}) satisfies Fn

type Props = Record<string, Checker>

// with a ctx, a value is applied once, as arktype applies it, since a callback
// may see each call; one that transforms is checked first, as arktype checks it
const failsValue = (
	ctx: FailureContext | number | undefined,
	checker: Checker,
	data: any,
	k: PropertyKey,
	value: unknown
): boolean | undefined =>
	(ctx as FailureContext | undefined)?._at ?
		checker.m ? checker.m(ctx, checker, value, k)
		: checker.t?.m ? checker.t.m(ctx, checker, value, k)
		: (!checker.t || !(checker.a ? checker.a(value, ctx) : checker(value))) &&
			(ctx as FailureContext)._in(checker as CompactApply, data, k)
	:	!checker(value)

// keys checked in declared order; a missing key expects its checker's description
const failsProps = (
	declared: Props,
	data: any,
	ctx: FailureContext | number | undefined
): boolean => {
	for (const k in declared) {
		const value = data[k]
		if (
			value === undefined && !(k in data) ?
				!declared[k].o &&
				failsAt(ctx as never, requiredSiteOf(declared[k].description), data, k)
			:	failsValue(ctx, declared[k], data, k, value)
		)
			return true
	}
	return false
}

export const props = ((declared: Props): Checker => {
	const checker: Checker = (data, ctx) =>
		objectCheck.test(data) ?
			!failsProps(declared, data, ctx)
		:	!failsAt(ctx as never, objectCheck, data)
	checker.description = objectCheck.description
	return checker
}) satisfies Fn

// rejects each key it doesn't declare, for...in also reaching inherited keys,
// which aren't undeclared
export const closedProps = ((
	declared: Props,
	description = "removed"
): Checker => {
	const removed = siteOf("undeclared", description)
	const checker: Checker = (data: any, ctx) => {
		if (!objectCheck.test(data))
			return !failsAt(ctx as never, objectCheck, data)
		if (failsProps(declared, data, ctx)) return false
		for (const k in data) {
			if (
				!hasOwn(declared, k) &&
				hasOwn(data, k) &&
				failsAt(ctx as never, removed, data, k)
			)
				return false
		}
		return true
	}
	checker.description = objectCheck.description
	return checker
}) satisfies Fn

const matchesKey = (key: Checker, k: PropertyKey, ctx: unknown) =>
	key.a ? key.a(k, ctx) : key(k)

// each signature a key matches checks its value, after the keys it declares,
// and where removed is passed, a key no signature matches fails it
export const indexed = ((
	signatures: readonly [key: Checker, value: Checker][],
	declared: Props = {},
	removed?: string
): Checker => {
	const site = removed === undefined ? undefined : siteOf("undeclared", removed)
	const checker: Checker = (data: any, ctx) => {
		if (!objectCheck.test(data))
			return !failsAt(ctx as never, objectCheck, data)
		if (failsProps(declared, data, ctx)) return false
		for (const k of [
			...Object.keys(data),
			...Object.getOwnPropertySymbols(data)
		]) {
			for (const [key, value] of signatures) {
				if (matchesKey(key, k, ctx) && failsValue(ctx, value, data, k, data[k]))
					return false
			}
			if (
				site &&
				typeof k === "string" &&
				!hasOwn(declared, k) &&
				!signatures.some(([key]) => matchesKey(key, k, ctx)) &&
				failsAt(ctx as never, site, data, k)
			)
				return false
		}
		return true
	}
	checker.description = objectCheck.description
	return checker
}) satisfies Fn

const holdsValue = (checker: Checker, data: any, k: string): boolean =>
	checker.u ? data[k] !== undefined : k in data

// what a parent's t passes each value through
interface WrittenValues {
	transformed(checker: Checker, value: unknown, k: PropertyKey): unknown
	failed?(): unknown
	defaulted?(write: DefaultWrite, out: any): void
}

const transformedValues: WrittenValues = {
	transformed: ({ t }, value) => t!(value)
}

const isDefaulted = ({ d, w }: Checker) => !!(w || d?.length)

// what props whose values transform or default write, keeping what they don't:
// each transform runs first, and a default only where none failed
const writtenProps = (
	declared: Props,
	data: any,
	values = transformedValues
): any => {
	let out = data
	let defaults = false
	for (const k in declared) {
		const checker = declared[k]
		if (!holdsValue(checker, data, k)) {
			defaults ||= isDefaulted(checker)
			continue
		}
		if (!checker.t) continue
		const value = values.transformed(checker, data[k], k)
		if (Object.is(value, data[k])) continue
		if (out === data) out = copyOf(data)
		out[k] = value
	}
	if (defaults && !values.failed?.()) {
		for (const k in declared) {
			const checker = declared[k]
			if (holdsValue(checker, data, k) || !isDefaulted(checker)) continue
			if (out === data) out = copyOf(data)
			// a default is written even where it's undefined
			if (checker.w) values.defaulted!(checker.w, out)
			else out[k] = checker.d![0]
		}
	}
	if (out !== data)
		for (const k in declared) if (!(k in out) && k in data) out[k] = data[k]
	return out
}

// a t reading each value through what it's passed
type WritesValues = (data: any, values?: WrittenValues) => unknown

type FailingValues = (
	write: WritesValues,
	held: readonly Checker[]
) => Transform

const transformsProps = (
	declared: Props,
	checker: Checker,
	fails?: FailingValues
): Checker => {
	checker.t =
		fails ?
			fails(
				(data, values) => writtenProps(declared, data, values),
				Object.values(declared)
			)
		:	data => writtenProps(declared, data)
	return checker
}

export const transformingProps = ((
	declared: Props,
	fails?: FailingValues
): Checker => transformsProps(declared, props(declared), fails)) satisfies Fn

export const transformingClosedProps = ((
	declared: Props,
	description?: string,
	fails?: FailingValues
): Checker =>
	transformsProps(
		declared,
		closedProps(declared, description),
		fails
	)) satisfies Fn

// a result of the keys it declares, in order; an instance is copied where it
// must be, keeping its prototype
export const deletingProps = ((
	declared: Props,
	fails?: FailingValues
): Checker => {
	const checker = props(declared)
	const write: WritesValues = (data, values = transformedValues) => {
		if (Object.getPrototypeOf(data) !== Object.prototype) {
			let out = writtenProps(declared, data, values)
			for (const k of [
				...Object.keys(data),
				...Object.getOwnPropertySymbols(data)
			]) {
				if (hasOwn(declared, k)) continue
				if (out === data) out = copyOf(data)
				delete out[k]
			}
			return out
		}
		const result: Record<string, unknown> = {}
		let defaults = false
		for (const k in declared) {
			const { t, d: defaulted, w } = declared[k]
			if (holdsValue(declared[k], data, k))
				result[k] = t ? values.transformed(declared[k], data[k], k) : data[k]
			else if (defaulted?.length) result[k] = defaulted[0]
			// holds its place among the keys, as each transform runs before it's written
			else if (w) {
				result[k] = undefined
				defaults = true
			}
		}
		if (defaults && !values.failed!()) {
			for (const k in declared) {
				const { w } = declared[k]
				if (w && !holdsValue(declared[k], data, k)) values.defaulted!(w, result)
			}
		}
		return result
	}
	checker.t =
		fails ? fails(write, Object.values(declared)) : data => write(data)
	return checker
}) satisfies Fn

// an array's elements, each checked at its index
export const elementsOf = ((element: Checker): Checker =>
	(data: any, ctx) => {
		for (let i = 0; i < data.length; i++)
			if (failsValue(ctx, element, data, i, data[i])) return false
		return true
	}) satisfies Fn

export const transformingElementsOf = ((
	element: Checker,
	fails?: FailingValues
): Checker => {
	const checker = elementsOf(element)
	const write: WritesValues = (data, values = transformedValues) => {
		let out = data
		for (let i = 0; i < data.length; i++) {
			const value = values.transformed(element, data[i], i)
			if (Object.is(value, data[i])) continue
			if (out === data) out = copyOf(data)
			out[i] = value
		}
		return out
	}
	checker.t = fails ? fails(write, [element]) : data => write(data)
	return checker
}) satisfies Fn

// a value transforming may fail: what fails goes to ctx, or without one is
// returned gathered, as arktype's Transform does for a node with no ctx
export const failingValues: FailingValues = (write, held) => {
	const t: Transform = (data, ctx) => {
		const issues = ctx?.errN
		let gathered: TransformErrors | undefined
		const gather = (errors: TransformErrors, k?: PropertyKey) => {
			if (ctx) addMorphErrs(ctx, errors, k)
			else gathered = errors.addTo(gathered, k)
		}
		const failed = () => gathered ?? ctx?.errN > issues
		const out = write(data, {
			transformed: ({ t }, value, k) => {
				let result
				if (t!.c) {
					ctx.path.push(k)
					result = t!(value, ctx)
					ctx.path.pop()
				} else result = t!(value)
				if (!(result instanceof TransformErrors)) return result
				gather(result, k)
				return value
			},
			failed,
			defaulted: (write, out) => {
				const written = write(out, ctx)
				if (written !== out) gather(written as TransformErrors)
			}
		})
		return failed() ? (gathered ?? data) : out
	}
	if (held.some(({ w }) => w?.length === 2)) t.c = 1
	return holdingMorphs(t, held)
}

// what holds an alias transforms with a ctx, whichever value transforms
export const failingWithCtx: FailingValues = (write, held) => {
	const t = failingValues(write, held)
	t.c = 1
	return t
}

// only transforming a value Apply finds valid finds its morphs' errors
const applyMorphAt: ApplyAt = (ctx, checker, value, k) => {
	ctx.path.push(k)
	const passes =
		(
			transformsValid(ctx) &&
			(checker.a ? checker.a(value, ctx) : checker(value))
		) ?
			(transformedInApply(ctx, transformedBy(checker, value, ctx)), true)
		:	checker(value, ctx)
	ctx.path.pop()
	return !passes
}

/** a step of a morph: what it returns of what the step before returned */
interface MorphStep {
	(data: any, ctx?: any): unknown
	/** where it pipes to a node, so reports to a ctx */
	p?: 1
}

// a morph's step piping to a node, as arktype reads it
export const piped = ((checker: Checker): MorphStep => {
	const node = {
		allows: checker,
		allowsCtx: !!checker.a,
		tApply: checker,
		tTransform: (data: unknown, ctx: unknown) =>
			transformedBy(checker, data, ctx)
	} as never
	const pipe =
		checker.t ? pipeTransformed
		: checker.a ? pipeChecked
		: pipeApplied
	const step: MorphStep = (data, ctx) => pipe(ctx, node, data)
	step.p = 1
	return step
}) satisfies Fn

// its head decides what's allowed, each step taking what the last returned
export const morphing = ((
	head: Checker | 0,
	steps: readonly MorphStep[]
): Checker => {
	const checker: Checker = (data, ctx) => !head || head(data, ctx)
	if (head) checker.description = head.description
	const t: Transform = (data, ctx) => {
		let result = data
		if (head && head.t) {
			const issues = ctx?.errN
			result = transformedBy(head, data, ctx)
			if (result instanceof TransformErrors) {
				if (!ctx) return result
				addMorphErrs(ctx, result)
				return data
			}
			if (ctx?.errN > issues) return data
		}
		for (const step of steps) {
			const morphed: any = step(result, ctx)
			if (
				step.p ?
					ctx._errors !== undefined && morphed === ctx._errors
				:	morphed instanceof ArkErrors
			) {
				if (!ctx) return new TransformErrors(morphed, result)
				addErrors(ctx, morphed)
				return data
			}
			result = morphed
		}
		return result
	}
	t.m = applyMorphAt
	if (steps.some(step => step.p) || (head && head.t?.c)) t.c = 1
	checker.t = t
	return checker
}) satisfies Fn

// read as a node's Transform, unless it's unread
export const transformOf = ((checker: Checker) => checker.t!) satisfies Fn

// a node only transforming by its checker
export const checkerNode = ((checker: Checker) =>
	Object.freeze({
		tfs: true,
		tApply: checker,
		tTransform: checker.t,
		allows: checker
	})) satisfies Fn

// a node read past its allows, by a cycle or a callback reading its ctx
export const ctxNode = ((
	flags: object,
	tAllows: Checker,
	tApply: Checker,
	tTransform?: Transform
) => {
	const node: any = Object.freeze({
		...flags,
		allowsCtx: true,
		tAllows,
		tApply,
		tTransform,
		allows: (data: unknown) =>
			allowsUntracked(node, data) ?? allowsInContext(node, data, runtimeConfig),
		$: runtimeScope
	})
	return node
}) satisfies Fn

// a union transforms by the branch data takes
const transformingBranches = (
	checker: Checker,
	branches: readonly (Checker | 1)[],
	t: Transform
): Checker => {
	if (branches.some(branch => (branch as Checker).t))
		checker.t = holdingMorphs(t, branches as Checker[])
	return checker
}

// a union of values compared by identity
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
	checker.description = description
	return transformingBranches(checker, Object.values(cases), (data, ctx) =>
		transformedBy(caseOf(data) as Checker, data, ctx)
	)
}) satisfies Fn

export const nullableDescriptionOf = (domain: string): string =>
	`${domain === "object" ? "an" : "a"} ${domain} or null`

// a domain's checker or null
export const nullable = ((checker: Checker | 1, domain = "string"): Checker =>
	domains(
		{ [domain]: checker, null: 1 },
		nullableDescriptionOf(domain)
	)) satisfies Fn

// a union of objects told apart by the string at one key
export const discriminate = ((
	key: string,
	cases: Record<string, Checker | 1>,
	description = describeValues(Object.keys(cases)),
	missed: FailureSite = { code: "union", description: "an object" },
	// a described union misses at its own path
	isOwn?: 1,
	areBooleans?: 1
): Checker => {
	// keyed by string, so no other value is a case
	const byValue = new Map<unknown, Checker | 1>(
		areBooleans ?
			[
				[true, cases.true],
				[false, cases.false]
			]
		:	Object.entries(cases)
	)
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
	checker.description = missed.description
	return transformingBranches(checker, Object.values(cases), (data, ctx) =>
		transformedBy(byValue.get(data[key]) as Checker, data, ctx)
	)
}) satisfies Fn

// the branches lacking the key check data holding no case
export const discriminateOr = ((
	otherwise: Checker,
	key: string,
	cases: Record<string, Checker | 1>,
	description: string,
	missed: FailureSite = { code: "union", description: "an object" }
): Checker => {
	const byValue = new Map(Object.entries(cases))
	const site: FailureSite = { code: "discriminant", description }
	const miss: Checker = (data, ctx) => !failsAt(ctx as never, site, data, key)
	const checker: Checker = (data: any, ctx) => {
		const branch = byValue.get(data?.[key])
		return branch ?
				branch === 1 || branch(data, ctx)
			:	otherwise(data) ||
					(objectCheck.test(data) ?
						!failsBranches(ctx, [miss, otherwise], data)
					:	!failsAt(ctx as never, missed, data))
	}
	checker.description = missed.description
	return transformingBranches(
		checker,
		[...byValue.values(), otherwise],
		(data, ctx) =>
			transformedBy((byValue.get(data[key]) ?? otherwise) as Checker, data, ctx)
	)
}) satisfies Fn

// branches tried in turn, failing as one issue of each's first, by what writes
// it if it isn't what they did
export const union = ((
	branches: readonly Checker[],
	description: string,
	issueOf?: Parameters<typeof failsBranches>[3]
): Checker => {
	const checker: Checker = (data, ctx) =>
		branches.some(branch => branch(data)) ||
		!failsBranches(ctx, branches, data, issueOf)
	checker.description = description
	if (branches.some(branch => branch.t))
		checker.t = data => branches.find(branch => branch(data))!.t?.(data) ?? data
	return checker
}) satisfies Fn
