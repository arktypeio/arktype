import type {
	anyOrNever,
	array,
	JsonPrimitive,
	noSuggest,
	NonNegativeIntegerLiteral
} from "@ark/util"
import type { InferredJsonSchema } from "./jsonSchema.ts"

export type inferJsonSchema<schema, root = schema> =
	// when the root is the schema itself, each member of a union is its own root for `$ref`
	{ root: root; schema: schema } extends { root: schema; schema: root } ?
		// a schema's own inference is only valid against its own root
		schema extends InferredJsonSchema<infer t> ?
			t
		:	inferSchema<schema, schema, never>
	:	inferSchema<schema, root, never>

/** a schema whose keywords are all optional may be `{}`, so infers `unknown` */
export type inferWidened<schema> =
	[schema] extends [anyOrNever] ? schema : unknown

export type inferSchema<schema, root, seen> =
	{} extends schema ? inferWidened<schema>
	: schema extends StringSchema ?
		schema["type"] extends "string" ?
			string
		:	unknown
	: schema extends NumberSchema ? number
	: schema extends BooleanSchema ? boolean
	: schema extends NullSchema ? null
	: schema extends ObjectSchema ? inferObject<schema, root>
	: schema extends ArraySchema ? inferArray<schema, root, seen>
	: schema extends RefOnlySchema ? inferRef<schema["$ref"], root, seen>
	: schema extends boolean ?
		schema extends true ?
			unknown
		:	never
	: // before 2019-09, a `$ref`'s siblings are ignored. Every other node shares
	// one inferNode, since inferring a generic schema walks each instantiation
	(schema extends RefNode ? draftsOf<root> : "2020-12") extends "2020-12" ?
		inferNode<
			schema,
			schema extends IdentifiedSchema ? rootOf<schema, root> : root,
			keyof schema & PartKeyword,
			seen
		>
	: "2020-12" extends draftsOf<root> ?
		// a dialect that may be 2020-12 may apply `nullable` beside the `$ref`
		applyNullable<
			schema,
			inferRef<schema["$ref" & keyof schema], resourceOf<schema, root>, seen>
		>
	:	inferRef<schema["$ref" & keyof schema], resourceOf<schema, root>, seen>

/** excludes `nullable`, including from an index signature that may hold it,
 * which an optional `nullable?: never` wouldn't */
export interface NonNullableNode {
	[k: `nullable${string}`]: never
}

/** keywords whose absence allows a `type` to be inferred directly */
export interface Unmodified extends NonNullableNode {
	$ref?: never
	$id?: Anchor
	id?: Anchor
	const?: never
	enum?: never
	allOf?: never
	anyOf?: never
	oneOf?: never
	not?: never
	if?: never
}

/** an `$id` that doesn't start a new resource */
export type Anchor = `#${string}`

export type IdentifiedSchema = { $id: unknown } | { id: string }

/** the resource local refs resolve against. Before 2019-09, a `$ref`'s
 * siblings (including its identifier) are ignored */
export type rootOf<schema extends IdentifierKeywords, root> =
	schema extends RefNode ?
		draftsOf<root> extends "2020-12" ? resourceRootOf<schema, root>
		: draftsOf<root> extends SiblinglessRefDraft ? root
		: sameRoot<resourceRootOf<schema, root>, root>
	:	resourceRootOf<schema, root>

export interface RefNode {
	$ref: unknown
}

export interface IdentifierKeywords {
	$id?: unknown
	id?: unknown
}

/** draft-04 (and earlier) identifies a resource with `id`, later drafts with
 * `$id`, so where either may apply, a node identified by only one of them
 * has refs that can't be resolved */
export type resourceRootOf<schema extends IdentifierKeywords, root> =
	draftsOf<root> extends "2020-12" ? identifiedRootOf<"$id", schema, root>
	: draftsOf<root> extends "draft-04" ? identifiedRootOf<"id", schema, root>
	: "draft-04" extends draftsOf<root> ?
		sameRoot<
			identifiedRootOf<"id", schema, root>,
			identifiedRootOf<"$id", schema, root>
		>
	:	identifiedRootOf<"$id", schema, root>

/** a node without the identifier indexes it as `unknown` like a widened one */
export type identifiedRootOf<
	key extends keyof IdentifierKeywords,
	schema extends IdentifierKeywords,
	root
> =
	string extends schema[key] ?
		[schema, root] extends [root, schema] ? root
		: schema extends { [_ in key]: unknown } ? UnresolvedRef
		: root
	: schema[key] extends Anchor ? root
	: resourceIn<schema, root>

/** an embedded resource is read in its document's dialect unless it declares
 * its own */
export type resourceIn<schema, root> =
	"$schema" extends keyof schema ? schema
	: draftsOf<root> extends "2020-12" ? schema
	: schema & { $schema: root["$schema" & keyof root] }

/** a root that differs between the dialects a document may be read as can't
 * be resolved */
export type sameRoot<resource, root> =
	[resource, root] extends [root, resource] ? root : UnresolvedRef

/** the dialects a document may be read as: without `$schema`, it is read as
 * 2020-12 (as is any other known `$schema`), and a widened one may be any */
export type draftsOf<root> =
	"$schema" extends keyof root ? draftOf<root["$schema" & keyof root]>
	:	"2020-12"

export type draftOf<uri> =
	uri extends Draft04Uri ? "draft-04"
	: uri extends LegacyDraftUri ? "draft-07"
	: uri extends string ?
		{} extends Record<uri, 0> ?
			Draft
		:	"2020-12"
	: unknown extends uri ? Draft
	: "2020-12"

/** dialects that differ in how they identify resources and read `$ref` */
export type Draft = "draft-04" | "draft-07" | "2020-12"

export type SiblinglessRefDraft = "draft-04" | "draft-07"

export type Draft04Uri =
	`${string}json-schema.org/draft-0${0 | 1 | 2 | 3 | 4 | 5}/${string}`

/** draft-06 and draft-07, which ignore a `$ref`'s siblings like draft-04 */
export type LegacyDraftUri = `${string}json-schema.org/draft-0${string}`

export interface StringSchema extends Unmodified {
	type: "string"
}

export interface NumberSchema extends Unmodified {
	type: "number" | "integer"
}

export interface BooleanSchema extends Unmodified {
	type: "boolean"
}

export interface NullSchema extends Unmodified {
	type: "null"
}

export interface ObjectSchema extends Unmodified {
	type: "object"
}

export interface ArraySchema extends Unmodified {
	type: "array"
}

/** a `$ref` without siblings that would need to be intersected with its target */
export interface RefOnlySchema extends NonNullableNode {
	$ref: unknown
	$id?: Anchor
	type?: never
	properties?: never
	required?: never
	additionalProperties?: never
	patternProperties?: never
	items?: never
	prefixItems?: never
	const?: never
	enum?: never
	allOf?: never
	anyOf?: never
	oneOf?: never
	then?: never
	not?: never
}

export type inferNode<
	schema,
	root,
	keys extends keyof schema & PartKeyword,
	seen
> =
	schema extends UnmodifiedNode ? inferParts<schema, root, keys, seen>
	:	applyModifiers<schema, inferParts<schema, root, keys, seen>>

/** a single kind or a common pair is intersected directly, which is cheaper
 * than collecting every part for intersectParts */
