import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("basic File type", () => {
		const T = type("File")

		const validFile = new File(["content"], "test.txt")
		const anotherFile = new File(["x".repeat(1000)], "data.bin")
		const notAFile = "not a file"
		const alsoNotAFile = { name: "fake.txt" }

		attest(T(validFile)).equals(validFile)
		attest(T(anotherFile)).equals(anotherFile)
		attest(T(notAFile).toString()).snap("must be a File instance (was string)")
		attest(T(alsoNotAFile).toString()).snap(
			"must be a File instance (was object)"
		)
	})

	it("File in object schema", () => {
		const T = type({
			document: "File"
		})

		const validFile = new File(["content"], "doc.pdf")
		const validData = { document: validFile }
		const invalidData = { document: "not-a-file.txt" }

		attest(T(validData)).equals(validData)
		attest(T(invalidData).toString()).snap(
			"document must be a File instance (was string)"
		)
	})
})
