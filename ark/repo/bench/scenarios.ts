import { numericStringMatcher } from "@ark/util"
import { scope, type, type Type } from "arktype"
import TypeBox from "typebox"
import { Compile, type Validator } from "typebox/compile"
import * as v from "valibot"
import { z } from "zod"
import * as zm from "zod/mini"

// https://github.com/moltar/typescript-runtime-type-benchmarks
export const moltarData = Object.freeze({
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
	boolean: true,
	deeplyNested: { foo: "bar", num: 1, bool: false }
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

// a new bound makes a new schema, which arktype can't return from its cache
export const moltar = {
	arktype: (numMax?: number) =>
		type({
			number: "number",
			negNumber: "number",
			maxNumber: "number",
			string: "string",
			longString: "string",
			boolean: "boolean",
			deeplyNested: {
				foo: "string",
				num: numMax === undefined ? type.number : type.number.atMost(numMax),
				bool: "boolean"
			}
		}),
	zod: (numMax?: number) =>
		z.object({
			number: z.number(),
			negNumber: z.number(),
			maxNumber: z.number(),
			string: z.string(),
			longString: z.string(),
			boolean: z.boolean(),
			deeplyNested: z.object({
				foo: z.string(),
				num: numMax === undefined ? z.number() : z.number().max(numMax),
				bool: z.boolean()
			})
		}),
	valibot: (numMax?: number) =>
		v.object({
			number: v.number(),
			negNumber: v.number(),
			maxNumber: v.number(),
			string: v.string(),
			longString: v.string(),
			boolean: v.boolean(),
			deeplyNested: v.object({
				foo: v.string(),
				num:
					numMax === undefined ?
						v.number()
					:	v.pipe(v.number(), v.maxValue(numMax)),
				bool: v.boolean()
			})
		})
}

const moltarZodMini = {
	number: zm.number(),
	negNumber: zm.number(),
	maxNumber: zm.number(),
	string: zm.string(),
	longString: zm.string(),
	boolean: zm.boolean()
}

const moltarDeeplyNestedZodMini = {
	foo: zm.string(),
	num: zm.number(),
	bool: zm.boolean()
}

// strict objects reject undeclared keys
const moltarTypeBox = (strict: boolean) =>
	TypeBox.Object(
		{
			number: TypeBox.Number(),
			negNumber: TypeBox.Number(),
			maxNumber: TypeBox.Number(),
			string: TypeBox.String(),
			longString: TypeBox.String(),
			boolean: TypeBox.Boolean(),
			deeplyNested: TypeBox.Object(
				{
					foo: TypeBox.String(),
					num: TypeBox.Number(),
					bool: TypeBox.Boolean()
				},
				strict ? { additionalProperties: false } : {}
			)
		},
		strict ? { additionalProperties: false } : {}
	)

const moltarAjv = (strict: boolean) => ({
	type: "object",
	properties: {
		number: { type: "number" },
		negNumber: { type: "number" },
		maxNumber: { type: "number" },
		string: { type: "string" },
		longString: { type: "string" },
		boolean: { type: "boolean" },
		deeplyNested: {
			type: "object",
			properties: {
				foo: { type: "string" },
				num: { type: "number" },
				bool: { type: "boolean" }
			},
			required: ["foo", "num", "bool"],
			...(strict && { additionalProperties: false })
		}
	},
	required: Object.keys(moltarData),
	...(strict && { additionalProperties: false })
})

export const Moltar = {
	arktype: moltar.arktype(),
	zod: moltar.zod(),
	valibot: moltar.valibot(),
	zodMini: zm.object({
		...moltarZodMini,
		deeplyNested: zm.object(moltarDeeplyNestedZodMini)
	}),
	typebox: Compile(moltarTypeBox(false)),
	ajv: moltarAjv(false)
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
	}),
	zodMini: zm.strictObject({
		...moltarZodMini,
		deeplyNested: zm.strictObject(moltarDeeplyNestedZodMini)
	}),
	typebox: Compile(moltarTypeBox(true)),
	ajv: moltarAjv(true)
}

