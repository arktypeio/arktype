import { attest, contextualize } from "@ark/attest"
import { hasOwn, registry } from "@ark/util"
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

		attest(parseUserForm(data).toString()).snap(`email must be an email address
file must be a File instance
tags[2] must be a string`)
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

	it("__proto__ key is stored as own property without hijacking prototype", () => {
		const strData = new FormData()
		strData.append("__proto__", "x")
		const strOut = type("FormData.parse").assert(strData)
		attest(Object.getPrototypeOf(strOut)).is(Object.prototype)
		attest(hasOwn(strOut, "__proto__")).equals(true)
		attest(strOut.__proto__).equals("x")

		strData.append("__proto__", "y")
		const multiStrOut = type("FormData.parse").assert(strData)
		attest(Object.getPrototypeOf(multiStrOut)).is(Object.prototype)
		attest(hasOwn(multiStrOut, "__proto__")).equals(true)
		attest(multiStrOut.__proto__).equals(["x", "y"])

		if (process.version.startsWith("v18")) return
		const file = new registry.FileConstructor(["x"], "x.txt")
		const fileData = new FormData()
		fileData.append("__proto__", file)
		const fileOut = type("FormData.parse").assert(fileData)
		attest(Object.getPrototypeOf(fileOut)).is(Object.prototype)
		attest(hasOwn(fileOut, "__proto__")).equals(true)
		attest(fileOut.__proto__).is(file)

		fileData.append("__proto__", "after")
		const mixedOut = type("FormData.parse").assert(fileData)
		attest(Object.getPrototypeOf(mixedOut)).is(Object.prototype)
		attest(hasOwn(mixedOut, "__proto__")).equals(true)
		attest(mixedOut.__proto__).equals([file, "after"])
	})
})
