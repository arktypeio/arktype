import { rootNode } from "@ark/schema"
import { registry } from "@ark/util"
import type { Module, Submodule } from "../../module.ts"
import type { To } from "../ast.ts"
import { arkModule } from "../utils.ts"

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

export const arkFormData: arkFormData.module = arkModule({
	root: ["instanceof", FormData],
	value,
	parsed,
	parse: rootNode({
		in: FormData,
		morphs: (data: FormData): ParsedFormData => {
			const result: ParsedFormData = {}

			// no cast is actually required here, but with
			// typescript.tsserver.experimental.enableProjectDiagnostics: true
			// this file periodically displays as having an error, likely due to the
			// lack of a `File` type.
			type FormDataEntries = [string, FormDataValue][]
			for (const [k, v] of data as {} as FormDataEntries) {
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
		root: FormData
		value: FormDataValue
		parse: (In: FormData) => To<ParsedFormData>
		parsed: ParsedFormData
	}
}
