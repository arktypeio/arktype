export type FormDataValue = string | File

export type ParsedFormData = Record<string, FormDataValue | FormDataValue[]>

// support Node18
const File = globalThis.File ?? Blob
type parseFormData = (In: FormData) => Out<ParsedFormData>

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
