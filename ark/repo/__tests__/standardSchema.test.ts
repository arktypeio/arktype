import { attest, contextualize } from "@ark/attest"
import type { StandardSchemaV1 } from "@ark/schema"
import { type, type Out, type Type } from "arktype"
import { writeAsyncStandardSchemaMessage } from "arktype/internal/parser/definition.ts"
import * as v from "valibot"
import z from "zod"

contextualize(() => {
	it("accepts standard schema at property", () => {
		const Address = z.object({
			streetNumber: z.number(),
			streetName: z.string()
		})

		const TFromZod = type({
			name: "string",
			age: "number",
			address: Address
		})

		attest<
			Type<{
				name: string
				age: number
				address: {
					streetNumber: number
					streetName: string
				}
			}>
		>(TFromZod)

		const validInput = {
			name: "David",
			age: 32,
			address: {
				streetNumber: 449,
				streetName: "Canal"
			}
		}

		const valid = TFromZod(validInput)

		attest(valid).equals(validInput)

		const invalid = TFromZod({
			name: 5,
			age: "500",
			address: {
				streetNumber: "449"
			}
		})

		attest(invalid).instanceOf(type.errors)
		attest(invalid.toString()).snap(`name must be a string (was a number)
age must be a number (was a string)
address.streetNumber invalid input: expected number, received string
address.streetName invalid input: expected string, received undefined`)
	})

	it("accepts zod schema passed directly to type", () => {
		const UserSchema = z.object({
			id: z.number(),
			username: z.string(),
			email: z.email(),
			isActive: z.boolean()
		})

		const TFromZod = type(UserSchema)

		attest<
			Type<{
				id: number
				username: string
				email: string
				isActive: boolean
			}>
		>(TFromZod)

		const validInput: typeof TFromZod.infer = {
			id: 123,
			username: "john_doe",
			email: "john@example.com",
			isActive: true
		}

		const valid = TFromZod(validInput)

		attest(valid).equals(validInput)

		const invalid = TFromZod({
			id: "123",
			username: 42,
			email: "not-an-email",
			isActive: "yes"
		})

		attest(invalid).instanceOf(type.errors)
		attest(invalid.toString())
			.snap(`id invalid input: expected number, received string
username invalid input: expected string, received number
email invalid email address
isActive invalid input: expected boolean, received string`)
	})

	it("accepts zod schema with transformation", () => {
		const ProductSchema = z.object({
			name: z.string().trim().toLowerCase(),
			price: z.string().transform(val => parseFloat(val)),
			category: z.enum(["electronics", "books", "clothing"]),
			inStock: z
				.union([z.boolean(), z.string()])
				.transform(val => (typeof val === "string" ? val === "true" : val))
		})

		const TFromZod = type(ProductSchema)

		attest<
			Type<
				(In: {
					name: string
					price: string
					category: "electronics" | "books" | "clothing"
					inStock: string | boolean
				}) => Out<{
					name: string
					price: number
					category: "electronics" | "books" | "clothing"
					inStock: boolean
				}>
			>
		>(TFromZod)

		const validInput: typeof TFromZod.inferIn = {
			name: "  iPhone 15  ",
			price: "999.99",
			category: "electronics",
			inStock: "true"
		}

		const valid = TFromZod(validInput)

		attest(valid).equals({
			name: "iphone 15",
			price: 999.99,
			category: "electronics",
			inStock: true
		})

		const invalid = TFromZod({
			name: 123,
			price: "not-a-number",
			category: "furniture",
			inStock: "maybe"
		})

		attest(invalid).instanceOf(type.errors)
		attest(invalid.toString())
			.snap(`name invalid input: expected string, received number
category invalid option: expected one of "electronics"|"books"|"clothing"`)
	})

	it("prefixes issues without a path with the path of the schema", () => {
		const T = type({ age: z.number(), nickname: v.string() })

		attest(T({ age: "5", nickname: 5 }).toString())
			.snap(`age invalid input: expected number, received string
nickname invalid type: Expected string but received 5`)
	})

	// like Effect's Schema.standardSchemaV1
	it("accepts a class as a standard schema", () => {
		class NumberSchema {
			static "~standard": StandardSchemaV1.Props<number> = {
				version: 1,
				vendor: "effect",
				validate: value =>
					typeof value === "number" ?
						{ value }
					:	{ issues: [{ message: "Expected number" }] }
			}
		}

		const T = type({ age: NumberSchema })

		attest<{ age: number }>(T.infer)
		attest(T({ age: 5 })).equals({ age: 5 })
		attest(T({ age: "5" }).toString()).snap("age expected number")
	})

	it("throws if validation is async", () => {
		const T = type({ name: z.string().refine(async s => s.length > 1) })

		attest(() => T({ name: "x" })).throws(
			writeAsyncStandardSchemaMessage("zod")
		)
	})
})