// ajv strips with removeAdditional and TypeBox with Clean
export const MoltarStrip = {
	arktype: Moltar.arktype.onDeepUndeclaredKey("delete"),
	zod: Moltar.zod,
	valibot: Moltar.valibot,
	zodMini: Moltar.zodMini,
	typebox: Moltar.typebox,
	ajv: Moltar.ajv
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

export const productExtraKeysData = {
	...productData,
	extra: "x",
	images: [
		{ ...productData.images[0], extra: "y" },
		...productData.images.slice(1)
	],
	ratings: [productData.ratings[0], { ...productData.ratings[1], extra: "z" }]
}

const ajvDate = { instanceof: "Date" }

const typeBoxDate = TypeBox.Refine(
	TypeBox.Unknown(),
	value => value instanceof Date
)

const Image = {
	arktype: type({
		id: "number",
		created: "Date",
		title: "1 <= string <= 100",
		type: "'jpg' | 'png'",
		size: "number",
		url: "string.url"
	}),
	zod: z.object({
		id: z.number(),
		created: z.date(),
		title: z.string().min(1).max(100),
		type: z.enum(["jpg", "png"]),
		size: z.number(),
		url: z.url()
	}),
	valibot: v.object({
		id: v.number(),
		created: v.date(),
		title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
		type: v.picklist(["jpg", "png"]),
		size: v.number(),
		url: v.pipe(v.string(), v.url())
	}),
	zodMini: zm.object({
		id: zm.number(),
		created: zm.date(),
		title: zm.string().check(zm.minLength(1), zm.maxLength(100)),
		type: zm.enum(["jpg", "png"]),
		size: zm.number(),
		url: zm.url()
	}),
	typebox: TypeBox.Object({
		id: TypeBox.Number(),
		created: typeBoxDate,
		title: TypeBox.String({ minLength: 1, maxLength: 100 }),
		type: TypeBox.Enum(["jpg", "png"]),
		size: TypeBox.Number(),
		url: TypeBox.String({ format: "url" })
	}),
	ajv: {
		type: "object",
		properties: {
			id: { type: "number" },
			created: ajvDate,
			title: { type: "string", minLength: 1, maxLength: 100 },
			type: { enum: ["jpg", "png"] },
			size: { type: "number" },
			url: { type: "string", format: "uri" }
		},
		required: ["id", "created", "title", "type", "size", "url"]
	}
}

const Rating = {
	arktype: type({
		id: "number",
		stars: "1 <= number <= 5",
		title: "1 <= string <= 100",
		text: "1 <= string <= 1000",
		images: Image.arktype.array()
	}),
	zod: z.object({
		id: z.number(),
		stars: z.number().min(1).max(5),
		title: z.string().min(1).max(100),
		text: z.string().min(1).max(1000),
		images: z.array(Image.zod)
	}),
	valibot: v.object({
		id: v.number(),
		stars: v.pipe(v.number(), v.minValue(1), v.maxValue(5)),
		title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
		text: v.pipe(v.string(), v.minLength(1), v.maxLength(1000)),
		images: v.array(Image.valibot)
	}),
	zodMini: zm.object({
		id: zm.number(),
		stars: zm.number().check(zm.minimum(1), zm.maximum(5)),
		title: zm.string().check(zm.minLength(1), zm.maxLength(100)),
		text: zm.string().check(zm.minLength(1), zm.maxLength(1000)),
		images: zm.array(Image.zodMini)
	}),
	typebox: TypeBox.Object({
		id: TypeBox.Number(),
		stars: TypeBox.Number({ minimum: 1, maximum: 5 }),
		title: TypeBox.String({ minLength: 1, maxLength: 100 }),
		text: TypeBox.String({ minLength: 1, maxLength: 1000 }),
		images: TypeBox.Array(Image.typebox)
	}),
	ajv: {
		type: "object",
		properties: {
			id: { type: "number" },
			stars: { type: "number", minimum: 1, maximum: 5 },
			title: { type: "string", minLength: 1, maxLength: 100 },
			text: { type: "string", minLength: 1, maxLength: 1000 },
			images: { type: "array", items: Image.ajv }
		},
		required: ["id", "stars", "title", "text", "images"]
	}
}

export const Product = {
	arktype: type({
		id: "number",
		created: "Date",
		title: "1 <= string <= 100",
		brand: "1 <= string <= 30",
		description: "1 <= string <= 500",
		price: "1 <= number <= 10000",
		discount: "1 <= number <= 100 | null",
		quantity: "0 <= number <= 10",
		tags: "(1 <= string <= 30)[]",
		images: Image.arktype.array(),
		ratings: Rating.arktype.array()
	}),
	zod: z.object({
		id: z.number(),
		created: z.date(),
		title: z.string().min(1).max(100),
		brand: z.string().min(1).max(30),
		description: z.string().min(1).max(500),
		price: z.number().min(1).max(10000),
		discount: z.number().min(1).max(100).nullable(),
		quantity: z.number().min(0).max(10),
		tags: z.array(z.string().min(1).max(30)),
		images: z.array(Image.zod),
		ratings: z.array(Rating.zod)
	}),
	valibot: v.object({
		id: v.number(),
		created: v.date(),
		title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
		brand: v.pipe(v.string(), v.minLength(1), v.maxLength(30)),
		description: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
		price: v.pipe(v.number(), v.minValue(1), v.maxValue(10000)),
		discount: v.nullable(v.pipe(v.number(), v.minValue(1), v.maxValue(100))),
		quantity: v.pipe(v.number(), v.minValue(0), v.maxValue(10)),
		tags: v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(30))),
		images: v.array(Image.valibot),
		ratings: v.array(Rating.valibot)
	}),
	zodMini: zm.object({
		id: zm.number(),
		created: zm.date(),
		title: zm.string().check(zm.minLength(1), zm.maxLength(100)),
		brand: zm.string().check(zm.minLength(1), zm.maxLength(30)),
		description: zm.string().check(zm.minLength(1), zm.maxLength(500)),
		price: zm.number().check(zm.minimum(1), zm.maximum(10000)),
		discount: zm.nullable(zm.number().check(zm.minimum(1), zm.maximum(100))),
		quantity: zm.number().check(zm.minimum(0), zm.maximum(10)),
		tags: zm.array(zm.string().check(zm.minLength(1), zm.maxLength(30))),
		images: zm.array(Image.zodMini),
		ratings: zm.array(Rating.zodMini)
	}),
	typebox: Compile(
		TypeBox.Object({
			id: TypeBox.Number(),
			created: typeBoxDate,
			title: TypeBox.String({ minLength: 1, maxLength: 100 }),
			brand: TypeBox.String({ minLength: 1, maxLength: 30 }),
			description: TypeBox.String({ minLength: 1, maxLength: 500 }),
			price: TypeBox.Number({ minimum: 1, maximum: 10000 }),
			discount: TypeBox.Union([
				TypeBox.Number({ minimum: 1, maximum: 100 }),
				TypeBox.Null()
			]),
			quantity: TypeBox.Number({ minimum: 0, maximum: 10 }),
			tags: TypeBox.Array(TypeBox.String({ minLength: 1, maxLength: 30 })),
			images: TypeBox.Array(Image.typebox),
			ratings: TypeBox.Array(Rating.typebox)
		})
	),
	ajv: {
		type: "object",
		properties: {
			id: { type: "number" },
			created: ajvDate,
			title: { type: "string", minLength: 1, maxLength: 100 },
			brand: { type: "string", minLength: 1, maxLength: 30 },
			description: { type: "string", minLength: 1, maxLength: 500 },
			price: { type: "number", minimum: 1, maximum: 10000 },
			discount: {
				anyOf: [{ type: "number", minimum: 1, maximum: 100 }, { type: "null" }]
			},
			quantity: { type: "number", minimum: 0, maximum: 10 },
			tags: {
				type: "array",
				items: { type: "string", minLength: 1, maxLength: 30 }
			},
			images: { type: "array", items: Image.ajv },
			ratings: { type: "array", items: Rating.ajv }
		},
		required: Object.keys(productData)
	}
}

