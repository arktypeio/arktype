import { attest, contextualize } from "@ark/attest"
import {
	ArkErrors,
	flatByPath,
	flatProblemsByPath,
	rootSchema,
	schemaScope,
	type ArkError,
	type Traversal
} from "@ark/schema"

contextualize(() => {
	it("shallow", () => {
		const n = rootSchema({
			domain: "number",
			divisor: 3
		})
		attest(n.traverse(6)).snap(6)
		attest(n.traverse(7)?.toString()).snap("must be a multiple of 3 (was 7)")
	})

	it("at path", () => {
		const o = rootSchema({
			domain: "object",
			required: {
				key: "foo",
				value: {
					domain: "number",
					divisor: 3
				}
			}
		})
		attest(o.traverse({ foo: 6 })).snap({ foo: 6 })
		attest(o.traverse({ foo: 7 })?.toString()).snap(
			"foo must be a multiple of 3 (was 7)"
		)
	})

	it("array", () => {
		const T = rootSchema({
			proto: Array,
			sequence: "number"
		})
		attest(T.traverse([5])).snap([5])
		attest(T.traverse([5, "five"])?.toString()).snap(
			"value at [1] must be a number (was a string)"
		)
	})

	it("custom description integrated with error", () => {
		const superSpecialBigint = rootSchema({
			domain: "bigint",
			meta: "my special bigint"
		})
		attest(superSpecialBigint.description).snap("my special bigint")
		attest(superSpecialBigint.traverse(5)?.toString()).snap(
			"must be my special bigint (was a number)"
		)
	})

	it("custom description on parent doesn't affect children", () => {
		const evenNumber = rootSchema({
			meta: "an even number",
			domain: "number",
			divisor: 2
		})
		attest(evenNumber.description).snap("an even number")
		// since the error is from the divisor constraint which didn't have a
		// description, it is unchanged
		attest(evenNumber.traverse(5)?.toString()).snap("must be even (was 5)")
	})

	it("can configure error writers at a node level", () => {
		const customNumber = rootSchema({
			meta: {
				description: "custom description",
				actual: data => `custom actual ${data}`,
				problem: ctx => `custom problem ${ctx.expected} ${ctx.actual}`,
				message: ctx => `custom message ${ctx.problem}`
			},
			domain: "number"
		})

		const out = customNumber("foo") as ArkErrors

		attest(out.summary).snap(
			"custom message custom problem custom description custom actual foo"
		)
	})

	it("can configure errors by kind at a scope level", () => {
		const types = schemaScope(
			{ superSpecialString: "string" },
			{
				domain: {
					expected: inner => `custom expected ${inner.domain}`,
					actual: data => `custom actual ${data}`,
					problem: ctx => `custom problem ${ctx.expected} ${ctx.actual}`,
					message: ctx => `custom message ${ctx.problem}`
				}
			}
		).export()
		const superSpecialString = types.superSpecialString
		attest(superSpecialString(5)?.toString()).snap(
			"custom message custom problem custom expected string custom actual 5"
		)
	})

	it("can configure description by kind at scope level", () => {
		const types = schemaScope(
			{ superSpecialNumber: "number" },
			{
				domain: {
					description: inner => `my special ${inner.domain}`
				}
			}
		).export()
		const superSpecialNumber = types.superSpecialNumber
		attest(superSpecialNumber.description).snap("my special number")
		attest(superSpecialNumber("five")?.toString()).snap(
			"must be my special number (was a string)"
		)
	})

	it("reads supplied text through its slot", () => {
		const greeting = rootSchema({
			domain: "string",
			predicate: (s: string, ctx: Traversal) =>
				ctx.reject({ expected: "a greeting", actual: "" })
		})
		const errors = greeting.traverse("x") as ArkErrors
		const error = errors.issues[0]
		attest(error.expected).equals("a greeting")
		attest(error.actual).equals("")
		attest(error.message).snap("must be a greeting")
		attest(errors.toJSON()).snap([
			{
				data: "x",
				path: [],
				expected: "a greeting",
				actual: "",
				code: "predicate",
				propString: "",
				problem: "must be a greeting",
				message: "must be a greeting"
			}
		])
	})

	it("an issue is a plain object", () => {
		const issue = (rootSchema({ domain: "string" })(5) as ArkErrors).issues[0]
		attest(Object.getPrototypeOf(issue)).equals(Object.prototype)
		attest(Reflect.ownKeys(issue)).snap([
			"data",
			"path",
			"code",
			"description",
			"meta",
			"domain",
			"propString",
			"expected",
			"actual",
			"problem",
			"message"
		])
		attest(`${issue}`).equals("[object Object]")
	})

	it("writes an issue's text when its errors are first read", () => {
		let calls = 0
		const T = rootSchema({
			domain: "string",
			meta: { message: () => `${++calls}` }
		})
		const errors = T(5) as ArkErrors
		attest(calls).equals(0)
		attest(errors.summary).equals("1")
		attest(errors.issues[0].message).equals("1")
		attest(calls).equals(1)
	})

	const nEvenAtLeast2 = rootSchema({
		domain: "object",
		required: {
			key: "n",
			value: { domain: "number", divisor: 2, min: 2 }
		}
	})

	const errors = nEvenAtLeast2({ n: 1 }) as ArkErrors

	it("issues is a plain array", () => {
		const messages = errors.issues.map(e => e.message)
		attest(messages instanceof Array).equals(true)
		attest(messages.constructor).equals(Array)
		attest(messages instanceof ArkErrors).equals(false)

		attest(Array.isArray(errors)).equals(false)
		attest(Array.isArray(errors.issues)).equals(true)
	})

	it("array members are read from issues", () => {
		// @ts-expect-error
		attest(() => errors[0]).type.errors("Property '0' does not exist")
		// @ts-expect-error
		attest(() => errors.issues.push(errors.issues[0])).type.errors(
			"Property 'push' does not exist"
		)
		// @ts-expect-error
		attest((): readonly ArkError[] => errors).type.errors(
			"is missing the following properties"
		)
	})

	it("serialization", () => {
		attest(errors.toJSON()).snap([
			{
				data: 1,
				path: ["n"],
				code: "intersection",
				errors: [
					{
						data: 1,
						path: ["n"],
						code: "divisor",
						description: "even",
						meta: {},
						rule: 2,
						propString: "n",
						expected: "even",
						actual: "1",
						problem: "must be even (was 1)",
						message: "n must be even (was 1)"
					},
					{
						data: 1,
						path: ["n"],
						code: "min",
						description: "at least 2",
						meta: {},
						rule: 2,
						propString: "n",
						expected: "at least 2",
						actual: "1",
						problem: "must be at least 2 (was 1)",
						message: "n must be at least 2 (was 1)"
					}
				],
				propString: "n",
				expected: "  ◦ even\n  ◦ at least 2",
				actual: "1",
				problem: "(1) must be...\n  ◦ even\n  ◦ at least 2",
				message: "n (1) must be...\n  ◦ even\n  ◦ at least 2"
			}
		])
	})

	it("JSON.stringify round-trip via Standard Schema failure (e.g. HTTP error payload)", () => {
		const result = nEvenAtLeast2["~standard"].validate({ n: 1 })
		if (!("issues" in result)) throw new Error("expected validation failure")

		const messages = result.issues?.map(issue => issue.message)
		// a consumer prefixes the path itself
		attest(messages).snap(["(1) must be...\n  ◦ even\n  ◦ at least 2"])
		attest(messages instanceof ArkErrors).equals(false)

		const parsed = JSON.parse(
			JSON.stringify({ issues: result.issues, messages })
		) as { issues: unknown[]; messages: string[] }

		attest(parsed.issues).equals(
			(JSON.parse(JSON.stringify(errors)) as object[]).map(issue => ({
				...issue,
				message: messages![0]
			}))
		)
		attest(parsed.messages).equals(messages!)
	})

	it("flatByPath", () => {
		attest(flatByPath(errors)).snap({
			n: [
				{
					data: 1,
					path: ["n"],
					code: "divisor",
					description: "even",
					meta: {},
					rule: 2,
					propString: "n",
					expected: "even",
					actual: "1",
					problem: "must be even (was 1)",
					message: "n must be even (was 1)"
				},
				{
					data: 1,
					path: ["n"],
					code: "min",
					description: "at least 2",
					meta: {},
					rule: 2,
					propString: "n",
					expected: "at least 2",
					actual: "1",
					problem: "must be at least 2 (was 1)",
					message: "n must be at least 2 (was 1)"
				}
			]
		})
	})

	it("summary", () => {
		attest(errors.summary).snap(`n (1) must be...
  ◦ even
  ◦ at least 2`)
	})

	it("flatProblemsByPath", () => {
		attest(flatProblemsByPath(errors)).snap({
			n: ["must be even (was 1)", "must be at least 2 (was 1)"]
		})
	})
})
