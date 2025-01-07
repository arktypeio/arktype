export const apiDocsByGroup = {
    "Type": [
        {
            "group": "Type",
            "name": "$",
            "parts": [
                {
                    "kind": "text",
                    "text": "The "
                },
                {
                    "kind": "reference",
                    "to": "Scope"
                },
                {
                    "kind": "text",
                    "text": " in which definitions for this Type its chained methods are parsed"
                }
            ]
        },
        {
            "group": "Type",
            "name": "infer",
            "parts": [
                {
                    "kind": "text",
                    "text": "The type of data this returns"
                }
            ]
        },
        {
            "group": "Type",
            "name": "inferIn",
            "parts": [
                {
                    "kind": "text",
                    "text": "The type of data this expects"
                }
            ]
        },
        {
            "group": "Type",
            "name": "json",
            "parts": [
                {
                    "kind": "text",
                    "text": "The internal JSON representation"
                }
            ]
        },
        {
            "group": "Type",
            "name": "toJsonSchema",
            "parts": [
                {
                    "kind": "text",
                    "text": "Generate a JSON Schema"
                }
            ]
        },
        {
            "group": "Type",
            "name": "meta",
            "parts": [
                {
                    "kind": "text",
                    "text": "Metadata like custom descriptions and error messages\n\nThe type of this property [can be extended](https://arktype.io/docs/configuration#custom) by your project."
                }
            ]
        },
        {
            "group": "Type",
            "name": "description",
            "parts": [
                {
                    "kind": "text",
                    "text": "An english description"
                }
            ]
        },
        {
            "group": "Type",
            "name": "expression",
            "parts": [
                {
                    "kind": "text",
                    "text": "A syntactic representation similar to native TypeScript"
                }
            ]
        },
        {
            "group": "Type",
            "name": "assert",
            "parts": [
                {
                    "kind": "text",
                    "text": "Attempt to apply validation and morph logic, either returning valid output or throwing."
                }
            ]
        }
    ]
}