export const ProductStrip = {
	...Product,
	arktype: Product.arktype.onDeepUndeclaredKey("delete")
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
	),
	zodMini: zm.array(
		zm.object({ id: zm.number(), name: zm.string(), active: zm.boolean() })
	),
	typebox: Compile(
		TypeBox.Array(
			TypeBox.Object({
				id: TypeBox.Number(),
				name: TypeBox.String(),
				active: TypeBox.Boolean()
			})
		)
	),
	ajv: {
		type: "array",
		items: {
			type: "object",
			properties: {
				id: { type: "number" },
				name: { type: "string" },
				active: { type: "boolean" }
			},
			required: ["id", "name", "active"]
		}
	}
}

export const itemsInvalidData = itemsData.map((item, i) =>
	i === 50 ? { ...item, active: "no" } : item
)

const abPattern = /^[ab]+$/

// the last string fails the pattern only at its end
export const patternsInvalidData = ["ab", "ba", `${"ab".repeat(5000)}c`]

export const Patterns = {
	arktype: type(abPattern).array(),
	zod: z.array(z.string().regex(abPattern)),
	valibot: v.array(v.pipe(v.string(), v.regex(abPattern))),
	zodMini: zm.array(zm.string().check(zm.regex(abPattern))),
	typebox: Compile(
		TypeBox.Array(TypeBox.String({ pattern: abPattern.source }))
	),
	ajv: { type: "array", items: { type: "string", pattern: abPattern.source } }
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
	]),
	zodMini: zm.discriminatedUnion("kind", [
		zm.object({ kind: zm.literal("a"), a: zm.string() }),
		zm.object({ kind: zm.literal("b"), b: zm.number() }),
		zm.object({ kind: zm.literal("c"), c: zm.boolean() }),
		zm.object({ kind: zm.literal("d"), d: zm.array(zm.string()) })
	]),
	typebox: Compile(
		TypeBox.Union([
			TypeBox.Object({ kind: TypeBox.Literal("a"), a: TypeBox.String() }),
			TypeBox.Object({ kind: TypeBox.Literal("b"), b: TypeBox.Number() }),
			TypeBox.Object({ kind: TypeBox.Literal("c"), c: TypeBox.Boolean() }),
			TypeBox.Object({
				kind: TypeBox.Literal("d"),
				d: TypeBox.Array(TypeBox.String())
			})
		])
	),
	ajv: {
		type: "object",
		discriminator: { propertyName: "kind" },
		required: ["kind"],
		oneOf: [
			{
				properties: { kind: { const: "a" }, a: { type: "string" } },
				required: ["a"]
			},
			{
				properties: { kind: { const: "b" }, b: { type: "number" } },
				required: ["b"]
			},
			{
				properties: { kind: { const: "c" }, c: { type: "boolean" } },
				required: ["c"]
			},
			{
				properties: {
					kind: { const: "d" },
					d: { type: "array", items: { type: "string" } }
				},
				required: ["d"]
			}
		]
	}
}

