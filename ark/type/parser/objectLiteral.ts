import {
	checkDefault,
	intrinsic,
	normalizeIndex,
	ownKeysOf,
	requiredPropOf,
	type BaseParseContext,
	type BaseRoot,
	type BaseScope,
	type Domain,
	type NodeInput,
	type Prop,
	type Structure,
	type TypeMeta,
	type writeInvalidPropertyKeyMessage
} from "@ark/schema"
import {
	append,
	Backslash,
	isArray,
	isEmptyObject,
	printable,
	throwParseError,
	type anyOrNever,
	type Dict,
	type ErrorMessage,
	type ErrorType,
	type Key,
	type merge,
	type mutable,
	type show
} from "@ark/util"
import type { validateString } from "./ast/validate.ts"
import type { inferDefinition } from "./definition.ts"
import {
	invalidDefaultableKeyKindMessage,
	invalidOptionalKeyKindMessage,
	parseProperty,
	type OptionalPropertyDefinition,
	type OptionalPropertyString,
	type validateProperty
} from "./property.ts"

type MutableStructureSchema = mutable<NodeInput<"structure">, 2>

export const parseObjectLiteral = (
	def: Dict,
	ctx: BaseParseContext
): BaseRoot => {
	let spread: Structure.Node | undefined
	let meta: TypeMeta.Collapsible | undefined
	const structure: MutableStructureSchema = {}
	// the order output lists keys in, as they're declared
	const order: Key[] = []
	// We only allow a spread operator to be used as the first key in an object
	// because to match JS behavior any keys before the spread are overwritten
	// by the values in the target object, so there'd be no useful purpose in having it
	// anywhere except for the beginning.
	for (const k of ownKeysOf(def)) {
		const v = def[k as string]
		const parsedKey = preparseKey(k)

		if (parsedKey.kind === "spread") {
			if (!isEmptyObject(structure))
				return throwParseError(nonLeadingSpreadError)
			const operand = ctx.$.parseOwn(v, ctx)
			// treat object domain as empty for spreading (useful for generic constraints)
			if (operand.equals(intrinsic.object)) continue
			if (
				!operand.is("intersection") ||
				// still error on attempts to spread proto nodes like ...Date
				!operand.basis?.equals(intrinsic.object)
			) {
				return throwParseError(
					writeInvalidSpreadTypeMessage(operand.expression)
				)
			}
			spread = operand.structure
			continue
		}

		if (parsedKey.kind === "undeclared") {
			if (v !== "reject" && v !== "delete" && v !== "ignore")
				throwParseError(writeInvalidUndeclaredBehaviorMessage(v))
			structure.undeclared = v
			continue
		}

		if (parsedKey.kind === "meta") {
			meta = v as TypeMeta.Collapsible
			continue
		}

		const parsedValue = parseProperty(v, ctx)
		const parsedEntryKey = parsedKey as PreparsedEntryKey

		if (parsedKey.kind !== "index") order.push(parsedEntryKey.normalized)

		if (parsedKey.kind === "required") {
			if (!isArray(parsedValue)) {
				appendNamedProp(
					structure,
					"required",
					{
						key: parsedKey.normalized,
						value: parsedValue
					},
					ctx
				)
			} else {
				// string defaults run no user code
				if (typeof v === "string" && typeof parsedValue[2] === "function")
					checkDefault(parsedValue[0], parsedValue[2](), parsedKey.normalized)
				appendNamedProp(
					structure,
					"optional",
					parsedValue[1] === "=" ?
						{
							key: parsedKey.normalized,
							value: parsedValue[0],
							default: parsedValue[2]
						}
					:	{
							key: parsedKey.normalized,
							value: parsedValue[0]
						},
					ctx
				)
			}
			continue
		}
		if (isArray(parsedValue)) {
			if (parsedValue[1] === "?") throwParseError(invalidOptionalKeyKindMessage)

			if (parsedValue[1] === "=")
				throwParseError(invalidDefaultableKeyKindMessage)
		}

		// value must be a BaseRoot at this point

		if (parsedKey.kind === "optional") {
			appendNamedProp(
				structure,
				"optional",
				{
					key: parsedKey.normalized,
					value: parsedValue
				},
				ctx
			)
			continue
		}

		// must be index at this point

		const signature = ctx.$.parseOwn(parsedEntryKey.normalized, ctx)

		const normalized = normalizeIndex(signature, parsedValue, ctx.$)

		if (normalized.index)
			structure.index = append(structure.index, normalized.index)

		if (normalized.required) {
			structure.required = append(structure.required, normalized.required)
			for (const prop of normalized.required) order.push(prop.key)
		}
	}

	if (order.length > 1) structure.order = order

	const structureNode = ctx.$.node("structure", structure)

	// an object's structure implies no siblings, so it has nothing to reduce
	const node = ctx.$.node(
		"intersection",
		{
			domain: objectDomainOf(ctx.$),
			structure: spread?.merge(structureNode) ?? structureNode
		},
		{ reduced: true }
	)

	return meta === undefined ? node : node.configure(meta)
}