export type inferParts<
	schema,
	root,
	keys extends keyof schema & PartKeyword,
	seen
> =
	PartKinds[keys] extends "base" ? inferBase<schema, root, seen>
	: PartKinds[keys] extends "$ref" ? inferRef<schema[keys], root, seen>
	: PartKinds[keys] extends "anyOf" ? inferBranches<schema[keys], root, seen>
	: PartKinds[keys] extends "oneOf" ? inferBranches<schema[keys], root, seen>
	: PartKinds[keys] extends "const" ? inferConst<schema[keys]>
	: PartKinds[keys] extends "enum" ? inferEnum<schema[keys]>
	: PartKinds[keys] extends "allOf" ?
		intersectBranches<schema[keys], root, seen>
	: PartKinds[keys] extends "base" | "enum" ?
		filterBase<schema, root, seen, inferEnum<schema["enum" & keyof schema]>>
	: PartKinds[keys] extends "base" | "const" ?
		filterBase<schema, root, seen, inferConst<schema["const" & keyof schema]>>
	: PartKinds[keys] extends "base" | "oneOf" ?
		intersect<
			inferBase<schema, root, seen>,
			inferBranches<schema["oneOf" & keyof schema], root, seen>
		>
	: PartKinds[keys] extends "base" | "anyOf" ?
		intersect<
			inferBase<schema, root, seen>,
			inferBranches<schema["anyOf" & keyof schema], root, seen>
		>
	: PartKinds[keys] extends "base" | "allOf" ?
		intersect<
			inferBase<schema, root, seen>,
			intersectBranches<schema["allOf" & keyof schema], root, seen>
		>
	: PartKinds[keys] extends "then" ? inferConditional<schema, root, seen>
	: PartKinds[keys] extends "base" | "then" ?
		intersect<
			inferBase<schema, root, seen>,
			inferConditional<schema, root, seen>
		>
	: keepsValues<schema> extends true ?
		intersect<
			"const" extends keyof schema ? inferConst<schema["const" & keyof schema]>
			:	unknown,
			"enum" extends keyof schema ? inferEnum<schema["enum" & keyof schema]>
			:	unknown
		>
	:	intersectParts<{
			[k in keys as PartKinds[k]]: inferPart<k, schema, root, seen>
		}>

/** whether `const` or `enum` values are kept unfiltered, since they're
 * structured and filtering them against parts that may recurse back to the
 * node can't be deferred */
export type keepsValues<schema> =
	[schema] extends [PrimitiveValuesSchema] ? false : containsRef<schema>

/** a schema whose `const` and `enum` values are intersected without
 * reading the other parts */
export interface PrimitiveValuesSchema {
	const?: JsonPrimitive
	enum?: readonly JsonPrimitive[]
	[k: string]: unknown
}

/** whether a ref in `nodes` or their inferred subschemas could recurse */
export type containsRef<nodes> =
	[nodes] extends [never] ? false
	: true extends (nodes extends { $ref: unknown } ? true : false) ? true
	: containsRef<subschemasOf<nodes>>

export type subschemasOf<node> =
	node extends SubschemaNode ?
		| (node[SubschemaKeyword & keyof node] extends infer subschema ?
				subschema extends array ?
					subschema[number]
				:	subschema
		  :	never)
		| (node[SubschemaRecordKeyword & keyof node] extends infer record ?
				record[keyof record]
		  :	never)
	:	never

export type intersectParts<parts> =
	parts extends (
		{
			base?: infer base
			$ref?: infer ref
			const?: infer constValue
			enum?: infer enumValue
			allOf?: infer allOf
			anyOf?: infer anyOf
			oneOf?: infer oneOf
			then?: infer conditional
		}
	) ?
		[parts[keyof parts]] extends [JsonPrimitive] ?
			unknown extends parts[keyof parts] ?
				filterValues<
					intersect<
						intersect<base, ref>,
						intersect<intersect<allOf, anyOf>, intersect<oneOf, conditional>>
					>,
					intersect<constValue, enumValue>
				>
			:	base & ref & constValue & enumValue & allOf & anyOf & oneOf & conditional
		:	filterValues<
				intersect<
					intersect<base, ref>,
					intersect<intersect<allOf, anyOf>, intersect<oneOf, conditional>>
				>,
				intersect<constValue, enumValue>
			>
	:	never

export type inferPart<k extends keyof schema, schema, root, seen> =
	k extends BaseKeyword ? inferBase<schema, root, seen>
	: k extends "$ref" ? inferRef<schema[k], root, seen>
	: k extends "anyOf" | "oneOf" ? inferBranches<schema[k], root, seen>
	: k extends "const" ? inferConst<schema[k]>
	: k extends "enum" ? inferEnum<schema[k]>
	: k extends "allOf" ? intersectBranches<schema[k], root, seen>
	: inferConditional<schema, root, seen>

/** object and array keywords only constrain their own domain, so without a
 * `type` every other JSON value is valid. A node without keywords may be a
 * `jsonSchema.as` value, whose asserted type is trusted */
export type inferBase<schema, root, seen> =
	schema extends TypeListSchema ?
		inferTypeName<schema["type"][number], schema, root, seen>
	: schema extends TypedSchema ?
		inferTypeName<schema["type"], schema, root, seen>
	: schema extends ImpliedObjectSchema ?
		schema extends ImpliedArraySchema ?
			inferArray<
				schema,
				root,
				seen,
				inferObject<schema, root> | string | number | boolean | null
			>
		:	inferObject<schema, root> | string | number | boolean | null | unknown[]
	: schema extends ImpliedArraySchema ?
		inferArray<schema, root, seen, string | number | boolean | null | object>
	: schema extends InferredJsonSchema<infer t> ? t
	: unknown

export interface TypedSchema {
	type: unknown
}

export interface TypeListSchema {
	type: array
}

export type ImpliedObjectSchema =
	| PropertiesSchema
	| { required: unknown }
	| { additionalProperties: unknown }
	| PatternPropertiesSchema

export type ImpliedArraySchema = ItemsSchema | { prefixItems: unknown }

/** JSON has no `undefined`, so a value including it is an optional keyword
 * that may be absent. A widened `object` may also be an array, which an
 * inferred `object` excludes */
export type inferConst<value> =
	value extends undefined ? unknown
	: object extends value ?
		string extends value ?
			value
		:	value | unknown[]
	:	value

export type inferEnum<values> =
	values extends array ?
		object extends values[number] ?
			inferConst<values[number]>
		:	values[number]
	:	unknown

export type PartKinds = {
	type: "base"
	properties: "base"
	required: "base"
	additionalProperties: "base"
	patternProperties: "base"
	items: "base"
	prefixItems: "base"
	$ref: "$ref"
	const: "const"
	enum: "enum"
	allOf: "allOf"
	anyOf: "anyOf"
	oneOf: "oneOf"
	then: "then"
}

export type PartKeyword = keyof PartKinds

export type BaseKeyword = {
	[k in PartKeyword]: PartKinds[k] extends "base" ? k : never
}[PartKeyword]

export type inferConditional<schema, root, seen> =
	schema extends ConditionalSchema ?
		schema["if"] extends true ? inferSchema<schema["then"], root, seen>
		: schema["if"] extends false ? inferSchema<schema["else"], root, seen>
		: inferSchema<schema["then" | "else"], root, seen>
	:	unknown

