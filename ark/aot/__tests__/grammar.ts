import type { Traversal } from "@ark/schema"
import fc from "fast-check"

// arktype's grammar, data near each definition's boundary, and their source

export type Node =
	| { kind: "keyword"; name: Keyword }
	| { kind: "literal"; value: Defaultable | bigint }
	| { kind: "bound"; base: Bounded; comparator: Comparator; limit: number }
	| { kind: "divisor"; divisor: number }
	| { kind: "regex"; pattern: number }
	| { kind: "union"; l: Node; r: Node }
	| { kind: "intersection"; l: Node; r: ObjectNode }
	| { kind: "array"; element: Node }
	| { kind: "tuple"; elements: Node[]; optionals: Node[]; variadic?: Node }
	| ObjectNode
	| { kind: "morph"; node: Node; morph: keyof typeof morphs }
	| { kind: "narrow"; node: Node; predicate: keyof typeof predicates }
	| { kind: "described"; node: Node; description: string }
	| { kind: "keyof"; node: Node }
	| { kind: "alias"; name: string }

interface ObjectNode {
	kind: "object"
	props: Prop[]
	index?: Node
}

interface Prop {
	key: string
	optional: boolean
	node: Node
	default?: Defaultable | typeof emptyArray
}

type Keyword = keyof typeof keywordData

type Defaultable = string | number | boolean

type Bounded = "number" | "string" | "number[]"

type Comparator = "<" | "<=" | ">" | ">=" | "=="

export const noise = fc.constantFrom<unknown>(
	undefined,
	null,
	0,
	-0,
	1,
	Number.NaN,
	"",
	"a",
	true,
	1n,
	{},
	[],
	new Date(0)
)

const keywordData = {
	string: fc.string({ maxLength: 4 }),
	number: fc.oneof(fc.integer({ min: -3, max: 3 }), fc.double()),
	boolean: fc.boolean(),
	bigint: fc.bigInt({ min: -3n, max: 3n }),
	null: fc.constant(null),
	undefined: fc.constant(undefined),
	unknown: noise,
	object: fc.oneof(fc.object({ maxDepth: 1 }), fc.array(noise)),
	Date: fc.date(),
	"number.integer": fc.oneof(fc.integer(), fc.double()),
	"string.numeric.parse": fc.oneof(fc.integer().map(String), fc.string()),
	"string.trim": fc.constantFrom(" a ", "a", "", " "),
	"string.email": fc.constantFrom("a@b.co", "a@b", "@", ""),
	// a keyword's predicate, which a root reporting into ArkErrors can hold
	"string.url": fc.constantFrom("https://a.b", "a:", "a", "")
}

const keywords = Object.keys(keywordData) as Keyword[]

// a pattern with flags is a RegExp, as a string definition can't hold them
const patterns: [pattern: RegExp, strings: string[]][] = [
	[/^a+$/, ["a", "aa", "", "ab", "A"]],
	[/\d/, ["1", "a1", "", "a"]],
	[/^[a-z]*$/i, ["Ab", "a-b", "", "z"]]
]

// written for their source to be printed in a program
export const morphs = {
	double: data => (typeof data === "number" ? data * 2 : data),
	box: data => ({ data }),
	size: data => (Array.isArray(data) ? data.length : String(data).length),
	fail: (data, ctx) => ctx.error("something else")
} satisfies Record<string, (data: unknown, ctx: Traversal) => unknown>

// for pipe.try, throwing an Error or what they were passed
export const tried = {
	parse: data => JSON.parse(String(data)),
	refuse: data => {
		if (typeof data !== "number") throw data
		return -data
	}
} satisfies Record<string, (data: unknown) => unknown>

export const predicates = {
	isTruthy: data => !!data,
	isShort: data => String(data).length < 3,
	isPositive: (data, ctx) =>
		typeof data !== "number" || data > 0 || ctx.reject("positive"),
	isEven: data => {
		const remainder = Number(data) % 2
		return remainder === 0
	}
} satisfies Record<string, (data: unknown, ctx: Traversal) => boolean>

export const emptyArray: () => never[] = () => []

const literals: (Defaultable | bigint)[] = ["a", "", 0, -0, 1, -0.5, true, 5n]

const unitOf = (value: Defaultable | bigint | null | undefined): Node =>
	value === null || value === undefined ?
		{ kind: "keyword", name: value === null ? "null" : "undefined" }
	:	{ kind: "literal", value }

const unionOf = (nodes: Node[]): Node =>
	nodes.reduce((l, r) => ({ kind: "union", l, r }))

// two units, which arktype discriminates as it does three or more
const pairs = fc
	.uniqueArray(fc.constantFrom(...literals, null, undefined), {
		minLength: 2,
		maxLength: 2,
		comparator: "SameValue"
	})
	.map(values => unionOf(values.map(unitOf)))

