import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("nested array schema with a pipe should return validation errors for missing properties instead of throwing", () => {
		const genericSchema = type({
			Item: type({
				SubItem: type({
					Value: type("string")
						.array()
						.pipe((v: any) => v[0])
						.to("string.numeric.parse")
				})
					.array()
					.pipe((v: any) => v[0]),
				Meta: type({})
			}).array()
		})

		const data = {
			Item: [
				{
					SubItem: [
						{
							Value: ["0"]
						}
					]
				},
				{
					SubItem: [
						{
							Value: ["0"]
						}
					]
				}
			]
		}

		const result = genericSchema(data)

		// Assert that the result is an instance of ArkType's error class
		// This implicitly checks that an internal error was not thrown during schema(data)
		attest(result instanceof type.errors).equals(true)

		// Snapshot the string representation of the validation error
		attest(result.toString()).snap(`Item[0].Meta must be an object (was missing)
Item[1].Meta must be an object (was missing)`)
	})
})
