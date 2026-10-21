import type { JsonSchema } from "@ark/schema"
import type {
	anyOrNever,
	array,
	Digit,
	domainOf,
	ErrorMessage
} from "@ark/util"
import type {
	Anchor,
	IdentifiedSchema,
	replaceAll,
	resolveRef,
	rootOf,
	UnresolvedRef
} from "./infer.ts"

export type validateJsonSchema<schema, root = schema> =
	null extends undefined ?
		ErrorMessage<"'strict' or 'strictNullChecks' must be set to true in your tsconfig's 'compilerOptions'">
	: [schema] extends [anyOrNever] ? schema
	: [schema] extends [StaticallyValidDocument] ? KeywordCompletions
	: JsonSchema extends schema ? schema | KeywordCompletions
	: [schema] extends [boolean] ? schema
	: // when the root is the schema itself, each member of a union is its own root for `$ref`
	{ root: root; schema: schema } extends { root: schema; schema: root } ?
		validateDocument<schema>
	:	// a schema validated against a separate root could appear anywhere in it
		validateSchema<schema, root, "branch">

/** each member is checked on its own, so a valid member can't accept an invalid one */
export type validateDocument<schema> =
	(
		schema extends unknown ?
			[schema] extends [checkDocument<schema>] ?
				never
			:	schema
		:	never
	) extends never ?
		Extract<schema, boolean> | KeywordCompletions
	: isUnion<schema> extends false ? validateMember<schema, schema, "document">
	: // only invalid members are expected, since the completions of a valid
	// one could accept them
	invalidDocumentMemberOf<schema> extends infer invalid ?
		[invalid] extends [never] ?
			Extract<schema, boolean> | KeywordCompletions
		:	validateDocumentMember<invalid>
	:	never

export type isUnion<t, members = t> =
	t extends unknown ?
		[members] extends [t] ?
			false
		:	true
	:	never

export type validateDocumentMember<schema> =
	schema extends unknown ? validateMember<schema, schema, "document"> : never

export type invalidDocumentMemberOf<schema> =
	schema extends unknown ?
		[schema] extends [checkDocument<schema>] ? never
		: [schema] extends [validateMember<schema, schema, "document">] ? never
		: schema
	:	never

/** where a subschema appears, which determines whether its `required` keys
 * are checked: only on a path from the document root along which no other
 * schema could apply to the same instance */
export type SchemaPosition = "document" | "branch" | "subschema"

export type validateSchema<schema, root, position extends SchemaPosition> =
	[schema] extends [StaticallyValidSchemaObject] ? KeywordCompletions
	: [schema] extends [boolean] ? schema
	: JsonSchema extends schema ? schema
	: [schema] extends [checkSchema<schema, root>] ?
		Extract<schema, boolean> | KeywordCompletions
	:	validateSubschema<schema, root, position>

/** a member of a union that passes on its own expects only what it is, since
 * the completions of its subschemas could accept an invalid sibling */
export type validateSubschema<schema, root, position extends SchemaPosition> =
	schema extends StaticallyValidSchema ? StaticallyValidSchema
	: [schema] extends [checkSchema<schema, root>] ?
		schema & closedKeywordsOf<schema>
	:	validateMember<schema, root, position>

/** keywords a schema doesn't have, so a sibling with more keywords isn't
 * accepted as a subtype of it */
export type closedKeywordsOf<schema> = {
	[k in Exclude<KeywordName, keyof schema>]?: never
}

export type validateMember<schema, root, position extends SchemaPosition> =
	schema extends boolean ? schema
	: schema extends array ? ErrorMessage<writeInvalidSchemaMessage<"array">>
	: schema extends IdentifiedSchema ?
		validateKeywords<
			schema,
			position extends "document" ? schema : rootOf<schema, root>,
			position
		>
	: schema extends object ? validateKeywords<schema, root, position>
	: ErrorMessage<writeInvalidSchemaMessage<domainOf<schema>>>

