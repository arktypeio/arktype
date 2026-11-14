// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	listedIssue,
	type ArkErrorCode,
	type CompactApply,
	type Custom,
	type FailureContext,
	type FailureSite,
	type SiteContext
} from "@ark/schema/runtime"
import { hasOwn, type Fn } from "@ark/util"
import {
	addErrors,
	addMorphErrs,
	allowsInBranchBy,
	allowsInContext,
	allowsUntracked,
	appliesValues,
	ArkErrors,
	copyOf,
	describePredicate,
	discriminatesBooleans,
	enterApplied,
	exitApplied,
	failsAt,
	failsBranches,
	failsInBranches,
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
	transformsBranches,
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
	/** where it holds a callback reading its ctx, its Allows at the key ctx is at, or at k under it */
	a?: ((data: unknown, ctx: any, k?: PropertyKey) => boolean) | undefined
	/** where it holds an alias, how a key applies it */
	e?: ApplyAt
	/** the message a key it's the value of says where the key is missing, if its own */
	x?: string | undefined
	/** how x was configured, as a site's c says */
	c?: Custom | undefined
}

type DefaultWrite = (data: any, ctx?: any) => unknown

interface Transform {
	(data: any, ctx?: any): unknown
	/** where it holds a morph, how a key applies what it's the transform of */
	e?: ApplyAt | undefined
	/** where it reports to a ctx, rather than returning what fails */
	c?: 1 | undefined
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
		t.e ??= checker.t?.e
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

// a callback's answer where it may report to a ctx: its own issue if it returned
// false reporting none
const reportedBy = (
	read: () => (data: any, ctx: any) => boolean,
	description: string | undefined,
	data: unknown,
	ctx: any
): boolean => {
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

// a callback a build proved only returns what it reports, passed a ctx to report
// to where there is one
export const narrowedWithCtx = ((
	read: () => (data: any, ctx: any) => boolean,
	description?: string
): Checker => {
	const checker: Checker = (data, ctx: any) =>
		ctx?._at && ctx._at !== stops ?
			reportedBy(read, description, data, ctx)
		:	!!read()(data, silentCtx)
	checker.description = description
	return checker
}) satisfies Fn

const stops = () => true

const allowingCtx = (data: any, ctx: any, checker: Checker) => {
	if (ctx._at === stops) return checker(data, ctx)
	const { chkOnly, _at, failsUnion } = ctx
	ctx.chkOnly = true
	ctx._at = ctx.failsUnion = stops
	const allowed = checker(data, ctx)
	ctx._at = _at
	ctx.failsUnion = failsUnion
	ctx.chkOnly = chkOnly
	return allowed
}

// a node holding a callback that may read its ctx runs what Apply does, with a
// ctx finding no issues, stopping at the first as Allows does. Read through a
// node as its Allows, and read by a key where data's checked first
export const readingCtx = ((checker: Checker): Checker => {
	const allows = (data: unknown, ctx: any) => allowingCtx(data, ctx, checker)
	checker.a = (data, ctx, k) => {
		if (k === undefined) return allowsInBranchBy(ctx, allows, data)
		// a key's value is checked at its path, which a callback sees
		ctx.path.push(k)
		const allowed = allowsInBranchBy(ctx, allows, data)
		ctx.path.pop()
		return allowed
	}
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

const wrapping = (checker: Checker): Checker =>
	Object.assign((data: unknown, ctx?: any) => checker(data, ctx), checker)

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
	wrapped.e = (ctx, _, value, k) => {
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
	const checker: Checker = (data, ctx: any) =>
		// one taking only data is passed no ctx where arktype only asks
		!ctx?._at ? !!read()(data, undefined)
		: ctx._at === stops ? !!read()(data, ctx)
		: reportedBy(read, description, data, ctx)
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
		// an issue stops what Apply runs, where Allows stops only at false
		const applies = ctx?._at && ctx._at !== stops
		const issues = applies && issuesIn(ctx)
		for (const narrowed of checkers) {
			if (!narrowed(data, ctx)) return false
			if (applies && issuesIn(ctx) > issues) return true
		}
		return true
	}
	checker.description = checkers[0].description
	return checker
}) satisfies Fn

// a callback a build proved reads only data, written in place with no name
export const narrowed = ((
	narrow: (data: any) => boolean,
	description = "valid according to an anonymous predicate"
): Checker => {
	const checker = ((data, ctx) =>
		!!narrow(data) || !failsAt(ctx as never, checker, data)) as Check
	checker.code = "predicate"
	checker.description = description
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

// a bound's description, as arktype writes it. An exclusive bound is apart, so
// an app writing none ships none of its text
export const min = ((
	rule: number,
	description = rule === 0 ? "non-negative" : `at least ${rule}`
): Check => check("min", description, data => data >= rule)) satisfies Fn

export const moreThan = ((
	rule: number,
	description = rule === 0 ? "positive" : `more than ${rule}`
): Check => check("min", description, data => data > rule)) satisfies Fn

export const max = ((
	rule: number,
	description = rule === 0 ? "non-positive" : `at most ${rule}`
): Check => check("max", description, data => data <= rule)) satisfies Fn

export const lessThan = ((
	rule: number,
	description = rule === 0 ? "negative" : `less than ${rule}`
): Check => check("max", description, data => data < rule)) satisfies Fn

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
	description = rule === 2 ? "even" : `a multiple of ${rule}`
): Check =>
	check("divisor", description, data => data % rule === 0)) satisfies Fn

// what nearly every divisor is, created once
export const integerCheck: Check = /* @__PURE__ */ check(
	"divisor",
	"an integer",
	data => data % 1 === 0
)

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
	const tooSmall = least === undefined ? numberCheck : min(least)
	const tooLarge = most === undefined ? numberCheck : max(most)
	const checker: Checker = (data: any, ctx) =>
		Number.isFinite(data) ?
			(data % 1 === 0 || !failsAt(ctx as never, integerCheck, data)) &&
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
	within?: Checker,
	// what a missing key expects, unless a keyword's basis says more than its brief
	brief = basis ? basis.description : "present"
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
	checker.description = brief
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

// a required key's checker whose description isn't what the key expects where
// missing, which says no message of its own
export const required = ((checker: Checker, description: string): Checker => {
	const wrapped = wrapping(checker)
	wrapped.description = description
	wrapped.x = undefined
	return wrapped
}) satisfies Fn

// a required key's checker where the missing key says a message of its own,
// configured for its value's Type, or as c says, 2 for the code
export const sayingMissing = ((
	checker: Checker,
	message: string,
	c: Custom = 1,
	description = checker.description
): Checker => {
	const wrapped = wrapping(checker)
	wrapped.description = description
	wrapped.x = message
	wrapped.c = c
	return wrapped
}) satisfies Fn

// a checker each of whose sites says the message configured for its Type, as
// does the key it's the value of where missing. It checks no key's value, so
// each site it's passed is its own: the checker of a field is the one a field
// checking the same shares, and only its message is the field's
export const saying = ((checker: Checker, message: string): Checker => {
	const said: Checker = (data, ctx: any) => {
		const at = ctx?._at
		if (!at || at === stops) return checker(data, ctx)
		ctx._at = (site: SiteContext, data: unknown) =>
			at.call(
				ctx,
				{ code: site.code, description: site.description, x: message, c: 1 },
				data
			)
		try {
			return checker(data, ctx)
		} finally {
			ctx._at = at
		}
	}
	Object.assign(said, checker)
	said.x = message
	said.c = 1
	return said
}) satisfies Fn

// what a missing key fails: required's, expecting its value's brief
const missingSiteOf = ({ description, x, c }: Checker): FailureSite =>
	x === undefined ?
		requiredSiteOf(description)
	:	{ m: { code: "required", description, x, c } }

type Props = Record<string, Checker>

// with a ctx, a value is applied once, as arktype applies it, since a callback
// may see each call; one that transforms is checked first where arktype checks it
const failsValue = (
	ctx: FailureContext | number | undefined,
	checker: Checker,
	data: any,
	k: PropertyKey,
	value: unknown
): boolean | undefined =>
	(ctx as FailureContext | undefined)?._at ?
		appliesValues && checker.e ? checker.e(ctx, checker, value, k)
		: appliesValues && checker.t?.e ? checker.t.e(ctx, checker, value, k)
		: (!checker.t ||
				!(appliesValues && checker.a ?
					// as arktype, a value reading its ctx is applied once where
					// one only checks, as Allows does
					!(ctx as any).chkOnly && checker.a(value, ctx, k)
				:	checker(value))) &&
			(ctx as FailureContext)._in(checker as CompactApply, data, k)
	:	!checker(value)

// keys checked in declared order; a missing key expects its checker's
// description. A shape checking more than its keys walks them through this,
// so a program of only props ships no function apart for the walk
export const props = ((declared: Props): Checker => {
	const checker: Checker = (data: any, ctx) => {
		if (!objectCheck.test(data))
			return !failsAt(ctx as never, objectCheck, data)
		for (const k in declared) {
			const value = data[k]
			if (
				value === undefined && !(k in data) ?
					!declared[k].o &&
					failsAt(ctx as never, missingSiteOf(declared[k]), data, k)
				:	failsValue(ctx, declared[k], data, k, value)
			)
				return false
		}
		return true
	}
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
	const walks = props(declared)
	const checker: Checker = (data: any, ctx) => {
		if (!objectCheck.test(data))
			return !failsAt(ctx as never, objectCheck, data)
		if (!walks(data, ctx)) return false
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

// an object each of whose string keys holds value
export const recordOf = ((value: Checker): Checker => {
	const checker: Checker = (data: any, ctx) => {
		if (!objectCheck.test(data))
			return !failsAt(ctx as never, objectCheck, data)
		for (const k of Object.keys(data))
			if (failsValue(ctx, value, data, k, data[k])) return false
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
	const walks = props(declared)
	const checker: Checker = (data: any, ctx) => {
		if (!objectCheck.test(data))
			return !failsAt(ctx as never, objectCheck, data)
		if (!walks(data, ctx)) return false
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

// what a parent's t passes each value through, where one can fail
interface WrittenValues {
	transformed(t: Transform, value: unknown, k: PropertyKey): unknown
	failed(): unknown
	defaulted(write: DefaultWrite, out: any): void
}

// what props write where nothing can fail, a value's transform returning an
// object and a default being a literal. Only the keys changing can write are
// read, and the rest only where data's copied
const writtenProps = (declared: Props, changing: Props, data: any): any => {
	let out = data
	for (const k in changing) {
		const holds = k in data
		const defaulted = changing[k].d
		const value = holds ? changing[k].t?.(data[k]) : defaulted?.[0]
		if (holds ? value !== undefined && value !== data[k] : defaulted?.length) {
			if (out === data) out = copyOf(data)
			out[k] = value
		}
	}
	if (out !== data)
		for (const k in declared) if (!(k in out) && k in data) out[k] = data[k]
	return out
}

const isDefaulted = ({ d, w }: Checker) => !!(w || d?.length)

// the keys a shape transforms or defaults, the only ones that can change data
const changingIn = (declared: Props): Props => {
	const changing: Props = {}
	for (const k in declared) {
		const { t, d, w } = declared[k]
		if (t || w || d?.length) changing[k] = declared[k]
	}
	return changing
}

// what props write where something can fail: each transform runs first, and a
// default only where none failed
const writtenValues = (
	declared: Props,
	changing: Props,
	data: any,
	values: WrittenValues
): any => {
	let out = data
	let defaults = false
	for (const k in changing) {
		const checker = changing[k]
		if (!holdsValue(checker, data, k)) {
			defaults ||= isDefaulted(checker)
			continue
		}
		if (!checker.t) continue
		const value = values.transformed(checker.t, data[k], k)
		if (Object.is(value, data[k])) continue
		if (out === data) out = copyOf(data)
		out[k] = value
	}
	if (defaults && !values.failed()) {
		for (const k in changing) {
			const checker = changing[k]
			if (holdsValue(checker, data, k) || !isDefaulted(checker)) continue
			if (out === data) out = copyOf(data)
			// a default is written even where it's undefined
			if (checker.w) values.defaulted(checker.w, out)
			else out[k] = checker.d![0]
		}
	}
	if (out !== data)
		for (const k in declared) if (!(k in out) && k in data) out[k] = data[k]
	return out
}

// a t reading each value through what it's passed
type WritesValues = (data: any, values: WrittenValues) => unknown

// props writing what its keys transform or default; a closed shape passes its
// own checker
export const transformingProps = ((
	declared: Props,
	checker: Checker = props(declared)
): Checker => {
	const changing = changingIn(declared)
	checker.t = data => writtenProps(declared, changing, data)
	return checker
}) satisfies Fn

export const transformingClosedProps = ((
	declared: Props,
	description?: string
): Checker =>
	transformingProps(declared, closedProps(declared, description))) satisfies Fn

const transformsFailing = (
	declared: Props,
	checker: Checker,
	withCtx?: 1
): Checker => {
	const changing = changingIn(declared)
	checker.t = failingValues(
		(data, values) => writtenValues(declared, changing, data, values),
		Object.values(declared),
		withCtx
	)
	return checker
}

export const failingProps = ((declared: Props, withCtx?: 1): Checker =>
	transformsFailing(declared, props(declared), withCtx)) satisfies Fn

export const failingClosedProps = ((
	declared: Props,
	description?: string,
	withCtx?: 1
): Checker =>
	transformsFailing(
		declared,
		closedProps(declared, description),
		withCtx
	)) satisfies Fn

const deletes = (declared: Props, data: any, out: any): any => {
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

// a result of the keys it declares, in order; an instance is copied where it
// must be, keeping its prototype
export const deletingProps = ((declared: Props): Checker => {
	const checker = props(declared)
	checker.t = data => {
		if (Object.getPrototypeOf(data) !== Object.prototype)
			return deletes(declared, data, writtenProps(declared, declared, data))
		const result: Record<string, unknown> = {}
		for (const k in declared) {
			const { t, d: defaulted } = declared[k]
			if (k in data) result[k] = t ? t(data[k]) : data[k]
			else if (defaulted?.length) result[k] = defaulted[0]
		}
		return result
	}
	return checker
}) satisfies Fn

export const failingDeletingProps = ((
	declared: Props,
	withCtx?: 1
): Checker => {
	const checker = props(declared)
	checker.t = failingValues(
		(data, values) => {
			if (Object.getPrototypeOf(data) !== Object.prototype) {
				return deletes(
					declared,
					data,
					writtenValues(declared, declared, data, values)
				)
			}
			const result: Record<string, unknown> = {}
			let defaults = false
			for (const k in declared) {
				const { t, d: defaulted, w } = declared[k]
				if (holdsValue(declared[k], data, k))
					result[k] = t ? values.transformed(t, data[k], k) : data[k]
				else if (defaulted?.length) result[k] = defaulted[0]
				// holds its place among the keys, as each transform runs before it's written
				else if (w) {
					result[k] = undefined
					defaults = true
				}
			}
			if (defaults && !values.failed()) {
				for (const k in declared) {
					const { w } = declared[k]
					if (w && !holdsValue(declared[k], data, k))
						values.defaulted(w, result)
				}
			}
			return result
		},
		Object.values(declared),
		withCtx
	)
	return checker
}) satisfies Fn

// what a shape's own text writes, where a transform can fail reading each
// value through values
type SitedWrite = (
	data: any,
	checkers: readonly Checker[],
	values: WrittenValues | undefined,
	copy: (data: any) => any
) => any

// a shape of many keys that may be absent, or whose transform can fail, reading
// and writing each at a site of its own, as one site reading them all finds each
// by a generic lookup. Only what looks for issues in data that failed still takes
// that site
export const sited = ((
	allows: (data: any, checkers: readonly Checker[]) => boolean,
	declared: Props,
	write: SitedWrite | 0,
	// 1 where it transforms, 2 where a transform can fail, 3 and 4 where it
	// also deletes the keys it doesn't declare
	writes: 0 | 1 | 2 | 3 | 4,
	removed?: string,
	withCtx?: 1
): Checker => {
	const checkers = Object.values(declared)
	const walks = removed ? closedProps(declared, removed) : props(declared)
	const checker: Checker = (data: any, ctx: any) =>
		!objectCheck.test(data) ? !failsAt(ctx as never, objectCheck, data)
		: ctx?._at ? walks(data, ctx)
		: allows(data, checkers)
	checker.description = objectCheck.description
	if (!write) return checker
	const changing = changingIn(declared)
	const written = (data: any, values?: WrittenValues) => {
		// an instance is copied, keeping its prototype
		if (writes > 2) {
			return Object.getPrototypeOf(data) === Object.prototype ?
					write(data, checkers, values, copyOf)
				:	deletes(
						declared,
						data,
						values ?
							writtenValues(declared, changing, data, values)
						:	writtenProps(declared, changing, data)
					)
		}
		const out = write(data, checkers, values, copyOf)
		// where data's copied, each key it declares that the copy lacks
		if (out !== data)
			for (const k in declared) if (!(k in out) && k in data) out[k] = data[k]
		return out
	}
	checker.t =
		writes % 2 ?
			data => written(data)
			// a t of its own, calling only what a shape writes, where failingValues'
			// calls whatever any transform that can fail does
		:	readingValues(
				(data, ctx) => {
					const values = writtenFor(ctx)
					try {
						return values.resolved(data, written(data, values))
					} finally {
						freed(values)
					}
				},
				checkers,
				withCtx
			)
	return checker
}) satisfies Fn

// an array's elements, each checked at its index
export const elementsOf = ((element: Checker): Checker =>
	(data: any, ctx) => {
		for (let i = 0; i < data.length; i++)
			if (failsValue(ctx, element, data, i, data[i])) return false
		return true
	}) satisfies Fn

export const transformingElementsOf = ((element: Checker): Checker => {
	const checker = elementsOf(element)
	checker.t = data => {
		let out = data
		for (let i = 0; i < data.length; i++) {
			const value = element.t!(data[i])
			if (value === data[i]) continue
			if (out === data) out = copyOf(data)
			out[i] = value
		}
		return out
	}
	return checker
}) satisfies Fn

const failingElements = (element: Checker, withCtx?: 1): Transform =>
	failingValues(
		(data, values) => {
			let out = data
			const { t } = element
			for (let i = 0; i < data.length; i++) {
				const value = values.transformed(t!, data[i], i)
				if (Object.is(value, data[i])) continue
				if (out === data) out = copyOf(data)
				out[i] = value
			}
			return out
		},
		[element],
		withCtx,
		1
	)

export const failingElementsOf = ((element: Checker, withCtx?: 1): Checker => {
	const checker = elementsOf(element)
	checker.t = failingElements(element, withCtx)
	return checker
}) satisfies Fn

// an array of element, which may fail to transform
export const failingArrayOf = ((
	element: Checker,
	max?: number,
	min?: number,
	withCtx?: 1
): Checker => {
	const checker = arrayOf(element, max, min)
	checker.t = failingElements(element, withCtx)
	return checker
}) satisfies Fn

// a value transforming may fail: what fails goes to ctx, or without one is
// returned gathered, as arktype's Transform does for a node with no ctx
class Written implements WrittenValues {
	declare gathered: TransformErrors | undefined
	declare ctx: any
	declare issues: number | undefined

	constructor(ctx?: any) {
		this.ctx = ctx
		this.issues = ctx?.errN
		this.gathered = undefined
	}

	gather(errors: TransformErrors, k?: PropertyKey) {
		if (this.ctx) addMorphErrs(this.ctx, errors, k)
		else this.gathered = errors.addTo(this.gathered, k)
	}

	failed() {
		return this.gathered ?? this.ctx?.errN > this.issues!
	}

	// what a t returns of out where a value failed: with no ctx, what failed
	resolved(data: unknown, out: unknown) {
		return this.gathered ?? (this.ctx?.errN > this.issues! ? data : out)
	}

	transformed(t: Transform, value: unknown, k: PropertyKey) {
		let result
		if (t.c) {
			this.ctx.path.push(k)
			result = t(value, this.ctx)
			this.ctx.path.pop()
		} else result = t(value)
		if (result === value || !(result instanceof TransformErrors)) return result
		this.gather(result, k)
		return value
	}

	defaulted(write: DefaultWrite, out: any) {
		const written = write(out, this.ctx)
		if (written !== out) this.gather(written as TransformErrors)
	}
}

// a transform's Written: where there's no ctx, one for each depth of those
// running within one another, so a call allocates none. One with a ctx is new,
// as writing a ctx just created into an old Written costs more. Each t frees its
// own in a finally, as a value's morph may throw
const writtenAtDepth: Written[] = []
let depth = 0

const writtenFor = (ctx: any): Written => {
	if (ctx) return new Written(ctx)
	const values = (writtenAtDepth[depth] ??= new Written())
	depth++
	return values
}

// holding nothing it gathered while it's free
const freed = (values: Written) => {
	if (values.ctx) return
	depth--
	values.gathered = undefined
}

// what holds an alias transforms with a ctx, whichever value transforms
const readingValues = (t: Transform, held: readonly Checker[], withCtx?: 1) => {
	if (withCtx || held.some(({ w }) => w?.length === 2)) t.c = 1
	return holdingMorphs(t, held)
}

const failingValues = (
	write: WritesValues,
	held: readonly Checker[],
	withCtx?: 1,
	// 1 where it writes an array's elements, which an empty one has none of
	elements?: 1
): Transform =>
	readingValues(
		(data, ctx) => {
			if (elements && !data.length) return data
			const values = writtenFor(ctx)
			try {
				return values.resolved(data, write(data, values))
			} finally {
				freed(values)
			}
		},
		held,
		withCtx
	)

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
export const piped = ((checker: Checker, reports?: 1): MorphStep => {
	const node = {
		allows: checker,
		allowsCtx: !!(checker.a || reports),
		tApply: checker,
		tTransform: (data: unknown, ctx: unknown) =>
			transformedBy(checker, data, ctx)
	} as never
	const pipe =
		checker.t ? pipeTransformed
		: checker.a || reports ? pipeChecked
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
	// read once, as a t reading them of whichever morph it is finds each by a
	// generic lookup
	const headT = head ? head.t : undefined
	const headReadsCtx = headT?.c
	const pipes = steps.map(step => step.p)
	const t: Transform = (data, ctx) => {
		let result = data
		if (headT) {
			const issues = ctx?.errN
			result = headReadsCtx ? headT(data, ctx) : headT(data)
			if (result instanceof TransformErrors) {
				if (!ctx) return result
				addMorphErrs(ctx, result)
				return data
			}
			if (ctx?.errN > issues) return data
		}
		for (let i = 0; i < steps.length; i++) {
			const step = steps[i]
			const morphed: any = step(result, ctx)
			if (
				pipes[i] ?
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
	t.e = applyMorphAt
	if (pipes.includes(1) || headReadsCtx) t.c = 1
	checker.t = t
	return checker
}) satisfies Fn

// read as a node's Transform, unless it's unread
export const transformOf = ((checker: Checker) => checker.t!) satisfies Fn

// a node only transforming by its checker
export const checkerNode = ((checker: Checker, reportsPred?: true) =>
	Object.freeze({
		tfs: true,
		reportsPred,
		tApply: checker,
		tTransform: checker.t,
		allows: checker
	})) satisfies Fn

// a node read past its allows, by a cycle or a callback reading its ctx. One
// its own traversals read is declared before them, and filled here
export const ctxNode = ((
	flags: object,
	tAllows: Checker,
	tApply: Checker,
	tTransform?: Transform,
	declared: object = {}
) => {
	const node: any = Object.freeze(
		Object.assign(declared, flags, {
			allowsCtx: true,
			tAllows,
			tApply,
			tTransform,
			allows: (data: unknown) =>
				allowsUntracked(node, data) ??
				allowsInContext(node, data, runtimeConfig),
			$: runtimeScope
		})
	)
	return node
}) satisfies Fn

// a union's transform where a branch's can fail, holding a morph or an alias
export const failingBranches = ((
	branchOf: (data: any) => Checker | 1,
	branches: readonly (Checker | 1)[]
): Transform =>
	holdingMorphs(
		(data, ctx) => transformedBy(branchOf(data) as Checker, data, ctx),
		branches as Checker[]
	)) satisfies Fn

type FailingBranches = typeof failingBranches

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
	description: string,
	fails?: FailingBranches
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
	// a union transforms by the branch data takes, and what a branch transforms
	// is an object where it can't fail
	if (
		transformsBranches &&
		Object.values(cases).some(branch => (branch as Checker).t)
	) {
		checker.t =
			failsInBranches && fails ?
				fails(caseOf, Object.values(cases))
			:	data => (caseOf(data) as Checker).t?.(data) ?? data
	}
	return checker
}) satisfies Fn

export const nullableDescriptionOf = (domain: string): string =>
	`${domain === "object" ? "an" : "a"} ${domain} or null`

// a domain's checker that transforms nothing, nor is an object, or null
export const nullable = ((checker: Checker | 1, domain = "string"): Checker => {
	const description = nullableDescriptionOf(domain)
	const site: FailureSite = { code: "discriminant", description }
	const wrapped: Checker = (data, ctx) =>
		data === null ||
		(typeof data === domain ?
			checker === 1 || checker(data, ctx)
		:	!failsAt(ctx as never, site, data))
	wrapped.description = description
	return wrapped
}) satisfies Fn

// an object's checker or null, as domains writes them, smaller; what it
// transforms is an object where it can't fail
export const nullableObject = ((checker: Checker): Checker => {
	const site: FailureSite = {
		code: "discriminant",
		description: "an object or null"
	}
	const wrapped: Checker = (data, ctx) =>
		data === null ||
		(objectCheck.test(data) ?
			checker(data, ctx)
		:	!failsAt(ctx as never, site, data))
	wrapped.description = site.description
	const { t } = checker
	if (transformsBranches && t)
		wrapped.t = data => (data === null ? data : (t(data) ?? data))
	return wrapped
}) satisfies Fn

// a union of objects told apart by the string at one key
export const discriminate = ((
	key: string,
	cases: Record<string, Checker | 1>,
	description = describeValues(Object.keys(cases)),
	missed: FailureSite = { code: "union", description: "an object" },
	// a described union misses at its own path
	isOwn?: 1,
	areBooleans?: 1,
	fails?: FailingBranches
): Checker => {
	// keyed by each case's string, or boolean, so no other value is a case
	const byValue = new Map<unknown, Checker | 1>(
		discriminatesBooleans && areBooleans ?
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
	if (
		transformsBranches &&
		Object.values(cases).some(branch => (branch as Checker).t)
	) {
		checker.t =
			failsInBranches && fails ?
				fails(data => byValue.get(data[key])!, Object.values(cases))
			:	data => (byValue.get(data[key]) as Checker).t?.(data) ?? data
	}
	return checker
}) satisfies Fn

// the branches lacking the key check data holding no case
export const discriminateOr = ((
	otherwise: Checker,
	key: string,
	cases: Record<string, Checker | 1>,
	description: string,
	missed: FailureSite = { code: "union", description: "an object" },
	fails?: FailingBranches
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
						!failsBranches(ctx, [miss, otherwise], data, listedIssue)
					:	!failsAt(ctx as never, missed, data))
	}
	checker.description = missed.description
	const branches = [...byValue.values(), otherwise]
	if (transformsBranches && branches.some(branch => (branch as Checker).t)) {
		checker.t =
			failsInBranches && fails ?
				fails(data => byValue.get(data[key]) ?? otherwise, branches)
			:	data =>
					((byValue.get(data[key]) ?? otherwise) as Checker).t?.(data) ?? data
	}
	return checker
}) satisfies Fn

// branches tried in turn, failing as one issue of each's first, by what writes it
export const union = ((
	branches: readonly Checker[],
	description: string,
	issueOf: Parameters<typeof failsBranches>[3],
	fails?: FailingBranches
): Checker => {
	const checker: Checker = (data, ctx) =>
		branches.some(branch => branch(data)) ||
		!failsBranches(ctx, branches, data, issueOf)
	checker.description = description
	if (transformsBranches && branches.some(branch => branch.t)) {
		checker.t =
			failsInBranches && fails ?
				fails(data => branches.find(branch => branch(data))!, branches)
			:	data => branches.find(branch => branch(data))!.t?.(data) ?? data
	}
	return checker
}) satisfies Fn
