import {
	$ark,
	BaseRoot,
	bindPrecompiledUnits,
	createNode,
	deferredCallable,
	inProgress,
	intrinsic,
	isNode,
	lastCreated,
	printSelfAsThis,
	type BaseNode,
	type DeferredShell,
	type GenericRoot,
	type IntersectionNode
} from "@ark/schema"
import { domainOf, hasDomain, isThunk, type Dict, type Domain } from "@ark/util"
import { domainsOf, unitBitsOf } from "arksets/internal"
import { preparseKey } from "./parser/objectLiteral.ts"
import type { InternalScope } from "./scope.ts"

// A Type whose definition can't throw needn't build its nodes until it's read.
// Whatever isn't proved here parses as it always did, so its error is thrown by
// the same parse at the same call: anything a Type does past its call is a read,
// which builds it first, and its nodes are then those parsing it would have built.
// Equal definitions are one Type before any read, as their nodes would make them.

/** what's known of a Type before its nodes exist */
interface Facts {
	/** what's the same of any definition parsing to its nodes */
	key: string
	/** the terms of a union, flattened by another */
	terms?: string[] | undefined
	/** whether it's a union, any branch of which an intersection could conflict with */
	branched?: boolean | undefined
	/** whether two of a union's branches could allow one value, so are reduced as
	 * they're nested */
	overlaps?: boolean | undefined
	/** what its input can be, as `domainsOf` writes it */
	domains: number
	/** whether it changes no data, which a union can't then find indeterminate */
	pure: boolean
	/** the primitives it's a union of, if that's all it is */
	values?: unknown[] | undefined
	/** whether it allows a unit, which what it's narrowed with checks as it's written */
	units?: boolean | undefined
	/** whether what it holds allows one, as an element or a prop's value does */
	unitsWithin?: boolean | undefined
	/** what it's a range over and that range */
	base?: "string" | "array" | "number" | "integer" | undefined
	/** the key of what a range is of, if another bound can join it */
	of?: string | undefined
	/** what a bound can narrow, where it isn't a range another joins */
	bounds?: Facts["base"]
	/** whether it holds a predicate, which a union calls on a unit it could allow */
	narrowed?: boolean | undefined
	/** whether what it holds has one, which a union calls on a unit held in its place */
	narrowedWithin?: boolean | undefined
	/** which of those each prop of an object literal holds, if only its props hold them */
	held?: Map<string, number> | undefined
	min?: number | undefined
	minExclusive?: boolean | undefined
	max?: number | undefined
	maxExclusive?: boolean | undefined
	/** the values keys must have, which can make a union's branches disjoint */
	tags?: Map<string, unknown[]> | undefined
	/** the keys of an object literal saying nothing of others */
	names?: string[] | undefined
	/** how each entry of an object literal was written */
	entries?: string[] | undefined
	/** whether it's an object literal, so it can be spread */
	literal?: boolean | undefined
	/** each prop of an object literal, by its name and how it's written */
	props?: [name: string, entry: string][] | undefined
	/** how what an object literal spreads is written */
	spread?: string | undefined
	/** whether it holds an alias, which composing can then find conflicts in, or
	 * only a scanned `this`, which a bound can't */
	cyclic?: boolean | "this" | undefined
	/** whether it's a property's default, which only a property can be */
	defaults?: boolean | undefined
}

interface Deferred extends DeferredShell {
	facts: Facts
	$: InternalScope
	/** what builds its nodes until it's read */
	resolve: (() => BaseRoot) | undefined
}

const deferred = new WeakMap<object, Deferred>()

const stringBits = unitBitsOf("string")
const objectBits = unitBitsOf("object")
const numberBits = unitBitsOf("number")
const undefinedBits = unitBitsOf("undefined")
const symbolBits = unitBitsOf("symbol")

// what building a Type asks of what it holds is built too
let settling = 0

const settle = (self: BaseRoot, d: Deferred): BaseRoot => {
	const prior = lastCreated
	settling++
	let node: BaseRoot
	try {
		node = d.resolve!()
	} finally {
		settling--
	}
	const created = lastCreated
	d.resolve = undefined
	createNode({
		id: node.id,
		kind: node.kind,
		inner: node.inner,
		meta: node.meta,
		$: node.$,
		ignoreCache: true,
		shell: d
	})
	const key = node.c.key
	self.c.key = key
	// what holds `this` prints it, which its nodes written again wouldn't
	if (Object.getOwnPropertyDescriptor(node, "expression")?.get)
		printSelfAsThis(self, node)
	// no other holds a node it just created, so what reaches its key next is this
	if (key && node.id === created && created !== prior) {
		node.$.nodesByKey.set(key, self)
		if ($ark.nodesById[node.id] === node)
			$ark.nodesById[node.id] = self as never
	}
	return node.$.fin(self)
}

const settled = (self: any): any => {
	const d = deferred.get(self)
	return d?.resolve ? settle(self, d) : self
}

// keywords changing no data, by what they check
export const keywordDomains: Dict<string, Domain> = {
	string: "string",
	"string.uuid": "string",
	"string.email": "string",
	"string.url": "string",
	"string.date.iso": "string",
	"string.date": "string",
	"string.ip": "string",
	"string.numeric": "string",
	"string.integer": "string",
	"string.digits": "string",
	"string.alpha": "string",
	"string.alphanumeric": "string",
	"string.hex": "string",
	"string.semver": "string",
	number: "number",
	"number.integer": "number",
	"number.safe": "number",
	boolean: "boolean",
	bigint: "bigint",
	symbol: "symbol",
	object: "object",
	null: "null",
	undefined: "undefined",
	true: "boolean",
	false: "boolean"
} as never