export const rotatingData = [
	"s",
	"t",
	{ a: "x" },
	1,
	{ b: 1 },
	["u"],
	{ d: 1 },
	1
]

export const Rotating = [
	{
		arktype: type("string"),
		zod: z.string(),
		valibot: v.string(),
		zodMini: zm.string(),
		typebox: Compile(TypeBox.String()),
		ajv: { type: "string" }
	},
	{
		arktype: type("string > 0"),
		zod: z.string().min(1),
		valibot: v.pipe(v.string(), v.minLength(1)),
		zodMini: zm.string().check(zm.minLength(1)),
		typebox: Compile(TypeBox.String({ minLength: 1 })),
		ajv: { type: "string", minLength: 1 }
	},
	{
		arktype: type({ a: "string" }),
		zod: z.object({ a: z.string() }),
		valibot: v.object({ a: v.string() }),
		zodMini: zm.object({ a: zm.string() }),
		typebox: Compile(TypeBox.Object({ a: TypeBox.String() })),
		ajv: {
			type: "object",
			properties: { a: { type: "string" } },
			required: ["a"]
		}
	},
	{
		arktype: type("number"),
		zod: z.number(),
		valibot: v.number(),
		zodMini: zm.number(),
		typebox: Compile(TypeBox.Number()),
		ajv: { type: "number" }
	},
	{
		arktype: type({ b: "number" }),
		zod: z.object({ b: z.number() }),
		valibot: v.object({ b: v.number() }),
		zodMini: zm.object({ b: zm.number() }),
		typebox: Compile(TypeBox.Object({ b: TypeBox.Number() })),
		ajv: {
			type: "object",
			properties: { b: { type: "number" } },
			required: ["b"]
		}
	},
	{
		arktype: type("string[]"),
		zod: z.array(z.string()),
		valibot: v.array(v.string()),
		zodMini: zm.array(zm.string()),
		typebox: Compile(TypeBox.Array(TypeBox.String())),
		ajv: { type: "array", items: { type: "string" } }
	},
	{
		arktype: type({ c: "boolean" }).or({ d: "number" }),
		zod: z.union([z.object({ c: z.boolean() }), z.object({ d: z.number() })]),
		valibot: v.union([
			v.object({ c: v.boolean() }),
			v.object({ d: v.number() })
		]),
		zodMini: zm.union([
			zm.object({ c: zm.boolean() }),
			zm.object({ d: zm.number() })
		]),
		typebox: Compile(
			TypeBox.Union([
				TypeBox.Object({ c: TypeBox.Boolean() }),
				TypeBox.Object({ d: TypeBox.Number() })
			])
		),
		ajv: {
			anyOf: [
				{
					type: "object",
					properties: { c: { type: "boolean" } },
					required: ["c"]
				},
				{
					type: "object",
					properties: { d: { type: "number" } },
					required: ["d"]
				}
			]
		}
	},
	{
		arktype: type("0 <= number < 1000000000"),
		zod: z.number().min(0).lt(1000000000),
		valibot: v.pipe(v.number(), v.minValue(0), v.ltValue(1000000000)),
		zodMini: zm.number().check(zm.minimum(0), zm.lt(1000000000)),
		typebox: Compile(
			TypeBox.Number({ minimum: 0, exclusiveMaximum: 1000000000 })
		),
		ajv: { type: "number", minimum: 0, exclusiveMaximum: 1000000000 }
	}
]