export type validateKeywords<schema, root, position extends SchemaPosition> = {
	[k in keyof schema | KeywordName]?: k extends keyof schema ?
		k extends ValidatedKeyword ?
			| (k extends "type" ? validateTypeKeyword<schema[k]>
			  : k extends "required" ?
					position extends "branch" ? completeRequired<schema[k], schema>
					: schema extends SelfContainedSchema ?
						validateRequired<schema[k], propertyKeyOf<schema["properties"]>>
					:	completeRequired<schema[k], schema>
			  : k extends "properties" ?
					validateSchemaRecord<
						schema[k],
						root,
						propertyPositionOf<schema, position>
					>
			  : k extends "additionalProperties" ?
					validateSchema<schema[k], root, propertyPositionOf<schema, position>>
			  : k extends "items" ?
					validateItems<schema[k], root, itemPositionOf<schema, position>>
			  : k extends "prefixItems" ?
					validateSchemaList<schema[k], root, itemPositionOf<schema, position>>
			  : k extends SchemaKeyword | BranchKeyword ?
					validateSchema<schema[k], root, "branch">
			  : k extends CompositionKeyword ?
					validateSchemaList<schema[k], root, "branch">
			  : k extends "$ref" ? validateRef<schema[k], root>
			  : k extends CountKeyword ? validateCount<schema[k], k>
			  : k extends "multipleOf" ? validateMultipleOf<schema[k]>
			  : k extends keyof KeywordValueTypes ? KeywordValueTypes[k]
			  : k extends SchemaRecordKeyword ?
					validateSchemaRecord<schema[k], root, "branch">
			  : k extends "dependencies" ? validateDependencies<schema[k], root>
			  : k extends "dependentRequired" ? validateDependentRequired<schema[k]>
			  : k extends "additionalItems" ?
					validateSchema<schema[k], root, "branch">
			  : k extends UnsupportedKeyword ?
					// a widened schema type may omit it
					undefined extends schema[k] ?
						schema[k]
					:	ErrorMessage<writeUnsupportedKeywordMessage<k>>
			  : k extends ExclusiveBoundKeyword ?
					schema[k] extends boolean ?
						ErrorMessage<writeUnsupportedKeywordMessage<`boolean ${k}`>>
					: schema[k] extends number | boolean | undefined ? schema[k]
					: number
			  : k extends "propertyNames" ? validatePropertyNames<schema[k], root>
			  : schema[k])
			| (undefined extends schema[k] ? undefined : never)
		: k extends "components" ?
			position extends "document" ?
				validateComponents<schema[k], root>
			:	schema[k]
		:	schema[k]
	:	never
}

export type validateSchemaRecord<
	schemas,
	root,
	position extends SchemaPosition
> =
	schemas extends array ? { readonly [k: string]: boolean | object }
	: schemas extends StaticallyValidSchemaRecord ?
		{ [k in keyof schemas]: StaticallyValidSchemaCompletions }
	: schemas extends object ?
		{ [k in keyof schemas]: validateSchema<schemas[k], root, position> }
	:	{ readonly [k: string]: boolean | object }

/** schema lists (allOf, anyOf, oneOf, prefixItems and draft-07 items) must be non-empty */
export type validateSchemaList<schemas, root, position extends SchemaPosition> =
	schemas extends readonly [] ?
		readonly [boolean | object, ...(boolean | object)[]]
	: schemas extends array<StaticallyValidSchema> ?
		// mapped, so a tuple keeps its length and a union's empty member is rejected
		{ [i in keyof schemas]: StaticallyValidSchemaCompletions }
	: schemas extends array ?
		{ [i in keyof schemas]: validateSchema<schemas[i], root, position> }
	:	readonly (boolean | object)[]

/** unlike prefixItems, a draft-07 items array is never on a checked path */
export type validateItems<items, root, position extends SchemaPosition> =
	JsonSchema extends items ? items
	: [items] extends [array] ? validateSchemaList<items, root, "branch">
	: [items] extends [Exclude<items, array>] ?
		validateSchema<items, root, position>
	:	| validateSchemaList<Extract<items, array>, root, "branch">
		| validateSubschema<Exclude<items, array>, root, position>

