// each library's schema for a scenario accepts and returns the same values

import { numericStringMatcher } from "@ark/util"
import { deepStrictEqual, ok } from "node:assert/strict"
import { scope, type } from "arktype"
import * as v from "valibot"
import { z } from "zod"

const code = /^[A-Z]{3}-\d{4}$/

// https://github.com/moltar/typescript-runtime-type-benchmarks
export const moltarData = Object.freeze({
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString: "Lorem ipsum dolor sit amet, ".repeat(40),
	boolean: true,
	deeplyNested: Object.freeze({ foo: "bar", num: 1, bool: false })
})

export const moltarExtraKeysData = {
	...moltarData,
	extra: "x",
	deeplyNested: { ...moltarData.deeplyNested, extra: "y" }
}

export const moltarInvalidData = {
	...moltarData,
	deeplyNested: { ...moltarData.deeplyNested, bool: "false" }
}

// a factory's bound is part of its schema, so a new bound defeats arktype's cache
export const moltar = {
	arktype: (numMax: number) =>
		type({
			number: "number",
			negNumber: "number",
			maxNumber: "number",
			string: "string",
			longString: "string",
			boolean: "boolean",
			deeplyNested: {
				foo: "string",
				num: type.number.atMost(numMax),
				bool: "boolean"
			}
		}),
	zod: (numMax: number) =>
		z.object({
			number: z.number(),
			negNumber: z.number(),
			maxNumber: z.number(),
			string: z.string(),
			longString: z.string(),
			boolean: z.boolean(),
			deeplyNested: z.object({
				foo: z.string(),
				num: z.number().max(numMax),
				bool: z.boolean()
			})
		}),
	valibot: (numMax: number) =>
		v.object({
			number: v.number(),
			negNumber: v.number(),
			maxNumber: v.number(),
			string: v.string(),
			longString: v.string(),
			boolean: v.boolean(),
			deeplyNested: v.object({
				foo: v.string(),
				num: v.pipe(v.number(), v.maxValue(numMax)),
				bool: v.boolean()
			})
		})
}

export const Moltar = {
	arktype: moltar.arktype(Number.MAX_VALUE),
	zod: moltar.zod(Number.MAX_VALUE),
	valibot: moltar.valibot(Number.MAX_VALUE)
}

export const MoltarStrict = {
	arktype: Moltar.arktype.onDeepUndeclaredKey("reject"),
	zod: z.strictObject({
		...Moltar.zod.shape,
		deeplyNested: z.strictObject(Moltar.zod.shape.deeplyNested.shape)
	}),
	valibot: v.strictObject({
		...Moltar.valibot.entries,
		deeplyNested: v.strictObject(Moltar.valibot.entries.deeplyNested.entries)
	})
}

export const MoltarStrip = {
	arktype: Moltar.arktype.onDeepUndeclaredKey("delete"),
	zod: Moltar.zod,
	valibot: Moltar.valibot
}

// https://github.com/open-circle/schema-benchmarks (schemas/src/data.ts)
const created = new Date(0)

const image = (id: number, title: string) => ({
	id,
	created,
	title,
	type: "jpg",
	size: 92357232,
	url: `https://www.example.com/images/${id}`
})

export const productData = {
	id: 252,
	created,
	title: "Apple",
	brand: "Sunny Backyard",
	description: "Red apple from Lake Constance",
	price: 89,
	discount: null,
	quantity: 5,
	tags: ["fruit", "red", "round", "sweet", "juicy", "healthy"],
	images: [
		image(248, "Close up of an apple on a tree"),
		image(295, "Our apples in the final packaging"),
		image(723, "Our fruit fields at Lake Constance")
	],
	ratings: [
		{
			id: 315,
			stars: 4.5,
			title: "Tastes super delicious",
			text: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit.",
			images: [image(835, "The result of our apple pie")]
		},
		{
			id: 642,
			stars: 5,
			title: "Very tasty! I will buy them again!",
			text: "In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo.",
			images: [
				image(352, "The fruit salad in a bowl"),
				image(465, "The fruit salad on a plate")
			]
		}
	]
}

