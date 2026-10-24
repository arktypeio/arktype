import { attest, contextualize } from "@ark/attest"
import { registry } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("formData", () => {
		const User = type({
			email: "string.email",
			file: "File",
			tags: "Array.liftFrom<string>"
		})

		const parseUserForm = type("FormData.parse").pipe(User)

		attest(parseUserForm).type.toString.snap(`Type<
	(
		In: FormData
	) => To<{
		email: string
		file: File
		tags: (In: string | string[]) => To<string[]>
	}>,
	{}
>`)

		const data = new FormData()

		// Node18 doesn't have a File constructor
		if (process.version.startsWith("v18")) return

		const file = new registry.FileConstructor([], "")

		data.append("email", "david@arktype.io")
		data.append("file", file)
		data.append("tags", "typescript")
		data.append("tags", "arktype")

		const out = parseUserForm(data)
		attest(out).equals({
			email: "david@arktype.io",
			file,
			tags: ["typescript", "arktype"]
		})

		data.set("email", "david")
		data.set("file", null)
		data.append("tags", file)

		attest(parseUserForm(data).toString())
			.snap(`email must be an email address (was "david")
file must be a File instance (was a string)
tags[2] must be a string (was an object)`)
	})

	it("keys named like Object.prototype members", () => {
		const data = new FormData()
		data.append("toString", "a")
		data.append("constructor", "b")
		data.append("constructor", "c")
		attest(type("FormData.parse")(data)).snap({
			toString: "a",
			constructor: ["b", "c"]
		})
	})
})