/** an `if` that may be undefined may be absent, leaving `then` and `else`
 * with no effect */
export interface ConditionalSchema {
	if: {}
	then: unknown
	else: unknown
}

export type applyModifiers<schema, t> =
	schema extends NegatedSchema ?
		skipsNot<schema["not"], schema> extends true ?
			applyNullable<schema, t>
		:	applyNot<schema["not"], applyNullable<schema, t>>
	:	applyNullable<schema, t>

export interface UnmodifiedNode extends NonNullableNode {
	not?: never
	[k: string]: unknown
}

export interface NegatedSchema {
	not: unknown
}

/** whether a `not` that excludes structured values is skipped, since
 * excluding them from parts that may recurse back to the node can't be
 * deferred */
export type skipsNot<negated, schema> =
	negated extends object ?
		keyof negated extends NegatableKeyword ?
			[rejectedValues<negated>] extends [JsonPrimitive] ?
				false
			:	containsRef<schema>
		:	false
	:	false

/** an undefined `not` is absent, and one with other keywords excludes nothing */
export type applyNot<negated, t> =
	negated extends object ?
		keyof negated extends NegatableKeyword ?
			t extends object ? excludeRejected<t, rejectedValues<negated>>
			: t extends JsonPrimitive ? excludeRejected<t, rejectedValues<negated>>
			: jsonValuesWithout<rejectedValues<negated>>
		:	t
	: negated extends true ? never
	: t

/** an element that may be `any` may be any value, though TS relates `[any]`
 * to `readonly [1]`, so only a rejected domain excludes it */
export type excludeRejected<t, rejected> =
	t extends rejected ?
		t extends array ?
			true extends mayBeAny<t[number]> ?
				array extends rejected ?
					never
				:	t
			:	never
		:	never
	:	t

export type mayBeAny<t> =
	0 extends 1 & t ? true
	: t extends array ? mayBeAny<t[number]>
	: false

/** the JSON values a negation doesn't reject, where it rejects at least one
 * whole domain. Non-array objects have no clean display, so keeping them
 * without arrays keeps everything */
export type jsonValuesWithout<rejected> =
	| (string extends rejected ? never : string)
	| (number extends rejected ? never : number)
	| (boolean extends rejected ? never : boolean)
	| (null extends rejected ? never : null)
	| (array extends rejected ?
			JsonObject extends rejected ?
				never
			:	unknown
	  : JsonObject extends rejected ? unknown[]
	  : object | unknown[]) extends infer kept ?
		[string | number | boolean | null | object] extends [kept] ?
			unknown
		:	kept
	:	never

export type NegatableKeyword = ExactKeyword | AnnotationKeyword

export type ExactKeyword = "type" | "const" | "enum"

export type AnnotationKeyword =
	| "title"
	| "description"
	| "default"
	| "examples"
	| "deprecated"
	| "readOnly"
	| "writeOnly"
	| "$comment"

/** values rejected by a negation whichever member of each keyword's union is
 * present, where an undefined member is an absent keyword */
export type rejectedValues<negated> =
	{
		[k in keyof negated]-?: k extends ExactKeyword ? rejectedBy<k, negated[k]>
		:	never
	}[keyof negated] extends (_: infer values) => void ?
		values
	:	never

/** a widened value may be any value, so it provably rejects nothing */
export type rejectedBy<keyword, value> =
	unknown extends value ? (_: never) => void
	: value extends undefined ? (_: unknown) => void
	: (_: rejects<keyword, value>) => void

export type rejects<keyword, value> =
	keyword extends "const" ? unitOf<value>
	: value extends array ?
		number extends value["length"] ?
			never
		:	{
				[i in keyof value]: rejectedByEach<
					keyword extends "type" ? "type" : "const",
					value[i]
				>
			}[number]
	: keyword extends "type" ? domainOf<value>
	: never

/** values rejected whichever member of a union the value is */
export type rejectedByEach<keyword, value> =
	unknown extends value ? never
	: (
		value extends unknown ?
			(_: rejects<keyword, value>) => void
		:	never
	) extends (_: infer values) => void ?
		values
	:	never

/** a literal that is the only JSON value of its type (TS object types are
 * open, so an object is never exact) */
export type unitOf<value> =
	value extends string | number ?
		{} extends { [_ in value]: 0 } ?
			never
		:	value
	: value extends boolean | null ? value
	: value extends array ?
		number extends value["length"] ? never
		: [value] extends (
			[{ [i in keyof value]-?: rejectedByEach<"const", value[i]> }]
		) ?
			value
		:	never
	:	never

export type domainOf<name> =
	name extends keyof TypeDomains ? TypeDomains[name] : never

/** JSON values of each type name, except `integer`, which TS can't express */
export type TypeDomains = {
	string: string
	number: number
	boolean: boolean
	null: null
	object: JsonObject
	array: array
}

/** JSON's non-array objects (TS `object` includes arrays) */
export type JsonObject = object & { length?: never }

/** `nullable` might be `true` (a widened `boolean` or an optional keyword) */
export type applyNullable<schema, t> =
	true extends schema["nullable" & keyof schema] ? t | null : t

/** a widened name (including `any`) may be any type */
export type inferTypeName<name, schema, root, seen> =
	unknown extends name ? unknown
	: name extends keyof PrimitiveTypes ? PrimitiveTypes[name]
	: name extends "object" ? inferObject<schema, root>
	: name extends "array" ? inferArray<schema, root, seen>
	: unknown

export type PrimitiveTypes = {
	string: string
	number: number
	integer: number
	boolean: boolean
	null: null
}

export type intersectBranches<branches, root, seen> = intersectLimited<
	limitUnions<branches, root>,
	root,
	seen
>

export type intersectLimited<branches, root, seen> =
	branches extends readonly [infer head, ...infer tail] ?
		tail extends readonly [] ? inferSchema<head, root, seen>
		: "19" extends keyof tail ?
			intersectAll<intersectBranchPairs<branches, root, seen, []>>
		:	intersectRest<tail, root, seen, inferSchema<head, root, seen>>
	:	unknown

export type intersectBranchPairs<branches, root, seen, paired extends array> =
	branches extends readonly [infer l, infer r, ...infer rest] ?
		intersectBranchPairs<
			rest,
			root,
			seen,
			[
				...paired,
				intersect<inferSchema<l, root, seen>, inferSchema<r, root, seen>>
			]
		>
	: branches extends readonly [infer last, ...unknown[]] ?
		[...paired, inferSchema<last, root, seen>]
	:	paired

/** intersect neighboring pairs until one result remains, so the results of
 * a wide allOf (more than 20 branches) aren't each nested in the one before */
export type intersectAll<results extends array> =
	results extends [infer result] ? result
	:	intersectAll<intersectPairs<results, []>>

export type intersectPairs<results extends array, paired extends array> =
	results extends [infer l, infer r, ...infer rest] ?
		intersectPairs<rest, [...paired, intersect<l, r>]>
	:	[...paired, ...results]