const objectDomains = new WeakMap<BaseScope, Domain.Node>()

const objectDomainOf = ($: BaseScope): Domain.Node => {
	let domain = objectDomains.get($)
	if (!domain) {
		domain = $.node("domain", { domain: "object" })
		objectDomains.set($, domain)
	}
	return domain
}

const appendNamedProp = <kind extends Prop.Kind>(
	structure: MutableStructureSchema,
	kind: kind,
	input: NodeInput<kind>,
	ctx: BaseParseContext
) => {
	structure[kind] = append(
		// doesn't seem like this cast should be necessary
		structure[kind] as MutableStructureSchema[Prop.Kind],
		kind === "required" ?
			requiredPropOf(input.key, input.value as BaseRoot, ctx.$)
		:	ctx.$.node(kind, input)
	) as never
}

export type inferObjectLiteral<def extends object, $, args> =
	"..." extends keyof def ?
		show<
			merge<
				inferDefinition<def["..."], $, args>,
				inferKeyedObjectLiteral<def, $, args>
			>
		>
	: [keyof def & PreparsedKeyPattern] extends [never] ?
		inferUnparsedKeys<def, optionalKeyOf<def>, $, args>
	:	show<inferKeyedObjectLiteral<def, $, args>>

// keys whose kind or name only preparseKey can determine
type PreparsedKeyPattern =
	| number
	| MetaKey
	| IndexKey
	| `${string}${Backslash}${string}`

type optionalKeyOf<def> = {
	[k in keyof def]: k extends OptionalPropertyString ? k
	: def[k] extends OptionalPropertyDefinition ?
		[def[k]] extends [anyOrNever] ?
			never
		:	k
	:	never
}[keyof def]

// one mapped type needs no show
type inferUnparsedKeys<def, optionalKey, $, args> =
	[optionalKey] extends [never] ?
		{ -readonly [k in keyof def]: inferDefinition<def[k], $, args> }
	:	show<inferUnparsedProps<def, optionalKey, $, args>>

// keeps definition order through show
type inferUnparsedProps<def, optionalKey, $, args> = {
	-readonly [k in keyof def as k extends optionalKey ? never
	:	k]: inferDefinition<def[k], $, args>
} & {
	-readonly [k in keyof def as k extends optionalKey ?
		optionalKeyFromEntry<k, def[k]>
	:	never]?: def[k] extends OptionalPropertyDefinition<infer baseDef> ?
		inferDefinition<baseDef, $, args>
	:	inferDefinition<def[k], $, args>
}

