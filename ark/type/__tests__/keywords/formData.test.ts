import { attest, contextualize } from "@ark/attest"
import { registry } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("formData", () => {
		const user = type({
			email: "string.email",
			file: "File",
			tags: "Array.liftFrom<string>"
		})

		const parseUserForm = type("FormData.parse").pipe(user)

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
file must be a File instance (was string)
tags[2] must be a string (was an object)`)
	})
})