const stringLiteral = /^'[^'\\]*'$/
const numberLiteral = /^-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/
const branded = /^([.a-z]+)#\w[\w!]*$/
const range = /^(?:(0|-?[1-9]\d*) (<=?) )?(\S.*) ([<>]=?) (0|-?[1-9]\d*)$/
const defaulted = /^(.+) = ('[^'\\]*'|0|-?[1-9]\d*|true|false)$/
const regexLiteral = /^\/(?:[^\n/\\]|\\.)+\/$/
const record = /^Record<string, (.+)>$/

const fits = (value: unknown, facts: Facts): boolean => {
	// without exactOptionalPropertyTypes a default replaces undefined, so can't be it
	if (value === undefined) return false
	if (facts.values) return facts.values.includes(value)
	if (typeof value === "string") {
		return (
			facts.base === "string" &&
			value.length >= (facts.min ?? 0) &&
			value.length <= (facts.max ?? Infinity)
		)
	}
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		(facts.base === "number" ||
			(facts.base === "integer" && Number.isInteger(value))) &&
		(facts.min === undefined ||
			(facts.minExclusive ? value > facts.min : value >= facts.min)) &&
		(facts.max === undefined ||
			(facts.maxExclusive ? value < facts.max : value <= facts.max))
	)
}

const holdsNarrow = 1
const holdsUnit = 2

/** what a Type holding it then holds: a predicate, or a unit one could be called on */
const holds = (f: Facts) =>
	(f.narrowed || f.narrowedWithin ? holdsNarrow : 0) |
	(f.units || f.unitsWithin ? holdsUnit : 0)

type Holding = Pick<Facts, "narrowedWithin" | "unitsWithin">

const holding = (...held: Facts[]): Holding => {
	let bits = 0
	for (const f of held) bits |= holds(f)
	return {
		narrowedWithin: (bits & holdsNarrow) !== 0,
		unitsWithin: (bits & holdsUnit) !== 0
	}
}

/** what an inclusive range is, which any way of writing it is one Type */
const rangeFacts = (
	d: Pick<Facts, "pure" | "base" | "of" | "cyclic"> & Holding,
	min: number | undefined,
	max: number | undefined
): Facts => {
	// a length is at least 0 without saying so
	if (!min && (d.base === "string" || d.base === "array")) min = undefined
	// a number that can only be one value is that unit
	const unit =
		min !== undefined &&
		min === max &&
		(d.base === "number" || d.base === "integer")
	return {
		key: `${d.of}${min === undefined ? "" : `>=${min}`}${max === undefined ? "" : `<=${max}`}`,
		domains:
			d.base === "string" ? stringBits
			: d.base === "array" ? objectBits
			: numberBits,
		pure: d.pure,
		cyclic: d.cyclic,
		base: d.base,
		of: d.of,
		min,
		max,
		values: unit ? [min] : undefined,
		units: unit,
		narrowedWithin: d.narrowedWithin,
		unitsWithin: d.unitsWithin
	}
}

const scanRange = (def: string): Facts | undefined => {
	const m = range.exec(def)
	if (!m) return
	const [, left, leftOp, word, op, right] = m
	const of =
		word === "string" || word === "number" || word === "number.integer" ?
			scanTerm(word)
		: word.endsWith("[]") ? scanTerm(word)
		: undefined
	if (!of?.pure || !of.base) return
	const isLength = of.base === "string" || of.base === "array"
	// a length's bound is an integer
	const step = of.base === "number" ? 0 : 1
	let min: number | undefined
	let max: number | undefined
	if (op[0] === "<") max = +right - (op === "<" ? step : 0)
	else min = +right + (op === ">" ? step : 0)
	if (left) {
		// a bound before an array of a range bounds that range, as a parser reads it
		if (op[0] !== "<" || range.test(word.replace(/(?:\[])+$/, ""))) return
		min = +left + (leftOp === "<" ? step : 0)
	}
	// a length is positive and a range isn't empty
	if (
		(min !== undefined && !Number.isFinite(min)) ||
		(max !== undefined && !Number.isFinite(max))
	)
		return
	if ((min ?? 0) > (max ?? Infinity)) return
	if (min === max && (op.length === 1 || leftOp === "<")) return
	if (isLength && ((max ?? 0) < 0 || (min ?? 0) < 0)) return
	if (isLength || (op.length === 2 && (!left || leftOp === "<=")))
		return rangeFacts(of, min, max)

	if (
		of.base === "integer" &&
		((min !== undefined && !Number.isSafeInteger(min)) ||
			(max !== undefined && !Number.isSafeInteger(max)))
	)
		return

	// bounds apart from what they exclude
	return {
		key: def,
		domains: numberBits,
		pure: true,
		base: of.base,
		min,
		minExclusive: of.base === "number" && (left ? leftOp === "<" : op === ">"),
		max,
		maxExclusive: of.base === "number" && op === "<"
	}
}

const splitTop = (def: string, separator: string): string[] => {
	const parts: string[] = []
	let depth = 0
	let quoted = false
	let start = 0
	for (let i = 0; i < def.length; i++) {
		const c = def[i]
		if (c === "'") quoted = !quoted
		else if (quoted) continue
		else if (c === "/" || c === "\\" || c === '"') return [def]
		else if (c === "(") depth++
		else if (c === ")") depth--
		else if (!depth && def.startsWith(separator, i)) {
			parts.push(def.slice(start, i))
			i += separator.length - 1
			start = i + 1
		}
	}
	parts.push(def.slice(start))
	return parts
}

const wrap = (f: Facts) => (f.terms ? `(${f.key})` : f.key)

const arrayFacts = (element: Facts): Facts => {
	const of = `${wrap(element)}[]`
	return {
		key: of,
		domains: objectBits,
		pure: element.pure,
		cyclic: element.cyclic,
		base: "array",
		of,
		...holding(element)
	}
}

