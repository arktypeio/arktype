import type { ApiDocsByGroup } from "../../repo/jsDocGen.ts"

export const apiDocsByGroup: ApiDocsByGroup = {
	Type: [
		{
			group: "Type",
			name: "$",
			summary: [
				{
					kind: "reference",
					value: "Scope"
				},
				{
					kind: "text",
					value: "in which chained methods are parsed"
				}
			],
			notes: []
		},
		{
			group: "Type",
			name: "infer",
			summary: [
				{
					kind: "text",
					value: "type of output this returns"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value:
							"🥸 inference-only property that will be `undefined` at runtime"
					}
				]
			],
			example:
				'const parseNumber = type("string").pipe(s => Number.parseInt(s))\ntype ParsedNumber = typeof parseNumber.infer // number'
		},
		{
			group: "Type",
			name: "inferIn",
			summary: [
				{
					kind: "text",
					value: "type of input this allows"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value:
							"🥸 inference-only property that will be `undefined` at runtime"
					}
				]
			],
			example:
				'const parseNumber = type("string").pipe(s => Number.parseInt(s))\ntype UnparsedNumber = typeof parseNumber.inferIn // string'
		},
		{
			group: "Type",
			name: "json",
			summary: [
				{
					kind: "text",
					value: "internal JSON representation"
				}
			],
			notes: []
		},
		{
			group: "Type",
			name: "toJsonSchema",
			summary: [
				{
					kind: "text",
					value: "generate a JSON Schema"
				}
			],
			notes: []
		},
		{
			group: "Type",
			name: "meta",
			summary: [
				{
					kind: "text",
					value: "metadata like custom descriptions and error messages"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value: "✅ type"
					},
					{
						kind: "link",
						url: "https://arktype.io/docs/configuration#custom",
						value: "can be customized"
					},
					{
						kind: "text",
						value: "for your project"
					}
				]
			]
		},
		{
			group: "Type",
			name: "description",
			summary: [
				{
					kind: "text",
					value: "human-readable English description"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value: "✅ works best for primitive values"
					}
				]
			],
			example:
				'const n = type("0 < number <= 100")\nconsole.log(n.description) // positive and at most 100'
		},
		{
			group: "Type",
			name: "expression",
			summary: [
				{
					kind: "text",
					value: "syntax string similar to native TypeScript"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value: "✅ works well for both primitives and structures"
					}
				]
			],
			example:
				'const loc = type({ coords: ["number", "number"] })\nconsole.log(loc.expression) // { coords: [number, number] }'
		},
		{
			group: "Type",
			name: "assert",
			summary: [
				{
					kind: "text",
					value: "validate and return transformed data or throw"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value: "✅ sugar to avoid checking for"
					},
					{
						kind: "reference",
						value: "type.errors"
					},
					{
						kind: "text",
						value: "if they are unrecoverable"
					}
				]
			],
			example:
				'const criticalPayload = type({\n    superImportantValue: "string"\n})\n// throws AggregateError: superImportantValue must be a string (was missing)\nconst data = criticalPayload.assert({ irrelevantValue: "whoops" })\nconsole.log(data.superImportantValue) // valid output can be accessed directly'
		},
		{
			group: "Type",
			name: "allows",
			summary: [
				{
					kind: "text",
					value: "check input without applying morphs"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value:
							"✅ good for stuff like filtering that doesn't benefit from detailed errors"
					}
				]
			],
			example:
				'const numeric = type("number | bigint")\n// [0, 2n]\nconst numerics = [0, "one", 2n].filter(numeric.allows)'
		},
		{
			group: "Type",
			name: "configure",
			summary: [
				{
					kind: "text",
					value: "add metadata to shallow references"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value:
							"⚠️ does not affect error messages within properties of an object"
					}
				]
			],
			example:
				'const notOdd = type("number % 2").configure({ description: "not odd" })\n// all constraints at the root are affected\nconst odd = notOdd(3) // must be not odd (was 3)\nconst nonNumber = notOdd("two") // must be not odd (was "two")\n\nconst notOddBox = type({\n   // we should have referenced notOdd or added meta here\n   notOdd: "number % 2",\n// but instead chained from the root object\n}).configure({ description: "not odd" })\n// error message at path notOdd is not affected\nconst oddProp = notOddBox({ notOdd: 3 }) // notOdd must be even (was 3)\n// error message at root is affected, leading to a misleading description\nconst nonObject = notOddBox(null) // must be not odd (was null)'
		},
		{
			group: "Type",
			name: "describe",
			summary: [
				{
					kind: "text",
					value: "add description to shallow references"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value: "🔗 equivalent to `.configure({ description })` (see"
					},
					{
						kind: "reference",
						value: "configure"
					},
					{
						kind: "text",
						value: ")"
					}
				],
				[
					{
						kind: "noteStart",
						value:
							"⚠️ does not affect error messages within properties of an object"
					}
				]
			],
			example:
				'const aToZ = type(/^a.*z$/).describe("a string like \'a...z\'")\nconst good = aToZ("alcatraz") // "alcatraz"\n// ArkErrors: must be a string like \'a...z\' (was "albatross")\nconst badPattern = aToZ("albatross")'
		},
		{
			group: "Type",
			name: "onUndeclaredKey",
			summary: [
				{
					kind: "text",
					value: "apply undeclared key behavior"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value:
							'- `"ignore"` (default) - allow and preserve extra properties'
					}
				],
				[
					{
						kind: "noteStart",
						value: '- `"reject"` - disallow extra properties'
					}
				],
				[
					{
						kind: "noteStart",
						value:
							'- `"delete"` - clone and remove extra properties from output'
					}
				]
			]
		},
		{
			group: "Type",
			name: "onDeepUndeclaredKey",
			summary: [
				{
					kind: "text",
					value: "deeply apply undeclared key behavior"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value:
							'- `"ignore"` (default) - allow and preserve extra properties'
					}
				],
				[
					{
						kind: "noteStart",
						value: '- `"reject"` - disallow extra properties'
					}
				],
				[
					{
						kind: "noteStart",
						value:
							'- `"delete"` - clone and remove extra properties from output'
					}
				]
			]
		},
		{
			group: "Type",
			name: "from",
			summary: [
				{
					kind: "text",
					value: "alias for"
				},
				{
					kind: "reference",
					value: "assert"
				},
				{
					kind: "text",
					value: "with typed input"
				}
			],
			notes: [],
			example:
				'const t = type({ foo: "string" });\n// TypeScript: foo must be a string (was 5)\nconst data = t.from({ foo: 5 });'
		},
		{
			group: "Type",
			name: "as",
			summary: [
				{
					kind: "text",
					value: "cast the way this is inferred"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value: "🥸 inference-only function that does nothing runtime"
					}
				]
			],
			example: "// Type<`a${string}`>\nconst t = type(/^a/).as<`a${string}`>()"
		},
		{
			group: "Type",
			name: "brand",
			summary: [
				{
					kind: "text",
					value: "add a compile-time brand to output"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value: "🥸 inference-only function that does nothing runtime"
					}
				]
			],
			example:
				'const palindrome = type("string")\n    .narrow(s => s === [...s].reverse().join(""))\n    .brand("palindrome")\n// Brand<string, "palindrome">\nconst out = palindrome.assert("racecar")'
		},
		{
			group: "Type",
			name: "and",
			summary: [
				{
					kind: "text",
					value:
						"intersect another Type, throwing if the result is unsatisfiable"
				}
			],
			notes: [],
			example:
				'// Type<{ foo: number; bar: string }>\nconst t = type({ foo: "number" }).and({ bar: "string" })\n// ParseError: Intersection at foo of number and string results in an unsatisfiable type\nconst bad = type({ foo: "number" }).and({ foo: "string" })'
		},
		{
			group: "Type",
			name: "or",
			summary: [
				{
					kind: "text",
					value: "union with another Type"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value:
							"⚠️ a union that could apply different morphs to the same data is a ParseError ([docs](https://arktype.io/docs/expressions/union-morphs))"
					}
				]
			],
			example:
				'// Type<string | { box: string }>\nconst t = type("string").or({ box: "string" })'
		},
		{
			group: "Type",
			name: "array",
			summary: [
				{
					kind: "text",
					value: "an array of this"
				}
			],
			notes: [],
			example:
				'// Type<{ rebmun: number }[]>\nconst t = type({ rebmun: "number" }).array();'
		},
		{
			group: "Type",
			name: "optional",
			summary: [
				{
					kind: "text",
					value:
						"[optional definition](https://arktype.io/docs/objects#properties-optional) for this"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value:
							"⚠️ unlike most other methods, this creates a definition rather than a Type (read why)"
					}
				]
			],
			example:
				'const prop = type({ foo: "number" })\n// Type<{ bar?: { foo: number } }>\nconst obj = type({ bar: prop.optional() })'
		},
		{
			group: "Type",
			name: "default",
			summary: [
				{
					kind: "text",
					value:
						"[defaultable definition](https://arktype.io/docs/objects#properties-defaultable) for this"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value: "✅ object defaults can be returned from a function"
					}
				],
				[
					{
						kind: "noteStart",
						value: "⚠️ throws if the default value is not allowed"
					}
				],
				[
					{
						kind: "noteStart",
						value:
							"⚠️ unlike most other methods, this creates a definition rather than a Type (read why)"
					}
				]
			],
			example:
				'// Type<{ count: Default<number, 0> }>\nconst state = type({ count: type.number.default(0) })\nconst prop = type({ nested: "boolean" })\nconst forObj = type({\n    key: nested.default(() => ({ nested: false }))\n})'
		},
		{
			group: "Type",
			name: "filter",
			summary: [
				{
					kind: "text",
					value: "apply a predicate function to input"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value: "⚠️ the behavior of"
					},
					{
						kind: "reference",
						value: "narrow"
					},
					{
						kind: "text",
						value:
							", this method's output counterpart, is usually more desirable"
					}
				],
				[
					{
						kind: "noteStart",
						value:
							"✅ most useful for morphs with input types that are re-used externally"
					}
				],
				[
					{
						kind: "noteStart",
						value: "🥸"
					},
					{
						kind: "link",
						url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates",
						value: "Type predicates"
					},
					{
						kind: "text",
						value: "can be used to cast"
					}
				]
			],
			example:
				'const stringifyUser = type({ name: "string" }).pipe(user => JSON.stringify(user))\nconst stringifySafe = stringifyUser.filter(user => user.name !== "Bobby Tables")\n// Type<(In: `${string}Z`) => To<Date>>\nconst withPredicate = type("string.date.parse").filter((s): s is `${string}Z` =>\n    s.endsWith("Z")\n)'
		},
		{
			group: "Type",
			name: "narrow",
			summary: [
				{
					kind: "text",
					value: "apply a predicate function to output"
				}
			],
			notes: [
				[],
				[
					{
						kind: "noteStart",
						value:
							"✅ go-to fallback for validation not composable via built-in types and operators"
					}
				],
				[
					{
						kind: "noteStart",
						value: "✅ runs after all other validators and morphs, if present"
					}
				],
				[
					{
						kind: "noteStart",
						value: "🥸"
					},
					{
						kind: "link",
						url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates",
						value: "Type predicates"
					},
					{
						kind: "text",
						value: "can be used to cast"
					}
				]
			],
			example:
				'const palindrome = type("string").narrow(s => s === [...s].reverse().join(""))\n\nconst palindromicEmail = type("string.date.parse").narrow((date, ctx) =>\n\t\tdate.getFullYear() === 2025 || ctx.mustBe("the current year")\n)\n// Type<`${string}.tsx`>\nconst withPredicate = type("string").narrow((s): s is `${string}.tsx` => /\\.tsx?$/.test(s))'
		}
	]
}
