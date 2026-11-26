import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import { writeInvalidSpreadTypeMessage } from "arktype/internal/parser/objectLiteral.ts"

contextualize(() => {
	it("within scope", () => {
		const s = scope({
			user: { isAdmin: "false", name: "string" },
			admin: { "...": "user", isAdmin: "true" }
		}).export()

		attest<{ isAdmin: true; name: string }>(s.admin.infer)
		attest(s.admin.json).equals({
			domain: "object",
			required: [
				{ key: "isAdmin", value: { unit: true } },
				{ key: "name", value: "string" }
			]
		})
	})

	it("from another `type` call", () => {
		const User = type({ isAdmin: "false", name: "string" })
		const Admin = type({ "...": User, isAdmin: "true" })

		attest<{ isAdmin: true; name: string }>(Admin.infer)
		attest(Admin.json).snap({
			domain: "object",
			required: [
				{ key: "isAdmin", value: { unit: true } },
				{ key: "name", value: "string" }
			]
		})
	})

	it("from an object literal", () => {
		// no idea why you'd want to do this
		const T = type({
			"...": {
				inherited: "boolean",
				overridden: "string"
			},
			overridden: "number"
		})

		attest<{
			inherited: boolean
			overridden: number
		}>(T.infer)

		attest(T.json).snap({
			domain: "object",
			required: [
				{
					key: "inherited",
					value: [{ unit: false }, { unit: true }]
				},
				{ key: "overridden", value: "number" }
			]
		})
	})

	it("escaped key", () => {
		const T = type({
			"\\...": "string"
		})

		attest<{ "...": string }>(T.infer)

		attest(T.json).snap({
			domain: "object",
			required: [{ key: "...", value: "string" }]
		})
	})

	it("with non-object", () => {
		// @ts-expect-error
		attest(() => type({ "...": "string" })).throwsAndHasTypeError(
			writeInvalidSpreadTypeMessage("string")
		)
	})

	it("with an object type runtime won't spread", () => {
		const $ = scope({
			a: { x: "string" },
			b: { y: "number" },
			c: { x: "string", "y?": "number" }
		})
		// @ts-expect-error
		attest(() => $.type({ "...": "a | b" }))
			.throws(writeInvalidSpreadTypeMessage("{ x: string } | { y: number }"))
			.type.errors(writeInvalidSpreadTypeMessage("object"))
		// TypeScript would take a morph for a function
		// @ts-expect-error
		attest(() => type({ "...": "string.json.parse" }))
			.throws(
				"Spread operand must resolve to an object literal type (was (In: "
			)
			.type.errors(writeInvalidSpreadTypeMessage("Function"))
		// @ts-expect-error
		attest(() => type({ "...": "never" })).throwsAndHasTypeError(
			writeInvalidSpreadTypeMessage("never")
		)
		// any is unknown at runtime
		// @ts-expect-error
		attest(() => type({ "...": "unknown.any" })).throwsAndHasTypeError(
			writeInvalidSpreadTypeMessage("unknown")
		)
		// a union that reduces to one of its branches is spread as that branch
		attest($.type({ "...": "a | c", z: "1" }).expression).snap(
			"{ x: string, z: 1 }"
		)
	})

	// this is a regression test to ensure nodes are handled even if they aren't just an object
	it("with complex type", () => {
		const AdminUser = type({
			"...": [{ name: "string" }, "&", { isAdmin: "false" }],
			isAdmin: "true"
		})

		attest<{ isAdmin: true; name: string }>(AdminUser.infer)
		attest(AdminUser.json).snap({
			domain: "object",
			required: [
				{ key: "isAdmin", value: { unit: true } },
				{ key: "name", value: "string" }
			]
		})
	})

	it("object keyword treated as empty", () => {
		const T = type({
			"...": "object",
			foo: "string"
		})

		attest<{
			foo: string
		}>(T.t)
		attest(T.expression).snap("{ foo: string }")
	})

	it("spread leaving no props", () => {
		const T = type({ "...": "object" })
		// an object, as {} would be any value but null or undefined
		attest(T.infer).type.toString.snap("object")
		attest(T.expression).snap("{}")
		// @ts-expect-error
		attest(() => T.from(5))
			.throws("must be an object")
			.type.errors("not assignable to parameter of type 'object'")
		attest(type({ "...": {} }).infer).type.toString.snap("object")
	})

	it("narrowed object keyword treated as empty", () => {
		const T = type({
			"...": type.object.narrow(() => true),
			foo: "string"
		})

		attest<{
			foo: string
		}>(T.t)
		attest(T.expression).snap("{ foo: string }")
	})

	it("errors on proto node", () => {
		attest(() =>
			type({
				"...": "Date",
				foo: "string"
			})
		).throws(writeInvalidSpreadTypeMessage("Date"))
	})

	it("autocompletes shallow string", () => {
		attest(() =>
			type({
				// @ts-expect-error
				"...": "objec"
			})
		).completions({
			objec: ["object"]
		})
	})

	it("autocompletes nested strings", () => {
		attest(() =>
			type({
				"...": {
					// @ts-expect-error
					inner: "boo"
				}
			})
		).completions({
			boo: ["boolean"]
		})
	})
})