export const constraintsData = {
	name: "Ada Lovelace",
	email: "ada@example.com",
	age: 36,
	ratio: 0.5,
	code: "ABC-1234"
}

const codePattern = /^[A-Z]{3}-\d{4}$/

// each library's own email format: the regexes differ
export const Constraints = {
	arktype: type({
		name: "1 <= string <= 50",
		email: "string.email",
		age: "0 <= number.integer < 150",
		ratio: "0 < number <= 1",
		code: codePattern
	}),
	zod: z.object({
		name: z.string().min(1).max(50),
		email: z.email(),
		age: z.number().int().min(0).lt(150),
		ratio: z.number().gt(0).max(1),
		code: z.string().regex(codePattern)
	}),
	valibot: v.object({
		name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
		email: v.pipe(v.string(), v.email()),
		age: v.pipe(v.number(), v.integer(), v.minValue(0), v.ltValue(150)),
		ratio: v.pipe(v.number(), v.gtValue(0), v.maxValue(1)),
		code: v.pipe(v.string(), v.regex(codePattern))
	}),
	zodMini: zm.object({
		name: zm.string().check(zm.minLength(1), zm.maxLength(50)),
		email: zm.email(),
		age: zm.int().check(zm.minimum(0), zm.lt(150)),
		ratio: zm.number().check(zm.gt(0), zm.maximum(1)),
		code: zm.string().check(zm.regex(codePattern))
	}),
	typebox: Compile(
		TypeBox.Object({
			name: TypeBox.String({ minLength: 1, maxLength: 50 }),
			email: TypeBox.String({ format: "email" }),
			age: TypeBox.Integer({ minimum: 0, exclusiveMaximum: 150 }),
			ratio: TypeBox.Number({ exclusiveMinimum: 0, maximum: 1 }),
			code: TypeBox.String({ pattern: codePattern.source })
		})
	),
	ajv: {
		type: "object",
		properties: {
			name: { type: "string", minLength: 1, maxLength: 50 },
			email: { type: "string", format: "email" },
			age: { type: "integer", minimum: 0, exclusiveMaximum: 150 },
			ratio: { type: "number", exclusiveMinimum: 0, maximum: 1 },
			code: { type: "string", pattern: codePattern.source }
		},
		required: Object.keys(constraintsData)
	}
}