export const productInvalidData = {
	...productData,
	title: "",
	price: 0,
	quantity: 1000,
	tags: ["fruit", null, "round", undefined, "juicy", "healthy"],
	images: [
		{
			created: null,
			title: "Close up of an apple on a tree",
			type: "mp4",
			size: 92357232,
			url: "https://www.example.com/images/248"
		},
		{
			id: 295,
			created,
			title: "Our apples in the final packaging",
			type: "jpg",
			size: 83247232
		},
		productData.images[2]
	],
	ratings: [
		{
			...productData.ratings[0],
			title:
				"Lorem ipsum dolor sit amet, consectetuer adipiscing elit. ".repeat(2)
		},
		{
			...productData.ratings[1],
			images: [
				{ ...image(352, "x"), id: "abc", created: undefined, url: "invalid" },
				{ id: 465, created, url: "https://www.example.com/images/465" }
			]
		}
	]
}

export const product = {
	arktype: (sizeMax: number) => {
		const Image = type({
			id: "number",
			created: "Date",
			title: "1 <= string <= 100",
			type: "'jpg' | 'png'",
			size: type.number.atMost(sizeMax),
			url: "string.url"
		})
		const Rating = type({
			id: "number",
			stars: "1 <= number <= 5",
			title: "1 <= string <= 100",
			text: "1 <= string <= 1000",
			images: Image.array()
		})
		return type({
			id: "number",
			created: "Date",
			title: "1 <= string <= 100",
			brand: "1 <= string <= 30",
			description: "1 <= string <= 500",
			price: "1 <= number <= 10000",
			discount: "1 <= number <= 100 | null",
			quantity: "0 <= number <= 10",
			tags: "(1 <= string <= 30)[]",
			images: Image.array(),
			ratings: Rating.array()
		})
	},
	zod: (sizeMax: number) => {
		const Image = z.object({
			id: z.number(),
			created: z.date(),
			title: z.string().min(1).max(100),
			type: z.enum(["jpg", "png"]),
			size: z.number().max(sizeMax),
			url: z.url()
		})
		const Rating = z.object({
			id: z.number(),
			stars: z.number().min(1).max(5),
			title: z.string().min(1).max(100),
			text: z.string().min(1).max(1000),
			images: z.array(Image)
		})
		return z.object({
			id: z.number(),
			created: z.date(),
			title: z.string().min(1).max(100),
			brand: z.string().min(1).max(30),
			description: z.string().min(1).max(500),
			price: z.number().min(1).max(10000),
			discount: z.number().min(1).max(100).nullable(),
			quantity: z.number().min(0).max(10),
			tags: z.array(z.string().min(1).max(30)),
			images: z.array(Image),
			ratings: z.array(Rating)
		})
	},
	valibot: (sizeMax: number) => {
		const Image = v.object({
			id: v.number(),
			created: v.date(),
			title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
			type: v.picklist(["jpg", "png"]),
			size: v.pipe(v.number(), v.maxValue(sizeMax)),
			url: v.pipe(v.string(), v.url())
		})
		const Rating = v.object({
			id: v.number(),
			stars: v.pipe(v.number(), v.minValue(1), v.maxValue(5)),
			title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
			text: v.pipe(v.string(), v.minLength(1), v.maxLength(1000)),
			images: v.array(Image)
		})
		return v.object({
			id: v.number(),
			created: v.date(),
			title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
			brand: v.pipe(v.string(), v.minLength(1), v.maxLength(30)),
			description: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
			price: v.pipe(v.number(), v.minValue(1), v.maxValue(10000)),
			discount: v.nullable(v.pipe(v.number(), v.minValue(1), v.maxValue(100))),
			quantity: v.pipe(v.number(), v.minValue(0), v.maxValue(10)),
			tags: v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(30))),
			images: v.array(Image),
			ratings: v.array(Rating)
		})
	}
}