const scanTerm = (def: string): Facts | undefined => {
	if (stringLiteral.test(def)) {
		return {
			key: def,
			domains: stringBits,
			pure: true,
			units: true,
			values: [def.slice(1, -1)]
		}
	}
	// at runtime a brand is what it's of
	const brand = branded.exec(def)
	if (brand) return keywordDomains[brand[1]] && scanTerm(brand[1])
	// one that's what it writes, which a number too long to be isn't
	if (numberLiteral.test(def) && `${+def}` === def) {
		return {
			key: def,
			domains: numberBits,
			pure: true,
			units: true,
			values: [+def]
		}
	}
	if (def[0] === "(" && def[def.length - 1] === ")")
		return scanUnion(def.slice(1, -1))
	if (def.endsWith("[]")) {
		const element = scanTerm(def.slice(0, -2))
		return element?.pure ? arrayFacts(element) : undefined
	}
	const bounded = scanRange(def)
	if (bounded) return bounded
	const domain = keywordDomains[def]
	if (!domain) return
	const base =
		def === "string" ? "string"
		: def === "number" ? "number"
		: def === "number.integer" ? "integer"
		: undefined
	const values =
		def === "true" ? [true]
		: def === "false" ? [false]
		: def === "null" ? [null]
		: def === "undefined" ? [undefined]
		: def === "boolean" ? [true, false]
		: undefined
	return {
		key: def,
		domains: unitBitsOf(domain),
		pure: true,
		base,
		of: base && def,
		values,
		units: !!values
	}
}

/** adds a term in order, since a union's say nothing, or false if it's a repeat, whose
 * union could reduce to what isn't scanned */
const insert = (sorted: string[], term: string) => {
	let i = sorted.length
	while (i && sorted[i - 1] > term) i--
	if (sorted[i - 1] === term) return false
	sorted.splice(i, 0, term)
	return true
}

const insertAll = (terms: string[], f: Facts) =>
	f.terms ? f.terms.every(t => insert(terms, t)) : insert(terms, f.key)

const scanUnion = (def: string): Facts | undefined => {
	const parts = splitTop(def, " | ")
	if (parts.length === 1) return scanTerm(def)
	let domains = 0
	let open = 0
	let values: unknown[] | undefined = []
	let units: boolean | undefined
	let unitsWithin: boolean | undefined
	const terms: string[] = []
	for (let i = 0; i < parts.length; i++) {
		const term = scanTerm(parts[i])
		// a value in what another allows isn't a branch of what it reduces to
		if (!term || term.domains & (term.values ? open : domains)) return
		domains |= term.domains
		if (!term.values) open |= term.domains
		values = term.values && values?.concat(term.values)
		units ||= term.units
		unitsWithin ||= term.unitsWithin
		if (!insertAll(terms, term)) return
	}
	return {
		key: terms.join("|"),
		terms,
		domains,
		pure: true,
		values,
		units,
		unitsWithin
	}
}

const refinesString = (f: Facts | undefined): f is Facts =>
	!!f && f.pure && f.domains === stringBits && !f.values && !f.defaults

// nothing but two ranges of a string conflicts
const andFacts = (l: Facts, r: Facts): Facts | undefined => {
	if (
		(l.min !== undefined || l.max !== undefined) &&
		(r.min !== undefined || r.max !== undefined)
	)
		return
	return {
		// enclosed, so what's written after it isn't its last operand's, and in
		// order, since a node both hold keeps the meta of the left's
		key: `(${wrap(l)}&${wrap(r)})`,
		domains: stringBits,
		pure: true,
		min: l.min ?? r.min,
		max: l.max ?? r.max,
		narrowed: l.narrowed || r.narrowed
	}
}

const scanAnd = (def: string): Facts | undefined => {
	const at = def.indexOf(" & ")
	if (at === -1) return scanUnion(def)
	const l = scanTerm(def.slice(0, at))
	const right = def.slice(at + 3)
	const r =
		regexLiteral.test(right) ? regexLiteralFacts(right) : scanTerm(right)
	return refinesString(l) && refinesString(r) ? andFacts(l, r) : undefined
}

// what its node holds, sized since a source is whatever's written
const patternFacts = (rule: string, flags: string): Facts => ({
	key: `/${sized(rule)}/${flags}`,
	domains: stringBits,
	pure: true
})

// a subclass says what it likes of its source and flags, or throws
const regexFacts = (v: RegExp): Facts | undefined =>
	Object.getPrototypeOf(v) === RegExp.prototype ?
		patternFacts(v.source, v.flags)
	:	undefined

// a string's, whose source is what's written but for a / it escapes, which
// isn't the source of a RegExp writing that escape
const regexLiteralFacts = (literal: string): Facts => {
	const rule = literal
		.slice(1, -1)
		.replace(/\\./g, escape => (escape === "\\/" ? "/" : escape))
	// throws what parsing it would
	void new RegExp(rule)
	return patternFacts(rule, "")
}

const maxScannedDefs = 4096
const scanned = new Map<string, Facts | null>()

/** what a string so plain that parsing it can't throw says */
const scanLeaf = (def: string): Facts | undefined => {
	let facts = scanned.get(def)
	if (facts === undefined) {
		try {
			facts = scanUncached(def) ?? null
		} catch {
			facts = null
		}
		if (scanned.size >= maxScannedDefs) scanned.clear()
		scanned.set(def, facts)
	}
	return facts ?? undefined
}

