import { discriminate } from "arksets"
import { type } from "arktype"

// random definitions whose set algebra must agree with .allows on values
// sampled near their bounds, each failure shrunk to a minimal repro

interface Bounds {
	min?: number
	exclusiveMin?: boolean
	max?: number
	exclusiveMax?: boolean
}

interface NumberDef extends Bounds {
	kind: "number"
	divisor?: number | undefined
}

// a length's bounds
interface StringDef extends Bounds {
	kind: "string"
	pattern?: string
}

interface DateDef extends Bounds {
	kind: "date"
}

interface UnitDef {
	kind: "unit"
	literal: string
}

interface DomainDef {
	kind: "domain"
	domain: string
}

interface ArrayDef {
	kind: "array"
	element: Def
}

interface TupleDef {
	kind: "tuple"
	prefix: Def[]
	optional: Def[]
	variadic?: Def | undefined
	postfix: Def[]
}

interface PropDef {
	key: string
	optional: boolean
	value: Def
}

interface IndexDef {
	signature: string
	value: Def
}

// "delete" is left out: an intersection treats the keys it strips as gone,
// which .allows, reading the input, doesn't
interface ObjectDef {
	kind: "object"
	props: PropDef[]
	index: IndexDef[]
	reject: boolean
}

interface UnionDef {
	kind: "union"
	branches: Def[]
}

interface IntersectionDef {
	kind: "intersection"
	l: Def
	r: Def
}

type Def =
	| NumberDef
	| StringDef
	| DateDef
	| UnitDef
	| DomainDef
	| ArrayDef
	| TupleDef
	| ObjectDef
	| UnionDef
	| IntersectionDef

let state = 0

