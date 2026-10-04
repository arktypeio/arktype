import { attest, contextualize } from "@ark/attest"
import type { BaseNode } from "@ark/schema"
import { ArkErrors, scope, type, type Type } from "arktype"

type Value = {
	form:
		| "number"
		| "string"
		| "default"
		| "parse"
		| "ref"
		| "nullable"
		| "array"
		| "unionArray"
		| "record"
		| "orString"
		| "and"
		| "box"
		| "bounded"
		| "alt"
		| "wraps"
		| "nullDefault"
		| "nonEmpty"
		| "pipe"
		| "indexed"
		| "tuple"
		| "orArray"
	to: number
	other: number
}

type Prop = { key: string; optional: boolean; value: Value }

type Alias = {
	form: "object" | "union" | "arrayOf" | "recordOf"
	tagged: boolean
	props: Prop[]
	of: number[]
}

const random = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const nameOf = (i: number) => `a${i}`

const valueForms: [threshold: number, form: Value["form"]][] = [
	[0.1, "number"],
	[0.2, "string"],
	[0.32, "ref"],
	[0.48, "nullable"],
	[0.62, "array"],
	[0.72, "unionArray"],
	[0.8, "record"],
	[0.83, "indexed"],
	[0.86, "orString"],
	[0.88, "tuple"],
	[0.9, "and"],
	[0.92, "parse"],
	[0.95, "box"],
	[0.96, "wraps"],
	[0.97, "alt"],
	[0.98, "bounded"],
	[1, "default"]
]

const relatedValueForms: [threshold: number, form: Value["form"]][] = [
	[0.1, "number"],
	[0.25, "ref"],
	[0.4, "nullable"],
	[0.48, "array"],
	[0.54, "nonEmpty"],
	[0.6, "unionArray"],
	[0.66, "orArray"],
	[0.72, "record"],
	[0.76, "indexed"],
	[0.8, "tuple"],
	[0.85, "orString"],
	[0.9, "nullDefault"],
	[0.93, "parse"],
	[0.97, "pipe"],
	[1, "default"]
]

const generateAliases = (rand: () => number, forms = valueForms): Alias[] => {
	const count = 2 + Math.floor(rand() * 4)
	const pick = () => Math.floor(rand() * count)
	return Array.from({ length: count }, (_, i): Alias => {
		const of = [...new Set([pick(), pick()])]
		if (i > 0 && rand() < 0.25)
			return { form: "union", tagged: false, props: [], of }
		if (rand() < 0.15) {
			const form = rand() < 0.5 ? "arrayOf" : "recordOf"
			return { form, tagged: false, props: [], of }
		}
		const props = Array.from({ length: 1 + Math.floor(rand() * 3) }, (_, j) => {
			const r = rand()
			const form = forms.find(([threshold]) => r < threshold)![1]
			const to = pick()
			// a tuple's variadic absorbs an optional element it equals, and a key both declared and indexed takes each step
			const other =
				form === "tuple" || (form === "indexed" && rand() < 0.5) ? to : pick()
			const value: Value = { form, to, other }
			// a required reference with no other way out would leave the type uninhabited
			const optional =
				form !== "default" &&
				form !== "nullDefault" &&
				(["ref", "and", "box", "bounded", "alt", "nonEmpty", "pipe"].includes(
					form
				) ||
					rand() < 0.3)
			return { key: `p${j}`, optional, value }
		})
		return { form: "object", tagged: rand() < 0.7, props, of: [] }
	})
}

