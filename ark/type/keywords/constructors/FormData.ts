import { rootNode } from "@ark/schema"
import { registry } from "@ark/util"
import type { Module, Submodule } from "../../module.ts"
import type { To } from "../ast.ts"
import { submodule } from "../utils.ts"

export type FormDataValue = string | File

export type ParsedFormData = Record<string, FormDataValue | FormDataValue[]>

const value = rootNode(["string", registry.FileConstructor])

const parsedFormDataValue = value.or(value.array())

const parsed = rootNode({
	meta: "an object representing parsed form data",
	domain: "object",
	index: {
		signature: "string",
		value: parsedFormDataValue
	}
})

export const arkFormData: arkFormData.module = submodule({
	$root: ["instanceof", FormData],
	value,
	parsed,
	parse: rootNode({
		in: FormData,
		morphs: (data: FormData): ParsedFormData => {
			const result: ParsedFormData = {}

			for (const [k, v] of data) {
				if (k in result) {
					const existing = result[k]
					if (
						typeof existing === "string" ||
						existing instanceof registry.FileConstructor
					)
						result[k] = [existing, v]
					else existing.push(v)
				} else result[k] = v
			}
			return result
		},
		declaredOut: parsed
	})
})

export declare namespace arkFormData {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		$root: FormData
		value: FormDataValue
		parse: (In: FormData) => To<ParsedFormData>
		parsed: ParsedFormData
	}

	export type deepResolutions = { [k in keyof $ as `FormData.${k}`]: $[k] }
}