export const morphData = "12345"

export const Morph = {
	arktype: type("string.numeric.parse"),
	zod: z.string().regex(numericStringMatcher).transform(Number),
	valibot: v.pipe(
		v.string(),
		v.regex(numericStringMatcher),
		v.transform(Number)
	),
	zodMini: zm.pipe(
		zm.string().check(zm.regex(numericStringMatcher)),
		zm.transform(Number)
	),
	// TypeBox transforms through Decode, and ajv can't transform
	typebox: Compile(
		TypeBox.Decode(
			TypeBox.String({ pattern: numericStringMatcher.source }),
			Number
		)
	)
}

export const defaultsData = { a: "s", c: true }

// a row whose Zod output is a new object of only its declared keys has
// ArkType remove undeclared keys too, so both return the same output
export const Defaults = {
	arktype: type({
		a: "string",
		b: "number = 5",
		"c?": "boolean",
		d: "string = 'x'",
		"e?": "number"
	}).onDeepUndeclaredKey("delete"),
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
	}),
	zodMini: zm.object({
		a: zm.string(),
		b: zm._default(zm.number(), 5),
		c: zm.optional(zm.boolean()),
		d: zm._default(zm.string(), "x"),
		e: zm.optional(zm.number())
	}),
	// ajv adds defaults with useDefaults and TypeBox with Default
	typebox: Compile(
		TypeBox.Object({
			a: TypeBox.String(),
			b: TypeBox.Optional(TypeBox.Number({ default: 5 })),
			c: TypeBox.Optional(TypeBox.Boolean()),
			d: TypeBox.Optional(TypeBox.String({ default: "x" })),
			e: TypeBox.Optional(TypeBox.Number())
		})
	),
	ajv: {
		type: "object",
		properties: {
			a: { type: "string" },
			b: { type: "number", default: 5 },
			c: { type: "boolean" },
			d: { type: "string", default: "x" },
			e: { type: "number" }
		},
		required: ["a"]
	}
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

const zodMiniNode: zm.ZodMiniType<TreeNode> = zm.object({
	id: zm.number(),
	get children() {
		return zm.array(zodMiniNode)
	}
})

const typeboxNode: Validator = Compile(
	TypeBox.Cyclic(
		{
			Node: TypeBox.Object({
				id: TypeBox.Number(),
				children: TypeBox.Array(TypeBox.Ref("Node"))
			})
		},
		"Node"
	)
)

const arktypeNode: Type<TreeNode, any> = scope({
	node: { id: "number", children: "node[]" }
}).export().node

export const Tree = {
	arktype: arktypeNode,
	zod: zodNode,
	valibot: valibotNode,
	zodMini: zodMiniNode,
	typebox: typeboxNode,
	ajv: {
		type: "object",
		properties: {
			id: { type: "number" },
			children: { type: "array", items: { $ref: "#" } }
		},
		required: ["id", "children"]
	}
}

// transforms below the root, where a library copies what it changes or writes it into its input
export const itemsMorphData = Array.from({ length: 100 }, (_, i) => ({
	id: i,
	name: `item${i}`,
	count: `${i}`
}))