export type validateDependencies<dependencies, root> =
	dependencies extends array ?
		{ readonly [k: string]: boolean | object | readonly string[] }
	: dependencies extends StaticDependencies ? DependencyCompletions
	: dependencies extends object ?
		{ [k in keyof dependencies]: validateDependency<dependencies[k], root> }
	:	{ readonly [k: string]: boolean | object | readonly string[] }

export type validateDependency<dependency, root> =
	[dependency] extends [array] ? validateRequired<dependency, string>
	: [dependency] extends [Exclude<dependency, array>] ?
		validateSchema<dependency, root, "branch">
	:	| validateRequired<Extract<dependency, array>, string>
		| validateSubschema<Exclude<dependency, array>, root, "branch">

export type validateDependentRequired<dependencies> =
	dependencies extends array ? { readonly [k: string]: readonly string[] }
	: dependencies extends object ?
		{ [k in keyof dependencies]: validateRequired<dependencies[k], string> }
	:	{ readonly [k: string]: readonly string[] }

export type validateComponents<components, root> =
	components extends { schemas: unknown } ?
		{
			[k in keyof components]: k extends "schemas" ?
				validateSchemaRecord<components[k], root, "branch">
			:	components[k]
		}
	:	components

/** a union of every type name (like JSONSchema6TypeName, which adds "any")
 * is widened */
export type validateTypeKeyword<name> =
	JsonSchema.TypeName extends Extract<name, string> ? name
	: name extends readonly [] ?
		readonly [JsonSchema.TypeName, ...JsonSchema.TypeName[]]
	: name extends array ?
		{ [i in keyof name]: validateEntry<name[i], JsonSchema.TypeName> }
	:	validateEntry<name, JsonSchema.TypeName>

export type validateRequired<keys, key> =
	keys extends array<string> ?
		{ [i in keyof keys]: validateEntry<keys[i], key> }
	:	readonly string[]

/** required keys another schema could declare: any string is valid, and the
 * schema's own properties are offered */
export type completeRequired<keys, schema> =
	keys extends array<string> ?
		{
			[i in keyof keys]:
				| propertyKeyOf<schema["properties" & keyof schema]>
				| (string & {})
		}
	:	readonly string[]

export type validateEntry<value, entry> =
	value extends entry ? value
	: value extends string ?
		string extends value ?
			value
		:	entry
	:	entry

export type validateCount<n, keyword extends string> =
	n extends number ?
		checkCount<n> extends never ?
			ErrorMessage<writeInvalidCountMessage<keyword, n>>
		:	n
	:	number

export type validateMultipleOf<n> =
	n extends number ?
		checkMultipleOf<n> extends never ?
			ErrorMessage<writeInvalidMultipleOfMessage<n>>
		:	n
	:	number

export type validateRef<ref, root> =
	ref extends LocalRef ?
		resolveRef<ref, root> extends UnresolvedRef ?
			{} extends Record<ref, 0> ? ref
			: root extends UnresolvedRef ? ref
			: ref extends PercentEncodedRef ? ref
			: "#" | definitionRefOf<root>
		:	ref
	: ref extends "" ? ref | "#" | definitionRefOf<root>
	: ref extends string ? ref
	: string

/** a percent-encoded ref, which isn't decoded and is accepted like a widened
 * ref */
export type PercentEncodedRef = `${string}%${string}`

/** a conditional, so a message prints the refs rather than this alias */
export type definitionRefOf<root> =
	root extends object ?
		| (root extends { $defs?: infer definitions } ?
				containerRefOf<definitions, "$defs">
		  :	never)
		| (root extends { definitions?: infer definitions } ?
				containerRefOf<definitions, "definitions">
		  :	never)
		| (root extends { components: { schemas?: infer definitions } } ?
				containerRefOf<definitions, "components/schemas">
		  :	never)
	:	never

export type containerRefOf<definitions, path extends string> =
	definitions extends array ? never
	: definitions extends object ?
		`#/${path}/${escapePointerSegment<`${keyof definitions & (string | number)}`>}`
	:	never

/** escape a JSON pointer segment (RFC 6901), then the `%` of the URI fragment
 * it is written in, which is percent-decoded before the pointer is split */
export type escapePointerSegment<segment extends string> = replaceAll<
	replaceAll<replaceAll<segment, "~", "~0">, "/", "~1">,
	"%",
	"%25"