type inferKeyedObjectLiteral<def extends object, $, args> = {
	// since def is a const parameter, we remove the readonly modifier here
	// support for built-in readonly tracked here:
	// https://github.com/arktypeio/arktype/issues/808
	-readonly [k in keyof def as nonOptionalKeyFromEntry<
		k,
		def[k],
		$,
		args
	>]: inferDefinition<def[k], $, args>
} & {
	-readonly [k in keyof def as optionalKeyFromEntry<
		k,
		def[k]
	>]?: def[k] extends OptionalPropertyDefinition<infer baseDef> ?
		inferDefinition<baseDef, $, args>
	:	inferDefinition<def[k], $, args>
}

export type validateObjectLiteral<def, $, args> = {
	[k in keyof def]: k extends PreparsedKeyPattern ?
		validatePreparsedEntry<k, def[k], $, args>
	: k extends `${infer indexKey extends IndexKey}?` ?
		ErrorMessage<writeOptionalIndexKeyMessage<indexKey>>
	:	validateProperty<
			def[k],
			k extends OptionalPropertyString ? "optional" : "required",
			$,
			args
		>
}

type validatePreparsedEntry<k, v, $, args> =
	preparseKey<k> extends infer parsedKey extends PreparsedKey ?
		parsedKey extends PreparsedEntryKey<"index"> ?
			validateString<parsedKey["normalized"], $, args> extends (
				ErrorMessage<infer message>
			) ?
				// add a nominal type here to avoid allowing the error message as input
				ErrorType<message>
			: inferDefinition<parsedKey["normalized"], $, args> extends Key ?
				// if the index def is syntactically and semantically valid,
				// move on to the validating the value definition
				validateProperty<v, parsedKey["kind"], $, args>
			:	ErrorMessage<writeInvalidPropertyKeyMessage<parsedKey["normalized"]>>
		:	validateProperty<v, parsedKey["kind"], $, args>
	:	never

type nonOptionalKeyFromEntry<k extends PropertyKey, v, $, args> =
	// inferring into parsedKey with no extends check seems to
	// help TS preserve homomorphic mapping for required keys
	preparseKey<k> extends infer parsedKey ?
		parsedKey extends PreparsedEntryKey<"required"> ?
			[v] extends [OptionalPropertyDefinition] ?
				[v] extends [anyOrNever] ?
					parsedKey["normalized"]
				:	never
			:	parsedKey["normalized"]
		: parsedKey extends PreparsedEntryKey<"index"> ?
			inferDefinition<parsedKey["normalized"], $, args> & Key
		:	// optional keys are not included by definition
			// "..." is handled at the type root so is handled neither here nor in optionalKeyFrom
			// "+" has no effect on inference
			never
	:	never

type optionalKeyFromEntry<k extends PropertyKey, v> =
	// inferring into parsedKey with no extends check seems to
	// help TS preserve homomorphic mapping for value-optional keys
	preparseKey<k> extends infer parsedKey ?
		parsedKey extends PreparsedEntryKey<"optional"> ? parsedKey["normalized"]
		: parsedKey extends PreparsedEntryKey<"required"> ?
			v extends OptionalPropertyDefinition ?
				parsedKey["normalized"]
			:	never
		:	never
	:	never

export const writeInvalidUndeclaredBehaviorMessage = (
	actual: unknown
): string =>
	`Value of '+' key must be 'reject', 'delete', or 'ignore' (was ${printable(actual)})`

export const writeOptionalIndexKeyMessage = <key extends IndexKey>(
	key: key
): writeOptionalIndexKeyMessage<key> =>
	`Index signature ${key} can't be optional. Escape its '[' with a backslash for an optional key named '${key}'`

export type writeOptionalIndexKeyMessage<key extends IndexKey> =
	`Index signature ${key} can't be optional. Escape its '[' with a backslash for an optional key named '${key}'`

export const nonLeadingSpreadError =
	"Spread operator may only be used as the first key in an object"

export type PreparsedKey = PreparsedEntryKey | PreparsedSpecialKey

type normalizedKeyKind<kind extends EntryKeyKind> =
	kind extends "index" ? string : Key