const valueDefOf = (value: Value): unknown =>
	value.form === "number" || value.form === "string" ? value.form
	: value.form === "default" ? "string = 'd'"
	: value.form === "nullDefault" ? [`${nameOf(value.to)} | null`, "=", null]
	: value.form === "parse" ? "string.numeric.parse"
	: value.form === "ref" ? nameOf(value.to)
	: value.form === "nullable" ? `${nameOf(value.to)} | null`
	: value.form === "array" ? `${nameOf(value.to)}[]`
	: value.form === "nonEmpty" ?
		[nameOf(value.to), "...", `${nameOf(value.to)}[]`]
	: value.form === "pipe" ? `string.json.parse |> ${nameOf(value.to)}`
	: value.form === "record" ? `Record<string, ${nameOf(value.to)}>`
	: value.form === "indexed" ?
		{ "q?": nameOf(value.to), "[string]": nameOf(value.other) }
	: value.form === "tuple" ?
		[[nameOf(value.to), "?"], "...", `${nameOf(value.other)}[]`]
	: value.form === "orArray" ? `${nameOf(value.to)} | ${nameOf(value.to)}[]`
	: value.form === "orString" ? `${nameOf(value.to)} | string`
	: value.form === "and" ? [nameOf(value.to), "&", { "x?": "number" }]
	: value.form === "box" ? `box<${nameOf(value.to)}>`
	: value.form === "bounded" ? `bounded<${nameOf(value.to)}>`
	: value.form === "alt" ? `alt<${nameOf(value.to)}, ${nameOf(value.other)}>`
	: value.form === "wraps" ?
		`wrap<${nameOf(value.to)}> | wrap<${nameOf(value.other)}>`
	:	`(${nameOf(value.to)} | ${nameOf(value.other)})[]`

const defOf = (alias: Alias, i: number): unknown => {
	if (alias.form === "union") return alias.of.map(nameOf).join(" | ")
	if (alias.form === "arrayOf") return `(${alias.of.map(nameOf).join(" | ")})[]`
	if (alias.form === "recordOf")
		return `Record<string, ${alias.of.map(nameOf).join(" | ")}>`
	const def: Record<string, unknown> = {}
	if (alias.tagged) def.kind = `'${nameOf(i)}'`
	for (const prop of alias.props)
		def[prop.optional ? `${prop.key}?` : prop.key] = valueDefOf(prop.value)
	return def
}

// a union reaching itself only through unions is a shallow cycle
const isShallow = (aliases: Alias[]) => {
	const reaches = (i: number, path: number[]): boolean =>
		path.includes(i) ||
		(aliases[i].form === "union" &&
			aliases[i].of.some(j => reaches(j, [...path, i])))
	return aliases.some((_, i) => reaches(i, []))
}

const generateData = (aliases: Alias[], rand: () => number) => {
	const box = (
		l: number,
		r: number,
		depth: number,
		swaps: boolean
	): unknown => {
		const data: Record<string, unknown> = { v: generate(l, depth + 1, []) }
		if (depth < 4 && rand() < 0.5) {
			const [next, other] = swaps ? [r, l] : [l, r]
			data[swaps ? "swap" : "next"] = box(next, other, depth + 1, swaps)
		}
		return data
	}
	const generate = (i: number, depth: number, unions: number[]): unknown => {
		const alias = aliases[i]
		if (alias.form === "union") {
			const options = alias.of.filter(
				j => !unions.includes(j) || aliases[j].form !== "union"
			)
			const next = options[Math.floor(rand() * options.length)] ?? alias.of[0]
			return generate(next, depth, [...unions, i])
		}
		if (alias.form !== "object") {
			const elements = Array.from(
				{ length: depth > 3 ? 0 : Math.floor(rand() * 3) },
				() =>
					generate(
						alias.of[Math.floor(rand() * alias.of.length)],
						depth + 1,
						[]
					)
			)
			return alias.form === "arrayOf" ?
					elements
				:	Object.fromEntries(elements.map((e, k) => [`k${k}`, e]))
		}
		const data: Record<string, unknown> = {}
		if (alias.tagged) data.kind = nameOf(i)
		for (const { key, optional, value } of alias.props) {
			if (optional && (depth > 3 || rand() < 0.3)) continue
			const deep = depth > 3
			const v =
				value.form === "number" ? Math.floor(rand() * 100)
				: value.form === "string" ? "s"
				: value.form === "default" ?
					rand() < 0.5 ?
						"x"
					:	undefined
				: value.form === "parse" ? String(Math.floor(rand() * 100))
				: value.form === "ref" ? generate(value.to, depth + 1, [])
				: value.form === "nullable" ?
					deep || rand() < 0.4 ?
						null
					:	generate(value.to, depth + 1, [])
				: value.form === "nullDefault" ?
					deep || rand() < 0.4 ?
						rand() < 0.5 ?
							null
						:	undefined
					:	generate(value.to, depth + 1, [])
				: value.form === "array" ?
					deep ? []
					:	[generate(value.to, depth + 1, [])]
				: value.form === "nonEmpty" ? [generate(value.to, depth + 1, [])]
				: value.form === "pipe" ?
					JSON.stringify(generate(value.to, depth + 1, []))
				: value.form === "unionArray" ?
					deep ? []
					:	[generate(rand() < 0.5 ? value.to : value.other, depth + 1, [])]
				: value.form === "record" ?
					deep ? {}
					:	{ k: generate(value.to, depth + 1, []) }
				: value.form === "indexed" ?
					deep ? {}
					:	{ q: generate(value.to, depth + 1, []) }
				: value.form === "tuple" ?
					deep ? []
					:	[
							generate(value.to, depth + 1, []),
							generate(value.other, depth + 1, [])
						]
				: value.form === "orArray" ?
					deep ? []
					: rand() < 0.5 ? generate(value.to, depth + 1, [])
					: [generate(value.to, depth + 1, [])]
				: value.form === "and" ? withX(generate(value.to, depth + 1, []), rand)
				: value.form === "box" || value.form === "bounded" ?
					box(value.to, value.to, depth + 1, false)
				: value.form === "alt" ? box(value.to, value.other, depth + 1, true)
				: value.form === "wraps" ?
					deep ? []
					: rand() < 0.5 ? [generate(value.to, depth + 1, [])]
					: [[generate(value.other, depth + 1, [])]]
				: deep || rand() < 0.4 ? "s"
				: generate(value.to, depth + 1, [])
			if (v !== undefined) data[key] = v
		}
		return data
	}
	return (i: number) => generate(i, 0, [])
}