export type intersectRest<branches, root, seen, result> =
	branches extends readonly [infer head, ...infer tail] ?
		tail extends readonly [] ?
			intersect<result, inferSchema<head, root, seen>>
		:	intersectRest<
				tail,
				root,
				seen,
				intersect<result, inferSchema<head, root, seen>>
			>
	:	result

/** each branch that infers a union multiplies the members of the result, so
 * past a few of them, a branch's union keywords are ignored. A nested allOf
 * shares the count, and past it a `$ref` that may lead to more of them is
 * inferred without union keywords at every depth */
export type limitUnions<branches, root> =
	[branches[number & keyof branches]] extends [UnionFreeBranch] ? branches
	: "3" extends keyof branches ? limitedUnions<branches, root>
	: [branches[number & keyof branches]] extends [FlatBranch] ? branches
	: limitedUnions<branches, root>

export type limitedUnions<branches, root> =
	limitUnionsIn<branches, root, [], [], false> extends (
		[infer limited, unknown, true]
	) ?
		limited
	:	branches

/** the limited branches, the union branches counted so far and whether any
 * branch was changed (an unchanged list is kept, so it's inferred once) */
export type limitUnionsIn<
	branches,
	root,
	limited extends array,
	unions extends 1[],
	changed extends boolean
> =
	branches extends readonly [infer head, ...infer tail] ?
		head extends NestedBranch ?
			limitUnionsIn<head["allOf"], root, [], unions, false> extends (
				[infer nested, infer nestedUnions extends 1[], infer nestedChanged]
			) ?
				nestedChanged extends true ?
					limitUnionsIn<
						tail,
						root,
						[
							...limited,
							{ [k in keyof head]: k extends "allOf" ? nested : head[k] }
						],
						nestedUnions,
						true
					>
				:	limitUnionsIn<tail, root, [...limited, head], nestedUnions, changed>
			:	never
		: mayInferUnion<head, root> extends true ?
			unions["length"] extends MaxUnionBranches ?
				limitUnionsIn<
					tail,
					root,
					[...limited, withoutUnions<head>],
					unions,
					true
				>
			:	limitUnionsIn<tail, root, [...limited, head], [...unions, 1], changed>
		:	limitUnionsIn<tail, root, [...limited, head], unions, changed>
	:	[limited, unions, changed]

/** an allOf branch whose own allOf branches are combined with the others */
export interface NestedBranch {
	allOf: array
	anyOf?: never
	oneOf?: never
	then?: never
	$ref?: never
	$id?: Anchor
	id?: Anchor
}

export type MaxUnionBranches = 3

/** a ref's target or a nested allOf may lead to a union keyword */
export type mayInferUnion<branch, root> =
	branch extends UnionBranch | AllOfSchema ? true
	: branch extends { $ref: infer ref extends string } ?
		resolveRef<ref, root> extends UnionBranch | AllOfSchema | RefSchema ?
			true
		:	false
	:	false

export type UnionBranch =
	| { anyOf: unknown }
	| { oneOf: unknown }
	| ConditionalSchema

export interface AllOfSchema {
	allOf: unknown
}

export interface RefSchema {
	$ref: string
}

export type UnionKeyword = "anyOf" | "oneOf" | "then" | "else"

/** a branch whose refs and nested allOf branches are also inferred without
 * union keywords */
export type withoutUnions<branch> =
	branch extends array ? branch
	: branch extends object ?
		{
			[k in keyof branch as k extends UnionKeyword ? never : k]: k extends (
				"$ref"
			) ?
				UnionlessRef<branch[k]>
			: k extends "allOf" ? withoutUnionsIn<branch[k]>
			: branch[k]
		}
	:	branch

export type withoutUnionsIn<branches> = {
	[i in keyof branches]: withoutUnions<branches[i]>
}

/** a `$ref` whose target is inferred without union keywords */
export interface UnionlessRef<ref> {
	unionless: ref
}

/** a branch without a nested allOf, which can't add to the union-producing
 * branches of a list */
export interface FlatBranch {
	allOf?: never
	[k: string]: unknown
}

/** a branch that can't infer a union (UnionBranch checks `then` and `else`
 * exactly) */
export interface UnionFreeBranch {
	anyOf?: never
	oneOf?: never
	then?: never
	allOf?: never
	$ref?: never
	[k: string]: unknown
}

/** an optional keyword may be absent, so its value includes `undefined` and contributes nothing */
export type inferBranches<branches, root, seen> =
	undefined extends branches ? unknown
	:	inferSchema<branches[number & keyof branches], root, seen>

/** JSON domains are disjoint, but TS doesn't reduce `string & { a: 1 }`,
 * and its `object` includes arrays */
export type intersect<l, r> =
	unknown extends l ?
		unknown extends r ?
			l & r
		:	r
	: unknown extends r ? l
	: l | r extends JsonPrimitive ? l & r
	: intersectDomains<l, r> | never

export type intersectDomains<l, r> =
	l extends unknown ?
		r extends unknown ?
			l extends object ?
				r extends object ?
					intersectObjects<l, r>
				:	never
			: r extends object ? never
			: l & r
		:	never
	:	never

/** an object without numeric keys can't be an array, so it isn't related to
 * one, which would resolve the members of a recursive object while its index
 * signature is still being inferred (TS would then see it without them) */
export type intersectObjects<l, r> =
	[keyof l] extends [never] ?
		number extends keyof r ?
			r extends array ?
				never
			:	r
		:	r
	: [keyof r] extends [never] ?
		number extends keyof l ?
			l extends array ?
				never
			:	l
		:	l
	: (keyof l | keyof r) & number extends never ?
		[keyof l & keyof r] extends [never] ?
			{ [k in keyof (l & r)]: (l & r)[k] } & unknown
		:	mergeObjects<l, r, keyof l & keyof r>
	: l extends array ?
		r extends array ?
			intersectArrays<l, r>
		:	never
	: r extends array ? never
	: mergeObjects<
			stringKeyed<l>,
			stringKeyed<r>,
			keyof stringKeyed<l> & keyof stringKeyed<r>
		>

/** a numeric key is the same property as its string spelling */
export type stringKeyed<o> = {
	[k in keyof o as k extends number ? `${k}` : k]: o[k]
}

/** a key of both objects (including one matched by an index signature) has
 * the intersection of both values. Keys and modifiers come from the objects'
 * shapes, since TS would reduce `l & r` itself by resolving every property
 * type, which a recursive property can't allow */
export type mergeObjects<l, r, sharedKey extends keyof l & keyof r> = {
	[k in keyof (shapeOf<l> & shapeOf<r>)]: k extends sharedKey ?
		intersectValues<l[k], r[k]>
	: k extends keyof l ? l[k]
	: r[k & keyof r]
} & unknown

/** equivalent values (like the same recursive `$ref`) aren't intersected,
 * which would build a new type at every level of the recursion */
export type intersectValues<l, r> =
	[l, r] extends [r, l] ? Exclude<l, undefined>
	:	Exclude<intersect<l, r>, undefined>

export type shapeOf<o> = { [k in keyof o]: 0 }

export type filterBase<schema, root, seen, values> =
	unknown extends values ? inferBase<schema, root, seen>
	: [values] extends [JsonPrimitive] ?
		intersect<inferBase<schema, root, seen>, values>
	: containsRef<schema> extends true ? values
	: filterValues<inferBase<schema, root, seen>, values>

