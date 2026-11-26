import { attest, contextualize } from "@ark/attest"
import {
	ArkErrors,
	firstIssue,
	flatByPath,
	flatMessagesByPath,
	lineOf,
	messageIn,
	rootSchema,
	schemaScope,
	writeInvalidLocaleObjectMessage,
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
		attest(n.traverse(7)?.toString()).snap("must be a multiple of 3")
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
			"foo must be a multiple of 3"
		)
	})

	it("array", () => {
		const T = rootSchema({
			proto: Array,
			sequence: "number"
		})
		attest(T.traverse([5])).snap([5])
		attest(T.traverse([5, "five"])?.toString()).snap("[1] must be a number")
	})

	it("custom description integrated with error", () => {
		const superSpecialBigint = rootSchema({
			domain: "bigint",
			meta: "my special bigint"
		})
		attest(superSpecialBigint.description).snap("my special bigint")
		attest(superSpecialBigint.traverse(5)?.toString()).snap(
			"must be my special bigint"
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
		attest(evenNumber.traverse(5)?.toString()).snap("must be even")
	})

	it("can configure error writers at a node level", () => {
		const customNumber = rootSchema({
			meta: {
				description: "custom description",
				actual: data => `custom actual ${data}`,
				message: ctx => `custom message ${ctx.expected} ${ctx.actual}`
			},
			domain: "number"
		})

		const out = customNumber("foo") as ArkErrors

		attest(out.summary).snap(
			"custom message custom description custom actual foo"
		)
	})

	it("a summary's line is a message after its path, a configured one after a colon", () => {
		const o = rootSchema({
			domain: "object",
			required: [
				{ key: "a", value: "number" },
				{
					key: "b",
					value: { domain: "number", meta: { message: "Enter a number" } }
				}
			]
		})
		const out = o({ a: "", b: "" }) as ArkErrors
		attest(out.summary).snap(`a must be a number
b: Enter a number`)
		attest(out.issues.map(e => e.message)).snap([
			"must be a number",
			"Enter a number"
		])
		attest(flatMessagesByPath(out)).snap({
			a: ["must be a number"],
			b: ["Enter a number"]
		})
	})

	it("can configure errors by kind at a scope level", () => {
		const types = schemaScope(
			{ superSpecialString: "string" },
			{
				domain: {
					expected: inner => `custom expected ${inner.domain}`,
					actual: data => `custom actual ${data}`,
					message: ctx => `custom message ${ctx.expected} ${ctx.actual}`
				}
			}
		).export()
		const superSpecialString = types.superSpecialString
		attest(superSpecialString(5)?.toString()).snap(
			"custom message custom expected string custom actual 5"
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
			"must be my special number"
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
				code: "predicate",
				path: [],
				expected: "a greeting",
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
				code: "divisor",
				path: ["n"],
				expected: "even",
				message: "must be even"
			},
			{
				code: "min",
				path: ["n"],
				expected: "at least 2",
				message: "must be at least 2"
			}
		])
	})

	it("JSON.stringify round-trip via Standard Schema failure (e.g. HTTP error payload)", () => {
		const result = nEvenAtLeast2["~standard"].validate({ n: 1 })
		if (!("issues" in result)) throw new Error("expected validation failure")

		const messages = result.issues?.map(issue => issue.message)
		// each is its error's message, so a consumer prefixes the path itself
		attest(messages).equals(errors.issues.map(e => e.message))
		attest(messages).snap(["must be even", "must be at least 2"])
		attest(messages instanceof ArkErrors).equals(false)

		// JSON.stringify on the Standard Schema failure strips data, actual, and
		// non-JSON Type metadata, matching ArkErrors.toJSON()
		attest(JSON.parse(JSON.stringify(result))).equals({
			issues: JSON.parse(JSON.stringify(errors)),
			message: errors.summary
		})

		const parsed = JSON.parse(
			JSON.stringify({ issues: result.issues, messages })
		) as { issues: unknown[]; messages: string[] }

		// JSON.stringify(result.issues) strips data, actual, and internal fields,
		// matching ArkErrors.toJSON() directly
		attest(parsed.issues).equals(JSON.parse(JSON.stringify(errors)))
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
					message: "must be even"
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
					message: "must be at least 2"
				}
			]
		})
	})

	it("summary", () => {
		attest(errors.summary).snap(`n must be even
n must be at least 2`)
	})

	it("flatMessagesByPath", () => {
		attest(flatMessagesByPath(errors)).snap({
			n: ["must be even", "must be at least 2"]
		})
	})

	it("lineOf matches each line of summary", () => {
		const root = rootSchema("string")
		const rootOut = root(5) as ArkErrors
		attest(lineOf(firstIssue(rootOut))).equals(rootOut.summary)
		attest(lineOf(rootOut.issues[0])).snap("must be a string")

		const sym = Symbol("k")
		const nested = rootSchema({
			domain: "object",
			required: [
				{ key: "name", value: "string" },
				{ key: "first-name", value: "string" },
				{ key: sym, value: "string" },
				{
					key: "custom",
					value: { domain: "string", meta: { message: "Enter a value" } }
				},
				{
					key: "labeled",
					value: { domain: "number", meta: { label: "Amount" } }
				},
				{
					key: "nested",
					value: {
						domain: "object",
						required: [
							{
								key: "price",
								value: { domain: "number", meta: { label: "Unit price" } }
							}
						]
					}
				},
				{
					key: "items",
					value: {
						proto: Array,
						sequence: {
							domain: "object",
							required: [{ key: "id", value: "number" }]
						}
					}
				}
			]
		})
		const out = nested({
			"first-name": 1,
			[sym]: 2,
			custom: 3,
			labeled: "x",
			nested: { price: "y" },
			items: [{ id: "z" }]
		}) as ArkErrors
		attest(out.issues.map(lineOf).join("\n")).equals(out.summary)
		attest(out.issues.map(lineOf)).snap([
			"custom: Enter a value",
			'["first-name"] must be a string',
			"items[0].id must be a number",
			"Amount must be a number",
			"name must be a string (was missing)",
			"nested: Unit price must be a number",
			"[Symbol(k)] must be a string"
		])
	})

	it("lineOf does not mutate the issue and handles JSON-round-tripped labeled issues", () => {
		const frozen = Object.freeze({
			path: ["name"] as const,
			code: "domain" as const,
			expected: "a string"
		})
		attest(lineOf(frozen)).snap("name must be a string")

		const plain: {
			path: string[]
			code: "domain"
			expected: string
			message?: string
		} = { path: ["name"], code: "domain", expected: "a string" }
		attest(lineOf(plain)).snap("name must be a string")
		attest("message" in plain).equals(false)

		const labeled = rootSchema({
			domain: "object",
			required: [
				{
					key: "b",
					value: { domain: "number", meta: { label: "Amount" } }
				},
				{
					key: "nested",
					value: {
						domain: "object",
						required: [
							{
								key: "price",
								value: { domain: "number", meta: { label: "Unit price" } }
							}
						]
					}
				},
				{
					key: "missing",
					value: { domain: "number", meta: { label: "Total" } }
				},
				{
					key: "custom",
					value: { domain: "string", meta: { message: "Enter a value" } }
				}
			]
		})
		const out = labeled({
			b: "x",
			nested: { price: "y" },
			custom: 3
		}) as ArkErrors
		const clonedIssues = out.issues.map(issue =>
			JSON.parse(JSON.stringify(issue))
		)
		const toJsonIssues = JSON.parse(JSON.stringify(out.issues))
		attest(clonedIssues.map(lineOf).join("\n")).equals(out.summary)
		attest(toJsonIssues.map(lineOf).join("\n")).equals(out.summary)
		attest(clonedIssues.map(lineOf)).snap([
			"Amount must be a number",
			"custom: Enter a value",
			"Total must be a number (was missing)",
			"nested: Unit price must be a number"
		])
	})

	it("throws ParseError when a non-object locale is passed to summaryIn or messageIn", () => {
		const out = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }]
		})({ a: 1 }) as ArkErrors
		const first = out.issues[0]

		for (const bad of ["de", ["de"], null, 42]) {
			const expected = writeInvalidLocaleObjectMessage(bad)
			attest(() => out.summaryIn(bad as never)).throws(expected)
			attest(() => messageIn(first, bad as never)).throws(expected)
		}
		attest(() => messageIn(first, undefined as never)).throws(
			writeInvalidLocaleObjectMessage(undefined)
		)
	})
})