const withX = (data: unknown, rand: () => number) => {
	if (isPlainObject(data) && rand() < 0.5) data.x = Math.floor(rand() * 10)
	return data
}

const isObject = (data: unknown): data is Record<string, unknown> =>
	typeof data === "object" && data !== null

const isPlainObject = (data: unknown): data is Record<string, unknown> =>
	isObject(data) && !Array.isArray(data)

const objectsOf = (data: unknown): Record<string, unknown>[] => {
	const objects: Record<string, unknown>[] = []
	const walk = (value: unknown) => {
		if (!isObject(value) || objects.includes(value)) return
		objects.push(value)
		for (const k in value) walk(value[k])
	}
	walk(data)
	return objects
}

const mutate = (data: unknown, rand: () => number) => {
	const objects = objectsOf(data)
	const target = objects[Math.floor(rand() * objects.length)]
	const keys = Object.keys(target)
	if (keys.length) {
		target[keys[Math.floor(rand() * keys.length)]] =
			rand() < 0.5 ? 12345n
			: rand() < 0.5 ? undefined
			: { bogus: true }
	}
	return data
}

// points a nested property at the root, or at any object so it's shared, which the type may or may not allow
const link = (data: unknown, rand: () => number, shares: boolean) => {
	const objects = objectsOf(data)
	const inner =
		objects[1 + Math.floor(rand() * Math.max(objects.length - 1, 1))]
	if (!inner) return data
	const target = shares ? objects[Math.floor(rand() * objects.length)] : data
	for (const k of Object.keys(inner)) {
		if (isPlainObject(inner[k])) {
			inner[k] = target
			break
		}
		if (Array.isArray(inner[k])) {
			inner[k].push(target)
			break
		}
	}
	return data
}