const leafOf = (aliases: string[]): fc.Arbitrary<Node> =>
	fc.oneof(
		{
			weight: 4,
			arbitrary: fc
				.constantFrom(...keywords)
				.map(name => ({ kind: "keyword", name }) as const)
		},
		fc
			.constantFrom(...literals)
			.map(value => ({ kind: "literal", value }) as const),
		pairs,
		fc.record({
			kind: fc.constant("bound" as const),
			base: fc.constantFrom<Bounded>("number", "string", "number[]"),
			comparator: fc.constantFrom<Comparator>("<", "<=", ">", ">=", "=="),
			limit: fc.integer({ min: 0, max: 3 })
		}),
		fc.record({
			kind: fc.constant("divisor" as const),
			divisor: fc.integer({ min: 2, max: 4 })
		}),
		fc
			.nat(patterns.length - 1)
			.map(pattern => ({ kind: "regex", pattern }) as const),
		...aliases.map(name => fc.constant({ kind: "alias", name } as const))
	)

const defaultOf = (node: Node): Prop["default"] =>
	node.kind === "array" ? emptyArray
	: node.kind === "narrow" ? defaultOf(node.node)
	: node.kind === "literal" && typeof node.value !== "bigint" ? node.value
	: node.kind !== "keyword" ? undefined
	: node.name === "string" ? ""
	: node.name === "number" ? 0
	: node.name === "boolean" ? false
	: undefined

const discriminants: (Defaultable | bigint | null)[] = [
	"a",
	"b",
	"",
	0,
	1,
	true,
	5n,
	null
]

export const nodeOf = (aliases: string[]): fc.Arbitrary<Node> =>
	fc.letrec<{ node: Node; object: ObjectNode }>(tie => {
		const node = tie("node")
		const object = tie("object")
		return {
			node: fc.oneof(
				{ maxDepth: 3, depthIdentifier: "node" },
				{ weight: 3, arbitrary: leafOf(aliases) },
				{ weight: 2, arbitrary: object },
				fc.record({ kind: fc.constant("union" as const), l: node, r: node }),
				fc.record({
					kind: fc.constant("intersection" as const),
					// an alias intersected with an object can be a cycle reaching a default
					l: aliases.length ? fc.oneof(object, leafOf(aliases)) : object,
					r: object
				}),
				fc.record({ kind: fc.constant("array" as const), element: node }),
				fc.record(
					{
						kind: fc.constant("tuple" as const),
						elements: fc.array(node, { maxLength: 2 }),
						optionals: fc.array(node, { maxLength: 1 }),
						variadic: node
					},
					{ requiredKeys: ["kind", "elements", "optionals"] }
				),
				fc.record({
					kind: fc.constant("morph" as const),
					node,
					morph: fc.constantFrom(
						...(Object.keys(morphs) as (keyof typeof morphs)[])
					)
				}),
				fc.record({
					kind: fc.constant("described" as const),
					node,
					description: fc.constantFrom("a thing", "")
				}),
				fc.record({ kind: fc.constant("keyof" as const), node }),
				// objects discriminated by k, each case holding one or two of its values
				fc
					.record({
						cases: fc.array(fc.tuple(object, fc.boolean()), {
							minLength: 2,
							maxLength: 3
						}),
						values: fc.shuffledSubarray(discriminants, {
							minLength: 6,
							maxLength: 6
						})
					})
					.map(({ cases, values }) => {
						let i = 0
						return unionOf(
							cases.map(([object, isPair]): ObjectNode => {
								const held = values.slice(i, (i += isPair ? 2 : 1))
								return {
									...object,
									props: [
										{
											key: "k",
											optional: false,
											node: unionOf(held.map(unitOf))
										},
										...object.props
									]
								}
							})
						)
					}),
				fc.record({
					kind: fc.constant("narrow" as const),
					node,
					predicate: fc.constantFrom(
						...(Object.keys(predicates) as (keyof typeof predicates)[])
					)
				})
			),
			object: fc.record(
				{
					kind: fc.constant("object" as const),
					props: fc
						.uniqueArray(
							fc.record({
								key: fc.constantFrom("a", "b", "c"),
								optional: fc.boolean(),
								node,
								isDefaulted: fc.boolean()
							}),
							{ selector: prop => prop.key, maxLength: 3 }
						)
						.map(props =>
							props.map(({ isDefaulted, ...prop }): Prop => {
								const value = defaultOf(prop.node)
								return isDefaulted && value !== undefined ?
										{ ...prop, optional: false, default: value }
									:	prop
							})
						),
					index: node
				},
				{ requiredKeys: ["kind", "props"] }
			)
		}
	}).node