>

export type validatePropertyNames<schema, root> =
	[nonStringNamesOf<schema>] extends [never] ?
		validateSchema<schema, root, "branch">
	: nonStringNamesOf<schema> extends infer invalid ?
		{
			[k in keyof invalid]: k extends "type" ?
				invalid[k] extends array ?
					readonly ["string", ...JsonSchema.TypeName[]]
				:	"string"
			:	invalid[k]
		}
	:	never

/** propertyNames schemas whose type admits no strings */
export type nonStringNamesOf<schema> =
	schema extends TypedSchema ?
		"string" extends typeNameOf<schema["type"]> ?
			never
		:	schema
	:	never

export type typeNameOf<type> = type extends array ? type[number] : type

/** the position of a `properties` or `additionalProperties` subschema, which
 * no other subschema of an isolated schema applies to */
export type propertyPositionOf<schema, position extends SchemaPosition> =
	position extends "branch" ? "branch"
	: schema extends IsolatedSchema ? "subschema"
	: "branch"

/** the position of an `items` or `prefixItems` subschema, which `contains`
 * may also apply to */
export type itemPositionOf<schema, position extends SchemaPosition> =
	"contains" extends keyof schema ? "branch"
	:	propertyPositionOf<schema, position>

export type propertyKeyOf<properties> =
	properties extends array ? string
	: properties extends object ?
		(keyof properties & string) | `${keyof properties & number}`
	:	string

/** a schema whose own `properties` are the only keys it can declare */
export interface SelfContainedSchema extends IsolatedSchema {
	properties: unknown
	additionalProperties?: false
}

/** a schema with no keyword that applies another subschema to the instance
 * or to one of its properties. It extends KeywordObject so any schema shares
 * a property with it, which TS requires of a type whose keys are optional. */
export interface IsolatedSchema extends KeywordObject {
	patternProperties?: never
	unevaluatedProperties?: never
	allOf?: never
	anyOf?: never
	oneOf?: never
	if?: never
	then?: never
	else?: never
	dependentSchemas?: never
	dependencies?: never
	$ref?: never
	$dynamicRef?: never
	$recursiveRef?: never
}

export type SchemaKeyword =
	| "additionalProperties"
	| "contains"
	| "contentSchema"

/** keywords jsonSchemaToType throws on, since it can't read them exactly */
export type UnsupportedKeyword =
	| "$dynamicRef"
	| "$recursiveRef"
	| "unevaluatedItems"
	| "unevaluatedProperties"

/** a draft-04 boolean exclusive bound is unsupported */
export type ExclusiveBoundKeyword = "exclusiveMinimum" | "exclusiveMaximum"

export type BranchKeyword = "not" | "if" | "then" | "else"

export type CompositionKeyword = "allOf" | "anyOf" | "oneOf"

export type PropertiesKeyword = "properties" | "patternProperties"

export type SchemaRecordKeyword =
	| PropertiesKeyword
	| "$defs"
	| "definitions"
	| "dependentSchemas"

export type CountKeyword =
	| "minLength"
	| "maxLength"
	| "minItems"
	| "maxItems"
	| "minProperties"
	| "maxProperties"
	| "minContains"
	| "maxContains"

export type KeywordValueTypes = {
	minimum: number
	maximum: number
	enum: readonly unknown[]
	pattern: string | RegExp
	format: string
	uniqueItems: boolean
	nullable: boolean
}

export type ValidatedKeyword =
	| SchemaKeyword
	| BranchKeyword
	| CompositionKeyword
	| SchemaRecordKeyword
	| CountKeyword
	| keyof KeywordValueTypes
	| "type"
	| "required"
	| "items"
	| "prefixItems"
	| "$ref"
	| "multipleOf"
	| "dependencies"
	| "dependentRequired"
	| "additionalItems"
	| UnsupportedKeyword
	| ExclusiveBoundKeyword
	| "propertyNames"