export type PreparsedEntryKey<
	kind extends EntryKeyKind = EntryKeyKind,
	normalized extends normalizedKeyKind<kind> = normalizedKeyKind<kind>
> = {
	kind: kind
	normalized: normalized
}

export type PreparsedSpecialKey<kind extends SpecialKeyKind = SpecialKeyKind> =
	{
		kind: kind
	}

declare namespace PreparsedKey {
	export type from<t extends PreparsedKey> = t
}

export type ParsedKeyKind = EntryKeyKind | SpecialKeyKind

export type EntryKeyKind = "required" | "optional" | "index"

export type SpecialKeyKind = "spread" | "undeclared" | "meta"

export type MetaKey = "..." | "+" | "@"

export type IndexKey<def extends string = string> = `[${def}]`

export const preparseKey = (key: Key): PreparsedKey =>
	typeof key === "symbol" ? { kind: "required", normalized: key }
	: key[key.length - 1] === "?" ?
		key[key.length - 2] === Backslash ?
			{ kind: "required", normalized: `${key.slice(0, -2)}?` }
		: key[0] === "[" && key[key.length - 2] === "]" ?
			throwParseError(
				writeOptionalIndexKeyMessage(key.slice(0, -1) as IndexKey)
			)
		: key[0] === Backslash && key[1] === "[" && key[key.length - 2] === "]" ?
			{ kind: "optional", normalized: key.slice(1, -1) }
		:	{ kind: "optional", normalized: key.slice(0, -1) }
	: key[0] === "[" && key[key.length - 1] === "]" ?
		{ kind: "index", normalized: key.slice(1, -1) }
	: key[0] === Backslash && key[1] === "[" && key[key.length - 1] === "]" ?
		{ kind: "required", normalized: key.slice(1) }
	: key === "..." ? { kind: "spread" }
	: key === "+" ? { kind: "undeclared" }
	: key === "@" ? { kind: "meta" }
	: {
			kind: "required",
			normalized:
				key === "\\..." ? "..."
				: key === "\\+" ? "+"
				: key === "\\@" ? "@"
				: key
		}

export type preparseKey<k> =
	k extends symbol ?
		PreparsedKey.from<{
			kind: "required"
			normalized: k
		}>
	: k extends `${infer inner}?` ?
		inner extends `${infer baseName}${Backslash}` ?
			PreparsedKey.from<{
				kind: "required"
				normalized: `${baseName}?`
			}>
		:	PreparsedKey.from<{
				kind: "optional"
				normalized: inner extends (
					`${Backslash}${infer escapedIndexKey extends IndexKey}`
				) ?
					escapedIndexKey
				:	inner
			}>
	: k extends `${"+" | "." | "@" | Backslash | "["}${string}` ?
		preparseSpecialKey<k>
	:	PreparsedKey.from<{
			kind: "required"
			normalized: k extends Key ? k : `${k & number}`
		}>

type preparseSpecialKey<k> =
	k extends "+" ? { kind: "undeclared" }
	: k extends "..." ? { kind: "spread" }
	: k extends "@" ? { kind: "meta" }
	: k extends `${Backslash}${infer escapedMeta extends MetaKey}` ?
		PreparsedKey.from<{ kind: "required"; normalized: escapedMeta }>
	: k extends IndexKey<infer def> ?
		PreparsedKey.from<{
			kind: "index"
			normalized: def
		}>
	:	PreparsedKey.from<{
			kind: "required"
			normalized: k extends (
				`${Backslash}${infer escapedIndexKey extends IndexKey}`
			) ?
				escapedIndexKey
			: k extends Key ? k
			: `${k & number}`
		}>

export const writeInvalidSpreadTypeMessage = <def extends string>(
	def: def
): writeInvalidSpreadTypeMessage<def> =>
	`Spread operand must resolve to an object literal type (was ${def})`

export type writeInvalidSpreadTypeMessage<def extends string> =
	`Spread operand must resolve to an object literal type (was ${def})`
