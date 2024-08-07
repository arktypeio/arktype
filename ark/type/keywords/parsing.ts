import { rootNode } from "@ark/schema"
import {
	isWellFormedInteger,
	wellFormedIntegerMatcher,
	wellFormedNumberMatcher
} from "@ark/util"
import type { Out, number } from "../ast.js"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
import { tryParseDatePattern } from "./utils/date.js"
import { regexStringNode } from "./utils/regex.js"

const number = rootNode({
	in: regexStringNode(wellFormedNumberMatcher, "a well-formed numeric string"),
	morphs: (s: string) => Number.parseFloat(s)
})

const integer = rootNode({
	in: regexStringNode(wellFormedIntegerMatcher, "a well-formed integer string"),
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
	in: "string",
	morphs: (s: string, ctx) => {
		try {
			return new URL(s)
		} catch {
			return ctx.error("a valid URL")
		}
	}
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

export type parsingExports = {
	url: (In: string) => Out<URL>
	number: (In: string) => Out<number>
	integer: (In: string) => Out<number.divisibleBy<1>>
	date: (In: string) => Out<Date>
	json: (In: string) => Out<object>
	formData: (In: FormData) => Out<ParsedFormData>
}

export type parsing = Module<parsingExports>

export const parsing: parsing = scope(
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