export type KeywordName =
	| ValidatedKeyword
	| "const"
	| "title"
	| "description"
	| "default"
	| "examples"
	| "deprecated"
	| "readOnly"
	| "writeOnly"
	| "$comment"
	| "$schema"
	| "$id"
	| "$anchor"
	| "$dynamicAnchor"
	| "$vocabulary"
	| "contentEncoding"
	| "contentMediaType"

/** schemas whose validity can be checked without generic instantiations */
export type StaticallyValidSchema = boolean | StaticallyValidSchemaObject

export interface StaticallyValidSchemaObject extends ContextFreeKeywords {
	required?: never
	$ref?: never
	multipleOf?: never
	minLength?: never
	maxLength?: never
	minItems?: never
	maxItems?: never
	minProperties?: never
	maxProperties?: never
	minContains?: never
	maxContains?: never
	additionalItems?: never
	propertyNames?: never
	properties?: StaticallyValidObjectRecord
	patternProperties?: StaticallyValidObjectRecord
	$defs?: StaticallyValidObjectRecord
	definitions?: StaticallyValidObjectRecord
	dependentSchemas?: StaticallyValidObjectRecord
	dependencies?: StaticDependencies
	items?: StaticallyValidSchema | StaticallyValidObjectList
	prefixItems?: StaticallyValidObjectList
	allOf?: StaticallyValidObjectList
	anyOf?: StaticallyValidObjectList
	oneOf?: StaticallyValidObjectList
	not?: StaticallyValidSchema
	if?: StaticallyValidSchema
	then?: StaticallyValidSchema
	else?: StaticallyValidSchema
	contains?: StaticallyValidSchema
	additionalProperties?: StaticallyValidSchema
	contentSchema?: StaticallyValidSchema
	unevaluatedProperties?: never
	unevaluatedItems?: never
	$dynamicRef?: never
	$recursiveRef?: never
}

/** keywords whose values are valid whatever else the schema contains */
export interface ContextFreeKeywords {
	type?:
		| JsonSchema.TypeName
		| readonly [JsonSchema.TypeName, ...JsonSchema.TypeName[]]
	dependentRequired?: DependentRequired
	minimum?: number
	maximum?: number
	exclusiveMinimum?: number
	exclusiveMaximum?: number
	enum?: readonly unknown[]
	pattern?: string | RegExp
	format?: string
	uniqueItems?: boolean
	nullable?: boolean
	const?: unknown
	title?: unknown
	description?: unknown
	default?: unknown
	examples?: unknown
	deprecated?: unknown
	readOnly?: unknown
	writeOnly?: unknown
	$comment?: unknown
	$schema?: unknown
	$id?: unknown
	$anchor?: unknown
	$dynamicAnchor?: unknown
	$vocabulary?: unknown
	contentEncoding?: unknown
	contentMediaType?: unknown
}

/** an OpenAPI document's `components.schemas` is a record of schemas */
export interface StaticallyValidDocument extends StaticallyValidSchemaObject {
	components?: { schemas?: StaticallyValidObjectRecord }
}

/** object schemas only, since relating each element to a union with
 * `boolean` costs a level of relation depth (TS2321 past about 33 levels of
 * nesting). A boolean element falls back to ValidSchemaObject. */
export type StaticallyValidObjectList = readonly [
	StaticallyValidSchemaObject,
	...StaticallyValidSchemaObject[]
]

export interface StaticallyValidObjectRecord {
	readonly [k: string]: StaticallyValidSchemaObject
}

export type StaticallyValidSchemaList = readonly [
	StaticallyValidSchema,
	...StaticallyValidSchema[]
]

export interface StaticallyValidSchemaRecord {
	readonly [k: string]: StaticallyValidSchema
}

export interface StaticDependencies {
	readonly [k: string]: StaticallyValidSchema | readonly string[]
}

export interface DependentRequired {
	readonly [k: string]: readonly string[]
}

/** a schema object whose keywords are checked in a single pass, falling back
 * to validateKeywords for errors if any check fails */