const scanUncached = (def: string): Facts | undefined => {
	const withDefault = defaulted.exec(def)
	if (withDefault) {
		const base = scanUnion(withDefault[1])
		const raw = withDefault[2]
		const value =
			raw[0] === "'" ? raw.slice(1, -1)
			: raw === "true" ? true
			: raw === "false" ? false
			: +raw
		if (!base || !fits(value, base)) return
		return {
			key: defaultKey(base, value),
			domains: base.domains,
			pure: false,
			defaults: true
		}
	}
	if (def === "string.trim")
		return { key: def, domains: stringBits, pure: false }
	if (def.startsWith("string.trim |> ")) {
		const to = scanAnd(def.slice(15))
		return to?.domains === stringBits && !to.values ?
				{ key: `string.trim|>${to.key}`, domains: stringBits, pure: false }
			:	undefined
	}
	if (regexLiteral.test(def)) return regexLiteralFacts(def)
	const record$ = record.exec(def)
	if (record$) {
		const value = scanUnion(record$[1])
		return value ?
				{
					key: `Record<${value.key}>`,
					domains: objectBits,
					pure: true,
					...holding(value)
				}
			:	undefined
	}
	return scanAnd(def)
}

// its length says where a name ends, whatever it holds, and a colon where its
// length does, since a name can start with a digit
const sized = (name: string) => `${name.length}:${name}`

const isPlainObject = (v: object) => {
	const proto = Object.getPrototypeOf(v)
	return proto === Object.prototype || proto === null
}

const fnIds = new WeakMap<object, number>()
let fnCount = 0

// what's the same of one function
const fnKey = (fn: object) => {
	let id = fnIds.get(fn)
	if (!id) fnIds.set(fn, (id = ++fnCount))
	return `#${id}`
}

const defaultKey = (of: Facts, value: unknown) =>
	`${wrap(of)}=${
		typeof value === "function" ? fnKey(value)
		: typeof value === "string" ? `string:${JSON.stringify(value)}`
		: typeof value === "number" && Object.is(value, -0) ? "number:-0"
		: `${typeof value}:${String(value)}`
	}`

const isUnit = (node: BaseNode) => node.is("unit")

// one a keyword holds is arktype's own, which nothing can tell was called
const isNarrow = (node: BaseNode) =>
	node.is("predicate") && node.meta.keyword === undefined

// a narrow of a morph is of its output, so a unit that allows is one it checks
const outputsUnit = (branch: BaseRoot) => {
	if (!branch.is("morph")) return false
	try {
		return branch._out.branches.some(isUnit)
	} catch {
		// an output that can't be written could be anything
		return true
	}
}

const nodeFacts = (node: BaseRoot): Facts | undefined => {
	if (node.isNever() || node.topAlias) return
	const key = `@${node.id}`
	const domains = domainsOf(node)
	if (node.hasAlias) return { key, domains, pure: false, cyclic: true }
	let values: unknown[] | undefined = []
	let units = false
	for (const branch of node.branches) {
		if (branch.is("unit")) {
			units = true
			if (typeof branch.unit !== "object") values?.push(branch.unit)
			else values = undefined
		} else {
			values = undefined
			units ||= outputsUnit(branch)
		}
	}
	// a node says nothing of where it holds a predicate or a unit
	const narrowed = node.userCode && node.selectReferences(isNarrow).length !== 0
	return {
		key,
		domains,
		pure: !node.alters,
		values,
		units,
		unitsWithin: node.selectReferences(isUnit).length !== 0,
		narrowed,
		narrowedWithin: narrowed
	}
}

// a prop's `this`, its own at each call, whose nodes each reference what's being defined
const thisFacts = (v: unknown): Facts | undefined =>
	v === "this" || v === "this[]" ?
		{
			key: `${v}#${++fnCount}`,
			domains: objectBits,
			pure: false,
			cyclic: "this"
		}
	:	undefined

// what a prop's value says, if it's one a literal can hold without throwing
const valueFacts = (
	v: unknown,
	into: Facts
): [facts: Facts, held: unknown] | undefined => {
	if (typeof v === "string") {
		const facts = scanLeaf(v)
		return facts && [facts, v]
	}
	if (Array.isArray(v)) {
		const element = v.length === 2 && v[1] === "[]" && valueFacts(v[0], into)
		return element && !element[0].defaults ?
				[arrayFacts(element[0]), [element[1], "[]"]]
			:	undefined
	}
	if (v instanceof RegExp) {
		const facts = regexFacts(v)
		return facts && [facts, v]
	}
	if (typeof v !== "object" && typeof v !== "function") return
	if (!v) return
	const d = deferred.get(v)
	if (d) return [d.facts, v]
	if (isNode(v)) {
		const of = v.isRoot() && nodeFacts(v)
		return of ? [of, v] : undefined
	}
	if (typeof v === "function" || !isPlainObject(v)) return
	const nested: Facts = { key: "", domains: objectBits, pure: true }
	const held = walkLiteral(v as Dict, nested, into)
	return (
		held && [
			{
				key: nested.key,
				domains: objectBits,
				pure: into.pure,
				narrowedWithin: nested.narrowedWithin,
				unitsWithin: nested.unitsWithin
			},
			held
		]
	)
}

