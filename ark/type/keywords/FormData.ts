import { node } from "@ark/schema"
import { cached, registry } from "@ark/util"
import type { To } from "../attributes.ts"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"
import { keywordMeta } from "./phrases.ts"

export type FormDataValue = string | File

export type ParsedFormData = Record<string, FormDataValue | FormDataValue[]>

const value = cached(() =>
	node("union", {
		branches: [
			node("domain", { domain: "string" }),
			node("proto", { proto: registry.FileConstructor })
		]
	})
)

const parsedFormDataValue = () => value().rawOr(value().array())

const parsed = cached(() =>
	node("intersection", {
		meta: keywordMeta("FormData.parsed"),
		domain: node("domain", { domain: "object" }),
		structure: node("structure", {
			index: [
				node("index", {
					signature: node("domain", { domain: "string" }),
					value: parsedFormDataValue()
				})
			]
		})
	})
)

export const arkFormData: arkFormData.module = keywordModule(
	{
		root: () => ["instanceof", FormData],
		value,
		parsed,
		parse: () =>
			node("morph", {
				in: node("proto", { proto: FormData }),
				morphs: [
					(data: FormData): ParsedFormData => {
						const result: ParsedFormData = {}

						// no cast is actually required here, but with
						// typescript.tsserver.experimental.enableProjectDiagnostics: true
						// this file periodically displays as having an error, likely due to the
						// lack of a `File` type.
						type FormDataEntries = [string, FormDataValue][]
						for (const [k, v] of data as {} as FormDataEntries) {
							if (Object.prototype.hasOwnProperty.call(result, k)) {
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
					}
				],
				declaredOut: parsed()
			})
	},
	{
		name: "FormData"
	}
) as never

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
