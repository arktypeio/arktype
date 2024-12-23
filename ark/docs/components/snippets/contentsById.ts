export default {
	betterErrors:
		'import { type, type ArkErrors } from "arktype"\n\nconst user = type({\n\tname: "string",\n\tplatform: "\'android\' | \'ios\'",\n\t"versions?": "(number | string)[]"\n})\n\ninterface RuntimeErrors extends ArkErrors {\n\t/**platform must be "android" or "ios" (was "enigma")\nversions[2] must be a number or a string (was bigint)*/\n\tsummary: string\n}\n\nconst narrowMessage = (e: ArkErrors): e is RuntimeErrors => true\n\n// ---cut---\nconst out = user({\n\tname: "Alan Turing",\n\tplatform: "enigma",\n\tversions: [0, "1", 0n]\n})\n\nif (out instanceof type.errors) {\n\t// ---cut-start---\n\tif (!narrowMessage(out)) throw new Error()\n\t// ---cut-end---\n\t// hover summary to see validation errors\n\tconsole.error(out.summary)\n}\n',
	clarityAndConcision:
		'// @errors: 2322\nimport { type } from "arktype"\n// this file is written in JS so that it can include a syntax error\n// without creating a type error while still displaying the error in twoslash\n// ---cut---\n// hover me\nconst user = type({\n\tname: "string",\n\tplatform: "\'android\' | \'ios\'",\n\t"versions?": "number | string)[]"\n})\n',
	deepIntrospectability:
		'import { type } from "arktype"\n\nconst user = type({\n\tname: "string",\n\tdevice: {\n\t\tplatform: "\'android\' | \'ios\'",\n\t\t"version?": "number | string"\n\t}\n})\n\n// ---cut---\nuser.extends("object") // true\nuser.extends("string") // false\n// true (string is narrower than unknown)\nuser.extends({\n\tname: "unknown"\n})\n// false (string is wider than "Alan")\nuser.extends({\n\tname: "\'Alan\'"\n})\n',
	intrinsicOptimization:
		'import { type } from "arktype"\n// prettier-ignore\n// ---cut---\n// all unions are optimally discriminated\n// even if multiple/nested paths are needed\nconst account = type({\n\tkind: "\'admin\'",\n\t"powers?": "string[]"\n}).or({\n\tkind: "\'superadmin\'",\n\t"superpowers?": "string[]"\n}).or({\n\tkind: "\'pleb\'"\n})\n',
	unparalleledDx:
		'// @noErrors\nimport { type } from "arktype"\n// prettier-ignore\n// ---cut---\nconst user = type({\n\tname: "string",\n\tplatform: "\'android\' | \'ios\'",\n\t"version?": "number | s"\n\t//                     ^|\n})\n'
}