export const Product = {
	arktype: product.arktype(Number.MAX_VALUE),
	zod: product.zod(Number.MAX_VALUE),
	valibot: product.valibot(Number.MAX_VALUE)
}

export const itemsData = Array.from({ length: 100 }, (_, i) => ({
	id: i,
	name: `item${i}`,
	active: i % 2 === 0
}))

export const Items = {
	arktype: type({ id: "number", name: "string", active: "boolean" }).array(),
	zod: z.array(
		z.object({ id: z.number(), name: z.string(), active: z.boolean() })
	),
	valibot: v.array(
		v.object({ id: v.number(), name: v.string(), active: v.boolean() })
	)
}

export const itemsInvalidData = itemsData.map((item, i) =>
	i === 50 ? { ...item, active: "no" } : item
)

export const stringsInvalidData = Array.from({ length: 1000 }, (_, i) =>
	i === 500 ? 5 : `s${i}`
)

export const Strings = {
	arktype: type("string[]"),
	zod: z.array(z.string()),
	valibot: v.array(v.string())
}

const ab = /^[ab]+$/

// the last string fails the pattern only at its end
export const patternsInvalidData = ["ab", "ba", `${"ab".repeat(5000)}c`]

export const Patterns = {
	arktype: type(ab).array(),
	zod: z.array(z.string().regex(ab)),
	valibot: v.array(v.pipe(v.string(), v.regex(ab)))
}

export const unionItemsInvalidData = Array.from({ length: 10 }, (_, i) =>
	i === 5 ? { v: { a: 1 }, w: "x" } : { v: { a: "x" }, w: "y" }
)

export const UnionItems = {
	arktype: type({
		v: type({ a: "string" }).or({ b: "number" }),
		w: "string"
	}).array(),
	zod: z.array(
		z.object({
			v: z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]),
			w: z.string()
		})
	),
	valibot: v.array(
		v.object({
			v: v.union([v.object({ a: v.string() }), v.object({ b: v.number() })]),
			w: v.string()
		})
	)
}

export const discriminatedData = [
	{ kind: "a", a: "x" },
	{ kind: "b", b: 1 },
	{ kind: "c", c: true },
	{ kind: "d", d: ["x"] }
] as const

export const Discriminated = {
	arktype: type({ kind: "'a'", a: "string" })
		.or({ kind: "'b'", b: "number" })
		.or({ kind: "'c'", c: "boolean" })
		.or({ kind: "'d'", d: "string[]" }),
	zod: z.discriminatedUnion("kind", [
		z.object({ kind: z.literal("a"), a: z.string() }),
		z.object({ kind: z.literal("b"), b: z.number() }),
		z.object({ kind: z.literal("c"), c: z.boolean() }),
		z.object({ kind: z.literal("d"), d: z.array(z.string()) })
	]),
	valibot: v.variant("kind", [
		v.object({ kind: v.literal("a"), a: v.string() }),
		v.object({ kind: v.literal("b"), b: v.number() }),
		v.object({ kind: v.literal("c"), c: v.boolean() }),
		v.object({ kind: v.literal("d"), d: v.array(v.string()) })
	])
}

export const unionData = [{ a: "x" }, { b: 1 }, { c: true }, { d: ["x"] }]

export const Union = {
	arktype: type({ a: "string" })
		.or({ b: "number" })
		.or({ c: "boolean" })
		.or({ d: "string[]" }),
	zod: z.union([
		z.object({ a: z.string() }),
		z.object({ b: z.number() }),
		z.object({ c: z.boolean() }),
		z.object({ d: z.array(z.string()) })
	]),
	valibot: v.union([
		v.object({ a: v.string() }),
		v.object({ b: v.number() }),
		v.object({ c: v.boolean() }),
		v.object({ d: v.array(v.string()) })
	])
}

export const constraintsData = {
	name: "Ada Lovelace",
	email: "ada@example.com",
	age: 36,
	ratio: 0.5,
	code: "ABC-1234"
}

