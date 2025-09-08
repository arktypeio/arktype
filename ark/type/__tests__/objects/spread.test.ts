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