const walkLiteral = (
	def: Dict,
	facts: Facts,
	outer?: Facts
): Dict | undefined => {
	if (Object.getOwnPropertySymbols(def).length) return
	const keys = Object.keys(def)
	if (!keys.length) return
	const copy: Record<string, unknown> = {}
	const names: string[] = []
	const entries: string[] = []
	const props: [name: string, entry: string][] = []
	const heldByName = new Map<string, number>()
	let closed = true
	let spreadThis: string | undefined
	let spreadOf: Facts | undefined
	let spreadNode: IntersectionNode | undefined
	for (let i = 0; i < keys.length; i++) {
		const k = keys[i]
		// which a copy would hold as its prototype
		if (k === "__proto__") return
		const v: unknown = def[k]
		const key = preparseKey(k)
		if (key.kind === "undeclared") {
			if (v !== "reject" && v !== "delete" && v !== "ignore") return
			if (v !== "ignore") facts.pure = false
			closed = false
			// a node orders only its props
			entries.unshift(`+${v}`)
			copy[k] = v
			continue
		}
		if (key.kind === "spread") {
			if (i) return
			const d = deferred.get(v as object)
			if (
				d ?
					!d.facts.literal
				:	!isNode(v) ||
					!v.is("intersection") ||
					!v.structure ||
					v.structure.index ||
					v.structure.sequence ||
					!v.basis?.is("domain") ||
					v.basis.domain !== "object" ||
					v.hasAlias
			)
				return
			if (d ? !d.facts.pure : (v as BaseRoot).alters) facts.pure = false
			// it holds what the props it spreads do, whichever of them it keeps
			const spread = d ? d.facts : nodeFacts(v as BaseRoot)
			if (spread?.narrowedWithin) facts.narrowedWithin = true
			if (spread?.unitsWithin) facts.unitsWithin = true
			if (d?.facts.cyclic) {
				facts.cyclic = d.facts.cyclic
				spreadThis = d.facts.key
			}
			closed = false
			if (d) spreadOf = d.facts
			else spreadNode = v as IntersectionNode
			// a node spreads only its structure, which nodes holding more share
			entries.push(d ? "" : `...@${spreadNode!.structure!.id}`)
			copy[k] = v
			continue
		}
		if (key.kind !== "required" && key.kind !== "optional") return
		const name = key.normalized as string
		if (names.includes(name)) return
		// what replaces what held `this` is what a definition could then repeat
		if (spreadThis?.includes(sized(name))) return
		// what replaces a node's prop is what nodes spreading others could write
		if (spreadNode?.structure!.byKey[name]) return
		names.push(name)
		const isTuple = Array.isArray(v) && v[1] !== "[]"
		if (isTuple && key.kind === "optional") return
		if (
			isTuple &&
			!(v[1] === "=" ? v.length === 3 : v[1] === "?" && v.length === 2)
		)
			return
		const held = isTuple ? v[0] : v
		const self = thisFacts(held)
		const value = self ? ([self, held] as const) : valueFacts(held, facts)
		if (!value) return
		const [of, kept] = value
		if (of.defaults && (isTuple || key.kind === "optional")) return
		if (isTuple && v[1] === "=") {
			if (
				!isThunk(v[2]) &&
				(hasDomain(v[2], "object") ||
					typeof v[2] === "symbol" ||
					!fits(v[2], of))
			)
				return
			facts.pure = false
		}
		if (!of.pure) facts.pure = false
		if (of.cyclic && facts.cyclic !== true) facts.cyclic = of.cyclic
		const optional = isTuple || of.defaults || key.kind === "optional"
		// without exactOptionalPropertyTypes an optional value allows undefined
		const bits = holds(of) | (optional ? holdsUnit : 0)
		if (bits) {
			heldByName.set(name, bits)
			if (bits & holdsNarrow) facts.narrowedWithin = true
			if (bits & holdsUnit) facts.unitsWithin = true
		}
		// an optional value's union with undefined could be indeterminate or call
		// what it narrows, and without exactOptionalPropertyTypes composes what an
		// alias resolves to
		if (
			optional &&
			(of.domains & undefinedBits ?
				!of.pure || bits & holdsNarrow
			:	!of.pure && of.cyclic === true)
		)
			return
		if (!optional && of.values) (facts.tags ??= new Map()).set(name, of.values)
		const entry = `${sized(name)}${
			isTuple && v[1] === "=" ? `:${defaultKey(of, v[2])}`
			: optional && !of.defaults ? `?${of.key}`
			: `:${of.key}`
		}`
		entries.push(entry)
		props.push([name, entry])
		copy[k] = isTuple ? [kept, ...v.slice(1)] : kept
	}
	if (outer && !facts.pure) outer.pure = false
	if (outer && facts.cyclic && outer.cyclic !== true)
		outer.cyclic = facts.cyclic
	if (closed) {
		facts.names = names
		facts.entries = entries
	}
	facts.props = props
	// what it spreads holds more than its own props say
	if (!spreadOf && !spreadNode) facts.held = heldByName
	if (spreadOf) {
		// where it spreads a literal, only the props it doesn't replace are what
		// it holds, and its undeclared keys are its own
		const spread = spreadOf.props!.map(([name, entry]) =>
			names.includes(name) ? `${sized(name)}~` : entry
		)
		if (spreadOf.spread) spread.unshift(spreadOf.spread)
		facts.spread = entries[entries.indexOf("")] = `...{${spread.join()}}`
	}
	facts.key = `{${entries.join()}}`
	return copy
}

const disjointByTag = (l: Facts, r: Facts) => {
	if (l.tags && r.tags) {
		for (const [k, values] of l.tags) {
			const other = r.tags.get(k)
			if (other && !values.some(v => other.includes(v))) return true
		}
	}
	return false
}

// a union intersects its branches' inputs, which calls a predicate of one on a
// unit of another in its place: at any depth, unless both are literals whose
// props say where
const calls = (l: Facts, r: Facts) => {
	if (l.narrowed && r.units) return true
	if (!l.narrowedWithin || !r.unitsWithin) return false
	if (!l.held || !r.held) return true
	for (const [name, bits] of l.held)
		if (bits & holdsNarrow && r.held.get(name)! & holdsUnit) return true
	return false
}

// whether nothing is allowed by both, so a union reduces neither however it's nested
const apart = (l: Facts, r: Facts) =>
	!(l.domains & r.domains) ||
	disjointByTag(l, r) ||
	(l.values !== undefined &&
		r.values !== undefined &&
		!l.values.some(v => r.values!.includes(v)))

const determinate = (l: Facts, r: Facts) =>
	!(l.domains & r.domains) ||
	(!calls(l, r) && !calls(r, l) && ((l.pure && r.pure) || disjointByTag(l, r)))