export interface ValidSchemaObject<schema extends KeywordObject, root>
	extends ContextFreeKeywords {
	required?: array<keyof schema["properties"] & string>
	$ref?: checkRef<schema["$ref"], root>
	multipleOf?: checkMultipleOf<schema["multipleOf"]>
	minLength?: checkCount<schema["minLength"]>
	maxLength?: checkCount<schema["maxLength"]>
	minItems?: checkCount<schema["minItems"]>
	maxItems?: checkCount<schema["maxItems"]>
	minProperties?: checkCount<schema["minProperties"]>
	maxProperties?: checkCount<schema["maxProperties"]>
	minContains?: checkCount<schema["minContains"]>
	maxContains?: checkCount<schema["maxContains"]>
	properties?: checkRecord<schema["properties"], root>
	patternProperties?: checkRecord<schema["patternProperties"], root>
	$defs?: checkRecord<schema["$defs"], root>
	definitions?: checkRecord<schema["definitions"], root>
	dependentSchemas?: checkRecord<schema["dependentSchemas"], root>
	dependencies?: checkDependencies<schema["dependencies"], root>
	items?: checkItems<schema["items"], root>
	prefixItems?: checkList<schema["prefixItems"], root>
	allOf?: checkList<schema["allOf"], root>
	anyOf?: checkList<schema["anyOf"], root>
	oneOf?: checkList<schema["oneOf"], root>
	not?: checkSchema<schema["not"], root>
	if?: checkSchema<schema["if"], root>
	then?: checkSchema<schema["then"], root>
	else?: checkSchema<schema["else"], root>
	contains?: checkSchema<schema["contains"], root>
	additionalProperties?: checkSchema<schema["additionalProperties"], root>
	unevaluatedProperties?: never
	unevaluatedItems?: never
	$dynamicRef?: never
	$recursiveRef?: never
	contentSchema?: checkSchema<schema["contentSchema"], root>
	additionalItems?: checkSchema<schema["additionalItems"], root>
	propertyNames?: checkPropertyNames<schema["propertyNames"], root>
	components?: checkComponents<schema["components" & keyof schema], root>
}

export type checkDocument<schema> =
	schema extends KeywordObject ? ValidSchemaObject<schema, schema>
	:	checkSchema<schema, schema>

/** `unknown` is also the value of a keyword the schema doesn't have, which
 * accepts nothing, so one union member's check can't accept another's */
export type checkSchema<schema, root> =
	JsonSchema extends schema ?
		unknown extends schema ?
			never
		:	unknown
	: schema extends StaticallyValidSchema ? StaticallyValidSchema
	: schema extends ResourcelessKeywordObject ? ValidSchemaObject<schema, root>
	: schema extends KeywordObject ?
		ValidSchemaObject<
			schema,
			schema extends IdentifiedSchema ? rootOf<schema, root> : root
		>
	:	never

/** checks that return the value they were given, so a union member can't be
 * mistaken for a valid sibling */
export type checkRecord<schemas, root> =
	schemas extends StaticallyValidSchemaRecord ? StaticallyValidSchemaRecord
	: schemas extends array ? never
	: schemas extends object ?
		{ [k in keyof schemas]: checkSchema<schemas[k], root> }
	:	never

export type checkList<schemas, root> =
	schemas extends StaticallyValidSchemaList ? StaticallyValidSchemaList
	: schemas extends readonly [] ? never
	: schemas extends array ?
		{ [i in keyof schemas]: checkSchema<schemas[i], root> }
	:	never

export type checkItems<items, root> =
	JsonSchema extends items ?
		unknown extends items ?
			never
		:	unknown
	: items extends array ? checkList<items, root>
	: checkSchema<items, root>

export type checkDependencies<dependencies, root> =
	dependencies extends StaticDependencies ? StaticDependencies
	: dependencies extends array ? never
	: dependencies extends object ?
		{ [k in keyof dependencies]: checkDependency<dependencies[k], root> }
	:	never

export type checkDependency<dependency, root> =
	dependency extends array<string> ? readonly string[]
	:	checkSchema<dependency, root>

export type checkComponents<components, root> =
	components extends { schemas: unknown } ?
		{ schemas?: checkRecord<components["schemas"], root> }
	:	components

export type checkPropertyNames<schema, root> =
	[nonStringNamesOf<schema>] extends [never] ? checkSchema<schema, root> : never

export interface TypedSchema {
	type: unknown
}