// cyclic data is valid if it's valid assuming each (alias, object) pair on its path is
const oracleOf = (aliases: Alias[]) => {
	const assumed: [string, object][] = []
	const assuming = (key: string, data: object, check: () => boolean) => {
		if (assumed.some(([k, o]) => k === key && o === data)) return true
		assumed.push([key, data])
		const result = check()
		assumed.pop()
		return result
	}
	const allows = (i: number, data: unknown): boolean => {
		const alias = aliases[i]
		if (!isObject(data))
			return alias.form === "union" && alias.of.some(j => allows(j, data))
		return assuming(`${i}`, data, () =>
			alias.form === "union" ? alias.of.some(j => allows(j, data))
			: alias.form === "arrayOf" ?
				Array.isArray(data) && data.every(e => alias.of.some(j => allows(j, e)))
			: alias.form === "recordOf" ?
				Object.values(data).every(v => alias.of.some(j => allows(j, v)))
			:	(!alias.tagged || data.kind === nameOf(i)) &&
				alias.props.every(({ key, optional, value }) =>
					key in data ?
						valueAllows(value, data[key])
					:	optional || value.form === "default" || value.form === "nullDefault"
				)
		)
	}
	const boxAllows = (
		l: number,
		r: number,
		data: unknown,
		key: string
	): boolean =>
		isObject(data) &&
		assuming(`${key}${l},${r}`, data, () => {
			const [nextL, nextR] = key === "swap" ? [r, l] : [l, r]
			return (
				allows(l, data.v) &&
				(!(key in data) || boxAllows(nextL, nextR, data[key], key))
			)
		})
	const wrapAllows = (i: number, data: unknown): boolean =>
		Array.isArray(data) &&
		assuming(`wrap${i}`, data, () =>
			data.every(e => allows(i, e) || wrapAllows(i, e))
		)
	const valueAllows = (value: Value, data: unknown): boolean =>
		value.form === "number" ? typeof data === "number"
		: value.form === "string" || value.form === "default" ?
			typeof data === "string"
		: value.form === "parse" ?
			typeof data === "string" && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(data)
		: value.form === "ref" ? allows(value.to, data)
		: value.form === "nullable" || value.form === "nullDefault" ?
			data === null || allows(value.to, data)
		: value.form === "array" ?
			Array.isArray(data) && data.every(e => allows(value.to, e))
		: value.form === "nonEmpty" ?
			Array.isArray(data) &&
			data.length !== 0 &&
			data.every(e => allows(value.to, e))
		: value.form === "pipe" ?
			typeof data === "string" && allows(value.to, JSON.parse(data))
		: value.form === "unionArray" ?
			Array.isArray(data) &&
			data.every(e => allows(value.to, e) || allows(value.other, e))
		: value.form === "record" ?
			isObject(data) && Object.values(data).every(v => allows(value.to, v))
		: value.form === "indexed" ?
			isObject(data) &&
			Object.values(data).every(v => allows(value.other, v)) &&
			(!("q" in data) || allows(value.to, data.q))
		: value.form === "tuple" ?
			Array.isArray(data) &&
			(data.length === 0 || allows(value.to, data[0])) &&
			data.slice(1).every(e => allows(value.other, e))
		: value.form === "orArray" ?
			allows(value.to, data) ||
			(Array.isArray(data) && data.every(e => allows(value.to, e)))
		: value.form === "and" ?
			isObject(data) &&
			(!("x" in data) || typeof data.x === "number") &&
			allows(value.to, data)
		: value.form === "box" || value.form === "bounded" ?
			boxAllows(value.to, value.to, data, "next")
		: value.form === "alt" ? boxAllows(value.to, value.other, data, "swap")
		: value.form === "wraps" ?
			wrapAllows(value.to, data) || wrapAllows(value.other, data)
		:	typeof data === "string" || allows(value.to, data)
	return allows
}

// a copy of data built again from its seed has the same values, shared objects and cycles
const isCopyOf = (
	l: unknown,
	r: unknown,
	copies = new Map<object, unknown>()
): boolean => {
	if (!isObject(l) || !isObject(r)) return Object.is(l, r)
	if (copies.has(l)) return copies.get(l) === r
	copies.set(l, r)
	const keys = Object.keys(l)
	return (
		Array.isArray(l) === Array.isArray(r) &&
		keys.length === Object.keys(r).length &&
		keys.every(k => k in r && isCopyOf(l[k], r[k], copies))
	)
}

// an alias is only a prop's value, a sequence element or a morph's piped node
const placesAliasesStructurally = (node: BaseNode): boolean =>
	node.children.every(child =>
		child.hasKind("alias") ?
			node.isStructural() || (node.hasKind("morph") && node.inner.in !== child)
		:	placesAliasesStructurally(child)
	)

const outcomeOf = (t: Type, data: unknown) => {
	const out = t(data)
	return out instanceof ArkErrors ? out.summary : "ok"
}

const pathsOf = (t: Type, data: unknown) => {
	const out = t(data)
	return out instanceof ArkErrors ? out.map(e => e.propString).join() : "ok"
}

