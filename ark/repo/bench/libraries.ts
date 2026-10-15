import { Ajv, type Options } from "ajv"
import addFormats from "ajv-formats"
import ajvKeywords from "ajv-keywords"

export const libraries = [
	"valibot",
	"zod",
	"zodCompiled",
	"zodMini",
	"typia",
	"ajv",
	"typebox",
	"arktype",
	"standalone"
] as const

export type Library = (typeof libraries)[number]

export const ajvOf = (opts?: Options): Ajv => {
	const ajv = new Ajv({
		discriminator: true,
		// count string length in UTF-16 code units, as arktype does
		unicode: false,
		useDefaults: true,
		messages: true,
		...opts
	})
	addFormats.default(ajv)
	ajvKeywords.default(ajv, "instanceof")
	return ajv
}
