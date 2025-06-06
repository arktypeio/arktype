import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("complex pipe + to chains transform a record array into the expected nested typed object", () => {
		const inputData = [
			{
				OuterKey: [
					{
						MiddleKey: [
							{
								InnerKey: []
							}
						]
					}
				]
			}
		]

		const genericSchema = type("Record<string, unknown>[]")
			.pipe.try((arr: Record<string, unknown>[]) =>
				arr.map(item => {
					const [kind, value] = Object.entries(item)[0]
					return { kind, value }
				})
			)
			.to(
				type({ kind: "string", value: "unknown" })
					.pipe(item => ({ kind: item.kind, value: item.value }))
					.array()
			)
			.pipe((arr: { kind: string; value: unknown }[]) =>
				arr.reduce<Record<string, { value: unknown }>>(
					(acc, { kind, value }) => {
						acc[kind] = { value }
						return acc
					},
					{}
				)
			)
			.to({
				OuterKey: {
					value: type({
						MiddleKey: type({ InnerKey: type("object") })
							.array()
							.pipe(v => v[0])
					}).array()
				}
			})

		const result = genericSchema(inputData)
		attest(result instanceof type.errors).equals(false)
		attest(result).equals({
			OuterKey: {
				value: [
					{
						MiddleKey: { InnerKey: [] }
					}
				]
			}
		})
	})
})
