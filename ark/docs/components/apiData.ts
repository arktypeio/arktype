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
					value: "An english description"
				}
			]
		},
		{
			group: "Type",
			name: "expression",
			parts: [
				{
					kind: "text",
					value: "A syntactic representation similar to native TypeScript"
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
						"Attempt to apply validation and morph logic, either returning valid output or throwing."
				}
			]
		}
	]
} as const
