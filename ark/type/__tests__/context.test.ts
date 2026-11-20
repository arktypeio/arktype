import { attest, contextualize } from "@ark/attest"
import {
	writeContextAtDefinitionMessage,
	type StandardSchemaV1
} from "@ark/schema"
import { scope, type } from "arktype"

declare module "arktype" {
	interface ArkEnv {
		context(): { savedStreet?: string }
	}
}

// a saved street passes as it was saved, though rules have since tightened
const Street = type("string").narrow(
	(s, ctx) =>
		s === ctx.context?.savedStreet ||
		s.length > 3 ||
		ctx.mustBe("a full street")
)

const saved = { savedStreet: "Elm" }

const issuesOf = (result: StandardSchemaV1.Result<unknown>) =>
	result.issues?.map(issue => issue.message)

contextualize(() => {
	it("is undefined in a call without one", () => {
		attest(Street("Elm").toString()).snap("must be a full street")
		attest(Street("Elm Street")).equals("Elm Street")
	})

	it("reaches a narrow at any depth", () => {
		const Contact = type({ name: "string", address: { street: Street } })
		const Destination = type({
			data: type.or(
				{ type: "'bank'", beneficiary: Contact },
				{ type: "'crypto'", wallet: "string" }
			)
		})
		const data = {
			data: {
				type: "bank" as const,
				beneficiary: { name: "a", address: { street: "Elm" } }
			}
		}
		attest(Destination(data).toString()).snap(
			"data.beneficiary.address.street must be a full street"
		)
		// the first call is jitless, the second compiled
		attest(Destination.withContext(saved)(data)).equals(data)
		attest(Destination.withContext(saved)(data)).equals(data)
	})

	it("reaches a narrow in a cyclic scope", () => {
		const Chain = scope({
			link: { street: Street, "next?": "link" }
		}).export().link
		const data = { street: "Elm Street", next: { street: "Elm" } }
		attest(Chain(data).toString()).snap("next.street must be a full street")
		attest(Chain.withContext(saved)(data)).equals(data)
	})

	it("reaches a narrow and a morph after a pipe", () => {
		const Parsed = type("string")
			.pipe((s, ctx) => `${s}${ctx.context?.savedStreet === s ? "" : "!"}`)
			.pipe(Street)
		attest(Parsed("Elm")).equals("Elm!")
		// the morph sees the street as saved, and the narrow its output
		attest(Parsed.withContext(saved)("Elm")).equals("Elm")
		attest(Parsed.withContext({ savedStreet: "Elm!" })("Elm")).equals("Elm!")
	})

	it("binds assert and allows", () => {
		const Bound = Street.withContext(saved)
		attest(Bound.assert("Elm")).equals("Elm")
		attest(Bound.allows("Elm")).equals(true)
		attest(Bound.allows("Oak")).equals(false)
		attest(() => Bound.assert("Oak")).throws("must be a full street")
	})

	it("is the outer call's again once a bound call throws", () => {
		const Bound = Street.withContext(saved)
		attest(() => Bound.assert("Oak")).throws("must be a full street")
		attest(Street.allows("Elm")).equals(false)
		const Outer = type("string").narrow(
			(s, ctx) => Bound.allows(s) && ctx.context?.savedStreet === "Oak"
		)
		attest(Outer.withContext({ savedStreet: "Oak" })("Elm")).equals("Elm")
	})

	it("is a Standard Schema validating in context", async () => {
		const standard = Street.withContext(saved)["~standard"]
		attest(standard.vendor).equals("arktype")
		attest(typeof standard.jsonSchema.input).equals("function")
		attest(issuesOf(await standard.validate("Elm"))).equals(undefined)
		attest(issuesOf(await standard.validate("Oak"))).snap([
			"must be a full street"
		])
	})

	it("is read from Standard Schema's libraryOptions", async () => {
		const { validate } = Street["~standard"]
		attest(issuesOf(await validate("Elm"))).snap(["must be a full street"])
		attest(
			issuesOf(await validate("Elm", { libraryOptions: { context: saved } }))
		).equals(undefined)
	})

	it("can't be read where a literal is checked as a Type is defined", () => {
		// a result without context would be kept for every call, so "b" could never pass
		attest(() =>
			type("'a' | 'b'").narrow(
				(s, ctx) => s === "a" || s === ctx.context?.savedStreet
			)
		).throws(writeContextAtDefinitionMessage)
		// a read with no property is a read
		attest(() => type("boolean").narrow((b, ctx) => b === !ctx.context)).throws(
			writeContextAtDefinitionMessage
		)
		// as it is once a narrow on a wider Type meets a literal
		attest(() => Street.and("'Elm' | 'Oak'")).throws(
			writeContextAtDefinitionMessage
		)
	})

	it("is typed as declared on ArkEnv", () => {
		type("string").narrow((s, ctx) => {
			attest<{ savedStreet?: string } | undefined>(ctx.context)
			return true
		})
		// @ts-expect-error
		attest(() => Street.withContext({ savedStreet: 5 })).type.errors(
			"Type 'number' is not assignable to type 'string'"
		)
		attest<"Elm" | (string & {})>(
			Street.withContext(saved).assert("Elm")
		).type.toString.snap("string")
	})
})
