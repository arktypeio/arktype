import { type declareNode, type withAttributes } from "../base.ts"
import { type BasisKind } from "../bases/basis.ts"
import { builtins } from "../builtins.ts"
import { Disjoint } from "../disjoint.ts"
import { type Node, type RootInput, type RootKind } from "../nodes.ts"
import { defineNode, rootKinds } from "../utils.ts"
import { type ConstraintAttachments } from "./constraint.ts"
import { getBasisName } from "./shared.ts"

export type PropDeclarationsByKind = {
	required: RequiredDeclaration
	optional: OptionalDeclaration
}

export type PropKind = keyof PropDeclarationsByKind

export type RequiredPropInner = withAttributes<{
	readonly key: string | symbol
	readonly value: Node<RootKind>
}>

export type RequiredPropSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: RootInput
}>

export type RequiredDeclaration = declareNode<{
	kind: "required"
	expandedSchema: RequiredPropSchema
	inner: RequiredPropInner
	intersections: {
		required: "required" | Disjoint | null
	}
	attach: ConstraintAttachments<object>
}>

const writeInvalidBasisMessage = (basis: Node<BasisKind> | undefined) =>
	`Props may only be applied to an object basis (was ${getBasisName(basis)})`

// readonly implicitBasis: DomainNode<object> = builtins().object

export const RequiredImplementation = defineNode({
	kind: "required",
	keys: {
		key: {},
		value: {
			children: rootKinds
		}
	},
	intersections: {
		required: (l, r) => {
			if (l.key !== r.key) {
				return null
			}
			const required = l.key
			const value = l.value.intersect(r.value)
			if (value instanceof Disjoint) {
				return value
			}
			return {
				key: required,
				value
			}
		}
	},
	expand: (schema) => schema as never,
	writeDefaultDescription: (inner) => `${String(inner.key)}: ${inner.value}`,
	attach: (inner) => ({
		implicitBasis: builtins().object,
		condition: "true"
	})
})

// static writeInvalidBasisMessage = writeInvalidBasisMessage

export type OptionalPropInner = withAttributes<{
	readonly key: string | symbol
	readonly value: Node<RootKind>
}>

export type OptionalPropSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: RootInput
}>

export type OptionalDeclaration = declareNode<{
	kind: "optional"
	expandedSchema: OptionalPropSchema
	inner: OptionalPropInner
	intersections: {
		optional: "optional" | null
	}
	attach: ConstraintAttachments<object>
}>

// static writeInvalidBasisMessage = writeInvalidBasisMessage

// readonly implicitBasis: DomainNode<object> = builtins().object

export const OptionalImplementation = defineNode({
	kind: "optional",
	keys: {
		key: {},
		value: {
			children: rootKinds
		}
	},
	intersections: {
		optional: (l, r) => {
			if (l.key !== r.key) {
				return null
			}
			const optional = l.key
			const value = l.value.intersect(r.value)
			return {
				key: optional,
				value: value instanceof Disjoint ? builtins().never : value
			}
		}
	},
	expand: (schema) => schema as never,
	writeDefaultDescription: (inner) => `${String(inner.key)}?: ${inner.value}`,
	attach: (inner) => ({
		implicitBasis: builtins().object,
		condition: "true"
	})
})

/**** NAMED *****/

// export const compileNamedProps = (
// 	props: readonly NamedPropRule[],
// 	ctx: CompilationContext
// ) => props.map((prop) => compileNamedProp(prop, ctx)).join("\n")

// export const compileNamedProp = (
// 	prop: NamedPropRule,
// 	ctx: CompilationContext
// ) => {
// 	ctx.path.push(prop.key.name)
// 	const compiledValue = `${prop.value.alias}(${In}${compilePropAccess(
// 		prop.key.name
// 	)})`
// 	ctx.path.pop()
// 	const result = prop.key.optional
// 		? `if('${prop.key.name}' in ${In}) {
//             ${compiledValue}
//         }`
// 		: compiledValue
// 	return result
// }

/**** PROPS ********/

// readonly kind = "props"
// 	readonly named: NamedEntries = this.rule.filter(isNamed)
// 	readonly indexed: IndexedEntries = this.rule.filter(isIndexed)