export const deferUnion = (
	branches: unknown[],
	$: InternalScope
): BaseRoot | undefined => {
	if (branches.length < 2 || !canDefer($)) return
	const all: Facts[] = []
	const defs: unknown[] = []
	const flat: string[] = []
	try {
		for (let i = 0; i < branches.length; i++) {
			const branch: unknown = branches[i]
			const shell =
				(
					hasDomain(branch, "object") &&
					!deferred.has(branch) &&
					!isNode(branch)
				) ?
					deferDefinition(branch, $)
				:	branch
			if (!shell) return
			const value = valueFacts(shell, { key: "", domains: 0, pure: true })
			if (!value || value[0].defaults || value[0].cyclic === true) return
			all.push(value[0])
			defs.push(value[1])
			if (!insertAll(flat, value[0])) return
		}
	} catch {
		return
	}
	// the branches another could reduce, and whether any is
	const reduced: boolean[] = []
	let overlaps = false
	let domains = 0
	let pure = true
	let values: unknown[] | undefined = []
	let units: boolean | undefined
	let narrowed: boolean | undefined
	let cyclic: Facts["cyclic"]
	let narrowedWithin: boolean | undefined
	let unitsWithin: boolean | undefined
	let held: Facts["held"] = new Map()
	for (let i = 0; i < all.length; i++) {
		const f = all[i]
		for (let j = i + 1; j < all.length; j++) {
			if (!determinate(f, all[j])) return
			if (!apart(f, all[j])) reduced[i] = reduced[j] = overlaps = true
		}
		domains |= f.domains
		pure &&= f.pure
		values = f.values && values?.concat(f.values)
		units ||= f.units
		narrowed ||= f.narrowed
		cyclic ||= f.cyclic
		narrowedWithin ||= f.narrowedWithin
		unitsWithin ||= f.unitsWithin
		// a branch that isn't a literal holds what no prop says
		if (!f.held) held &&= f.narrowedWithin || f.unitsWithin ? undefined : held
		else
			for (const [name, bits] of f.held) held?.set(name, held.get(name)! | bits)
	}
	// a union's branches are this one's unless reducing them first could matter:
	// what's left of two that overlap keeps the meta of how they were nested
	const nests = (f: Facts, i: number) => f.terms && (f.overlaps || reduced[i])
	let terms = flat
	if (all.some(nests)) {
		terms = []
		for (let i = 0; i < all.length; i++) {
			if (nests(all[i], i)) insert(terms, wrap(all[i]))
			else insertAll(terms, all[i])
		}
	}
	let tags: Map<string, unknown[]> | undefined
	if (all[0].tags) {
		for (const [k, of] of all[0].tags) {
			let union = of
			for (let i = 1; union && i < all.length; i++) {
				const other = all[i].tags?.get(k)
				union = (other && union.concat(other)) as never
			}
			if (union) (tags ??= new Map()).set(k, union)
		}
	}
	return defer(
		{
			key: terms.join("|"),
			terms,
			branched: true,
			overlaps,
			domains,
			pure,
			tags,
			values,
			units,
			narrowed,
			cyclic,
			narrowedWithin,
			unitsWithin,
			held
		},
		$,
		() => ($.or as any)(...defs)
	)
}

const boundMethod =
	(bases: string, isMin: boolean) =>
	(d: Deferred, [n, message]: any[]): Facts | undefined => {
		const { bounds, of, min, max, pure, cyclic } = d.facts
		const over = of ? d.facts.base : bounds
		if (
			// a bound with its own message isn't the one its facts write
			message !== undefined ||
			cyclic === true ||
			!over ||
			(!pure && (!of || over !== "array")) ||
			!bases.includes(over) ||
			typeof n !== "number" ||
			// a node holds -0 apart from 0, which a key writes as one
			Object.is(n, -0) ||
			!(over === "number" ?
				Number.isFinite(n)
			:	Number.isSafeInteger(n) && n >= 0)
		)
			return
		// what's narrower holds
		const lo = isMin && !(min! > n) ? n : min
		const hi = !isMin && !(max! < n) ? n : max
		if ((lo ?? -Infinity) > (hi ?? Infinity)) return
		// a narrowed number bounded to one value is a unit its predicate checks
		if (!of && lo === hi && (over === "number" || over === "integer")) return
		return of ?
				rangeFacts(d.facts, lo, hi)
			:	{
					...d.facts,
					key: `${wrap(d.facts)}${isMin ? ">=" : "<="}${n}`,
					terms: undefined,
					min: lo,
					max: hi
				}
	}

const metaFacts = (d: Deferred, meta: object): Facts => ({
	...d.facts,
	key: `${wrap(d.facts)}@${JSON.stringify(meta)}`,
	terms: undefined,
	of: undefined,
	names: undefined,
	literal: false
})

const snapshotPlainMeta = (
	meta: unknown
): Record<string, string> | undefined => {
	if (
		!hasDomain(meta, "object") ||
		!isPlainObject(meta) ||
		Object.getOwnPropertySymbols(meta).length
	)
		return
	const copy: Record<string, string> = {}
	for (const k of Object.keys(meta)) {
		if (
			k !== "description" &&
			k !== "expected" &&
			k !== "title" &&
			k !== "label"
		)
			return
		const v = (meta as Record<string, unknown>)[k]
		if (typeof v !== "string") return
		copy[k] = v
	}
	return copy
}

// what a method makes of a Type without building it, if its args let it, or undefined
const deferredMethods: Dict<
	string,
	(d: Deferred, args: any[]) => Facts | undefined