// each library's own email format: the regexes differ
export const Constraints = {
	arktype: type({
		name: "1 <= string <= 50",
		email: "string.email",
		age: "0 <= number.integer < 150",
		ratio: "0 < number <= 1",
		code
	}),
	zod: z.object({
		name: z.string().min(1).max(50),
		email: z.email(),
		age: z.number().int().min(0).lt(150),
		ratio: z.number().gt(0).max(1),
		code: z.string().regex(code)
	}),
	valibot: v.object({
		name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
		email: v.pipe(v.string(), v.email()),
		age: v.pipe(v.number(), v.integer(), v.minValue(0), v.ltValue(150)),
		ratio: v.pipe(v.number(), v.gtValue(0), v.maxValue(1)),
		code: v.pipe(v.string(), v.regex(code))
	})
}

export const indexData = { a: "x", b: 1, c: "y", d: 2, e: "z" }

export const Index = {
	arktype: type({ a: "string", "[string]": "string | number" }),
	zod: z.object({ a: z.string() }).catchall(z.union([z.string(), z.number()])),
	valibot: v.objectWithRest(
		{ a: v.string() },
		v.union([v.string(), v.number()])
	)
}

export const datedData = { d: created, n: 1 }

// zod's and valibot's dates also reject an invalid Date
export const Dated = {
	arktype: type({ d: "Date", n: "number" }),
	zod: z.object({ d: z.date(), n: z.number() }),
	valibot: v.object({ d: v.date(), n: v.number() })
}

export const morphData = "12345"

export const Morph = {
	arktype: type("string.numeric.parse"),
	zod: z.string().regex(numericStringMatcher).transform(Number),
	valibot: v.pipe(
		v.string(),
		v.regex(numericStringMatcher),
		v.transform(Number)
	)
}

export const objectMorphData = {
	a: " x ",
	b: { c: [1, 2, 3], d: "y" },
	e: true
}

export const ObjectMorph = {
	arktype: type({
		a: "string.trim",
		b: { c: "number[]", d: "string" },
		e: "boolean"
	}),
	zod: z.object({
		a: z.string().trim(),
		b: z.object({ c: z.array(z.number()), d: z.string() }),
		e: z.boolean()
	}),
	valibot: v.object({
		a: v.pipe(v.string(), v.trim()),
		b: v.object({ c: v.array(v.number()), d: v.string() }),
		e: v.boolean()
	})
}

export const defaultsData = { a: "s", c: true }

export const Defaults = {
	arktype: type({
		a: "string",
		b: "number = 5",
		"c?": "boolean",
		d: "string = 'x'",
		"e?": "number"
	}),
	zod: z.object({
		a: z.string(),
		b: z.number().default(5),
		c: z.boolean().optional(),
		d: z.string().default("x"),
		e: z.number().optional()
	}),
	valibot: v.object({
		a: v.string(),
		b: v.optional(v.number(), 5),
		c: v.optional(v.boolean()),
		d: v.optional(v.string(), "x"),
		e: v.optional(v.number())
	})
}

export const nestedDefaultsData = {
	id: "x",
	inner: { a: "y" },
	flags: { x: true, y: false, z: true }
}

export const NestedDefaults = {
	arktype: type({
		id: "string",
		inner: { a: "string", b: "number = 5" },
		flags: { x: "boolean", y: "boolean", z: "boolean" }
	}),
	zod: z.object({
		id: z.string(),
		inner: z.object({ a: z.string(), b: z.number().default(5) }),
		flags: z.object({ x: z.boolean(), y: z.boolean(), z: z.boolean() })
	}),
	valibot: v.object({
		id: v.string(),
		inner: v.object({ a: v.string(), b: v.optional(v.number(), 5) }),
		flags: v.object({ x: v.boolean(), y: v.boolean(), z: v.boolean() })
	})
}

type TreeNode = { id: number; children: TreeNode[] }

const tree = (depth: number, id = 0): TreeNode => ({
	id,
	children:
		depth ?
			Array.from({ length: 3 }, (_, i) => tree(depth - 1, id * 3 + i + 1))
		:	[]
})