// 	readonly literalKeys = this.named.map((prop) => prop.key.name)
// 	readonly namedKeyOf = cached(() => node.unit(...this.literalKeys))
// 	readonly indexedKeyOf = cached(
// 		() =>
// 			new TypeNode(
// 				this.indexed.flatMap((entry) => entry.key.branches),
// 				this.meta
// 			)
// 	)
// 	readonly keyof = cached(() => this.namedKeyOf().or(this.indexedKeyOf()))

// compile(ctx: CompilationContext) {
// 	if (this.indexed.length === 0) {
// 		return compileNamedProps(this.named, ctx)
// 	}
// 	if (this.indexed.length === 1) {
// 		// if the only unenumerable set of props are the indices of an array, we can iterate over it instead of checking each key
// 		const indexMatcher = extractArrayIndexRegex(this.indexed[0].key)
// 		if (indexMatcher) {
// 			return compileArray(
// 				indexMatcher,
// 				this.indexed[0].value,
// 				this.named,
// 				ctx
// 			)
// 		}
// 	}
// 	return compileIndexed(this.named, this.indexed, ctx)
// }

// describe() {
// 	const entries = this.named.map(({ key, value }): [string, string] => {
// 		return [`${key.name}${key.optional ? "?" : ""}`, value.toString()]
// 	})
// 	for (const entry of this.indexed) {
// 		entries.push([`[${entry.key}]`, entry.value.toString()])
// 	}
// 	return JSON.stringify(fromEntries(entries))
// }

// readonly references = this.rule.flatMap((entry) =>
// hasArkKind(entry.key, "node") &&
// // since array indices have a special compilation process, we
// // don't need to store a reference their type
// !extractArrayIndexRegex(entry.key)
// 	? [
// 			entry.key,
// 			...entry.key.references,
// 			entry.value,
// 			...entry.value.references
// 	  ]
// 	: [entry.value, ...entry.value.references]
// )

// get(key: string | TypeNode) {
// 	return typeof key === "string"
// 		? this.named.find((entry) => entry.value.branches)?.value
// 		: this.indexed.find((entry) => entry.key.equals(key))?.value
// }

// export const intersectProps = (
// 	l: PropsNode,
// 	r: PropsNode
// ): PropsNode | Disjoint => {
// 	const indexed = [...l.indexed]
// 	for (const { key, value } of r.indexed) {
// 		const matchingIndex = indexed.findIndex((entry) => entry.key === key)
// 		if (matchingIndex === -1) {
// 			indexed.push({ key, value })
// 		} else {
// 			const result = indexed[matchingIndex].value.intersect(value)
// 			indexed[matchingIndex] = {
// 				key,
// 				value: result instanceof Disjoint ? builtins.never() : result
// 			}
// 		}
// 	}
// 	const named = { ...l.named, ...r.named }
// 	const disjointsByPath: DisjointsSources = {}
// 	for (const k in named) {
// 		// TODO: not all discriminable- if one optional and one required, even if disjoint
// 		let intersectedValue: NamedPropRule | Disjoint = named[k]
// 		if (k in l.named) {
// 			if (k in r.named) {
// 				// We assume l and r were properly created and the named
// 				// props from each PropsNode have already been intersected
// 				// with any matching index props. Therefore, the
// 				// intersection result will already include index values
// 				// from both sides whose key types allow k.
// 				intersectedValue = intersectNamedProp(l.named[k], r.named[k])
// 			} else {
// 				// If a named key from l matches any index keys of r, intersect
// 				// the value associated with the name with the index value.
// 				for (const { key, value } of r.indexed) {
// 					if (key.allows(k)) {
// 						intersectedValue = intersectNamedProp(l.named[k], {
// 							key: {
// 								name: k,
// 								prerequisite: false,
// 								optional: true
// 							},
// 							value
// 						})
// 					}
// 				}
// 			}
// 		} else {
// 			// If a named key from r matches any index keys of l, intersect
// 			// the value associated with the name with the index value.
// 			for (const { key, value } of l.indexed) {
// 				if (key.allows(k)) {
// 					intersectedValue = intersectNamedProp(r.named[k], {
// 						key: {
// 							name: k,
// 							prerequisite: false,
// 							optional: true
// 						},
// 						value
// 					})
// 				}
// 			}
// 		}
// 		if (intersectedValue instanceof Disjoint) {
// 			Object.assign(disjointsByPath, intersectedValue.withPrefixKey(k).sources)
// 		}
// 	}
// 	if (hasKeys(disjointsByPath)) {
// 		return new Disjoint(disjointsByPath)
// 	}
// 	// TODO: fix
// 	// if (
// 	//     named.some(
// 	//         ({ key }) =>
// 	//             !hasArkKind(key, "node") &&
// 	//             key.name === "length" &&
// 	//             key.prerequisite
// 	//     )
// 	// ) {
// 	//     // if the index key is from and unbounded array and we have a tuple length,
// 	//     // it has already been intersected and should be removed
// 	//     indexed = indexed.filter((entry) => !extractArrayIndexRegex(entry.key))
// 	// }
// 	// TODO: review other intersections to make sure meta is handled correclty
// 	return new PropsNode([...named, ...indexed], l.meta)
// }

