import { rootNode, type IntersectionNode } from "@ark/schema"
import { isWellFormedInteger, wellFormedNumberMatcher } from "@ark/util"
import type { number } from "../ast.ts"
import type { Module, Submodule } from "../module.ts"
import { scope } from "../scope.ts"
import { arkString } from "./string.ts"
import { tryParseDatePattern } from "./utils/date.ts"
import { regexStringNode } from "./utils/regex.ts"

const parsableNumber = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
).internal as IntersectionNode

const number = rootNode({
	in: parsableNumber,
	morphs: (s: string) => Number.parseFloat(s)
})

const integer = rootNode({
	in: arkString.submodule.integer as never,
	morphs: (s: string, ctx) => {
		if (!isWellFormedInteger(s))
			return ctx.error("a well-formed integer string")

		const parsed = Number.parseInt(s)
		return Number.isSafeInteger(parsed) ? parsed : (
				ctx.error(
					"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
				)
			)
	}
})

const url = rootNode({
	in: arkString.submodule.url as never,
	morphs: (s: string): URL => new URL(s)
})

const json = rootNode({
	in: "string",
	morphs: (s: string, ctx): object => {
		try {
			return JSON.parse(s)
		} catch {
			return ctx.error("a valid JSON string")
		}
	}
})

const date = rootNode({
	in: "string",
	morphs: (s: string, ctx) => {
		const result = tryParseDatePattern(s)
		return typeof result === "string" ? ctx.error(result) : result
	}
})

export type FormDataValue = string | File

export type ParsedFormData = Record<string, FormDataValue | FormDataValue[]>

// support Node18
const File = globalThis.File ?? Blob

const formData = rootNode({
	in: FormData,
	morphs: (data: FormData): ParsedFormData => {
		const result: ParsedFormData = {}

		// no cast is actually required here, but with
		// typescript.tsserver.experimental.enableProjectDiagnostics: true
		// this file periodically displays as having an error, likely based on a
		// failure to load the tsconfig settings needed to infer that FormData
		// has an iterator
		type FormDataEntries = [string, FormDataValue][]
		for (const [k, v] of data as {} as FormDataEntries) {
			if (k in result) {
				const existing = result[k]
				if (typeof existing === "string" || existing instanceof File)
					result[k] = [existing, v]
				else existing.push(v)
			} else result[k] = v
		}
		return result
	}
})

const submodule: Module<arkParse.submodule> = scope(
	{
		url,
		number,
		integer,
		date,
		json,
		formData
	},
	{
		prereducedAliases: true
	}
).export()

export const arkParse = {
	submodule
}

export declare namespace arkParse {
	export type submodule = Submodule<{}>
}
