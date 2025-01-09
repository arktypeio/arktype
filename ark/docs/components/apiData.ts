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
					value: "type of data this returns"
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
					value: "type of data this expects"
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
					value: "a human-readable English description"
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
					value: "clone and add metadata to shallow references"
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
					value: "clone and add the description to shallow references"
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
					value:
						"clone to a new Type with the specified undeclared key behavior"
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
					value:
						"deeply clone to a new Type with the specified undeclared key behavior"
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
		}
	]
}