/******* INPUT */
// export type PropsInput = NamedPropsInput | PropsInputTuple

// export const isParsedPropsRule = (
//     input: PropsInput | PropsEntries
// ): input is PropsEntries =>
//     isArray(input) && (input.length === 0 || hasArkKind(input[0].value, "node"))

// const parsePropsInput = (input: PropsInput, meta: PropsMeta) => {
//     const [namedInput, ...indexedInput] = isArray(input) ? input : [input]
//     const entries: NodeEntry[] = []
//     for (const name in namedInput) {
//         const prop = namedInput[name]
//         entries.push({
//             key: {
//                 name,
//                 prerequisite: prop.prerequisite ?? false,
//                 optional: prop.optional ?? false
//             },
//             value: hasArkKind(prop.value, "node")
//                 ? prop.value
//                 : typeNode(prop.value, meta)
//         })
//     }
//     for (const prop of indexedInput) {
//         entries.push({
//             key: typeNode(prop.key, meta),
//             value: typeNode(prop.value, meta)
//         })
//     }
//     return entries
// }

// export const parse = (input, meta) => {
//     // TODO: better strategy for sorting
//     const rule = isParsedPropsRule(input) ? input : parsePropsInput(input, meta)
//     return [...rule].sort((l, r) => {
//         // Sort keys first by precedence (prerequisite,required,optional,indexed),
//         // then alphebetically by key
//         const lPrecedence = kindPrecedence(this.key)
//         const rPrecedence = kindPrecedence(r.key)
//         return lPrecedence > rPrecedence
//             ? 1
//             : lPrecedence < rPrecedence
//             ? -1
//             : keyNameToString(this.key) > keyNameToString(r.key)
//             ? 1
//             : -1
//     })
// }

// export type inferPropsInput<input extends PropsInput> =
// 	input extends PropsInputTuple<infer named, infer indexed>
// 		? inferIndexed<indexed, inferNamedProps<named, indexed>>
// 		: input extends NamedPropsInput
// 		? inferNamedProps<input, []>
// 		: never

// type inferIndexed<
// 	indexed extends readonly IndexedPropInput[],
// 	result = unknown
// > = indexed extends readonly [
// 	infer entry extends IndexedPropInput,
// 	...infer tail extends IndexedPropInput[]
// ]
// 	? inferIndexed<
// 			tail,
// 			entry["key"] extends { readonly regex: VariadicIndexMatcherLiteral }
// 				? result extends List
// 					? [...result, ...inferTypeInput<entry["value"]>[]]
// 					: never
// 				: entry["key"] extends {
// 						readonly regex: NonVariadicIndexMatcherLiteral
// 				  }
// 				? inferTypeInput<entry["value"]>[]
// 				: Record<
// 						Extract<inferTypeInput<entry["key"]>, PropertyKey>,
// 						inferTypeInput<entry["value"]>
// 				  >
// 	  >
// 	: result

