import { attest, contextualize } from "@ark/attest"
import { type, type Out, type Type } from "arktype"
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
		attest(invalid.toString()).snap(`age must be a number (was a string)
name must be a string (was a number)
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
})
