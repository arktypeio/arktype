export const apiDocsByGroup = {
	Type: [
		{
			group: "Type",
			name: "$",
			parts: [
				{
					kind: "text",
					value: "The "
				},
				{
					kind: "reference",
					value: "Scope"
				},
				{
					kind: "text",
					value:
						" in which definitions for this Type its chained methods are parsed"
				}
			]
		},
		{
			group: "Type",
			name: "infer",
			parts: [
				{
					kind: "text",
					value: "The type of data this returns"
				}
			]
		},
		{
			group: "Type",
			name: "inferIn",
			parts: [
				{
					kind: "text",
					value: "The type of data this expects"
				}
			]
		},
		{
			group: "Type",
			name: "json",
			parts: [
				{
					kind: "text",
					value: "The internal JSON representation"
				}
			]
		},
		{
			group: "Type",
			name: "toJsonSchema",
			parts: [
				{
					kind: "text",
					value: "Generate a JSON Schema"
				}
			]
		},
		{
			group: "Type",
			name: "meta",
			parts: [
				{
					kind: "text",
					value:
						"Metadata like custom descriptions and error messages\n\nThe type of this property "
				},
				{
					kind: "link",
					url: "https://arktype.io/docs/configuration#custom",
					value: "can be extended"
				},
				{
					kind: "text",
					value: " by your project."
				}
			]
		},
		{
			group: "Type",
			name: "description",
			parts: [
				{
					kind: "text",
					value:
						"An English description\n\nBest suited for...\n\t   audience - English speakers\n    data - primitives"
				}
			]
		},
		{
			group: "Type",
			name: "expression",
			parts: [
				{
					kind: "text",
					value:
						"A syntactic representation similar to native TypeScript\n\nBest suited for...\n\t   audience - other developers\n    data - primitives or structures"
				}
			]
		},
		{
			group: "Type",
			name: "assert",
			parts: [
				{
					kind: "text",
					value:
						"Validate and morph data, throwing a descriptive AggregateError if it fails\n\nUseful to avoid needing to check for "
				},
				{
					kind: "reference",
					value: "type.errors"
				},
				{
					kind: "text",
					value: " if it would be unrecoverable"
				}
			]
		},
		{
			group: "Type",
			name: "allows",
			parts: [
				{
					kind: "text",
					value:
						"Validate input data without applying morphs\n\nHighly optimized and best for cases where you need to know if data\nsatisifes a Type's input without needing specific errors on rejection."
				}
			]
		},
		{
			group: "Type",
			name: "configure",
			parts: [
				{
					kind: "text",
					value:
						"Clone and add metadata to shallow references\n\nDoes not affect error messages within properties of an object\nOverlapping keys on existing meta will be overwritten"
				}
			]
		},
		{
			group: "Type",
			name: "describe",
			parts: [
				{
					kind: "text",
					value:
						"Clone and add the description to shallow references (equivalent to `.configure({ description })`)\n\nDoes not affect error messages within properties of an object"
				}
			]
		}
	]
} as const