// mulberry32, so a seed gives the same pairs and values on any machine
const random = (n: number): number => {
	state = (state + 0x6d2b79f5) | 0
	let t = Math.imul(state ^ (state >>> 15), 1 | state)
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
	return ((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n) | 0
}

const pick = <t>(items: readonly t[]): t => items[random(items.length)]

const chance = (percent: number): boolean => random(100) < percent

const times = <t>(n: number, create: () => t): t[] =>
	Array.from({ length: n }, () => create())

const keys = ["a", "b", "kind", "x1"]
const literals = [
	"0",
	"1",
	"2",
	"'a'",
	"'b'",
	"''",
	"true",
	"false",
	"null",
	"undefined"
]
const domains = [
	"number",
	"string",
	"boolean",
	"null",
	"undefined",
	"unknown",
	"object"
]
const bounds = [-1, 0, 1, 2, 3, 5]
const patterns = ["^a", "b$", "^[ab]*$", "^x"]
const dateBounds = [1000, 2000, 3000]
const discriminants = ["'a'", "'b'", "'c'", "0", "1"]

const genNumber = (): NumberDef => {
	const def: NumberDef = { kind: "number" }
	if (chance(55)) {
		def.min = pick(bounds)
		def.exclusiveMin = chance(40)
	}
	if (chance(45)) {
		const above = bounds.filter(n => def.min === undefined || n > def.min)
		if (above.length) {
			def.max = pick(above)
			def.exclusiveMax = chance(40)
		}
	}
	if (chance(30)) def.divisor = pick([2, 3])
	return def
}

const genString = (): StringDef => {
	const def: StringDef = { kind: "string" }
	if (chance(35)) def.min = pick([1, 2])
	if (chance(35)) def.max = pick([1, 2, 3].filter(n => n >= (def.min ?? 0)))
	if (chance(40)) def.pattern = pick(patterns)
	return def
}

const genDate = (): DateDef => {
	const def: DateDef = { kind: "date" }
	if (chance(50)) def.min = pick(dateBounds)
	if (chance(50)) def.max = pick(dateBounds.filter(n => n >= (def.min ?? 0)))
	return def
}

const genLeaf = (arrays = true): Def => {
	const roll = random(100)
	return (
		roll < 25 ? genNumber()
		: roll < 43 ? genString()
		: roll < 68 ? { kind: "unit", literal: pick(literals) }
		: roll < 83 ? { kind: "domain", domain: pick(domains) }
		: roll < 91 || !arrays ? genDate()
		: { kind: "array", element: genLeaf(false) }
	)
}

const genElement = (): Def =>
	chance(25) ?
		{ kind: "union", branches: [genLeaf(false), genLeaf(false)] }
	:	genLeaf(false)

// postfix elements need a variadic element and no optional ones
const genTuple = (): TupleDef => {
	const prefix = times(random(3), genElement)
	const optional = chance(30) ? times(1 + random(2), genElement) : []
	const variadic = chance(70) ? genElement() : undefined
	const postfix =
		variadic && !optional.length ? times(random(3), genElement) : []
	return { kind: "tuple", prefix, optional, variadic, postfix }
}

const genObject = (depth: number, discriminant?: PropDef): ObjectDef => {
	const props = discriminant ? [discriminant] : []
	for (let i = random(4); i > 0; i--) {
		const key = pick(keys)
		if (props.some(prop => prop.key === key)) continue
		props.push({
			key,
			optional: chance(35),
			value: depth < 1 && chance(25) ? gen(depth + 1) : genLeaf()
		})
	}
	const index =
		chance(20) ?
			[{ signature: pick(["string", "/^x/"]), value: genLeaf() }]
		:	[]
	return { kind: "object", props, index, reject: chance(20) }
}

const genDiscriminated = (depth: number): UnionDef => {
	const key = pick(["kind", "a"])
	return {
		kind: "union",
		branches: times(2 + random(2), () =>
			genObject(depth + 1, {
				key,
				optional: chance(10),
				value:
					chance(85) ?
						{ kind: "unit", literal: pick(discriminants) }
					:	genLeaf(false)
			})
		)
	}
}

const genUnion = (depth: number): UnionDef => ({
	kind: "union",
	branches: times(2 + random(2), () => (depth < 1 ? gen(depth + 1) : genLeaf()))
})

const genUnionish = (depth: number): Def =>
	chance(50) ? genDiscriminated(depth) : genUnion(depth)

const gen = (depth: number): Def => {
	if (depth >= 2) return genLeaf()
	const roll = random(100)
	return (
		roll < 33 ? genObject(depth)
		: roll < 45 ? genUnion(depth)
		: roll < 57 ? genDiscriminated(depth)
		: roll < 65 ?
			{
				kind: "intersection",
				l: genUnionish(depth + 1),
				r: chance(50) ? genUnionish(depth + 1) : genObject(depth + 1)
			}
		: roll < 70 ? { kind: "array", element: gen(depth + 1) }
		: roll < 76 ? genTuple()
		: genLeaf()
	)
}

// a near copy, so subset and equality checks see related definitions
const mutate = (def: Def): Def => {
	const copy = structuredClone(def)
	switch (copy.kind) {
		case "number":
			return chance(50) ?
					{ ...genNumber(), divisor: copy.divisor }
				:	genNumber()
		case "object":
			if (copy.props.length && chance(40)) {
				const prop = pick(copy.props)
				if (chance(50)) prop.optional = !prop.optional
				else prop.value = chance(50) ? genLeaf() : mutate(prop.value)
			} else if (chance(50)) copy.reject = !copy.reject
			else {
				const key = pick(keys)
				if (!copy.props.some(prop => prop.key === key))
					copy.props.push({ key, optional: chance(50), value: genLeaf() })
			}
			return copy
		case "union":
			if (chance(50)) copy.branches.splice(random(copy.branches.length), 1)
			else {
				const i = random(copy.branches.length)
				copy.branches[i] = mutate(copy.branches[i])
			}
			return copy.branches.length === 1 ? copy.branches[0] : copy
		case "intersection":
			if (chance(50)) copy.l = mutate(copy.l)
			else copy.r = mutate(copy.r)
			return copy
		case "array":
			return { kind: "array", element: mutate(copy.element) }
		case "tuple": {
			if (!copy.prefix.length || chance(40)) return genTuple()
			const i = random(copy.prefix.length)
			copy.prefix[i] = mutate(copy.prefix[i])
			return copy
		}
		default:
			return genLeaf()
	}
}

// a pair from one family overlaps often enough to exercise both sides
const genPair = (): [Def, Def] => {
	const family = random(100)
	if (family < 35) return [gen(0), gen(0)]
	if (family < 57) {
		const objectish = () =>
			chance(50) ? genObject(0)
			: chance(70) ? genDiscriminated(0)
			: gen(0)
		return [objectish(), objectish()]
	}
	if (family < 75) {
		const primitive = () => (chance(70) ? genLeaf() : genUnion(1))
		return [primitive(), primitive()]
	}
	if (family < 88) {
		const def = genTuple()
		return [
			def,
			chance(80) ? genTuple() : { kind: "array", element: genElement() }
		]
	}
	const def = gen(0)
	return [def, mutate(def)]
}

const rangeOf = (
	keyword: string,
	{ min, exclusiveMin, max, exclusiveMax }: Bounds
): string | undefined =>
	min !== undefined && max !== undefined ?
		`${min} ${exclusiveMin ? "<" : "<="} ${keyword} ${exclusiveMax ? "<" : "<="} ${max}`
	: min !== undefined ? `${keyword} ${exclusiveMin ? ">" : ">="} ${min}`
	: max !== undefined ? `${keyword} ${exclusiveMax ? "<" : "<="} ${max}`
	: undefined

const conjoin = (keyword: string, parts: (string | undefined)[]): unknown => {
	const defined = parts.filter(part => part !== undefined)
	return defined.length ?
			defined.slice(1).reduce<unknown>((l, r) => [l, "&", r], defined[0])
		:	keyword
}

const render = (def: Def): unknown => {
	switch (def.kind) {
		case "number":
			return conjoin("number", [
				rangeOf("number", def),
				def.divisor ? `number % ${def.divisor}` : undefined
			])
		case "string":
			return conjoin("string", [
				rangeOf("string", def),
				def.pattern && `/${def.pattern}/`
			])
		case "date":
			return rangeOf("Date", def) ?? "Date"
		case "unit":
			return def.literal
		case "domain":
			return def.domain
		case "array":
			return [render(def.element), "[]"]
		case "tuple":
			return [
				...def.prefix.map(render),
				...def.optional.map(element => [render(element), "?"]),
				...(def.variadic ? ["...", [render(def.variadic), "[]"]] : []),
				...def.postfix.map(render)
			]
		case "object": {
			const result: Record<string, unknown> = {}
			for (const prop of def.props)
				result[prop.optional ? `${prop.key}?` : prop.key] = render(prop.value)
			for (const index of def.index)
				result[`[${index.signature}]`] = render(index.value)
			if (def.reject) result["+"] = "reject"
			return result
		}
		case "union":
			return def.branches.map(render).reduce((l, r) => [l, "|", r])
		case "intersection":
			return [render(def.l), "&", render(def.r)]
	}
}

const show = (def: Def): string => JSON.stringify(render(def))

const strings = ["", "a", "b", "ab", "ba", "abc", "x", "xa", "x1", "1", "c"]
const numbers = [-1, 0, -0, 1, 1.5, 2, 3, 4, 5, 6, Number.NaN, Infinity]
const pool: unknown[] = [
	...numbers,
	...strings,
	true,
	false,
	null,
	undefined,
	new Date(1000),
	new Date(2000),
	new Date(Number.NaN),
	[],
	[0],
	["a"],
	[0, "a"],
	["a", true, 1],
	{},
	{ kind: "a" },
	{ a: 0 }
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" &&
	value !== null &&
	!Array.isArray(value) &&
	!(value instanceof Date)

const domainOf = (value: unknown): string =>
	value === null ? "null"
	: typeof value === "function" ? "object"
	: typeof value

const literalValue = (literal: string): unknown =>
	literal === "undefined" ? undefined
	: literal.startsWith("'") ? literal.slice(1, -1)
	: JSON.parse(literal)

const allowsNumber = (def: NumberDef, n: number): boolean =>
	(def.min === undefined || (def.exclusiveMin ? n > def.min : n >= def.min)) &&
	(def.max === undefined || (def.exclusiveMax ? n < def.max : n <= def.max)) &&
	(!def.divisor || n % def.divisor === 0)

const allowsString = (def: StringDef, s: string): boolean =>
	s.length >= (def.min ?? 0) &&
	s.length <= (def.max ?? Infinity) &&
	(!def.pattern || new RegExp(def.pattern).test(s))

// likely, not certainly, a value def allows: near misses find its bounds
const witness = (def: Def): unknown => {
	if (chance(8)) return pick(pool)
	switch (def.kind) {
		case "number": {
			const near = [def.min, def.max, def.divisor]
				.filter(n => n !== undefined)
				.flatMap(n => [n - 1, n, n + 1, n + 0.5, -n])
			const candidates = [...near, ...numbers]
			const inside = candidates.filter(n => allowsNumber(def, n))
			return chance(75) && inside.length ? pick(inside) : pick(candidates)
		}
		case "string": {
			const inside = strings.filter(s => allowsString(def, s))
			return chance(75) && inside.length ? pick(inside) : pick(strings)
		}
		case "date": {
			const near = [def.min, def.max, 0]
				.filter(n => n !== undefined)
				.flatMap(n => [n - 1, n, n + 1])
			return new Date(chance(5) ? Number.NaN : pick(near))
		}
		case "unit":
			return literalValue(chance(85) ? def.literal : pick(literals))
		case "domain":
			return pick(
				pool.filter(
					value => def.domain === "unknown" || domainOf(value) === def.domain
				)
			)
		case "array":
			return times(random(3), () => witness(def.element))
		case "tuple": {
			const result = def.prefix.map(element => witness(element))
			for (const element of def.optional) {
				if (chance(40)) break
				result.push(witness(element))
			}
			if (def.variadic)
				for (let i = random(3); i > 0; i--) result.push(witness(def.variadic))
			for (const element of def.postfix) result.push(witness(element))
			// a near miss on its length
			const roll = random(10)
			if (roll === 0) result.push(pick(pool))
			else if (roll === 1) result.pop()
			return result
		}
		case "object": {
			const result: Record<string, unknown> = {}
			for (const prop of def.props) {
				if (prop.optional && chance(40)) continue
				result[prop.key] = chance(90) ? witness(prop.value) : pick(pool)
			}
			for (const index of def.index) {
				const indexKeys =
					index.signature === "string" ?
						[...keys, "z", "xa"]
					:	["x1", "xa", "x"]
				for (let i = random(3); i > 0; i--)
					result[pick(indexKeys)] = witness(index.value)
			}
			if (chance(20)) result[pick([...keys, "z"])] = pick(pool)
			if (def.props.length && chance(10)) delete result[pick(def.props).key]
			return result
		}
		case "union":
			return witness(pick(def.branches))
		case "intersection":
			return merge(witness(def.l), witness(def.r))
	}
}

// a value both sides' witnesses describe, so intersections are hit
const merge = (l: unknown, r: unknown): unknown => {
	if (Array.isArray(l) && Array.isArray(r)) {
		return Array.from({ length: chance(50) ? l.length : r.length }, (_, i) =>
			i < l.length && i < r.length ? merge(l[i], r[i])
			: i < l.length ? l[i]
			: r[i]
		)
	}
	if (!isRecord(l) || !isRecord(r)) return chance(50) ? l : r
	const result: Record<string, unknown> = { ...l }
	for (const k in r) result[k] = k in result ? merge(result[k], r[k]) : r[k]
	return result
}

const showValue = (value: unknown): string =>
	value === undefined ? "undefined"
	: typeof value === "number" ?
		Object.is(value, -0) ?
			"-0"
		:	String(value)
	: value instanceof Date ? `new Date(${value.getTime()})`
	: Array.isArray(value) ? `[${value.map(showValue).join(", ")}]`
	: isRecord(value) ?
		`{${Object.entries(value)
			.map(([k, v]) => ` ${k}: ${showValue(v)}`)
			.join(",")} }`
	:	JSON.stringify(value)

const sample = (a: Def, b: Def): unknown[] => {
	const values = new Map<string, unknown>()
	const add = (value: unknown) => values.set(showValue(value), value)
	for (const value of pool) add(value)
	for (let i = 0; i < 40; i++) {
		add(witness(a))
		add(witness(b))
		add(merge(witness(a), witness(b)))
	}
	return [...values.values()]
}

const types = new Map<string, type.Any | Error>()

const typeOf = (def: Def): type.Any | Error => {
	const key = show(def)
	let result = types.get(key)
	if (!result) {
		try {
			result = type.raw(render(def)) as type.Any
			// its first check runs uncompiled, so the checks after it are compiled
			result.allows(undefined)
		} catch (e) {
			result = e as Error
		}
		types.set(key, result)
	}
	return result
}

// a failure's description, if value shows the property doesn't hold
type Check = (value: unknown) => string | undefined

// undefined if the property doesn't apply to the pair
type Property = (a: Def, b: Def) => Check | undefined

const binary =
	(operator: "and" | "or"): Property =>
	(a, b) => {
		const l = typeOf(a)
		const r = typeOf(b)
		if (l instanceof Error || r instanceof Error) return
		const expected = (value: unknown) =>
			operator === "and" ?
				l.allows(value) && r.allows(value)
			:	l.allows(value) || r.allows(value)
		let result: type.Any
		try {
			result = operator === "and" ? l.and(r) : l.or(r)
			result.allows(undefined)
		} catch (e) {
			return value =>
				expected(value) ? `throws ${(e as Error).message}` : undefined
		}
		return value => {
			const actual = result.allows(value)
			return actual === expected(value) ? undefined : (
					`${result.expression} => ${actual}`
				)
		}
	}

const extendsProperty: Property = (a, b) => {
	const l = typeOf(a)
	const r = typeOf(b)
	if (l instanceof Error || r instanceof Error || !l.extends(r)) return
	return value =>
		l.allows(value) && !r.allows(value) ?
			`${l.expression} extends ${r.expression}`
		:	undefined
}

const overlapsProperty: Property = (a, b) => {
	const l = typeOf(a)
	const r = typeOf(b)
	if (l instanceof Error || r instanceof Error || l.overlaps(r)) return
	return value =>
		l.allows(value) && r.allows(value) ?
			`${l.expression} doesn't overlap ${r.expression}`
		:	undefined
}

// a definition's own | or & allows what its parts do
const compositeProperty: Property = a => {
	const parts =
		a.kind === "union" ? a.branches
		: a.kind === "intersection" ? [a.l, a.r]
		: []
	const partTypes: type.Any[] = []
	for (const part of parts) {
		const t = typeOf(part)
		if (t instanceof Error) return
		partTypes.push(t)
	}
	if (!partTypes.length) return
	const expected = (value: unknown) =>
		a.kind === "union" ?
			partTypes.some(t => t.allows(value))
		:	partTypes.every(t => t.allows(value))
	const t = typeOf(a)
	if (t instanceof Error)
		return value => (expected(value) ? `throws ${t.message}` : undefined)
	return value => {
		const actual = t.allows(value)
		return actual === expected(value) ? undefined : (
				`${t.expression} => ${actual}`
			)
	}
}

// a value a union allows is allowed by the branches of its case
const discriminateProperty: Property = a => {
	const t = typeOf(a)
	if (a.kind !== "union" || t instanceof Error) return
	const discriminant = discriminate(t.internal)
	if (!discriminant) return
	const { path, kind, cases } = discriminant
	return value => {
		if (!t.allows(value)) return
		const atPath = path.reduce<unknown>(
			(v, k) =>
				typeof v === "object" && v !== null && k in v ?
					(v as Record<PropertyKey, unknown>)[k]
				:	undefined,
			value
		)
		const matched = cases.find(c =>
			kind === "unit" ? c.value === atPath : c.value === domainOf(atPath)
		)
		const branches = matched ? matched.branches : discriminant.default
		if (branches?.allows(value)) return
		return `${matched ? `case ${showValue(matched.value)}` : "default"} at ${JSON.stringify(path)} rejects it`
	}
}

const properties = {
	and: binary("and"),
	or: binary("or"),
	extends: extendsProperty,
	overlaps: overlapsProperty,
	composite: compositeProperty,
	discriminate: discriminateProperty
} satisfies Record<string, Property>

export type PropertyName = keyof typeof properties

const propertyNames = Object.keys(properties) as PropertyName[]

// checked against each side on its own rather than the pair
const unary = new Set<PropertyName>(["composite", "discriminate"])

const failureOf = (
	name: PropertyName,
	a: Def,
	b: Def,
	value: unknown
): string | undefined => {
	try {
		return properties[name](a, b)?.(value)
	} catch (e) {
		// allows, extends, overlaps and discriminate never throw
		return `throws ${(e as Error).message}`
	}
}

// wrapped, since the value can be undefined
const firstFailing = (
	name: PropertyName,
	a: Def,
	b: Def,
	values: unknown[]
): { value: unknown } | undefined => {
	let check: Check | undefined
	try {
		check = properties[name](a, b)
	} catch {
		return { value: values[0] }
	}
	if (!check) return
	for (const value of values) {
		try {
			if (check(value) !== undefined) return { value }
		} catch {
			return { value }
		}
	}
}

const without = <t>(items: t[], i: number): t[] =>
	items.filter((_, j) => j !== i)

const replaced = <t>(items: t[], i: number, item: t): t[] =>
	items.map((original, j) => (j === i ? item : original))

const shrinkLeaves: Def[] = [
	{ kind: "domain", domain: "unknown" },
	{ kind: "domain", domain: "number" },
	{ kind: "domain", domain: "string" }
]

const omitting = <def extends Def>(def: def, ...keys: (keyof def)[]): Def[] =>
	keys
		.filter(key => def[key] !== undefined)
		.map(key => ({ ...def, [key]: undefined }) as def)

const shrinksOf = (def: Def): Def[] => {
	const result: Def[] = []
	switch (def.kind) {
		case "number":
			result.push(...omitting(def, "min", "max", "divisor"))
			if (def.exclusiveMin) result.push({ ...def, exclusiveMin: false })
			if (def.exclusiveMax) result.push({ ...def, exclusiveMax: false })
			break
		case "string":
			result.push(...omitting(def, "min", "max", "pattern"))
			break
		case "date":
			result.push(...omitting(def, "min", "max"))
			break
		case "array":
			result.push(
				def.element,
				...shrinksOf(def.element).map(element => ({ ...def, element }))
			)
			break
		case "tuple":
			for (const list of ["prefix", "optional", "postfix"] as const) {
				const elements = def[list]
				for (const [i, element] of elements.entries()) {
					result.push({ ...def, [list]: without(elements, i) })
					for (const shrunk of shrinksOf(element))
						result.push({ ...def, [list]: replaced(elements, i, shrunk) })
				}
			}
			if (def.variadic) {
				result.push({ ...def, variadic: undefined, postfix: [] })
				for (const variadic of shrinksOf(def.variadic))
					result.push({ ...def, variadic })
			}
			break
		case "object":
			for (const [i, prop] of def.props.entries()) {
				result.push({ ...def, props: without(def.props, i) })
				if (prop.optional) {
					result.push({
						...def,
						props: replaced(def.props, i, { ...prop, optional: false })
					})
				}
				for (const value of [...shrinkLeaves, ...shrinksOf(prop.value)]) {
					result.push({
						...def,
						props: replaced(def.props, i, { ...prop, value })
					})
				}
			}
			for (const [i, index] of def.index.entries()) {
				result.push({ ...def, index: without(def.index, i) })
				for (const value of [...shrinkLeaves, ...shrinksOf(index.value)]) {
					result.push({
						...def,
						index: replaced(def.index, i, { ...index, value })
					})
				}
			}
			if (def.reject) result.push({ ...def, reject: false })
			break
		case "union":
			result.push(...def.branches)
			for (const [i, branch] of def.branches.entries()) {
				if (def.branches.length > 2)
					result.push({ ...def, branches: without(def.branches, i) })
				for (const shrunk of shrinksOf(branch))
					result.push({ ...def, branches: replaced(def.branches, i, shrunk) })
			}
			break
		case "intersection":
			result.push(def.l, def.r)
			for (const l of shrinksOf(def.l)) result.push({ ...def, l })
			for (const r of shrinksOf(def.r)) result.push({ ...def, r })
			break
	}
	result.push(...shrinkLeaves)
	const size = show(def).length
	return result.filter(shrunk => show(shrunk).length < size)
}

const valueShrinksOf = (value: unknown): unknown[] => {
	if (Array.isArray(value)) {
		return value.flatMap((element, i) => [
			without(value, i),
			...valueShrinksOf(element).map(shrunk => replaced(value, i, shrunk))
		])
	}
	if (isRecord(value)) {
		return Object.keys(value).flatMap(k => {
			const { [k]: _, ...rest } = value
			return [
				rest,
				...valueShrinksOf(value[k]).map(shrunk => ({ ...value, [k]: shrunk }))
			]
		})
	}
	return [0, "", true, null, undefined].filter(
		shrunk =>
			!Object.is(shrunk, value) &&
			showValue(shrunk).length <= showValue(value).length
	)
}

const shrink = (name: PropertyName, a: Def, b: Def, value: unknown) => {
	let current = { a, b, value }
	for (let shrunk = true; shrunk; ) {
		shrunk = false
		const candidates = [
			...shrinksOf(current.a).map(a =>
				unary.has(name) ? { ...current, a, b: a } : { ...current, a }
			),
			...(unary.has(name) ?
				[]
			:	shrinksOf(current.b).map(b => ({ ...current, b }))),
			...valueShrinksOf(current.value).map(value => ({ ...current, value }))
		]
		for (const candidate of candidates) {
			if (
				failureOf(name, candidate.a, candidate.b, candidate.value) !== undefined
			) {
				current = candidate
				shrunk = true
				break
			}
		}
	}
	const failure = failureOf(name, current.a, current.b, current.value)
	const operands =
		unary.has(name) ? show(current.a) : `${show(current.a)}, ${show(current.b)}`
	return `${operands} at ${showValue(current.value)}: ${failure}`
}

export interface FuzzResult {
	// pairs with a side that doesn't parse, e.g. a disjoint intersection
	invalid: number
	// each property's distinct failures, shrunk
	failures: Record<PropertyName, string[]>
}

export const fuzz = (seed: number, pairs: number): FuzzResult => {
	state = seed
	types.clear()
	let invalid = 0
	const failures = {} as FuzzResult["failures"]
	for (const name of propertyNames) failures[name] = []
	for (let i = 0; i < pairs; i++) {
		const [a, b] = genPair()
		const values = sample(a, b)
		if (typeOf(a) instanceof Error || typeOf(b) instanceof Error) invalid++
		for (const name of propertyNames) {
			const operands =
				unary.has(name) ?
					[
						[a, a],
						[b, b]
					]
				:	[
						[a, b],
						[b, a]
					]
			for (const [l, r] of operands) {
				const failing = firstFailing(name, l, r, values)
				if (!failing) continue
				const message = shrink(name, l, r, failing.value)
				if (!failures[name].includes(message)) failures[name].push(message)
			}
		}
	}
	return { invalid, failures }
}
