import {
	BaseRoot,
	type JsonSchema,
	type StandardJSONSchemaV1,
	type ToJsonSchema
} from "@ark/schema"
import { hasDomain, ParseError, printable, throwParseError } from "@ark/util"
import {
	isPlainObject,
	readJsonSchema,
	writeUnparsableSchemaMessage,
	writeUnreadableStandardSchemaMessage
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

// a JSON Schema is plain data that can change between reads, so only a
// Standard Schema's read is cached
const standardRootsByIo = {
	in: new WeakMap<object, BaseRoot>(),
	out: new WeakMap<object, BaseRoot>()
}

/** the Root a schema's values make up */
export const parse = (schema: Schema, options?: ParseOptions): Root => {
	const io = options?.io ?? "in"
	if (schema instanceof BaseRoot) return io === "in" ? schema._in : schema._out
	if (typeof schema === "boolean") return readJsonSchema(schema, options?.root)
	if (!hasDomain(schema, "object"))
		return throwParseError(writeUnparsableSchemaMessage(printable(schema)))
	if (!("~standard" in schema)) {
		return isPlainObject(schema) ?
				readJsonSchema(schema, options?.root)
			:	throwParseError(writeUnparsableSchemaMessage(printable(schema)))
	}
	let root = standardRootsByIo[io].get(schema)
	if (!root) {
		standardRootsByIo[io].set(
			schema,
			(root = readStandardSchema(schema as StandardJSONSchemaV1, io))
		)
	}
	return root
}

/** the JSON Schema of a schema's values */
export const toJsonSchema = (
	schema: Schema,
	options?: ToJsonSchema.Options
): JsonSchema => parse(schema).toJsonSchema(options)

const readStandardSchema = (
	schema: StandardJSONSchemaV1,
	io: "in" | "out"
): BaseRoot => {
	const standard = schema["~standard"]
	if (!standard.jsonSchema) {
		return throwParseError(
			writeUnparsableSchemaMessage(
				`a ${standard.vendor} Standard Schema without ~standard.jsonSchema`
			)
		)
	}
	const method = io === "in" ? "input" : "output"
	let jsonSchema: JsonSchema.Input
	try {
		jsonSchema = standard.jsonSchema[method]({ target: "draft-2020-12" })
	} catch (cause) {
		throw Object.assign(
			new ParseError(
				writeUnreadableStandardSchemaMessage(standard.vendor, method, cause)
			),
			{ cause }
		)
	}
	return readJsonSchema(jsonSchema)
}