export const treeData = tree(3)

const zodNode: z.ZodType<TreeNode> = z.object({
	id: z.number(),
	get children() {
		return z.array(zodNode)
	}
})

const valibotNode: v.GenericSchema<TreeNode> = v.object({
	id: v.number(),
	children: v.array(v.lazy(() => valibotNode))
})

export const Tree = {
	arktype: scope({ node: { id: "number", children: "node[]" } }).export().node,
	zod: zodNode,
	valibot: valibotNode
}

export const stringData = "foo"

export const Str = {
	arktype: type.string,
	zod: z.string(),
	valibot: v.string()
}

type Schemas = {
	arktype: { (data: unknown): unknown; allows(data: unknown): boolean }
	zod: z.ZodType
	valibot: v.GenericSchema
}

const results = (schemas: Schemas, data: unknown) => {
	const arktypeOut = schemas.arktype(data)
	const zodResult = schemas.zod.safeParse(data)
	const valibotResult = v.safeParse(schemas.valibot, data)
	return {
		allows: [
			schemas.arktype.allows(data),
			zodResult.success,
			v.is(schemas.valibot, data)
		],
		out: [
			arktypeOut instanceof type.errors ? undefined : arktypeOut,
			zodResult.data,
			valibotResult.success ? valibotResult.output : undefined
		],
		issues: [
			arktypeOut instanceof type.errors ? arktypeOut.count : 0,
			zodResult.error?.issues.length ?? 0,
			valibotResult.issues?.length ?? 0
		]
	}
}

const accepts = (
	name: string,
	schemas: Schemas,
	data: unknown,
	expected: unknown = data
) => {
	const before = structuredClone(data)
	const { allows, out } = results(schemas, data)
	deepStrictEqual(allows, [true, true, true], `${name} allows`)
	for (const o of out) deepStrictEqual(o, expected, `${name} output`)
	deepStrictEqual(data, before, `${name} mutated its input`)
}

const rejects = (name: string, schemas: Schemas, data: unknown) => {
	const { allows, issues } = results(schemas, data)
	deepStrictEqual(allows, [false, false, false], `${name} allows`)
	ok(issues[0] > 0, `${name} issues`)
	// abortEarly is off, so every library reports every issue
	deepStrictEqual(issues, [issues[0], issues[0], issues[0]], `${name} issues`)
}

export const check = (): void => {
	accepts("moltar", Moltar, moltarData)
	accepts("moltar strict", MoltarStrict, moltarData)
	rejects("moltar strict invalid", MoltarStrict, moltarExtraKeysData)
	accepts("moltar strip", MoltarStrip, moltarExtraKeysData, moltarData)
	rejects("moltar invalid", Moltar, moltarInvalidData)
	accepts("product", Product, productData)
	rejects("product invalid", Product, productInvalidData)
	accepts("items", Items, itemsData)
	rejects("items invalid", Items, itemsInvalidData)
	rejects("strings invalid", Strings, stringsInvalidData)
	rejects("patterns invalid", Patterns, patternsInvalidData)
	rejects("union items invalid", UnionItems, unionItemsInvalidData)
	for (const d of discriminatedData) accepts("discriminated", Discriminated, d)
	for (const d of unionData) accepts("union", Union, d)
	accepts("constraints", Constraints, constraintsData)
	accepts("index", Index, indexData)
	accepts("dated", Dated, datedData)
	accepts("morph", Morph, morphData, 12345)
	accepts("object morph", ObjectMorph, objectMorphData, {
		...objectMorphData,
		a: "x"
	})
	accepts("defaults", Defaults, defaultsData, { a: "s", b: 5, c: true, d: "x" })
	accepts("nested defaults", NestedDefaults, nestedDefaultsData, {
		...nestedDefaultsData,
		inner: { a: "y", b: 5 }
	})
	accepts("tree", Tree, treeData)
	accepts("string", Str, stringData)
}