export const ItemsMorph = {
	arktype: type({
		id: "number",
		name: "string",
		count: "string.numeric.parse"
	})
		.array()
		.onDeepUndeclaredKey("delete"),
	zod: z.array(
		z.object({
			id: z.number(),
			name: z.string(),
			count: z.string().regex(numericStringMatcher).transform(Number)
		})
	),
	valibot: v.array(
		v.object({
			id: v.number(),
			name: v.string(),
			count: v.pipe(
				v.string(),
				v.regex(numericStringMatcher),
				v.transform(Number)
			)
		})
	),
	zodMini: zm.array(
		zm.object({
			id: zm.number(),
			name: zm.string(),
			count: zm.pipe(
				zm.string().check(zm.regex(numericStringMatcher)),
				zm.transform(Number)
			)
		})
	),
	typebox: Compile(
		TypeBox.Array(
			TypeBox.Object({
				id: TypeBox.Number(),
				name: TypeBox.String(),
				count: TypeBox.Decode(
					TypeBox.String({ pattern: numericStringMatcher.source }),
					Number
				)
			})
		)
	)
}

export const itemsDefaultsData = Array.from({ length: 100 }, (_, i) => ({
	id: i,
	name: `item${i}`
}))

export const ItemsDefaults = {
	arktype: type({
		id: "number",
		name: "string",
		active: "boolean = false"
	})
		.array()
		.onDeepUndeclaredKey("delete"),
	zod: z.array(
		z.object({
			id: z.number(),
			name: z.string(),
			active: z.boolean().default(false)
		})
	),
	valibot: v.array(
		v.object({
			id: v.number(),
			name: v.string(),
			active: v.optional(v.boolean(), false)
		})
	),
	zodMini: zm.array(
		zm.object({
			id: zm.number(),
			name: zm.string(),
			active: zm._default(zm.boolean(), false)
		})
	),
	typebox: Compile(
		TypeBox.Array(
			TypeBox.Object({
				id: TypeBox.Number(),
				name: TypeBox.String(),
				active: TypeBox.Optional(TypeBox.Boolean({ default: false }))
			})
		)
	),
	ajv: {
		type: "array",
		items: {
			type: "object",
			properties: {
				id: { type: "number" },
				name: { type: "string" },
				active: { type: "boolean", default: false }
			},
			required: ["id", "name"]
		}
	}
}

export const moltarMorphData = {
	...moltarData,
	deeplyNested: { ...moltarData.deeplyNested, num: "1" }
}

export const MoltarMorph = {
	arktype: type({
		number: "number",
		negNumber: "number",
		maxNumber: "number",
		string: "string",
		longString: "string",
		boolean: "boolean",
		deeplyNested: {
			foo: "string",
			num: "string.numeric.parse",
			bool: "boolean"
		}
	}).onDeepUndeclaredKey("delete"),
	zod: z.object({
		...Moltar.zod.shape,
		deeplyNested: z.object({
			foo: z.string(),
			num: z.string().regex(numericStringMatcher).transform(Number),
			bool: z.boolean()
		})
	}),
	valibot: v.object({
		...Moltar.valibot.entries,
		deeplyNested: v.object({
			foo: v.string(),
			num: v.pipe(
				v.string(),
				v.regex(numericStringMatcher),
				v.transform(Number)
			),
			bool: v.boolean()
		})
	}),
	zodMini: zm.object({
		...moltarZodMini,
		deeplyNested: zm.object({
			foo: zm.string(),
			num: zm.pipe(
				zm.string().check(zm.regex(numericStringMatcher)),
				zm.transform(Number)
			),
			bool: zm.boolean()
		})
	}),
	typebox: Compile(
		TypeBox.Object({
			number: TypeBox.Number(),
			negNumber: TypeBox.Number(),
			maxNumber: TypeBox.Number(),
			string: TypeBox.String(),
			longString: TypeBox.String(),
			boolean: TypeBox.Boolean(),
			deeplyNested: TypeBox.Object({
				foo: TypeBox.String(),
				num: TypeBox.Decode(
					TypeBox.String({ pattern: numericStringMatcher.source }),
					Number
				),
				bool: TypeBox.Boolean()
			})
		})
	)
}