const shuffle = <t>(items: readonly t[], rand: () => number) => {
	const shuffled = [...items]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1))
		;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
	}
	return shuffled
}

const defsOf = (aliases: Alias[]): Record<string, unknown> =>
	Object.fromEntries(aliases.map((a, i) => [nameOf(i), defOf(a, i)]))

// each variant is the same scope written differently, so every alias it shares means the same type
const variantsOf = (
	aliases: Alias[],
	rand: () => number
): Record<string, Record<string, unknown>> => {
	const pick = () => Math.floor(rand() * aliases.length)
	const copied = pick()
	const redirect = (to: number) =>
		to === copied && rand() < 0.5 ? aliases.length : to
	const redirected = aliases.map(
		(alias): Alias => ({
			...alias,
			of: alias.of.map(redirect),
			props: alias.props.map(prop => ({
				...prop,
				value: {
					...prop.value,
					to: redirect(prop.value.to),
					other: redirect(prop.value.other)
				}
			}))
		})
	)
	const unfolded = defsOf(aliases)
	const refs = aliases.flatMap((alias, i) =>
		alias.props
			.filter(prop =>
				["ref", "nullable", "orString", "tuple"].includes(prop.value.form)
			)
			.map(prop => ({ i, prop }))
	)
	if (refs.length) {
		const { i, prop } = refs[Math.floor(rand() * refs.length)]
		const inlined = defOf(aliases[prop.value.to], prop.value.to)
		;(unfolded[nameOf(i)] as Record<string, unknown>)[
			prop.optional ? `${prop.key}?` : prop.key
		] =
			prop.value.form === "ref" ? inlined
			: prop.value.form === "nullable" ? [inlined, "|", "null"]
			: prop.value.form === "orString" ? [inlined, "|", "string"]
			: [[inlined, "?"], "...", `${nameOf(prop.value.other)}[]`]
	}
	return {
		duplicated: {
			...defsOf(redirected),
			[nameOf(aliases.length)]: defOf(redirected[copied], copied),
			u: `${nameOf(copied)} | ${nameOf(aliases.length)}`
		},
		unfolded,
		unused: { ...defsOf(aliases), u: `string.json.parse |> ${nameOf(pick())}` }
	}
}

const generics = {
	"box<t>": { v: "t", "next?": "box<t>" },
	// a constraint holding a definition is checked once it closes, in any order
	"bounded<t extends a0>": { v: "t", "next?": "bounded<t>" },
	"alt<a, b>": { v: "a", "swap?": "alt<b, a>" },
	"wrap<t>": "(t | wrap<t>)[]"
}