export const defOf = (node: Node): unknown => {
	switch (node.kind) {
		case "keyword":
			return node.name
		case "literal":
			return (
				typeof node.value === "string" ? `'${node.value}'`
				: typeof node.value === "bigint" ? `${node.value}n`
				: Object.is(node.value, -0) ? ["===", -0]
				: `${node.value}`
			)
		case "bound":
			return `${node.base} ${node.comparator} ${node.limit}`
		case "divisor":
			return `number % ${node.divisor}`
		case "regex": {
			const [pattern] = patterns[node.pattern]
			return pattern.flags ? pattern : `/${pattern.source}/`
		}
		case "union":
			return [defOf(node.l), "|", defOf(node.r)]
		case "intersection":
			return [defOf(node.l), "&", defOf(node.r)]
		case "array":
			return [defOf(node.element), "[]"]
		case "tuple":
			return [
				...node.elements.map(defOf),
				...node.optionals.map(optional => [defOf(optional), "?"]),
				...(node.variadic ? ["...", [defOf(node.variadic), "[]"]] : [])
			]
		case "object": {
			const def: Record<string, unknown> = {}
			for (const prop of node.props) {
				def[prop.optional ? `${prop.key}?` : prop.key] =
					prop.default === undefined ?
						defOf(prop.node)
					:	[defOf(prop.node), "=", prop.default]
			}
			if (node.index) def["[string]"] = defOf(node.index)
			return def
		}
		case "morph":
			return [defOf(node.node), "=>", morphs[node.morph]]
		case "narrow":
			return [defOf(node.node), ":", predicates[node.predicate]]
		case "described":
			return [defOf(node.node), "@", node.description]
		case "keyof":
			return ["keyof", defOf(node.node)]
		case "alias":
			return node.name
	}
}

// a function prints as its name, which a program declares
export const sourceOf = (value: unknown): string =>
	typeof value === "function" ? value.name
	: typeof value === "bigint" ? `${value}n`
	: typeof value === "number" ?
		Object.is(value, -0) ?
			"-0"
		:	String(value)
	: value === undefined ? "undefined"
	: value instanceof RegExp ? String(value)
	: value instanceof Date ? `new Date(${value.getTime()})`
	: Array.isArray(value) ? `[${value.map(sourceOf).join(", ")}]`
	: typeof value === "object" && value !== null ?
		`{ ${Object.entries(value)
			.map(
				([k, v]) =>
					// a literal __proto__ key would set the prototype
					`${k === "__proto__" ? `["__proto__"]` : JSON.stringify(k)}: ${sourceOf(v)}`
			)
			.join(", ")} }`
	:	JSON.stringify(value)

// near the boundary of what each node allows, and sometimes far from it
export const dataOf = (
	node: Node,
	dataOfAlias: (name: string) => fc.Arbitrary<unknown>
): fc.Arbitrary<unknown> => {
	const data = (node: Node): fc.Arbitrary<unknown> => {
		switch (node.kind) {
			case "keyword":
				return keywordData[node.name]
			case "literal":
				return fc.constant(node.value)
			case "bound": {
				const sizes = fc.integer({ min: 0, max: node.limit + 2 })
				return (
					node.base === "number" ?
						fc.oneof(
							sizes,
							sizes.map(n => n - 0.5)
						)
					: node.base === "string" ? sizes.map(n => "a".repeat(n))
					: sizes.map(n => Array.from({ length: n }, (_, i) => i))
				)
			}
			case "divisor":
				return fc.integer({ min: -2, max: 9 })
			case "regex":
				return fc.constantFrom(...patterns[node.pattern][1])
			case "union":
			case "intersection":
				return fc.oneof(data(node.l), data(node.r))
			case "array":
				return fc.array(data(node.element), { maxLength: 3 })
			case "tuple":
				return fc
					.tuple(
						fc.tuple(...node.elements.map(data)),
						fc.tuple(...node.optionals.map(data)),
						fc.array(node.variadic ? data(node.variadic) : noise, {
							maxLength: 2
						}),
						fc.integer({ min: -1, max: 1 })
					)
					.map(([elements, optionals, rest, lengthChange]) => {
						const items = [...elements, ...optionals, ...rest]
						return items.slice(0, Math.max(0, items.length + lengthChange))
					})
			case "object":
				return fc.record(
					{
						...Object.fromEntries(
							node.props.map(prop => [prop.key, data(prop.node)])
						),
						...(node.index && { d: data(node.index) })
					},
					{ requiredKeys: [] }
				)
			case "morph":
			case "narrow":
			case "described":
				return data(node.node)
			case "keyof":
				return fc.constantFrom("a", "b", "c", "d", 0, "length")
			case "alias":
				return dataOfAlias(node.name)
		}
	}
	return fc.oneof({ weight: 4, arbitrary: data(node) }, noise)
}