> = {
	array: d => arrayFacts(d.facts),
	narrow: ({ facts }, [predicate]) =>
		typeof predicate === "function" && !isNode(predicate) && !facts.units ?
			{
				key: `${wrap(facts)}:${fnKey(predicate)}`,
				domains: facts.domains,
				pure: facts.pure,
				cyclic: facts.cyclic,
				tags: facts.tags,
				min: facts.min,
				max: facts.max,
				bounds: facts.of ? facts.base : facts.bounds,
				branched: facts.branched,
				narrowed: true,
				narrowedWithin: facts.narrowedWithin,
				unitsWithin: facts.unitsWithin,
				held: facts.held
			}
		:	undefined,
	_pipe: ({ facts }, morphs) =>
		(
			morphs.length &&
			morphs.every(morph => typeof morph === "function" && !isNode(morph))
		) ?
			{
				key: `${wrap(facts)}|>${morphs.map(fnKey).join()}`,
				domains: facts.domains,
				pure: false,
				...holding(facts)
			}
		:	undefined,
	and: (d, args) => {
		const { facts } = d
		const [r] = args
		const string =
			r instanceof RegExp ? regexFacts(r)
			: typeof r === "string" ? scanLeaf(r)
			: undefined
		if (string) {
			// a union's branches could each have a range, which its facts don't say
			return refinesString(facts) && refinesString(string) && !facts.branched ?
					andFacts(facts, string)
				:	undefined
		}
		if (!facts.names) return
		const shell =
			deferred.has(r) ? r
			: hasDomain(r, "object") && !isNode(r) ? deferDefinition(r, d.$)
			: undefined
		const rf = shell && deferred.get(shell)?.facts
		if (!rf?.names) return
		for (let i = 0; i < rf.names.length; i++)
			if (facts.names.includes(rf.names[i])) return
		// what's built holds what's defined now, whatever becomes of a literal
		args[0] = shell
		const entries = [...facts.entries!, ...rf.entries!]
		return {
			key: `{${entries.join()}}`,
			domains: objectBits,
			pure: facts.pure && rf.pure,
			cyclic: facts.cyclic || rf.cyclic,
			names: [...facts.names, ...rf.names],
			entries,
			tags: new Map([...(facts.tags ?? []), ...(rf.tags ?? [])]),
			narrowedWithin: facts.narrowedWithin || rf.narrowedWithin,
			unitsWithin: facts.unitsWithin || rf.unitsWithin,
			held: facts.held && rf.held && new Map([...facts.held, ...rf.held])
		}
	},
	describe: (d, [description, selector]) =>
		typeof description === "string" && selector === undefined ?
			metaFacts(d, { description })
		:	undefined,
	label: (d, [label, selector]) =>
		typeof label === "string" && selector === undefined ?
			metaFacts(d, { label })
		:	undefined,
	configure: (d, args) => {
		if (args[1] !== undefined) return
		const copy = snapshotPlainMeta(args[0])
		if (!copy) return
		// snapshot mutable meta so later edits cannot poison the deferred shell or cache key
		args[0] = copy
		return metaFacts(d, copy)
	},
	to: ({ facts }, [r]) => {
		const to =
			typeof r === "string" ? scanLeaf(r)
			: r instanceof RegExp ? regexFacts(r)
			: deferred.get(r)?.facts
		return facts.key === "string.trim" && refinesString(to) ?
				{
					key: `(string.trim>${to.key})`,
					domains: stringBits,
					pure: false,
					// a narrow of a morph is of its output
					units: to.units
				}
			:	undefined
	},
	onUndeclaredKey: ({ facts }, [rule]) =>
		(
			facts.domains === objectBits &&
			facts.cyclic !== true &&
			(rule === "reject" || rule === "ignore")
		) ?
			{
				...facts,
				key: `${wrap(facts)}+${rule}`,
				terms: undefined,
				values: undefined,
				of: undefined,
				pure: rule === "ignore" && facts.pure,
				names: undefined,
				entries: undefined,
				literal: false
			}
		:	undefined,
	exclude: ({ facts }, [r]) => {
		const excluded = typeof r === "string" ? scanLeaf(r) : undefined
		if (
			!facts.terms ||
			!facts.values ||
			!excluded?.values ||
			// every term must be a single canonical literal (not "boolean" or a settled "@node")
			facts.terms.length !== facts.values.length ||
			facts.terms.some(t => t[0] === "@")
		)
			return
		const remaining = facts.values.filter(v => !excluded.values!.includes(v))
		const excludedTerms = excluded.terms ?? [excluded.key]
		const kept = facts.terms.filter(t => !excludedTerms.includes(t))
		// one term for each value left, so what's left is what those write
		if (!kept.length || kept.length !== remaining.length) return
		let domains = 0
		for (const v of remaining) domains |= unitBitsOf(domainOf(v))
		return {
			key: kept.join("|"),
			terms: kept.length > 1 ? kept : undefined,
			domains,
			pure: true,
			values: remaining,
			units: true
		}
	},
	atLeastLength: boundMethod("string array", true),
	atMostLength: boundMethod("string array", false),
	atLeast: boundMethod("number integer", true),
	atMost: boundMethod("number integer", false)
}

// what's not a Type of its own until a definition holding it is
const deferredForms: Dict<
	string,
	(self: unknown, d: Deferred, args: any[]) => unknown
> = {
	default: (self, d, [value]) =>
		isThunk(value) || (!hasDomain(value, "object") && fits(value, d.facts)) ?
			[self, "=", value]
		:	undefined,
	optional: self => [self, "?"],
	or: (self, d, [r]) => deferUnion([self, r], d.$)
}

// what reads a Type's output, which a conflict through an alias it holds throws
const composes = "narrow _pipe and or"

const builders: Record<string, Function> = {}

const built = (self: unknown, method: string, args: unknown[]) =>
	builders[method].apply(settled(self), args)

const proto = BaseRoot.prototype as never as Record<string, Function>

// on the prototype, so what's read keeps deferring what it's chained to
for (const k of [
	...Object.keys(deferredMethods),
	...Object.keys(deferredForms)
]) {
	builders[k] = proto[k]
	proto[k] = function (this: BaseRoot, ...args: unknown[]) {
		const d = deferred.get(this)
		const blocked =
			d?.facts.cyclic === true ? composes.includes(k)
			: d?.facts.cyclic ? k === "_pipe" || k === "narrow"
			: false
		if (d && !blocked && canDefer(d.$)) {
			if (deferredForms[k]) {
				const form = deferredForms[k](this, d, args)
				if (form) return form
			} else {
				const facts = deferredMethods[k](d, args)
				if (facts) return defer(facts, d.$, () => built(this, k, args))
			}
		}
		return built(this, k, args)
	}
}