const assertGeneratedScopesAlike = (firstSeed: number, lastSeed: number) => {
	const failures: string[] = []
	for (let seed = firstSeed; seed <= lastSeed; seed++) {
		const rand = random(seed)
		const aliases = generateAliases(rand)
		const names = aliases.map((_, i) => nameOf(i))
		const defs = Object.fromEntries(
			aliases.map((a, i) => [names[i], defOf(a, i)])
		)
		const orders = [names, ...[0, 1, 2].map(() => shuffle(names, rand))]
		const builds = [...orders, names].map((order, k) => {
			try {
				const ordered = Object.fromEntries(
					order.map(name => [name, defs[name]])
				)
				const types: Record<string, Type> = scope(
					{ ...generics, ...ordered } as never,
					{ jitless: k === orders.length }
				).export() as never
				// reading an input or output first mustn't change what validates
				if (k === 1) {
					for (const name of names) {
						void types[name].in
						void types[name].out
					}
				}
				return types
			} catch (e) {
				return String(e)
			}
		})
		const rejections = builds.filter(b => typeof b === "string")
		if (rejections.length) {
			if (rejections.length !== builds.length)
				failures.push(`${seed}: built in some orders only`)
			// a generic's constraint can be checked before the shallow cycle is found
			else if (
				isShallow(aliases) &&
				!/shallow|must be assignable/.test(rejections[0])
			)
				failures.push(`${seed}: ${rejections[0]}`)
			continue
		}
		if (isShallow(aliases)) failures.push(`${seed}: shallow cycle built`)
		const types = builds as Record<string, Type>[]
		const allows = oracleOf(aliases)
		for (let i = 0; i < aliases.length; i++) {
			let derived: Type[] = []
			try {
				derived = [
					types[0][names[i]].describe("x"),
					types[0][names[i]].configure({ description: "x" }, "references")
				]
			} catch (e) {
				failures.push(`${seed} ${names[i]}: ${e}`)
			}
			if (!placesAliasesStructurally(types[0][names[i]].internal))
				failures.push(`${seed} ${names[i]}: alias outside a structural value`)
			for (let variant = 0; variant < 6; variant++) {
				const generateVariant = () => {
					const variantRand = random(seed * 1000 + i * 10 + variant)
					const generated = generateData(aliases, variantRand)(i)
					return (
						variant % 3 === 1 ? mutate(generated, variantRand)
						: variant % 3 === 2 ? link(generated, variantRand, variant === 5)
						: generated
					)
				}
				const data = generateVariant()
				const expected = allows(i, data)
				const outcomes = types.map(t => outcomeOf(t[names[i]], data))
				if (new Set(outcomes).size > 1)
					failures.push(`${seed} ${names[i]}: ${outcomes}`)
				for (const [k, t] of types.entries()) {
					if ((outcomes[k] === "ok") !== expected) {
						failures.push(
							`${seed} ${names[i]}: expected ${expected}, got ${outcomes[k]}`
						)
					}
					if (t[names[i]].allows(data) !== expected)
						failures.push(`${seed} ${names[i]}: allows isn't ${expected}`)
					const out = t[names[i]](data)
					if (expected && !t[names[i]].out.allows(out))
						failures.push(`${seed} ${names[i]}: out rejects its output`)
				}
				// a derived type reports each invalid object at the paths its type does
				const paths = pathsOf(types[0][names[i]], data)
				for (const t of derived) {
					if (pathsOf(t, data) !== paths) {
						failures.push(
							`${seed} ${names[i]}: ${t.expression} got ${pathsOf(t, data)}`
						)
					}
				}
				if (!isCopyOf(data, generateVariant()))
					failures.push(`${seed} ${names[i]}: input mutated`)
			}
		}
	}
	attest(failures).equals([])
}

