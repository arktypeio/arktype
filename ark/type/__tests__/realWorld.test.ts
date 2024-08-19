import { attest, contextualize } from "@ark/attest"
import { registeredReference, type ArkErrors } from "@ark/schema"
import { scope, type, type Module } from "arktype"
import type {
	AtLeastLength,
	AtMostLength,
	constrain,
	Narrowed,
	number,
	Out,
	string,
	To
} from "arktype/internal/ast.ts"

contextualize(() => {
	// 	// https://github.com/arktypeio/arktype/issues/915
	// 	it("time stub w/ private constructor", () => {
	// 		class TimeStub {
	// 			declare readonly isoString: string

	// 			private constructor() {}

	// 			declare static from: (isoString: string) => TimeStub

	// 			declare static fromDate: (date: Date) => TimeStub

	// 			declare toDate: () => Date

	// 			declare toString: () => string
	// 		}

	// 		const types = scope({
	// 			timeStub: ["instanceof", TimeStub] as type.cast<TimeStub>,
	// 			account: "clientDocument&accountData",
	// 			clientDocument: {
	// 				"id?": "string",
	// 				"coll?": "string",
	// 				"ts?": "timeStub",
	// 				"ttl?": "timeStub"
	// 			},
	// 			accountData: {
	// 				user: "user|timeStub",
	// 				provider: "provider",
	// 				providerUserId: "string"
	// 			},
	// 			user: {
	// 				name: "string",
	// 				"accounts?": "account[]"
	// 			},
	// 			provider: "'GitHub'|'Google'"
	// 		}).export()

	// 		attest(types.account.infer).type.toString.snap(`{
	// 	id?: string
	// 	coll?: string
	// 	ts?: TimeStub
	// 	ttl?: TimeStub
	// 	user: TimeStub | { name: string; accounts?: cyclic[] }
	// 	provider: "GitHub" | "Google"
	// 	providerUserId: string
	// }`)
	// 		attest(types.account.json).snap({
	// 			required: [
	// 				{ key: "provider", value: [{ unit: "GitHub" }, { unit: "Google" }] },
	// 				{ key: "providerUserId", value: "string" },
	// 				{
	// 					key: "user",
	// 					value: [
	// 						{
	// 							required: [{ key: "name", value: "string" }],
	// 							optional: [
	// 								{
	// 									key: "accounts",
	// 									value: { sequence: "$account", proto: "Array" }
	// 								}
	// 							],
	// 							domain: "object"
	// 						},
	// 						"$ark.TimeStub"
	// 					]
	// 				}
	// 			],
	// 			optional: [
	// 				{ key: "coll", value: "string" },
	// 				{ key: "id", value: "string" },
	// 				{ key: "ts", value: "$ark.TimeStub" },
	// 				{ key: "ttl", value: "$ark.TimeStub" }
	// 			],
	// 			domain: "object"
	// 		})
	// 	})

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

		attest(out.toString()).snap(`email must be an email address (was "")
tags must be at least length 3 (was 2)`)
	})

	it("multiple refinement errors", () => {
		const nospacePattern = /^\S*$/

		const schema = type({
			name: "string",
			email: "email",
			tags: "(string>=2)[]>=3",
			score: "integer>=0",
			"date?": "Date",
			"nospace?": nospacePattern,
			extra: "string|null"
		})

		const data = {
			name: "Ok",
			email: "",
			tags: ["AB", "B"],
			score: -1,
			date: undefined,
			nospace: "One space"
		}

		const out = schema(data)

		attest(out.toString()).snap(`email must be an email address (was "")
extra must be a string or null (was missing)
score must be at least 0 (was -1)
tags must be at least length 3 (was 2)
date must be a Date (was undefined)
nospace must be matched by ^\\S*$ (was "One space")`)
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

		attest<{
			b: {
				a: {
					required: boolean
				}
			}
		}>(C.t)

		attest<{
			B: {
				a: {
					required: boolean
				}
			}
		}>(C.$.t)

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

	// https://github.com/arktypeio/arktype/issues/947
	it("chained inline type expression inference", () => {
		const a = type({
			action: "'a' | 'b'"
		}).or({
			action: "'c'"
		})

		const referenced = type({
			someField: "string"
		}).and(a)

		attest<
			| {
					someField: string
					action: "a" | "b"
			  }
			| {
					someField: string
					action: "c"
			  }
		>(referenced.infer)

		const inlined = type({
			someField: "string"
		}).and(
			type({
				action: "'a' | 'b'"
			}).or({
				action: "'c'"
			})
		)

		attest<typeof referenced>(inlined)
	})

	// https://discord.com/channels/957797212103016458/1242116299547476100
	it("infers morphs at nested paths", () => {
		const parseBigint = type("string", "=>", (s, ctx) => {
			try {
				return BigInt(s)
			} catch {
				return ctx.error("a valid number")
			}
		})

		const Test = type({
			group: {
				nested: {
					value: parseBigint
				}
			}
		})

		const out = Test({ group: { nested: { value: "5" } } })
		attest<bigint, typeof Test.infer.group.nested.value>()
		attest(out).equals({ group: { nested: { value: 5n } } })
	})

	// https://discord.com/channels/957797212103016458/957804102685982740/1242221022380556400
	it("nested pipe to validated output", () => {
		const trimString = (s: string) => s.trim()

		const trimStringReference = registeredReference(trimString)

		const validatedTrimString = type("string").pipe(
			trimString,
			type("1<=string<=3")
		)

		const CreatePatientInput = type({
			"patient_id?": "string|null",
			"first_name?": validatedTrimString.or("null"),
			"middle_name?": "string|null",
			"last_name?": "string|null"
		})

		attest<
			| ((In: string) => To<string.is<AtLeastLength<1> & AtMostLength<3>>>)
			| null
			| undefined,
			typeof CreatePatientInput.t.first_name
		>()

		attest(CreatePatientInput.json).snap({
			optional: [
				{
					key: "first_name",
					value: [
						{
							in: "string",
							morphs: [
								trimStringReference,
								{ domain: "string", maxLength: 3, minLength: 1 }
							]
						},
						{ unit: null }
					]
				},
				{ key: "last_name", value: ["string", { unit: null }] },
				{ key: "middle_name", value: ["string", { unit: null }] },
				{ key: "patient_id", value: ["string", { unit: null }] }
			],
			domain: "object"
		})
		attest(CreatePatientInput({ first_name: " Bob  " })).equals({
			first_name: "Bob"
		})
		attest(CreatePatientInput({ first_name: " John  " }).toString()).snap(
			"first_name must be at most length 3 (was 4)"
		)
		attest(CreatePatientInput({ first_name: 5 }).toString()).snap(
			"first_name must be a string or null (was 5)"
		)
	})

	// https://github.com/arktypeio/arktype/issues/968
	it("handles consecutive pipes", () => {
		const MyAssets = scope({
			Asset: {
				token: "string",
				amount: type("string").pipe((s, ctx) => {
					try {
						return BigInt(s)
					} catch {
						return ctx.error("a valid non-decimal number")
					}
				})
			},
			Assets: {
				assets: "Asset[]>=1"
			}
		})
			.export()
			.Assets.pipe(o => {
				const assets = o.assets.reduce<Record<string, bigint>>((acc, asset) => {
					acc[asset.token] = asset.amount
					return acc
				}, {})
				return { ...o, assets }
			})

		const out = MyAssets({ assets: [{ token: "a", amount: "1" }] })

		attest(out).snap({ assets: { a: "1n" } })
	})

	// https://discord.com/channels/957797212103016458/957804102685982740/1243850690644934677
	it("more chained pipes/narrows", () => {
		const Amount = type(
			"string",
			":",
			(s, ctx) => Number.isInteger(Number(s)) || ctx.reject("number")
		)
			.pipe((s, ctx) => {
				try {
					return BigInt(s)
				} catch {
					return ctx.error("a non-decimal number")
				}
			})
			.narrow((amount, ctx) => true)

		const Token = type("7<string<=120")
			.pipe(s => s.toLowerCase())
			.narrow((s, ctx) => true)

		const $ = scope({
			Asset: {
				token: Token,
				amount: Amount
			},
			Assets: () => $.type("Asset[]>=1").pipe(assets => assets)
		})

		const types = $.export()

		const out = types.Assets([{ token: "lovelace", amount: "5000000" }])

		attest(out).snap([{ token: "lovelace", amount: "5000000n" }])
	})

	it("regex index signature", () => {
		const test = scope({
			svgPath: /^\.\/(\d|a|b|c|d|e|f)+(-(\d|a|b|c|d|e|f)+)*\.svg$/,
			svgMap: {
				"[svgPath]": "string.digits"
			}
		}).export()
		attest<
			Module<{
				svgMap: {
					[x: string.matching<string>]: string
				}
				svgPath: string.matching<string>
			}>
		>(test)
		attest(test.svgMap({ "./f.svg": "123", bar: 5 })).unknown.snap({
			"./f.svg": "123",
			bar: 5
		})
		attest(test.svgMap({ "./f.svg": "123a" }).toString()).snap(
			'value at ["./f.svg"] must be only digits 0-9 (was "123a")'
		)
	})

	it("standalone type from cyclic", () => {
		const types = scope({
			JsonSchema: "JsonSchemaArray|JsonSchemaNumber",
			JsonSchemaArray: {
				items: "JsonSchema",
				type: "'array'"
			},
			JsonSchemaNumber: {
				type: "'number'|'integer'"
			}
		}).export()

		const standalone = types.JsonSchemaArray.describe("standalone")

		attest(standalone.json).snap({
			required: [
				{ key: "items", value: "$JsonSchema" },
				{ key: "type", value: { unit: "array" } }
			],
			meta: "standalone",
			domain: { meta: "standalone", domain: "object" }
		})

		const valid: typeof standalone.infer = {
			type: "array",
			items: { type: "array", items: { type: "number" } }
		}

		const out = standalone(valid)

		attest(out).equals(valid)

		const failOut = standalone({
			type: "array",
			items: { type: "array" }
		})

		attest(failOut.toString()).snap(
			'items.items must be an object (was missing) or items.type must be "integer" or "number" (was "array")'
		)
	})

	it("more external cyclic scope references", () => {
		const $ = scope({
			box: {
				"box?": "box"
			}
		})

		const box = $.type("box|null")

		attest(box({})).equals({})
		attest(box(null)).equals(null)
		attest(box({ box: { box: { box: {} } } })).snap({
			box: { box: { box: {} } }
		})
		attest(box({ box: { box: { box: "whoops" } } })?.toString()).snap(
			'box.box.box must be an object (was string) or must be null (was {"box":{"box":{"box":"whoops"}}})'
		)
	})

	it("morph with alias child", () => {
		const types = scope({
			ArraySchema: {
				"items?": "Schema"
			},
			Schema: "TypeWithKeywords",
			TypeWithKeywords: "ArraySchema"
		}).export()

		const t = types.Schema.pipe(o => JSON.stringify(o))

		attest(t({ items: {} })).snap('{"items":{}}')
		attest(t({ items: null }).toString()).snap(
			"items must be an object (was null)"
		)
	})

	it("terse missing key error", () => {
		const types = scope({
			Library: {
				sections: "Sections"
			},
			Sections: {
				"[string]": "Book[]"
			},
			Book: {
				isbn: "string",
				title: "string",
				"subtitle?": "string",
				authors: "string[]",
				publisher: "Publisher"
			},
			Publisher: {
				id: "string",
				name: "string"
			}
		}).export()

		attest(types.Library({}).toString()).snap(
			"sections must be an object (was missing)"
		)
	})

	it("narrowed quoted description", () => {
		const t = type("string")
			.narrow(() => true)
			.describe('This will "fail"')

		attest<string.narrowed>(t.t)

		const serializedPredicate =
			t.internal.firstReferenceOfKindOrThrow("predicate").serializedPredicate

		attest(t.json).snap({
			meta: 'This will "fail"',
			domain: { meta: 'This will "fail"', domain: "string" },
			predicate: [{ meta: 'This will "fail"', predicate: serializedPredicate }]
		})
	})

	it("extract in of narrowed morph", () => {
		const SubSubType = type("string").pipe(s => parseInt(s))
		const SubType = type({ amount: SubSubType }).narrow(() => true)
		const MyType = type({
			sub: SubType
		})

		type MyType = typeof MyType.in.infer

		attest<
			{
				sub: {
					amount: string
				}
			},
			MyType
		>()
	})

	it("narrowed morph", () => {
		const t = type("string")
			.pipe(s => parseInt(s))
			.narrow(n => true)

		attest<(In: string) => Out<number.narrowed>>(t.t)

		const u = t.pipe(
			n => `${n}`,
			s => `${s}++` as const
		)

		attest(u.t).type.toString("(In: string) => Out<`${string}++`>")
	})

	it("recursive reference from union", () => {
		const $ = scope({
			TypeWithKeywords: "ArraySchema",
			Schema: "number|ArraySchema",
			ArraySchema: {
				"additionalItems?": "Schema"
			}
		})

		$.export()

		attest($.json).snap({
			TypeWithKeywords: {
				optional: [
					{ key: "additionalItems", value: ["$ArraySchema", "number"] }
				],
				domain: "object"
			},
			Schema: ["$ArraySchema", "number"],
			ArraySchema: {
				optional: [
					{ key: "additionalItems", value: ["$ArraySchema", "number"] }
				],
				domain: "object"
			}
		})
	})

	// https://discord.com/channels/957797212103016458/957804102685982740/1254900389346807849
	it("narrows nested morphs", () => {
		const parseBigint = type("string").pipe(s => BigInt(s))
		const fee = type({ amount: parseBigint }).narrow(
			fee => typeof fee.amount === "bigint"
		)

		const Claim = type({
			fee
		})

		const out = Claim.assert({ fee: { amount: "5" } })

		attest(out).equals({ fee: { amount: 5n } })
	})

	// https://github.com/arktypeio/arktype/issues/1037
	it("can morph an optional key", () => {
		const t = type({
			"optionalKey?": ["string", "=>", x => x.toLowerCase()]
		})

		attest<{
			optionalKey?: (In: string) => Out<string>
		}>(t.t)

		attest(t({})).equals({})

		attest(t({ optionalKey: "FOO" })).snap({ optionalKey: "foo" })
	})

	// https://discord.com/channels/957797212103016458/1261621890775126160/1261621890775126160
	it("can narrow output of a piped union", () => {
		const parseBigint = (v: string | number) => BigInt(v)
		const morphReference = registeredReference(parseBigint)
		const validatePositiveBigint = (b: bigint) => b > 0n
		const predicateReference = registeredReference(validatePositiveBigint)

		const Amount = type("string|number")
			.pipe(parseBigint)
			.narrow(validatePositiveBigint)

		attest<(In: string | number) => Out<constrain<bigint, Narrowed>>>(Amount.t)
		attest(Amount.json).snap([
			{
				in: "number",
				morphs: [morphReference, { predicate: [predicateReference] }]
			},
			{
				in: "string",
				morphs: [morphReference, { predicate: [predicateReference] }]
			}
		])

		attest(Amount("1000")).equals(1000n)
		attest(Amount("-5").toString()).snap(
			"must be valid according to validatePositiveBigint (was -5n)"
		)
	})

	it("nested 'and' chained from morph on optional", () => {
		const validatedTrimString = type("string").pipe(
			s => s.trim(),
			type("1<=string<=3")
		)

		const t = type({
			"first_name?": validatedTrimString.and("unknown")
		})

		attest(t.expression).snap(
			"{ first_name?: (In: string) => Out<string <= 3 & >= 1> }"
		)
		attest(t.t).type.toString.snap(`{
	first_name?: (
		In: string
	) => To<is<AtLeastLength<1> & AtMostLength<3>>>
}`)
	})

	it("cyclic narrow in scope", () => {
		const root = scope({
			filename: "0<string<255",
			file: {
				type: "'file'",
				name: "filename"
			},
			directory: {
				type: "'directory'",
				name: "filename",
				children: [
					"root[]",
					":",
					(v, ctx) => {
						if (new Set(v.map(f => f.name)).size !== v.length)
							return ctx.mustBe("names must be unique in a directory")

						return true
					}
				]
			},
			root: "file|directory"
		}).resolve("root")

		attest(root.t).type.toString.snap(`	| {
			type: "file"
			name: is<MoreThanLength<0> & LessThanLength<255>>
	  }
	| {
			type: "directory"
			name: is<MoreThanLength<0> & LessThanLength<255>>
			children: constrain<
				(
					| {
							type: "file"
							name: is<
								MoreThanLength<0> & LessThanLength<255>
							>
					  }
					| cyclic
				)[],
				Narrowed
			>
	  }`)
	})

	// https://github.com/arktypeio/arktype/discussions/1080#discussioncomment-10247616
	it("pipe to discriminated morph union", () => {
		const objSchema = type({
			action: "'order.completed'"
		}).or({
			action: `'scheduled'`,
			id: "parse.integer",
			calendarID: "parse.integer",
			appointmentTypeID: "parse.integer"
		})

		const parseJsonToObj = type("parse.json").pipe(objSchema)

		attest(parseJsonToObj.expression).snap(
			'(In: string) => Out<{ action: "order.completed" } | { action: "scheduled", appointmentTypeID: unknown, calendarID: unknown, id: unknown }>'
		)

		const out = parseJsonToObj(
			JSON.stringify({
				action: "scheduled",
				id: "1",
				calendarID: "1",
				appointmentTypeID: "1"
			})
		)

		attest<
			| ArkErrors
			| {
					action: "order.completed"
			  }
			| {
					action: "scheduled"
					id: number
					calendarID: number
					appointmentTypeID: number
			  }
		>(out)

		attest(out).snap({
			action: "scheduled",
			id: 1,
			calendarID: 1,
			appointmentTypeID: 1
		})
	})

	// https://github.com/arktypeio/arktype/discussions/1080#discussioncomment-10247616
	it("pipe to discriminated morph inner union", () => {
		const objSchema = type({
			action: "'order.completed'"
		}).or({
			action: "'scheduled' | 'rescheduled' | 'canceled' | 'changed'",
			id: "parse.integer",
			calendarID: "parse.integer",
			appointmentTypeID: "parse.integer"
		})

		const parseJsonToObj = type("parse.json").pipe(objSchema)

		const out = parseJsonToObj(
			JSON.stringify({
				action: "scheduled",
				id: "1",
				calendarID: "1",
				appointmentTypeID: "1"
			})
		)

		attest(out).snap({
			action: "scheduled",
			id: 1,
			calendarID: 1,
			appointmentTypeID: 1
		})
	})
})
