import type { StandardSchemaV1 } from "@standard-schema/spec"
import { type, type Out } from "arktype"
import z from "zod"

type standardSchemaToArkType<
	schema extends StandardSchemaV1,
	i = StandardSchemaV1.InferInput<schema>,
	o = StandardSchemaV1.InferOutput<schema>
> = [i, o] extends [o, i] ? type<i> : type<(In: i) => Out<o>>

const typeFromStandardSchema = <schema extends StandardSchemaV1>(
	schema: schema
): standardSchemaToArkType<schema> =>
	type.unknown.pipe((v, ctx) => {
		const result = schema["~standard"].validate(
			v
		) as StandardSchemaV1.Result<unknown>

		if (result.issues) {
			for (const { message, path } of result.issues) {
				if (path) {
					ctx.error({
						message: message,
						path: path.map(k => (typeof k === "object" ? k.key : k))
					})
				} else {
					ctx.error({
						message
					})
				}
			}
		} else {
			return result.value
		}
	}) as never

const TFromZod = typeFromStandardSchema(
	z.object({
		foo: z.string()
	})
)

const valid = TFromZod({ foo: "foo" })
const invalid = TFromZod({ foo: 5 })