/** a `const` or `enum` value is a literal, which the other parts filter */
export type filterValues<base, values> =
	unknown extends values ? base
	: [values] extends [JsonPrimitive] ? intersect<base, values>
	: filterValue<base, values> | never

/** an array or object literal is kept if the base admits it, and otherwise
 * intersected with it */
export type filterValue<base, value> =
	value extends JsonPrimitive ? intersect<base, value>
	: unknown extends base ? value
	: [value] extends [base] ? value
	: intersect<base, value>

/** a tuple's fixed elements are keys like `"0"`, and `[]` has a literal length */
export type intersectArrays<l extends array, r extends array> =
	number extends r["length"] ?
		"0" extends keyof r ? intersectTuples<l, r>
		: [l] extends [readonly subtypeElementOf<r>[]] ? l
		: number extends l["length"] ?
			"0" extends keyof l ?
				intersectTuples<l, r>
			:	intersect<l[number], r[number]>[]
		:	intersectTuples<l, r>
	: number extends l["length"] ?
		"0" extends keyof l ? intersectTuples<l, r>
		: [r] extends [readonly subtypeElementOf<l>[]] ? r
		: intersectTuples<l, r>
	:	intersectTuples<l, r>

/** an element type that admits a TS array may still exclude JSON arrays (e.g.
 * `object`), so it only shows a subtype if it is `unknown` */
export type subtypeElementOf<t extends array> =
	readonly never[] extends t[number] ?
		unknown extends t[number] ?
			unknown
		:	never
	:	t[number]

/** a readonly tuple is the wider type, so the result is readonly if either side is */
export type intersectTuples<
	l extends array,
	r extends array
> = intersectElements<l, r, [l | r] extends [unknown[]] ? false : true, [], []>

/** intersect element by element with the stricter optionality and
 * closedness, where a missing required element makes the tuple `never` */
export type intersectElements<
	l extends array,
	r extends array,
	isReadonly extends boolean,
	required extends array,
	optional extends array
> =
	[elementOf<l>, elementOf<r>] extends (
		[
			[infer lKind, infer lElement, infer lTail extends array],
			[infer rKind, infer rElement, infer rTail extends array]
		]
	) ?
		lKind | rKind extends "rest" ?
			finishTuple<
				isReadonly,
				required,
				optional,
				intersect<lElement, rElement>[]
			>
		: "closed" extends lKind | rKind ?
			"required" extends lKind | rKind ?
				never
			:	finishTuple<isReadonly, required, optional, []>
		: [intersect<lElement, rElement>] extends [infer element] ?
			[element] extends [never] ?
				"required" extends lKind | rKind ?
					never
				:	finishTuple<isReadonly, required, optional, []>
			: "required" extends lKind | rKind ?
				intersectElements<
					lTail,
					rTail,
					isReadonly,
					[...required, element],
					optional
				>
			:	intersectElements<
					lTail,
					rTail,
					isReadonly,
					required,
					[...optional, element]
				>
		:	never
	:	never

/** the kind, type and remaining elements of a tuple's first element */
export type elementOf<t extends array> =
	t extends readonly [infer head, ...infer tail] ? ["required", head, tail]
	: "0" extends keyof t ?
		t extends readonly [(infer head)?, ...infer tail] ?
			["optional", head, tail]
		:	never
	: t extends readonly [] ? ["closed", never, t]
	: ["rest", t[number], t]

export type finishTuple<
	isReadonly extends boolean,
	required extends array,
	optional extends array,
	rest extends array
> =
	isReadonly extends true ?
		readonly [...required, ...{ [i in keyof optional]?: optional[i] }, ...rest]
	:	[...required, ...{ [i in keyof optional]?: optional[i] }, ...rest]

export type resourceOf<schema, root> =
	schema extends IdentifiedSchema ? rootOf<schema, root> : root

export type SubschemaKeyword =
	| "items"
	| "prefixItems"
	| "additionalItems"
	| "additionalProperties"
	| "allOf"
	| "anyOf"
	| "oneOf"
	| "then"
	| "else"

export type SubschemaRecordKeyword = "properties" | "patternProperties"

/** a node with a required subschema keyword (optional ones, as on a
 * hand-written schema type, may be absent, so they contribute nothing) */
export type SubschemaNode = {
	[k in SubschemaKeyword | SubschemaRecordKeyword]: { [_ in k]: unknown }
}[SubschemaKeyword | SubschemaRecordKeyword]

export type inferRef<ref, root, seen> =
	ref extends seen ? unknown
	: ref extends string ?
		[seen] extends [never] ?
			inferSchema<resolveRef<ref, root>, root, ref>
		:	inferSchema<resolveRef<ref, root>, root, trackedRefs<ref, root, seen>>
	: ref extends EmbeddedRef<infer target, infer resource> ?
		inferSchema<target, resource, seen>
	: ref extends UnionlessRef<infer unionless> ?
		inferUnionlessRef<unionless, root, seen>
	:	unknown

export type inferUnionlessRef<ref, root, seen> =
	ref extends string ?
		ref extends seen ?
			unknown
		:	inferSchema<withoutUnions<resolveRef<ref, root>>, root, seen | ref>
	: ref extends EmbeddedRef<infer target, infer resource> ?
		inferSchema<withoutUnions<target>, resource, seen>
	:	unknown

/** a ref can only be reached again through a ref its target can reach, so
 * a target that branches into several refs drops the others, letting each
 * acyclic target be inferred once however many paths lead to it */
export type trackedRefs<ref extends string, root, seen> =
	isUnit<targetRefs<ref, root>> extends true ? seen | ref
	: Extract<
		seen | ref,
		reachableRefs<targetRefs<ref, root>, root, never>
	> extends infer tracked ?
		ref extends tracked ?
			cycleRefs<tracked, Extract<seen, number>>
		:	tracked
	:	never

/** a cycle's refs are tracked by path, and a graph of cycles has
 * exponentially many, so a path that branches a few times within cycles
 * cuts every ref */
export type cycleRefs<tracked, depth> =
	[depth] extends [never] ? tracked | 1
	: depth extends 4 ? string
	: tracked | NextCycleDepth[depth & keyof NextCycleDepth]

export type NextCycleDepth = [never, 2, 3, 4]

/** whether `t` has at most one member */
export type isUnit<t, all = t> =
	t extends unknown ?
		Exclude<all, t> extends never ?
			true
		:	false
	:	never

/** refs reachable through `frontier`. Refs across a resource boundary may
 * be spelled the same as these, so a boundary makes every ref reachable */
export type reachableRefs<frontier extends string, root, reached> =
	[frontier] extends [never] ? reached
	: string extends frontier ? string
	: reachableRefs<
			Exclude<
				frontier extends unknown ? targetRefs<frontier, root> : never,
				reached | frontier
			>,
			root,
			reached | frontier
		>

/** the refs a target's own eagerly inferred subschemas contain */
export type targetRefs<ref extends string, root> = eagerRefsIn<
	resolveRef<ref, root>,
	never
>

/** an `any` node infers `any` without reading its refs */
export type eagerRefsIn<nodes, refs> =
	[nodes] extends [anyOrNever] ? refs
	:	eagerRefsIn<eagerSubschemas<nodes>, refs | refsOf<nodes>>

