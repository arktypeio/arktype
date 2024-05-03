import { attest, contextualize } from "@arktype/attest"
import { scope, type, type Type } from "arktype"

contextualize(() => {
	// https://github.com/arktypeio/arktype/issues/915
	it("time stub w/ private constructor", () => {
		class TimeStub {
			declare readonly isoString: string

			private constructor() {}

			declare static from: (isoString: string) => TimeStub

			declare static fromDate: (date: Date) => TimeStub

			declare toDate: () => Date

			declare toString: () => string
		}

		const types = scope({
			timeStub: ["instanceof", TimeStub] as type.cast<TimeStub>,
			account: "clientDocument&accountData",
			clientDocument: {
				"id?": "string",
				"coll?": "string",
				"ts?": "timeStub",
				"ttl?": "timeStub"
			},
			accountData: {
				user: "user|timeStub",
				provider: "provider",
				providerUserId: "string"
			},
			user: {
				name: "string",
				"accounts?": "account[]"
			},
			provider: "'GitHub'|'Google'"
		}).export()

		attest(types.account.infer).type.toString.snap(
			'{ id?: string; coll?: string; ts?: TimeStub; ttl?: TimeStub; user: TimeStub | { name: string; accounts?: ...[]; }; provider: "GitHub" | "Google"; providerUserId: string; }'
		)
		attest(types.account.json).snap({
			domain: "object",
			required: [
				{ key: "coll", optional: true, value: "string" },
				{ key: "id", optional: true, value: "string" },
				{ key: "provider", value: [{ unit: "GitHub" }, { unit: "Google" }] },
				{ key: "providerUserId", value: "string" },
				{ key: "ts", optional: true, value: "$ark.TimeStub" },
				{ key: "ttl", optional: true, value: "$ark.TimeStub" },
				{
					key: "user",
					value: [
						{
							domain: "object",
							required: [
								{
									key: "accounts",
									optional: true,
									value: { proto: "Array", sequence: "$account" }
								},
								{ key: "name", value: "string" }
							]
						},
						"$ark.TimeStub"
					]
				}
			]
		})
	})
	it("nested bound traversal", () => {
		// https://github.com/arktypeio/arktype/issues/898
		const user = type({
			name: "string",
			email: "email",
			tags: "(string>=2)[]>=3",
			score: "integer>=0"
		})

		const out = user({
			name: "Ok",
			email: "",
			tags: ["AB", "B"],
			score: 0
		})

		attest(out.toString()).snap('email must be a valid email (was "")')
	})

	it("discrimination false negative", () => {
		// https://github.com/arktypeio/arktype/issues/910
		const badScope = scope({
			a: {
				x: "'x1'",
				y: "'y1'",
				z: "string"
			},
			b: {
				x: "'x1'",
				y: "'y2'",
				z: "number"
			},
			c: {
				x: "'x2'",
				y: "'y3'",
				z: "string"
			},
			union: "a | b | c"
		}).export()

		const badType = badScope.union

		type Test = typeof badType.infer

		const value: Test = {
			x: "x2",
			y: "y3",
			z: ""
		} // no type error

		const out = badType(value) // matches scope union item 'c'; should not fail
		attest(out).equals(value)
	})
	it("morph path", () => {
		// https://github.com/arktypeio/arktype/issues/754
		const withMorph = type({
			key: type("string").pipe(type("3<=string<=4"), s => s.trim())
		})

		const outWithMorph = withMorph({
			key: "  This is too long  "
		})

		attest(outWithMorph.toString()).snap(
			"key must be at most length 4 (was 20)"
		)

		const withoutMorph = type({
			key: type("3<=string<=4")
		})

		const outWithoutMorph = withoutMorph({
			key: "  This is too long  "
		})

		attest(outWithoutMorph.toString()).snap(
			"key must be at most length 4 (was 20)"
		)
	})

	it("cross scope reference", () => {
		// https://github.com/arktypeio/arktype/issues/700
		const A = type({
			required: "boolean"
		})

		const B = scope({ A }).type({
			a: "A"
		})

		const C = scope({
			B
		}).type({
			b: "B"
		})

		attest<
			Type<
				{
					b: {
						a: {
							required: boolean
						}
					}
				},
				{
					B: {
						a: {
							required: boolean
						}
					}
				}
			>
		>(C)

		attest(C.json).snap({
			domain: "object",
			required: [
				{
					key: "b",
					value: {
						domain: "object",
						required: [
							{
								key: "a",
								value: {
									domain: "object",
									required: [
										{
											key: "required",
											value: [{ unit: false }, { unit: true }]
										}
									]
								}
							}
						]
					}
				}
			]
		})
	})
})
