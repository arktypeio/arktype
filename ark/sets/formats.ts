import {
	BaseRoot,
	type JsonSchema,
	type StandardJSONSchemaV1,
	type ToJsonSchema
} from "@ark/schema"
import { hasDomain, ParseError, printable, throwParseError } from "@ark/util"
import {
	isJsonSchemaObject,
	readJsonSchema,
	writeUnparsableSchemaMessage,
	writeUnreadableStandardSchemaMessage
} from "./fromJsonSchema.ts"

/** a set of values as an @ark/schema node, which every arktype Type is */
export type Root = BaseRoot

/** a Root (e.g. an arktype Type), a Standard JSON Schema (e.g. a zod schema) or a JSON Schema */
export type Schema = Root | StandardJSONSchemaV1 | JsonSchemaInput

/**
 * a JSON Schema: a boolean or an object. JsonSchema's keywords complete in a
 * literal, but any object type is accepted, like a library's own JSON Schema
 * interface, except an array or other iterable, which no JSON Schema is
 */
export type JsonSchemaInput =
	| JsonSchema.Branch
	| (object & { readonly [Symbol.iterator]?: never })

export interface ParseOptions {
	/** which side of a schema with morphs to read, its input by default */
	io?: "in" | "out"
	/** the document a JSON Schema's #/... refs resolve against, the schema itself by default */
	root?: JsonSchemaInput
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
		return isJsonSchemaObject(schema) ?
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
): JsonSchema =>
	// a Root is written whole, as its own toJsonSchema() would, so its defaults
	// are kept and a morph throws rather than writing only its input
	schema instanceof BaseRoot ?
		schema.toJsonSchema(options)
	:	parse(schema).toJsonSchema(options)

const readStandardSchema = (
	schema: StandardJSONSchemaV1,
	io: "in" | "out"
): BaseRoot => {
	// only its key was checked, so it may be anything
	const standard = schema["~standard"] as
		| Partial<StandardJSONSchemaV1.Props>
		| null
		| undefined
	if (!hasDomain(standard, "object"))
		return throwParseError(writeUnparsableSchemaMessage(printable(schema)))
	const vendor = String(standard.vendor)
	if (!hasDomain(standard.jsonSchema, "object")) {
		return throwParseError(
			writeUnparsableSchemaMessage(
				`a ${vendor} Standard Schema without ~standard.jsonSchema`
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
				writeUnreadableStandardSchemaMessage(vendor, method, cause)
			),
			{ cause }
		)
	}
	return readJsonSchema(jsonSchema)
}