export type refsOf<node> =
	node extends ResourceNode ? string
	: node extends { $ref: infer ref } ?
		ref extends string ?
			ref
		:	string
	:	never

/** a widened subschema infers `unknown` without reading its refs */
export type eagerSubschemas<node> =
	node extends EagerNode ?
		node[EagerKeyword & keyof node] extends infer subschema ?
			subschema extends array ?
				number extends subschema["length"] ?
					{} extends subschema[number] ?
						never
					:	subschema[number]
				:	subschema[number]
			: {} extends subschema ? never
			: subschema
		:	never
	:	never

/** a node with a required eager keyword (optional ones, as on a hand-written
 * schema type, may be absent, so they contribute nothing) */
export type EagerNode = {
	[k in EagerKeyword]: { [_ in k]: unknown }
}[EagerKeyword]

export type EagerKeyword =
	| "allOf"
	| "anyOf"
	| "oneOf"
	| "then"
	| "else"
	| "prefixItems"
	| "items"
	| "additionalItems"

export type resolveRef<ref extends string, root> =
	ref extends "#" ? root
	: ref extends (
		`#/${infer container extends DefinitionsKeyword}/${infer name}`
	) ?
		resolveDefinition<root, container, name>
	: ref extends `#/${infer path}` ? resolvePointer<root, path>
	: UnresolvedRef

export type DefinitionsKeyword = "$defs" | "definitions"

export type resolveDefinition<
	root,
	container extends string,
	name extends string
> =
	root extends { [_ in container]?: infer definitions } ?
		name extends keyof definitions ?
			name extends EncodedName ?
				resolvePointer<root, `${container}/${name}`>
			:	definitions[name]
		:	resolvePointer<root, `${container}/${name}`>
	:	UnresolvedRef

/** a name that must be decoded before it can be compared to a key */
export type EncodedName = `${string}${"/" | "~" | "%"}${string}`

/** a percent-encoded fragment isn't decoded, so its ref infers as `unknown` */
export type resolvePointer<root, path extends string> =
	path extends `${string}%${string}` ? UnresolvedRef : walkPointer<root, path>

/** a pointer may pass through an embedded resource, which its target's refs
 * resolve against */
export type walkPointer<
	node,
	path extends string,
	root = node,
	resource = never
> =
	path extends `${infer segment}/${infer rest}` ?
		walkPointer<
			childOf<node, unescapeSegment<segment>>,
			rest,
			root,
			resourceAfter<node, root, resource>
		>
	:	targetIn<
			schemaAt<childOf<node, unescapeSegment<path>>>,
			resourceAfter<node, root, resource>
		>

export type resourceAfter<node, root, resource> =
	node extends ResourceNode ?
		rootOf<node, [resource] extends [never] ? root : resource>
	:	resource

/** a schema with a string identifier (in a record of schemas, `$id` would be a schema) */
export type ResourceNode = { $id: string } | { id: string }

export type targetIn<target, resource> =
	[resource] extends [never] ? target
	: [target] extends [UnresolvedRef] ? target
	: EmbeddedTarget<target, resource>

/** a `$ref` whose target is inferred with its refs resolved against `resource` */
export interface EmbeddedTarget<target, resource> {
	$ref: EmbeddedRef<target, resource>
}

export interface EmbeddedRef<target, resource> {
	target: target
	resource: resource
}

export type childOf<node, key extends string> =
	node extends array ?
		key extends keyof node & `${number}` ? node[key]
		: number extends node["length"] ?
			key extends NonNegativeIntegerLiteral ?
				node[number]
			:	UnresolvedRef
		:	UnresolvedRef
	: node extends object ?
		key extends keyof node ? node[key]
		: key extends `${infer i extends number}` ?
			i extends keyof node ?
				node[i]
			:	UnresolvedRef
		:	UnresolvedRef
	: unknown extends node ? node
	: UnresolvedRef

/** a pointer must end on a schema (an object or boolean) */
export type schemaAt<target> =
	target extends array ? UnresolvedRef
	: target extends object | boolean ? target
	: unknown extends target ? target
	: UnresolvedRef

/** the target of a `$ref` that doesn't point to anything (infers as `unknown`) */
export type UnresolvedRef = noSuggest<"unresolvedRef">

/** unescape `~1` then `~0`, each exactly once (RFC 6901) */
export type unescapeSegment<segment extends string> =
	segment extends `${string}~${string}` ?
		replaceAll<replaceAll<segment, "~1", "/">, "~0", "~">
	:	segment

export type replaceAll<
	s extends string,
	from extends string,
	to extends string,
	result extends string = ""
> =
	s extends `${infer head}${from}${infer tail}` ?
		replaceAll<tail, from, to, `${result}${head}${to}`>
	:	`${result}${s}`

export type inferObject<schema, root> =
	schema extends PropertiesSchema ?
		schema extends RequiredSchema ?
			inferRequiredProperties<
				schema["properties"],
				schema["required"],
				schema,
				root
			>
		: schema extends IndexedSchema ?
			inferIndexedObject<schema["properties"], never, schema, root>
		:	inferOptionalProperties<schema["properties"], schema, root>
	: "properties" extends keyof schema ? object
	: schema extends RequiredSchema ?
		inferRequiredProperties<{}, schema["required"], schema, root>
	: schema extends IndexedSchema ? inferIndexedObject<{}, never, schema, root>
	: object

export interface PropertiesSchema {
	properties: object
}

/** only a tuple's entries are definitely present, since an array may be empty */
export interface RequiredSchema {
	required: readonly [string, ...string[]] | readonly [...string[], string]
}

export type inferOptionalProperties<props, schema, root> =
	UndeclaredKeyObject extends { [k in keyof props]?: 0 } ?
		[keyof props] extends [never] ?
			object
		:	inferRecordObject<props, never, schema, root>
	:	{ -readonly [k in keyof props]?: inferSchema<props[k], root, never> }

/** an object with a key that no literal key of `properties` declares, which
 * is only assignable to their optional template if they have an index
 * signature (or no keys) */
export type UndeclaredKeyObject = { [undeclaredKey]: never }

/** a key no JSON property can have */
export declare const undeclaredKey: unique symbol

/** `properties` with an index signature may be empty, so a key they don't
 * declare takes the index value, which includes the record's values */
export type inferRecordObject<
	props,
	requiredKey extends PropertyKey,
	schema,
	root
> =
	props extends unknown ?
		inferRecordProperties<
			literalTemplateOf<props> & { [k in requiredKey]: 0 } & {
				[k in string]: 0
			},
			props,
			keyof literalTemplateOf<props>,
			schema,
			root
		>
	:	never

export type literalTemplateOf<props> = {
	[k in keyof props as {} extends Record<k, 0> ? never : k]?: 0
}

export type inferRecordProperties<template, props, declaredKey, schema, root> =
	{
		-readonly [k in keyof template]: k extends declaredKey ?
			inferSchema<props[k & keyof props], root, never>
		:	indexValue<schema, root> | inferSchema<props[keyof props], root, never>
	} & unknown

/** each member of a `required` union requires its own keys, and a union
 * entry requires one of its keys, while an entry that isn't a literal (like
 * `any`, `string` or a template) may be any key, so it requires nothing */
