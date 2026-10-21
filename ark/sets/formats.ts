import {
	BaseRoot,
	type JsonSchema,
	type StandardJSONSchemaV1,
	type ToJsonSchema
} from "@ark/schema"
import { hasDomain, printable, throwParseError } from "@ark/util"
import {
	isPlainObject,
	readJsonSchema,
	writeUnparsableSchemaMessage
} from "./fromJsonSchema.ts"

/** a set of values as an @ark/schema node, which every arktype Type is */
export type Root = BaseRoot

/** a Root (e.g. an arktype Type), a Standard JSON Schema (e.g. a zod schema) or a JSON Schema */
export type Schema = Root | StandardJSONSchemaV1 | JsonSchema.Input

export interface ParseOptions {
	/** which side of a schema with morphs to read, its input by default */
	io?: "in" | "out"
	/** the document a JSON Schema's #/... refs resolve against, the schema itself by default */
	root?: JsonSchema.Input
}

const rootsByIo = {
	in: new WeakMap<object, BaseRoot>(),
	out: new WeakMap<object, BaseRoot>()
}

/** the Root a schema's values make up */
export const parse = (schema: Schema, options?: ParseOptions): Root => {
	const io = options?.io ?? "in"
	if (schema instanceof BaseRoot)
		return io === "in" ? schema.rawIn : schema.rawOut
	if (typeof schema === "boolean" || options?.root)
		return readJsonSchema(schema, options?.root)
	if (!hasDomain(schema, "object"))
		return throwParseError(writeUnparsableSchemaMessage(printable(schema)))
	let root = rootsByIo[io].get(schema)
	if (!root) rootsByIo[io].set(schema, (root = parseObject(schema, io)))
	return root
}

/** the JSON Schema of a schema's values */
export const toJsonSchema = (
	schema: Schema,
	options?: ToJsonSchema.Options
): JsonSchema => parse(schema).toJsonSchema(options)

const parseObject = (schema: object, io: "in" | "out"): BaseRoot => {
	if ("~standard" in schema) {
		const standard = (schema as StandardJSONSchemaV1)["~standard"]
		const converter = standard.jsonSchema
		return converter ?
				readJsonSchema(
					converter[io === "in" ? "input" : "output"]({
						target: "draft-2020-12"
					})
				)
			:	throwParseError(
					writeUnparsableSchemaMessage(
						`a ${standard.vendor} Standard Schema without ~standard.jsonSchema`
					)
				)
	}
	return isPlainObject(schema) ?
			readJsonSchema(schema)
		:	throwParseError(writeUnparsableSchemaMessage(printable(schema)))
}