export type checkCount<n> =
	n extends number ?
		`${n}` extends NonCountString ?
			`${n}` extends LargeIntegerString ?
				n
			:	never
		:	n
	: n extends undefined ? n
	: never

/** a number that may not be a non-negative integer when printed this way */
export type NonCountString =
	| `-${string}`
	| `${string}${"." | "e"}${string}`
	| "Infinity"

/** positive numbers of at least 1e21 print in exponent form and are integers */
export type LargeIntegerString = `${Digit}${string}e+${string}`

export type checkMultipleOf<n> =
	n extends number ?
		`${n}` extends NonPositiveString ?
			never
		:	n
	: n extends undefined ? n
	: never

export type NonPositiveString = `-${string}` | "0"

export type checkRef<ref, root> =
	ref extends LocalRef ?
		resolveRef<ref, root> extends UnresolvedRef ?
			{} extends Record<ref, 0> ? string
			: root extends UnresolvedRef ? string
			: ref extends PercentEncodedRef ? string
			: never
		:	string
	: ref extends "" ? never
	: ref extends string | undefined ? ref
	: never

export type LocalRef = "#" | `#/${string}`

/** keyword names offered as completions for a valid schema, which any
 * schema type (including an interface) is assignable to */
export interface KeywordCompletions extends SubschemaCompletions {
	[k: string]: any
}

/** completions without an index signature, which would make the elements
 * of an array literal `any` in a slot that also accepts a list */
export interface SubschemaCompletions extends KeywordObject {
	properties?: SchemaRecordCompletions
	patternProperties?: SchemaRecordCompletions
	$defs?: SchemaRecordCompletions
	definitions?: SchemaRecordCompletions
	dependentSchemas?: SchemaRecordCompletions
	dependencies?: DependencyCompletions
	items?: SchemaCompletions | readonly SchemaCompletions[]
	prefixItems?: readonly SchemaCompletions[]
	allOf?: readonly SchemaCompletions[]
	anyOf?: readonly SchemaCompletions[]
	oneOf?: readonly SchemaCompletions[]
	not?: SchemaCompletions
	if?: SchemaCompletions
	then?: SchemaCompletions
	else?: SchemaCompletions
	contains?: SchemaCompletions
	additionalProperties?: SchemaCompletions
	additionalItems?: SchemaCompletions
	propertyNames?: SchemaCompletions
	contentSchema?: SchemaCompletions
	/** without `schemas`, an unknown keyword */
	components?: {} | null | undefined | { schemas?: SchemaRecordCompletions }
}

/** a statically valid schema, whose unknown keywords aren't excess properties */
export type StaticallyValidSchemaCompletions =
	| boolean
	| StaticallyValidSchemaObjectCompletions

export interface StaticallyValidSchemaObjectCompletions
	extends StaticallyValidSchemaObject {
	[k: string]: any
}

/** `{}` relates a subschema without comparing it to the deeply nested
 * completions (it has already been validated), and with `null | undefined`
 * admits a widened `unknown` subschema */
export type SchemaCompletions = {} | null | undefined | SubschemaCompletions

/** `object` admits interfaces, which have no implicit index signature */
export type SchemaRecordCompletions =
	| object
	| { readonly [k: string]: SchemaCompletions }

export type DependencyCompletions =
	| object
	| { readonly [k: string]: SchemaCompletions | readonly string[] }

export type KeywordObject = { [k in KeywordName]?: unknown }

/** a schema object whose local refs resolve against the enclosing resource */
export interface ResourcelessKeywordObject extends KeywordObject {
	$id?: Anchor
	id?: Anchor
}

export type writeInvalidSchemaMessage<actual extends string> =
	`JSON Schema must be an object or a boolean (was ${actual})`

export type writeInvalidCountMessage<
	keyword extends string,
	value extends number
> = `${keyword} must be a non-negative integer (was ${value})`

export type writeInvalidMultipleOfMessage<value extends number> =
	`multipleOf must be a positive number (was ${value})`

export type writeUnsupportedKeywordMessage<keyword extends string> =
	`${keyword} isn't supported by jsonSchemaToType`
