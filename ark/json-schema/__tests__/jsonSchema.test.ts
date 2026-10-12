import { attest, contextualize } from "@ark/attest"
import {
	jsonSchema,
	jsonSchemaToType,
	type InferredJsonSchema
} from "@ark/json-schema"
import type { JsonSchema } from "arktype"

// not exported, since TS 7.1 rejects declaration emit for anonymous cyclic
// types (TS5088) that earlier versions elided to `any`
// https://github.com/microsoft/TypeScript/issues/64656
const tree = jsonSchema({
	type: "object",
	properties: {
		value: { type: "number" },
		children: { type: "array", items: { $ref: "#" } }
	}
})

contextualize(() => {
	it("returns its input", () => {
		const def = { type: "string", minLength: 1 } as const
		const s = jsonSchema(def)
		attest(s === def).equals(true)
	})

	it("infers", () => {
		const s = jsonSchema({
			type: "object",
			properties: { name: { type: "string" }, age: { type: "integer" } },
			required: ["name"]
		})
		attest<{ name: string; age?: number }>(s.infer)
		attest(s).type.toString.snap(`jsonSchema<
	{ name: string; age?: number },
	{
		readonly type: "object"
		readonly properties: {
			readonly name: { readonly type: "string" }
			readonly age: { readonly type: "integer" }
		}
		readonly required: readonly ["name"]
	}
>`)
	})

	it("preserves the schema's own type", () => {
		const s = jsonSchema({ type: "array", items: { type: "boolean" } })
		attest<"array">(s.type)
		attest<"boolean">(s.items.type)
	})

	it("boolean schemas", () => {
		attest<unknown>(jsonSchema(true).infer)
		attest<never>(jsonSchema(false).infer)
	})

	it("widened schema", () => {
		const s = jsonSchema({} as JsonSchema)
		attest<unknown>(s.infer)
	})

	it("invalid keyword", () => {
		// @ts-expect-error
		attest(() => jsonSchema({ type: "string", minLength: -1 })).type.errors(
			"minLength must be a non-negative integer (was -1)"
		)
	})

	it("completions", () => {
		// @ts-expect-error
		attest(() => jsonSchema({ type: "str" })).completions({
			str: ["string"]
		})
	})

	it("nested inferred schema", () => {
		const user = jsonSchema({
			type: "object",
			properties: { name: { type: "string" } },
			required: ["name"]
		})
		const users = jsonSchema({ type: "array", items: user })
		attest<{ name: string }[]>(users.infer)
	})

	it("nested $ref resolves against its new root", () => {
		const node = jsonSchema({
			type: "object",
			properties: { next: { $ref: "#" } }
		})
		const outer = jsonSchema({ type: "array", items: node })
		attest(outer.infer).type.toString.snap("{ next?: cyclic }[]")
		type next = NonNullable<(typeof outer.infer)[number]["next"]>
		attest<typeof outer.infer, next>()
	})

	it("recursive", () => {
		attest(tree.infer).type.toString.snap(
			"{ value?: number; children?: cyclic[] }"
		)
	})

	it("jsonSchemaToType", () => {
		const s = jsonSchema({ type: "string", minLength: 1 })
		const T = jsonSchemaToType(s)
		attest<string>(T.infer)
		attest(T.expression).snap("string >= 1")
	})

	it("parameter", () => {
		const parse = <t>(schema: jsonSchema<t>, data: unknown) => data as t
		const out = parse(jsonSchema({ type: "number" }), 5)
		attest<number>(out)
	})

	it("covariant", () => {
		const s: jsonSchema<string> = jsonSchema({ const: "foo" })
		attest<"foo">(jsonSchema({ const: "foo" }).infer)
		// @ts-expect-error
		attest((): jsonSchema<number> => s).type.errors(
			"Type 'string' is not assignable to type 'number'"
		)
	})

	describe("jsonSchema.as", () => {
		it("unknown by default", () => {
			const s = jsonSchema.as({ type: "string" })
			attest<unknown>(s.infer)
			attest<InferredJsonSchema>(s)
		})

		it("explicit", () => {
			const raw: object = JSON.parse(`{ "type": "string" }`)
			const s = jsonSchema.as<string>(raw)
			attest(s === raw).equals(true)
			attest<string>(s.infer)
			attest(s).type.toString.snap("InferredJsonSchema<string>")
		})

		it("jsonSchemaToType", () => {
			const s = jsonSchema.as<string>({ type: "string" })
			attest<string>(jsonSchemaToType(s).infer)
		})
	})

	describe("jsonSchema.infer", () => {
		it("schema", () => {
			attest<string | null>(
				{} as jsonSchema.infer<{ type: ["string", "null"] }>
			)
		})

		it("inferred schema", () => {
			const s = jsonSchema.as<{ a: 1 }>({})
			attest<{ a: 1 }>({} as jsonSchema.infer<typeof s>)
		})

		it("union with an inferred schema", () => {
			const a = jsonSchema.as<"a">({ const: "a" })
			attest<"a" | number>(
				{} as jsonSchema.infer<typeof a | { type: "number" }>
			)
		})

		it("inferred schema against another root", () => {
			const node = jsonSchema({
				type: "object",
				properties: { next: { $ref: "#" } }
			})
			type Outer = { type: "array"; items: typeof node }
			attest({} as jsonSchema.infer<typeof node, Outer>).type.toString.snap(
				"{ next?: cyclic[] }"
			)
		})

		it("root", () => {
			type Doc = {
				$defs: {
					a: { type: "array"; items: { $ref: "#/$defs/b" } }
					b: { type: "string" }
				}
			}
			attest<string[]>({} as jsonSchema.infer<Doc["$defs"]["a"], Doc>)
		})
	})

	it("wrapper", () => {
		const wrap = <const schema>(
			schema: jsonSchema.validate<schema>
		): jsonSchema.infer<schema> => schema as never
		const out: { a: string } = wrap({
			type: "object",
			properties: { a: { type: "string" } },
			required: ["a"]
		})
		attest<{ a: string }>(out)
		attest.instantiations([465, "instantiations"])
	})

	describe("jsonSchema.validate", () => {
		it("valid", () => {
			attest<true>(
				{} as { type: "string" } extends (
					jsonSchema.validate<{ type: "string" }>
				) ?
					true
				:	false
			)
		})

		it("invalid", () => {
			attest<false>(
				{} as { type: "string"; minLength: -1 } extends (
					jsonSchema.validate<{ type: "string"; minLength: -1 }>
				) ?
					true
				:	false
			)
		})
	})
})