// type inferNamedProps<
// 	named extends NamedPropsInput,
// 	indexed extends readonly IndexedPropInput[]
// > = [named, indexed[0]["key"]] extends
// 	| [TupleLengthProps, unknown]
// 	| [unknown, { readonly regex: VariadicIndexMatcherLiteral }]
// 	? inferNonVariadicTupleProps<named> &
// 			inferObjectLiteralProps<Omit<named, "length" | NumberLiteral | number>>
// 	: inferObjectLiteralProps<named>

// type inferObjectLiteralProps<named extends NamedPropsInput> = {} extends named
// 	? unknown
// 	: evaluate<
// 			{
// 				[k in requiredKeyOf<named>]: inferPropValue<named[k]["value"]>
// 			} & {
// 				[k in optionalKeyOf<named>]?: inferPropValue<named[k]["value"]>
// 			}
// 	  >

// type inferPropValue<value extends PropValueInput> = value extends Thunk<
// 	infer ret
// >
// 	? inferResolvedPropValue<ret>
// 	: inferResolvedPropValue<value>

// type inferResolvedPropValue<value> = value extends TypeNode<infer t>
// 	? t
// 	: inferTypeInput<Extract<value, TypeInput>>

// type stringifiedNumericKeyOf<t> = `${Extract<keyof t, number | NumberLiteral>}`

// type inferNonVariadicTupleProps<
// 	named extends NamedPropsInput,
// 	result extends unknown[] = []
// > = `${result["length"]}` extends stringifiedNumericKeyOf<named>
// 	? inferNonVariadicTupleProps<
// 			named,
// 			[...result, inferPropValue<named[`${result["length"]}`]["value"]>]
// 	  >
// 	: result

// type TupleLengthProps<length extends number = number> = {
// 	readonly length: {
// 		readonly prerequisite: true
// 		readonly value: { readonly basis: readonly ["===", length] }
// 	}
// }

//**** INDEXED */

// const arrayIndexSourceSuffix = `(?:0|(?:[1-9]\\d*))$`

// const arrayIndexLiteralSuffix = `${arrayIndexSourceSuffix}/` as const

// export type ArrayIndexMatcherSource =
// 	`${string}${typeof arrayIndexSourceSuffix}`

// const excludedIndexMatcherStart = "^(?!("
// const excludedIndexMatcherEnd = ")$)"

// // Build a pattern to exclude all indices from firstVariadic - 1 down to 0
// const excludedIndicesSource = (firstVariadic: number) => {
// 	if (firstVariadic < 1) {
// 		return throwInternalError(
// 			`Unexpectedly tried to create a variadic index < 1 (was ${firstVariadic})`
// 		)
// 	}
// 	let excludedIndices = `${firstVariadic - 1}`
// 	for (let i = firstVariadic - 2; i >= 0; i--) {
// 		excludedIndices += `|${i}`
// 	}
// 	return `${excludedIndexMatcherStart}${excludedIndices}${excludedIndexMatcherEnd}${arrayIndexSourceSuffix}` as const
// }

// export type VariadicIndexMatcherSource = ReturnType<
// 	typeof excludedIndicesSource
// >

// export type VariadicIndexMatcherLiteral = `/${VariadicIndexMatcherSource}/`

// const nonVariadicIndexMatcherSource = `^${arrayIndexSourceSuffix}` as const

// export type NonVariadicIndexMatcherSource = typeof nonVariadicIndexMatcherSource

// export type NonVariadicIndexMatcherLiteral =
// 	`/${NonVariadicIndexMatcherSource}/`

// export const arrayIndexMatcherSource = <index extends number>(
// 	firstVariadic: index
// ) =>
// 	(firstVariadic === 0
// 		? // If the variadic pattern starts at index 0, return the base array index matcher
// 		  nonVariadicIndexMatcherSource
// 		: excludedIndicesSource(firstVariadic)) as index extends 0
// 		? NonVariadicIndexMatcherSource
// 		: VariadicIndexMatcherSource