export type inferRequiredProperties<
	props,
	required extends array<string>,
	schema,
	root
> =
	number extends required["length"] ?
		{} extends required ?
			inferOptionalObject<props, schema, root>
		:	inferRequiredProperties<props, fixedEntriesOf<required, []>, schema, root>
	: required extends unknown ?
		UndeclaredKeyObject extends { [k in required[number]]?: 0 } ?
			inferRequiredChoices<
				props,
				requiredChoices<required, never>,
				schema,
				root
			>
		: entryArraysOf<required> extends arrayOf<required[number]> ?
			inferRequiredKeys<props, required[number], schema, root>
		:	inferRequiredChoices<props, requiredChoices<required, never>, schema, root>
	:	never

/** each entry as an array, which is only assignable to a member of
 * `arrayOf<required[number]>` if the entry is a single key */
export type entryArraysOf<required extends array> =
	required["length"] extends 1 ? required[number][]
	:	{ [i in keyof required]: required[i][] }[number]

export type arrayOf<t> = t extends unknown ? t[] : never

/** each way to pick one key from every union entry */
export type requiredChoices<required, choice> =
	required extends readonly [infer head, ...infer tail] ?
		[head] extends [never] ? requiredChoices<tail, choice>
		: head extends unknown ?
			requiredChoices<
				tail,
				{} extends Record<head & string, 0> ? choice : choice | head
			>
		:	never
	:	[choice]

export type inferRequiredChoices<props, choices, schema, root> =
	choices extends [infer requiredKey extends string] ?
		inferRequiredKeys<props, requiredKey, schema, root>
	:	never

export type inferRequiredKeys<props, requiredKey extends string, schema, root> =
	schema extends IndexedSchema ?
		inferIndexedObject<props, requiredKey, schema, root>
	: props extends unknown ?
		[requiredKey, keyof props] extends [keyof props, requiredKey] ?
			{ -readonly [k in keyof props]: inferSchema<props[k], root, never> }
		: UndeclaredKeyObject extends { [k in keyof props]?: 0 } ?
			[keyof props] extends [never] ?
				inferProperties<templateOf<props, requiredKey, never>, props, root>
			:	inferRecordObject<props, requiredKey, schema, root>
		:	inferProperties<templateOf<props, requiredKey, never>, props, root>
	:	never

/** a rest element may be empty, so only the fixed entries around it are required */
export type fixedEntriesOf<required, entries extends array<string>> =
	required extends readonly [infer head extends string, ...infer tail] ?
		fixedEntriesOf<tail, [...entries, head]>
	: required extends readonly [...infer init, infer last extends string] ?
		fixedEntriesOf<init, [...entries, last]>
	:	entries

export type inferOptionalObject<props, schema, root> =
	schema extends IndexedSchema ? inferIndexedObject<props, never, schema, root>
	:	inferOptionalProperties<props, schema, root>

/** an object indexed by `additionalProperties` (each member of a
 * `properties` union is indexed separately, since its declared types are
 * part of the index) */
export type inferIndexedObject<
	props,
	requiredKey extends PropertyKey,
	schema,
	root
> =
	props extends unknown ?
		schema extends AdditionalPropertiesSchema ?
			inferOpenObject<props, requiredKey, schema, root>
		:	inferPatternedObject<props, requiredKey, schema, root>
	:	never

/** an object indexed by `patternProperties`, unless they are all `false` */
export type inferPatternedObject<
	props,
	requiredKey extends PropertyKey,
	schema,
	root
> =
	schema extends PatternPropertiesSchema ?
		schema extends FalsePatternsSchema ?
			inferClosedProperties<props, requiredKey, root>
		:	inferOpenObject<props, requiredKey, schema, root>
	:	inferClosedProperties<props, requiredKey, root>

export interface FalsePatternsSchema {
	patternProperties: FalsePatterns
}

export interface FalsePatterns {
	[pattern: string]: false
}

export type inferOpenObject<
	props,
	requiredKey extends PropertyKey,
	schema,
	root
> =
	UndeclaredKeyObject extends { [k in keyof props]?: 0 } ?
		[keyof props] extends [never] ?
			inferIndexedProperties<
				templateOf<props, requiredKey, string>,
				props,
				schema,
				root
			>
		:	inferRecordObject<props, requiredKey, schema, root>
	:	inferIndexedProperties<
			templateOf<props, requiredKey, string>,
			props,
			schema,
			root
		>

/** an object whose keys and modifiers match the inferred object */
export type templateOf<
	props,
	requiredKey extends PropertyKey,
	indexKey extends string
> = { [k in keyof props]?: 0 } & { [k in requiredKey]: 0 } & {
	[k in indexKey]: 0
}

export type inferProperties<template, props, root> = {
	-readonly [k in keyof template]: k extends keyof props ?
		inferSchema<props[k], root, never>
	:	unknown
} & unknown

export type inferClosedProperties<
	props,
	requiredKey extends PropertyKey,
	root
> =
	[keyof props | requiredKey] extends [never] ? object
	:	inferProperties<templateOf<props, requiredKey, never>, props, root>

/** a TS index signature also applies to declared keys, so its value
 * includes their types */
export type inferIndexedProperties<template, props, schema, root> = {
	-readonly [k in keyof template]: string extends k ?
		indexValue<schema, root> | inferSchema<props[keyof props], root, never>
	: k extends keyof props ? inferSchema<props[k], root, never>
	: indexValue<schema, root>
} & unknown

export type IndexedSchema = AdditionalPropertiesSchema | PatternPropertiesSchema

export interface AdditionalPropertiesSchema {
	additionalProperties: object
}

export interface PatternPropertiesSchema {
	patternProperties: unknown
}

export interface ClosedSchema {
	additionalProperties: false
}

/** the value of a key not in `properties` */
export type indexValue<schema, root> =
	schema extends PatternPropertiesSchema ?
		| inferValues<schema["patternProperties"], root>
		| (schema extends EveryKeyPatternSchema ? never
		  :	additionalValue<schema, root>)
	:	additionalValue<schema, root>

/** the empty pattern matches every key, so `additionalProperties` applies
 * to none (arktype writes a string index beside declared keys this way) */
export interface EveryKeyPatternSchema {
	patternProperties: { "": unknown }
}

export type additionalValue<schema, root> =
	schema extends AdditionalPropertiesSchema ?
		inferSchema<schema["additionalProperties"], root, never>
	: schema extends ClosedSchema ? never
	: unknown

/** the union of the types inferred from each record of schemas */
export type inferValues<schemas, root> =
	schemas extends unknown ? inferSchema<schemas[keyof schemas], root, never>
	:	never

/** `domains` are the other values an untyped schema allows, added after a
 * tuple's elements so they don't cost a union's level of instantiation depth */