const assertGeneratedRelations = (firstSeed: number, lastSeed: number) => {
	const failures: string[] = []
	for (let seed = firstSeed; seed <= lastSeed; seed++) {
		const rand = random(seed)
		const aliases = generateAliases(rand, relatedValueForms)
		if (isShallow(aliases)) continue
		const names = aliases.map((_, i) => nameOf(i))
		const defs = defsOf(aliases)
		const build = (
			unordered: Record<string, unknown>
		): Record<string, Type> | string => {
			try {
				return scope(
					Object.fromEntries(
						shuffle(Object.keys(unordered), rand).map(name => [
							name,
							unordered[name]
						])
					) as never
				).export() as never
			} catch (e) {
				return String(e)
			}
		}
		const [l, r] = [defs, defs].map(build)
		if (typeof l === "string" || typeof r === "string") {
			if (l !== r) failures.push(`${seed}: ${l} || ${r}`)
			continue
		}
		for (const [variant, variantDefs] of Object.entries(
			variantsOf(aliases, rand)
		)) {
			const types = build(variantDefs)
			if (typeof types === "string") {
				failures.push(`${seed} ${variant}: ${types}`)
				continue
			}
			if (
				variant === "duplicated" &&
				!types.u.equals(types[nameOf(names.length)])
			)
				failures.push(`${seed}: union of twins isn't either`)
			for (const name of names) {
				if (!types[name].equals(l[name]))
					failures.push(`${seed} ${name}: ${variant} isn't equal`)
				if (
					variant === "unused" &&
					types[name].expression !== l[name].expression
				)
					failures.push(`${seed} ${name}: ${variant} ${types[name].expression}`)
			}
		}
		const allows = oracleOf(aliases)
		const serializable = aliases.every(alias =>
			alias.props.every(
				({ value }) =>
					!["parse", "default", "nullDefault", "pipe"].includes(value.form)
			)
		)
		// a required prop on each object narrows every alias reaching one
		const narrowed =
			serializable &&
			build(
				Object.fromEntries(
					Object.entries(defs).map(([name, def]) => [
						name,
						isPlainObject(def) ? { ...def, s: "true" } : def
					])
				)
			)
		if (typeof narrowed === "string")
			failures.push(`${seed} narrowed: ${narrowed}`)
		else if (narrowed) {
			for (const [i, name] of names.entries()) {
				if (!narrowed[name].extends(l[name]))
					failures.push(`${seed} ${name}: narrowed doesn't extend`)
				const sample = generateData(aliases, random(seed * 1000 + i * 10))(i)
				if (
					aliases[i].form === "object" &&
					allows(i, sample) &&
					l[name].extends(narrowed[name])
				)
					failures.push(`${seed} ${name}: extends narrowed`)
			}
		}
		for (let i = 0; i < aliases.length; i++) {
			const [a, b] = [l[names[i]], r[names[i]]]
			if (a.expression !== b.expression)
				failures.push(`${seed} ${names[i]}: ${a.expression} || ${b.expression}`)
			if (!a.equals(b) || !a.extends(b) || !b.extends(a))
				failures.push(`${seed} ${names[i]}: twins aren't related`)
			const other = names[Math.floor(rand() * names.length)]
			const [lUnion, rUnion] = [
				[a, l[other]],
				[b, r[other]]
			].map(([t, u]) => {
				try {
					return t.or(u)
				} catch (e) {
					return String(e)
				}
			})
			if (typeof lUnion === "string" || typeof rUnion === "string") {
				if (lUnion !== rUnion)
					failures.push(`${seed} ${names[i]}: ${lUnion} || ${rUnion}`)
			} else {
				if (lUnion.expression !== rUnion.expression)
					failures.push(`${seed} ${names[i]}: or ${other} differs by build`)
				if (!a.extends(lUnion))
					failures.push(`${seed} ${names[i]}: or ${other} doesn't absorb`)
			}
			if (!a.or(a).equals(a))
				failures.push(`${seed} ${names[i]}: or isn't idempotent`)
			if (serializable && !type.schema(a.json as never).equals(a))
				failures.push(`${seed} ${names[i]}: json doesn't parse back`)
			try {
				a.toJsonSchema({ fallback: ctx => ctx.base })
			} catch (e) {
				failures.push(`${seed} ${names[i]}: ${e}`)
			}
			const wrapper = type({ w: a })
			for (let variant = 0; variant < 4; variant++) {
				const generateVariant = () => {
					const variantRand = random(seed * 1000 + i * 10 + variant)
					const generated = generateData(aliases, variantRand)(i)
					return variant % 2 ? mutate(generated, variantRand) : generated
				}
				const data = generateVariant()
				const expected = allows(i, data)
				if (a.in.allows(data) !== expected)
					failures.push(`${seed} ${names[i]}: in allows isn't ${expected}`)
				const out = wrapper({ w: data })
				if (out instanceof ArkErrors === expected)
					failures.push(`${seed} ${names[i]}: wrapper got ${out}`)
				if (!isCopyOf(data, generateVariant()))
					failures.push(`${seed} ${names[i]}: input mutated`)
			}
		}
	}
	attest(failures).equals([])
}

// ARK_CYCLE_FUZZ=<count>[:<first seed>] checks that many seeds from the first, of which 65, 92, 114, 126, 157, 186 and 193 fail for now
const [fuzzCount, fuzzFirstSeed = 1] =
	process.env.ARK_CYCLE_FUZZ?.split(":").map(Number) ?? []

const seedRanges = (count: number) =>
	Array.from({ length: Math.ceil(count / 20) }, (_, k) => {
		const first = fuzzFirstSeed + k * 20
		return [first, Math.min(first + 19, fuzzFirstSeed + count - 1)] as const
	})

contextualize(() => {
	describe("generated scopes", () => {
		for (const [first, last] of seedRanges(fuzzCount ?? 60)) {
			it(`seeds ${first}-${last}`, () =>
				assertGeneratedScopesAlike(first, last))
		}
	})

	describe("generated scope relations", () => {
		for (const [first, last] of seedRanges(fuzzCount ?? 40))
			it(`seeds ${first}-${last}`, () => assertGeneratedRelations(first, last))
	})
})
