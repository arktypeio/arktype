import { attest, contextualize } from "@ark/attest"
import { arkToArbitrary } from "@ark/fast-check"
import type { BaseRoot, Traversal } from "@ark/schema"
import { scope, type } from "arktype"
import fc from "fast-check"
import { compare, observeArktype } from "./differential.ts"

// checks the generated programs of the precompilation design (design/precompile.md §12): definitions
// generated from arktype's grammar, each precompiled and compared with arktype on data generated for it
// ARK_PRECOMPILE_FUZZ=<count>[:<seed>] checks that many programs from the seed

type Definition = Node | { aliases: Record<string, Node> }

type Node =
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

const noise = fc.constantFrom<unknown>(
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
	"string.email": fc.constantFrom("a@b.co", "a@b", "@", "")
}

const keywords = Object.keys(keywordData) as Keyword[]

// a pattern with flags is a RegExp, since a string definition can't hold them
const patterns: [pattern: RegExp, strings: string[]][] = [
	[/^a+$/, ["a", "aa", "", "ab", "A"]],
	[/\d/, ["1", "a1", "", "a"]],
	[/^[a-z]*$/i, ["Ab", "a-b", "", "z"]]
]

function double(data: unknown) {
	return typeof data === "number" ? data * 2 : data
}

function box(data: unknown) {
	return { data }
}

function size(data: unknown) {
	return Array.isArray(data) ? data.length : String(data).length
}

function fail(data: unknown, ctx: Traversal) {
	return ctx.error("something else")
}

const morphs = { double, box, size, fail }

function isTruthy(data: unknown) {
	return !!data
}

function isShort(data: unknown) {
	return String(data).length < 3
}

function isPositive(data: unknown, ctx: Traversal) {
	return typeof data !== "number" || data > 0 || ctx.reject("positive")
}

const predicates = { isTruthy, isShort, isPositive }

function emptyArray() {
	return []
}

const leafOf = (aliases: string[]): fc.Arbitrary<Node> =>
	fc.oneof(
		{
			weight: 4,
			arbitrary: fc
				.constantFrom(...keywords)
				.map(name => ({ kind: "keyword", name }) as const)
		},
		fc
			.constantFrom<Defaultable | bigint>("a", "", 0, -0, 1, -0.5, true, 5n)
			.map(value => ({ kind: "literal", value }) as const),
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
	: node.kind === "literal" && typeof node.value !== "bigint" ? node.value
	: node.kind !== "keyword" ? undefined
	: node.name === "string" ? ""
	: node.name === "number" ? 0
	: node.name === "boolean" ? false
	: undefined

const nodeOf = (aliases: string[]): fc.Arbitrary<Node> =>
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

const definitions: fc.Arbitrary<Definition> = fc.oneof(
	{ weight: 3, arbitrary: nodeOf([]) },
	fc
		.record({ a: nodeOf(["a", "b"]), b: nodeOf(["a", "b"]) })
		.map(aliases => ({ aliases }))
)

const defOf = (node: Node): unknown => {
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
		case "alias":
			return node.name
	}
}

const sourceOf = (def: unknown): string =>
	typeof def === "function" ? def.name
	: def instanceof RegExp ? String(def)
	: Object.is(def, -0) ? "-0"
	: Array.isArray(def) ? `[${def.map(sourceOf).join(", ")}]`
	: typeof def === "object" && def !== null ?
		`{ ${Object.entries(def)
			.map(([k, v]) => `${JSON.stringify(k)}: ${sourceOf(v)}`)
			.join(", ")} }`
	:	JSON.stringify(def)

// near the boundary of what each node allows, and sometimes far from it
const dataOf = (
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
			case "alias":
				return dataOfAlias(node.name)
		}
	}
	return fc.oneof({ weight: 4, arbitrary: data(node) }, noise)
}

// @ark/fast-check generates what a Type allows, except where it can't or where it doesn't bound a cycle's depth
const allowedDataOf = (T: BaseRoot): fc.Arbitrary<unknown> => {
	if (T.isCyclic) return noise
	try {
		return arkToArbitrary(T as never)
	} catch {
		return noise
	}
}

interface Program {
	source: string
	types: Record<string, BaseRoot>
	inputs: Record<string, fc.Arbitrary<unknown>>
}

const programOf = (definition: Definition): Program | undefined => {
	const nodes = "aliases" in definition ? definition.aliases : { T: definition }
	const defs = Object.fromEntries(
		Object.entries(nodes).map(([name, node]) => [name, defOf(node)])
	)
	let types: Record<string, BaseRoot>
	try {
		types =
			"aliases" in definition ?
				(scope(defs as never).export() as never)
			:	{ T: type(defs.T as never) as never }
		// a scope can throw for a definition once a Type it exports is described
		for (const T of Object.values(types)) void T.description
	} catch {
		return
	}
	// a cycle's data is generated to a bounded depth
	const dataByAlias = fc.letrec(tie =>
		Object.fromEntries(
			Object.entries(nodes).map(([name, node]) => [
				name,
				fc.oneof(
					{ maxDepth: 2, depthIdentifier: "alias" },
					noise,
					dataOf(node, tie)
				)
			])
		)
	)
	return {
		source:
			"aliases" in definition ?
				`scope(${sourceOf(defs)}).export()`
			:	`type(${sourceOf(defs.T)})`,
		types,
		inputs: Object.fromEntries(
			Object.entries(types).map(([name, T]) => [
				name,
				fc.oneof(dataByAlias[name], allowedDataOf(T))
			])
		)
	}
}

// a program prints as its source, and its inputs follow it by the name of the Type they're for
const programs = definitions.chain(definition => {
	const program = programOf(definition)
	if (!program) return fc.constant(undefined)
	return fc.tuple(
		fc.constant(
			Object.assign(program, { [fc.toStringMethod]: () => program.source })
		),
		fc.record(
			Object.fromEntries(
				Object.entries(program.inputs).map(([name, inputs]) => [
					name,
					fc.array(inputs, { minLength: 1, maxLength: 6 })
				])
			)
		)
	)
})

const [runs = 200, seed = 1] =
	process.env.ARK_PRECOMPILE_FUZZ?.split(":").map(Number) ?? []

contextualize(() => {
	it("agree with arktype", async () => {
		let precompiled = 0
		await fc.assert(
			fc.asyncProperty(programs, async generated => {
				if (!generated) return
				const [program, inputsByName] = generated
				for (const [name, T] of Object.entries(program.types)) {
					const inputs = inputsByName[name]
					const comparison = await compare(T, inputs, observeArktype(T, inputs))
					if (comparison.refusal === undefined) precompiled++
					attest(comparison.disagreements).equals([])
				}
			}),
			{ numRuns: runs, seed }
		)
		attest(precompiled > runs / 2).equals(true)
	}).timeout(runs * 1000)
})