// export const extractArrayIndexRegex = (keyNode: TypeNode) => {
// 	if (keyNode.branches.length !== 1) {
// 		return
// 	}
// 	const regexConstraints = keyNode.branches[0].regex
// 	if (!regexConstraints || regexConstraints.length !== 1) {
// 		return
// 	}
// 	const regexLiteral = regexConstraints[0].rule
// 	if (!regexLiteral.endsWith(arrayIndexLiteralSuffix)) {
// 		return
// 	}
// 	return sourceFromRegexLiteral(regexLiteral) as ArrayIndexMatcherSource
// }

// export const extractFirstVariadicIndex = (source: ArrayIndexMatcherSource) => {
// 	if (!source.startsWith(excludedIndexMatcherStart)) {
// 		return 0
// 	}
// 	const excludedIndices = source.slice(
// 		excludedIndexMatcherStart.length,
// 		source.indexOf(excludedIndexMatcherEnd)
// 	)
// 	const firstExcludedIndex = excludedIndices.split("|")[0]
// 	return (
// 		tryParseWellFormedInteger(
// 			firstExcludedIndex,
// 			`Unexpectedly failed to parse a variadic index from ${source}`
// 		) + 1
// 	)
// }

// export const arrayIndexInput = <index extends number = 0>(
// 	firstVariadicIndex: index = 0 as index
// ) =>
// 	({
// 		basis: "string",
// 		regex: `/${arrayIndexMatcherSource(firstVariadicIndex)}/`
// 		// TODO: reenable
// 	}) as const // satisfies PredicateInput<"string">

// export const arrayIndexTypeNode = (firstVariadicIndex = 0): TypeNode<string> =>
// 	firstVariadicIndex === 0
// 		? builtins.nonVariadicArrayIndex()
// 		: node(arrayIndexInput(firstVariadicIndex))

// export const compileArray = (
// 	indexMatcher: ArrayIndexMatcherSource,
// 	elementNode: TypeNode,
// 	namedProps: readonly NamedPropRule[],
// 	ctx: CompilationContext
// ) => {
// 	const firstVariadicIndex = extractFirstVariadicIndex(indexMatcher)
// 	const namedCheck = namedProps
// 		.map((named) => compileNamedProp(named, ctx))
// 		.join("\n")
// 	ctx.path.push(["i"])
// 	const elementCondition = `${elementNode.alias}(${In}[i])`
// 	ctx.path.pop()
// 	return `${namedCheck}
// for(let i = ${firstVariadicIndex}; i < ${In}.length; i++) {
//     ${elementCondition}
// }`
// }

// export const compileIndexed = (
// 	namedProps: readonly NamedPropRule[],
// 	indexedProps: readonly IndexedPropRule[],
// 	ctx: CompilationContext
// ) => {
// 	const k = ctx.path.push(["k"])
// 	const indexedChecks = indexedProps
// 		.map((prop) =>
// 			prop.key === builtins.string()
// 				? // if the index signature is just for "string", we don't need to check it explicitly
// 				  prop.value.compile(ctx)
// 				: // Ensure condition is checked on the key variable as opposed to the input
// 				  // TODO: fix ${prop.key.condition.replaceAll(InputParameterName, k)}
// 				  `if(false){
//     ${prop.value.compile(ctx)}
// }`
// 		)
// 		.join("\n")
// 	ctx.path.pop()
// 	if (ctx) {
// 		return throwInternalError(`Unimplemented?`)
// 	}
// 	// TODO: don't recheck named
// 	return `${compileNamedProps(namedProps, ctx)}
//     for(const ${k} in ${In}) {
//         ${indexedChecks}
//     }
// `
// }

// export type IndexedPropInput = Readonly<{
// 	key: TypeInput
// 	value: TypeInput
// }>

// export type IndexedPropRule = Readonly<{
// 	key: TypeNode
// 	value: TypeNode
// }>

// export class IndexedPropNode extends NodeBase<IndexedPropRule, {}> {
//     readonly kind = "indexed"
//     readonly key = this.rule.key
//     readonly value = this.rule.value

//     compile(ctx: CompilationContext) {
//         return ""
//     }

//     describe() {
//         return `[${this.rule.key}]: ${this.rule.value}`
//     }
// }
