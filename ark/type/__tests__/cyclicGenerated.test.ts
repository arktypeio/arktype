import { attest, contextualize } from "@ark/attest"
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
		| "nullDefault"
		| "nonEmpty"
		| "pipe"
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
	[0.82, "record"],
	[0.86, "orString"],
	[0.89, "and"],
	[0.92, "parse"],
	[0.95, "box"],
	[0.97, "alt"],
	[0.98, "bounded"],
	[1, "default"]
]

const relatedValueForms: [threshold: number, form: Value["form"]][] = [
	[0.1, "number"],
	[0.25, "ref"],
	[0.4, "nullable"],
	[0.5, "array"],
	[0.58, "nonEmpty"],
	[0.65, "unionArray"],
	[0.75, "record"],
	[0.82, "orString"],
	[0.88, "nullDefault"],
	[0.92, "parse"],
	[0.96, "pipe"],
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
			const value: Value = { form, to: pick(), other: pick() }
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
	: value.form === "orString" ? `${nameOf(value.to)} | string`
	: value.form === "and" ? [nameOf(value.to), "&", { "x?": "number" }]
	: value.form === "box" ? `box<${nameOf(value.to)}>`
	: value.form === "bounded" ? `bounded<${nameOf(value.to)}>`
	: value.form === "alt" ? `alt<${nameOf(value.to)}, ${nameOf(value.other)}>`
	: `(${nameOf(value.to)} | ${nameOf(value.other)})[]`

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
				: value.form === "and" ? withX(generate(value.to, depth + 1, []), rand)
				: value.form === "box" || value.form === "bounded" ?
					box(value.to, value.to, depth + 1, false)
				: value.form === "alt" ? box(value.to, value.other, depth + 1, true)
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

// points a nested property at the root, which the type may or may not allow
const linkCycle = (data: unknown, rand: () => number) => {
	const objects = objectsOf(data)
	const inner =
		objects[1 + Math.floor(rand() * Math.max(objects.length - 1, 1))]
	if (!inner) return data
	for (const k of Object.keys(inner)) {
		if (isPlainObject(inner[k])) {
			inner[k] = data
			break
		}
		if (Array.isArray(inner[k])) {
			inner[k].push(data)
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
		: value.form === "and" ?
			isObject(data) &&
			(!("x" in data) || typeof data.x === "number") &&
			allows(value.to, data)
		: value.form === "box" || value.form === "bounded" ?
			boxAllows(value.to, value.to, data, "next")
		: value.form === "alt" ? boxAllows(value.to, value.other, data, "swap")
		: typeof data === "string" || allows(value.to, data)
	return allows
}

const outcomeOf = (t: Type, data: unknown) => {
	const out = t(data)
	return out instanceof ArkErrors ? out.summary : "ok"
}

const shuffle = <t>(items: readonly t[], rand: () => number) => {
	const shuffled = [...items]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1))
		;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
	}
	return shuffled
}

const generics = {
	"box<t>": { v: "t", "next?": "box<t>" },
	// a constraint holding a definition is checked once it closes, in any order
	"bounded<t extends a0>": { v: "t", "next?": "bounded<t>" },
	"alt<a, b>": { v: "a", "swap?": "alt<b, a>" }
}

contextualize(() => {
	it("validates generated cyclic scopes alike in any order and mode", () => {
		const failures: string[] = []
		for (let seed = 1; seed <= 60; seed++) {
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
					const types = scope({ ...generics, ...ordered } as never, {
						jitless: k === orders.length
					}).export() as never as Record<string, Type>
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
				else if (isShallow(aliases) && !rejections[0].includes("shallow"))
					failures.push(`${seed}: ${rejections[0]}`)
				continue
			}
			if (isShallow(aliases)) failures.push(`${seed}: shallow cycle built`)
			const types = builds as Record<string, Type>[]
			const allows = oracleOf(aliases)
			for (let i = 0; i < aliases.length; i++) {
				for (let variant = 0; variant < 6; variant++) {
					const data = () => {
						const r = random(seed * 1000 + i * 10 + variant)
						const generated = generateData(aliases, r)(i)
						return (
							variant % 3 === 1 ? mutate(generated, r)
							: variant % 3 === 2 ? linkCycle(generated, r)
							: generated
						)
					}
					const expected = allows(i, data())
					const outcomes = types.map(t => outcomeOf(t[names[i]], data()))
					const jit = outcomes.slice(0, -1)
					if (new Set(jit).size > 1)
						failures.push(`${seed} ${names[i]}: ${jit}`)
					for (const [k, t] of types.entries()) {
						if ((outcomes[k] === "ok") !== expected) {
							failures.push(
								`${seed} ${names[i]}: expected ${expected}, got ${outcomes[k]}`
							)
						}
						if (t[names[i]].allows(data()) !== expected)
							failures.push(`${seed} ${names[i]}: allows isn't ${expected}`)
						const out = t[names[i]](data())
						if (expected && !t[names[i]].out.allows(out))
							failures.push(`${seed} ${names[i]}: out rejects its output`)
					}
				}
			}
		}
		attest(failures).equals([])
	})

	it("relates generated cyclic scopes and their wrappers alike in any order", () => {
		const failures: string[] = []
		for (let seed = 1; seed <= 40; seed++) {
			const rand = random(seed)
			const aliases = generateAliases(rand, relatedValueForms)
			if (isShallow(aliases)) continue
			const names = aliases.map((_, i) => nameOf(i))
			const defs = Object.fromEntries(
				aliases.map((a, i) => [names[i], defOf(a, i)])
			)
			const [l, r] = [names, shuffle(names, rand)].map(order => {
				try {
					return scope(
						Object.fromEntries(order.map(name => [name, defs[name]])) as never
					).export() as never as Record<string, Type>
				} catch (e) {
					return String(e)
				}
			})
			if (typeof l === "string" || typeof r === "string") {
				if (l !== r) failures.push(`${seed}: ${l} || ${r}`)
				continue
			}
			const allows = oracleOf(aliases)
			const serializable = aliases.every(alias =>
				alias.props.every(
					({ value }) =>
						!["parse", "default", "nullDefault", "pipe"].includes(value.form)
				)
			)
			for (let i = 0; i < aliases.length; i++) {
				const [a, b] = [l[names[i]], r[names[i]]]
				if (a.expression !== b.expression) {
					failures.push(
						`${seed} ${names[i]}: ${a.expression} || ${b.expression}`
					)
				}
				if (!a.equals(b) || !a.extends(b) || !b.extends(a))
					failures.push(`${seed} ${names[i]}: twins aren't related`)
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
					const data = () => {
						const r = random(seed * 1000 + i * 10 + variant)
						const generated = generateData(aliases, r)(i)
						return variant % 2 ? mutate(generated, r) : generated
					}
					const expected = allows(i, data())
					if (a.in.allows(data()) !== expected)
						failures.push(`${seed} ${names[i]}: in allows isn't ${expected}`)
					const out = wrapper({ w: data() })
					if (out instanceof ArkErrors === expected)
						failures.push(`${seed} ${names[i]}: wrapper got ${out}`)
				}
			}
		}
		attest(failures).equals([])
	})
})