const shellProto = new Proxy(Object.create(proto), {
	get: (target, k, receiver) => {
		// while it's becoming a node
		if (!deferred.get(receiver)?.resolve)
			return Reflect.get(target, k, receiver)
		// a method's memo on it is only a read of what it's bound to
		if (k === "pipe") {
			return Object.assign(
				(...morphs: unknown[]) => proto._pipe.apply(receiver, morphs),
				{
					try: (...morphs: unknown[]) =>
						(settled(receiver).pipe.try as Function)(...morphs)
				}
			)
		}
		if (typeof k === "string" && (deferredMethods[k] || deferredForms[k]))
			return target[k]
		settled(receiver)
		return receiver[k]
	},
	set: (_, k, v, receiver) => {
		settled(receiver)
		return Reflect.set(receiver, k, v)
	},
	// a read of an own key, which it can't ask of a Type it isn't told of
	has: (target, k) => k in target || k in intrinsic.object
})

// equal definitions' one Type, as their nodes would make it. A kind and comma
// start each node's key, and nothing a definition is scanned to does
const defer = (facts: Facts, $: InternalScope, resolve: () => BaseRoot) => {
	const existing = $.nodesByKey.get(facts.key)
	if (existing) return existing as never
	const { fn, c } = deferredCallable()
	const self = fn as BaseRoot
	Object.setPrototypeOf(self, shellProto)
	deferred.set(self, { facts, fn, c, $, resolve })
	$.nodesByKey.set(facts.key, self)
	return self as never
}

// no scope but ark says what the scanned keywords are
const canDefer = ($: InternalScope) => {
	if (
		!$.isBuiltin ||
		$.name !== "ark" ||
		$ark.reached ||
		$ark.eagerTypes ||
		settling ||
		bindPrecompiledUnits ||
		inProgress.definitions ||
		inProgress.resolutions
	)
		return false
	// what else config changes could be what a definition parses to, where
	// jitless changes only whether it compiles
	for (const k in $ark.config)
		if (k !== "exactOptionalPropertyTypes" && k !== "jitless") return false
	// fixes the global config, as parsing a definition would
	void $.cfg
	return true
}

const literalOf = (value: unknown) =>
	typeof value === "string" ?
		value.includes("'") || value.includes("\\") ?
			"?"
		:	`'${value}'`
	: typeof value === "number" || value === null || typeof value === "boolean" ?
		`${value}`
	: value === undefined ? "undefined"
	: "?"

/** `type.unit` and `type.enumerated`, as the literals that are the same Type */
export const deferUnits = (
	values: unknown[],
	$: InternalScope
): BaseRoot | undefined => {
	const literals = values.map(literalOf)
	return literals.length === 1 ?
			deferDefinition(literals[0], $)
		:	deferUnion(literals, $)
}

/** `type.Record`, which is its generic once it's anything but called on what can defer */
export const deferredRecord = (
	$: InternalScope,
	generic: () => GenericRoot
): unknown => {
	const instantiate = (...args: unknown[]) => {
		const [k, v] = args
		const into: Facts = { key: "", domains: 0, pure: true }
		const keyEntry =
			args.length === 2 && canDefer($) ? valueFacts(k, into) : undefined
		let valueEntry: readonly [Facts, unknown] | undefined
		if (keyEntry) {
			if (typeof v === "string") {
				const facts = scanUnion(v)
				if (facts) valueEntry = [facts, v]
			} else valueEntry = valueFacts(v, into)
		}
		const key = keyEntry?.[0]
		const value = valueEntry?.[0]
		return (
				!value ||
					!key ||
					!key.pure ||
					key.units ||
					key.domains & ~(stringBits | symbolBits) ||
					value.defaults ||
					value.cyclic
			) ?
				(generic() as any)(...args)
			:	defer(
					{
						key: `Record<${key.key === "string" ? "" : `${key.key},`}${value.key}>`,
						domains: objectBits,
						pure: value.pure,
						// a literal says an alias it holds of what's walking it, not of itself
						cyclic: into.cyclic,
						...holding(key, value)
					},
					$,
					() => (generic() as any)(keyEntry![1], valueEntry![1])
				)
	}
	return Object.setPrototypeOf(
		instantiate,
		new Proxy(
			{},
			{
				get: (_, k) => (generic() as any)[k],
				has: (_, k) => k in generic(),
				getPrototypeOf: () => Object.getPrototypeOf(generic())
			}
		)
	)
}

export const deferDefinition = (
	def: unknown,
	$: InternalScope
): BaseRoot | undefined => {
	if (!canDefer($)) return
	if (deferred.has(def as object)) return def as BaseRoot
	if (typeof def === "string") {
		const facts = scanLeaf(def)
		// a string could be what another route has reached once nodes exist, and
		// it's few and cached, so it's parsed from then on
		return (
			!facts || facts.defaults ? undefined
			: lastCreated ? ($.nodesByKey.get(facts.key) as never)
			: defer(facts, $, () => $.parseDef(def))
		)
	}
	if (def instanceof RegExp) {
		const facts = regexFacts(def)
		return facts && defer(facts, $, () => $.parseDef(def))
	}
	if (typeof def !== "object" || !def || !isPlainObject(def)) return
	const facts: Facts = {
		key: "",
		domains: objectBits,
		pure: true,
		literal: true
	}
	let literal: Dict | undefined
	try {
		literal = walkLiteral(def as Dict, facts)
	} catch {
		return
	}
	if (!literal) return
	const copy = literal
	return defer(facts, $, () => $.parseDef(copy))
}