export type inferArray<schema, root, seen, domains = never> =
	schema extends PrefixItemsSchema ?
		// a draft-07 items array is read in place of prefixItems
		schema extends ItemsListSchema ?
			inferArray<Omit<schema, "prefixItems">, root, seen, domains>
		: [Extract<schema["items" & keyof schema], array>] extends [never] ?
			inferTuple<
				schema["prefixItems"],
				minItemsOf<schema>,
				schema extends RestItemsSchema ? schema["items"] : true,
				root,
				seen,
				domains
			>
		:	unknown[] | domains
	: schema extends UnprefixedItemsSchema ?
		{} extends schema["items"] ? inferWidened<schema["items"]>[] | domains
		: schema["items"] extends array ?
			inferTuple<
				schema["items"],
				minItemsOf<schema>,
				schema extends AdditionalItemsSchema ? schema["additionalItems"] : true,
				root,
				seen,
				domains
			>
		: schema["items"] extends false ? [] | domains
		: inferSchema<schema["items"], root, never>[] | domains
	: schema extends OptionalPrefixItemsSchema ?
		inferOptionalPrefix<schema, root, seen, domains>
	:	unknown[] | domains

export interface PrefixItemsSchema {
	prefixItems: array
}

export interface ItemsListSchema {
	items: array
}

/** an undefined `prefixItems` is absent */
export interface UnprefixedItemsSchema {
	items: unknown
	prefixItems?: never
}

/** a `prefixItems` that may be undefined (a weak type, so a schema without
 * the keyword doesn't match) */
export interface OptionalPrefixItemsSchema {
	prefixItems?: unknown
}

/** an absent `prefixItems` leaves `items` to every element, so only an
 * `items` schema (other than `true`) keeps both readings */
export type inferOptionalPrefix<
	schema extends OptionalPrefixItemsSchema,
	root,
	seen,
	domains
> =
	schema extends RestItemsSchema ?
		schema["items"] extends false ?
			inferPresentPrefix<schema, root, seen, domains>
		: schema["items"] extends true ? unknown[] | domains
		: | inferPresentPrefix<schema, root, seen, domains>
			| inferArray<Omit<schema, "prefixItems">, root, seen, domains>
	:	unknown[] | domains

export type inferPresentPrefix<
	schema extends OptionalPrefixItemsSchema & RestItemsSchema,
	root,
	seen,
	domains
> =
	Exclude<schema["prefixItems"], undefined> extends infer items extends array ?
		inferTuple<items, minItemsOf<schema>, schema["items"], root, seen, domains>
	:	unknown[] | domains

export interface ItemsSchema {
	items: unknown
}

/** a rest that may be undefined may be absent, leaving the array open */
export interface RestItemsSchema {
	items: {}
}

export interface AdditionalItemsSchema {
	additionalItems: {}
}

export type minItemsOf<schema> =
	schema extends MinItemsSchema ? schema["minItems"] : 0

export interface MinItemsSchema {
	minItems: number
}

/** a rest schema with subschemas may nest tuples, so its elements are an
 * `X[]`, which TS defers, after a prefix inferred on its own (spreading
 * the prefix's mapped type would cost a level of depth) */
export type inferTuple<
	items extends array,
	minItems extends number,
	rest,
	root,
	seen,
	domains
> =
	items extends unknown ?
		rest extends false ? inferPrefix<items, minItems, root, seen, domains>
		: [keyof rest & (EagerKeyword | "$ref")] extends [never] ?
			restShape<present<items>, minItems, rest[]> extends (
				infer shape extends array
			) ?
				withDomains<inferOptionalElements<shape, root, seen>, domains>
			:	never
		: restShape<present<items>, minItems, []> extends (
			infer shape extends array
		) ?
			inferOptionalElements<shape, root, seen> extends (
				infer prefix extends array
			) ?
				withDomains<[...prefix, ...inferSchema<rest, root, seen>[]], domains>
			:	never
		:	never
	:	never

/** a hand-written optional element may be absent, leaving its position to
 * the rest, so it may be any value */
export type present<items extends array> =
	undefined extends items[number] ? widenOptional<items> : items

export type widenOptional<items extends array> = {
	[i in keyof items]-?: [items[i]] extends [anyOrNever] ? items[i]
	: undefined extends items[i] ? true
	: items[i]
}

/** a widened minItems may be 0. Without a rest, a hand-written optional
 * element is only absent from a shorter array, so one that minItems
 * requires is present */
export type inferPrefix<
	items extends array,
	minItems extends number,
	root,
	seen,
	domains
> =
	minItems extends 0 ?
		withDomains<
			inferOptionalElements<optionalShape<items>, root, seen>,
			domains
		>
	: number extends minItems ?
		withDomains<
			inferOptionalElements<optionalShape<items>, root, seen>,
			domains
		>
	: `${minItems}` extends keyof items ?
		withDomains<
			inferOptionalElements<
				partialShape<requiredShape<items>, digitPrefix<`${minItems}`, []>>,
				root,
				seen
			>,
			domains
		>
	:	withDomains<
			{
				-readonly [i in keyof items]-?: inferSchema<items[i] & {}, root, seen>
			},
			domains
		>

export type requiredShape<items extends array> =
	undefined extends items[number] ? { [i in keyof items]-?: items[i] } : items

/** an untyped schema's other `domains` are added once its tuple is inferred,
 * so they don't cost a union's level of instantiation depth */
export type withDomains<tuple, domains> =
	[domains] extends [never] ? tuple
	: tuple extends unknown ? tuple | domains
	: never

/** elements are inferred in a single mapped type, since every type a level
 * of nesting passes through costs instantiation depth. An optional
 * element's type includes `undefined`, which isn't a schema */
export type inferOptionalElements<shape, root, seen> = {
	-readonly [i in keyof shape]: inferSchema<shape[i] & {}, root, seen>
}

/** a widened minItems may be 0. A conditional, so the tuple is built before
 * its elements are inferred */
export type restShape<
	items extends array,
	minItems extends number,
	rest extends array
> =
	minItems extends 0 ? [...optionalShape<items>, ...rest]
	: number extends minItems ? [...optionalShape<items>, ...rest]
	: `${minItems}` extends keyof items ?
		[...partialShape<items, digitPrefix<`${minItems}`, []>>, ...rest]
	:	[...items, ...rest]

/** a tuple of `unknown` whose length is the number represented by `digits` */
export type digitPrefix<digits extends string, prefix extends array> =
	digits extends `${infer digit extends keyof DigitPrefixes}${infer rest}` ?
		digitPrefix<
			rest,
			[
				...prefix,
				...prefix,
				...prefix,
				...prefix,
				...prefix,
				...prefix,
				...prefix,
				...prefix,
				...prefix,
				...prefix,
				...DigitPrefixes[digit]
			]
		>
	:	prefix

export type DigitPrefixes = {
	"0": []
	"1": [unknown]
	"2": [unknown, unknown]
	"3": [unknown, unknown, unknown]
	"4": [unknown, unknown, unknown, unknown]
	"5": [unknown, unknown, unknown, unknown, unknown]
	"6": [unknown, unknown, unknown, unknown, unknown, unknown]
	"7": [unknown, unknown, unknown, unknown, unknown, unknown, unknown]
	"8": [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]
	"9": [
		unknown,
		unknown,
		unknown,
		unknown,
		unknown,
		unknown,
		unknown,
		unknown,
		unknown
	]
}

export type optionalShape<items extends array> = {
	-readonly [i in keyof items]?: items[i]
}

export type partialShape<items extends array, prefix extends array> =
	items extends readonly [...prefix, ...infer optional] ?
		items extends readonly [...infer required, ...optional] ?
			[...required, ...optionalShape<optional>]
		:	never
	:	never
