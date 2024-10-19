import {
	refinementKinds,
	type NodeKind,
	type nodeOfKind,
	type RefinementKind
} from "@ark/schema"
import {
	hasKey,
	isArray,
	nearestFloat,
	stringAndSymbolicEntriesOf,
	throwInternalError
} from "@ark/util"
import type { type } from "arktype"
import {
	anything,
	array,
	bigInt,
	constant,
	dictionary,
	letrec,
	object,
	oneof,
	record,
	tuple,
	uniqueArray,
	type Arbitrary,
	type LetrecLooselyTypedTie
} from "fast-check"
import { buildDateArbitrary } from "./terminalArbitraries/date.ts"
import { buildNumberArbitrary } from "./terminalArbitraries/number.ts"
import { buildStringArbitrary } from "./terminalArbitraries/string.ts"

export type RuleByRefinementKind = {
	[k in RefinementKind]?: nodeOfKind<k>["inner"]["rule"]
}

const buildArbitrary = (node: nodeOfKind<NodeKind>, ctx: Ctx) => {
	switch (node.kind) {
		case "intersection":
			ctx.seenIntersectionIds[node.id] = true
			ctx.isCyclic = node.isCyclic
			const rootNode = getRootAndSetCtxRefinements(node, ctx)
			const intersectionArbitrary: Arbitrary<unknown> = buildArbitrary(
				rootNode,
				ctx
			)
			ctx.arbitrariesByIntersectionId[node.id] = intersectionArbitrary
			return intersectionArbitrary
		case "domain":
			return buildDomainArbitrary(node, ctx)
		case "union":
			const arbitraries: Arbitrary<unknown>[] = node.children.map(node =>
				buildArbitrary(node, ctx)
			)
			return oneof(...arbitraries)
		case "unit":
			return constant(node.unit)
		case "proto":
			return buildProtoArbitrary(node, ctx)
		case "structure":
			return buildStructureArbitrary(node, ctx)
		case "index":
			return buildIndexSignatureArbitrary([node], ctx)
		case "required":
		case "optional":
			if (node.value.kind === "alias" && node.required)
				throwInternalError("Infinitely deep cycles are not supported.")
			return buildArbitrary(node.value as never, getCleanCtx(ctx))
		case "morph":
			//todoshawn we can ask david about this one
			if (node.inner.in === undefined)
				throwInternalError(`Expected the morph to have an 'In' value.`)

			return buildArbitrary(node.inner.in as never, ctx)
		case "alias":
			if (ctx.tieStack.length < 1)
				throwInternalError("Tie has not been initialized")
			const tie = ctx.tieStack[ctx.tieStack.length - 1]
			const id = node.resolutionId
			if (!(id in ctx.seenIntersectionIds)) {
				ctx.seenIntersectionIds[id] = true
				ctx.arbitrariesByIntersectionId[id] = buildArbitrary(
					node.resolution as never,
					getCleanCtx(ctx)
				)
			}
			return tie(id)
	}
	throwInternalError(`${node.kind} is not supported`)
}

export type Ctx = {
	refinements: RuleByRefinementKind
	seenIntersectionIds: Record<string, true>
	arbitrariesByIntersectionId: Record<string, Arbitrary<unknown>>
	isCyclic: boolean
	tieStack: LetrecLooselyTypedTie[]
}

const initializeContext = (): Ctx => ({
	refinements: {},
	seenIntersectionIds: {},
	arbitrariesByIntersectionId: {},
	isCyclic: false,
	tieStack: []
})

const getCleanCtx = (oldCtx: Ctx) => ({ ...oldCtx, refinements: {} })

export const arkToArbitrary = (schema: type.Any): Arbitrary<unknown> => {
	const ctx = initializeContext()
	return buildArbitrary(schema as never, ctx)
}

const getRefinements = <t extends RefinementKind>(
	refinementNodes: nodeOfKind<t>[]
) => {
	const refinements: RuleByRefinementKind = {}
	for (const refinementNode of refinementNodes) {
		if (refinementNode.hasKindIn("min", "max")) {
			refinements[refinementNode.kind] =
				"exclusive" in refinementNode ?
					nearestFloat(
						refinementNode.rule,
						refinementNode.kind === "min" ? "+" : "-"
					)
				:	refinementNode.rule
		} else refinements[refinementNode.kind] = refinementNode.rule as never
	}
	return refinements
}
const getRootAndSetCtxRefinements = (
	node: nodeOfKind<"intersection">,
	ctx: Ctx
) => {
	const refinementNodes: nodeOfKind<RefinementKind>[] = []
	let rootNodes: nodeOfKind<NodeKind>[] = []
	for (const key in node.inner) {
		const value = node.inner[key as keyof typeof node.inner]
		if (refinementKinds.includes(key as never)) {
			if (key === "pattern" && isArray(value)) {
				if (value.length > 1) {
					throwInternalError(
						"Multiple regexes on a single node is not supported."
					)
				}
				refinementNodes.push(value[0] as never)
			} else refinementNodes.push(value as never)
		} else rootNodes.push(value as never)
	}
	ctx.refinements = getRefinements(refinementNodes as never)

	if (rootNodes.length === 0 || rootNodes.length > 1) {
		if (!hasKey(node, "structure"))
			throwInternalError("todoshawn figure out hwo to handle here")
		else rootNodes = rootNodes.filter(node => node.kind === "structure")
	}

	return rootNodes[0]
}

const buildDomainArbitrary = (node: nodeOfKind<"domain">, ctx: Ctx) => {
	switch (node.domain) {
		case "bigint":
			return bigInt()
		case "number":
			return buildNumberArbitrary(ctx)
		case "object":
			return object()
		case "string":
			return buildStringArbitrary(ctx)
		case "symbol":
			return constant(Symbol())
		default:
			throwInternalError(`${node.domain} is not implemented`)
	}
}

const buildStructureArbitrary = (
	node: nodeOfKind<"structure">,
	ctx: Ctx
): Arbitrary<unknown> => {
	//todoshawn
	if (hasKey(node, "index") && node.index)
		return buildIndexSignatureArbitrary(node.index, ctx)

	if (hasKey(node.inner, "sequence") && node.sequence) {
		const arrayArbitrary = buildArrayArbitrary(node.sequence, ctx)
		if (!hasKey(node.inner, "required")) return arrayArbitrary
		//todoshawn apply additional props to an array
		const recordArbitrary = buildObjectArbitrary(node, ctx)
		return tuple(arrayArbitrary, recordArbitrary).map(([arr, record]) =>
			Object.assign(arr, record)
		)
	}

	if (ctx.isCyclic && !ctx.tieStack.length) {
		const objectArbitrary = letrec(tie => {
			ctx.tieStack.push(tie)
			const arbitraries = {
				root: buildObjectArbitrary(node, ctx),
				...ctx.arbitrariesByIntersectionId
			}
			ctx.tieStack.pop()
			return arbitraries
		})
		return objectArbitrary["root"]
	}

	return buildObjectArbitrary(node, ctx)
}

const buildObjectArbitrary = (node: nodeOfKind<"structure">, ctx: Ctx) => {
	const entries = stringAndSymbolicEntriesOf(node.propsByKey)
	const requiredKeys = node.requiredKeys
	const arbitrariesByKey: Record<PropertyKey, Arbitrary<unknown>> = {}
	for (const [key, value] of entries) {
		arbitrariesByKey[key] = buildArbitrary(
			value as nodeOfKind<NodeKind>,
			getCleanCtx(ctx)
		)
	}

	return record(arbitrariesByKey, { requiredKeys } as never)
}

const buildIndexSignatureArbitrary = (
	indexNodes: readonly nodeOfKind<"index">[],
	ctx: Ctx
): Arbitrary<Record<string, unknown>> => {
	if (indexNodes.length === 1)
		return getDictionaryArbitrary(indexNodes[0], getCleanCtx(ctx))

	const dictionaryArbitraries = []
	for (const indexNode of indexNodes) {
		dictionaryArbitraries.push(
			getDictionaryArbitrary(indexNode, getCleanCtx(ctx))
		)
	}
	return tuple(...dictionaryArbitraries).map(arbs => {
		const recordArb = {}
		for (const arb of arbs) Object.assign(recordArb, arb)
		return recordArb
	})
}

const getDictionaryArbitrary = (node: nodeOfKind<"index">, ctx: Ctx) => {
	const signatureArbitrary = buildArbitrary(node.signature, ctx)
	const valueArbitrary = buildArbitrary(node.value as never, ctx)
	//signatureArbitrary can be a symbol or string arbitrary
	return dictionary(signatureArbitrary as never, valueArbitrary)
}

const buildArrayArbitrary = (node: nodeOfKind<"sequence">, ctx: Ctx) => {
	const tupleElements = node.tuple
	//Arrays will always have a single element and the kind will be variadic
	if (tupleElements.length === 1 && tupleElements[0].kind === "variadic") {
		const arrayTypeArbitrary = buildArbitrary(
			tupleElements[0].node as never,
			ctx
		)
		const arrArbitrary = array(arrayTypeArbitrary, ctx.refinements)
		const assembledArbitrary =
			ctx.tieStack.length ?
				oneof(
					{
						maxDepth: 2,
						depthIdentifier: `id:${node.id}`
					},
					{ arbitrary: constant([]), weight: 1 },
					{
						arbitrary: arrArbitrary,
						weight: 2
					}
				)
			:	arrArbitrary

		return assembledArbitrary
	}

	const tupleArbitraries = []
	for (const element of tupleElements) {
		const arbitrary = buildArbitrary(element.node as never, getCleanCtx(ctx))
		if (element.kind === "variadic") tupleArbitraries.push(array(arbitrary))
		else tupleArbitraries.push(arbitrary)
	}

	const spreadVariadicElementsTuple: Arbitrary<unknown[]> = tuple(
		...tupleArbitraries
	).chain(arr => {
		const arrayWithoutOptionals = []
		const arrayWithOptionals = []
		for (const i in arr) {
			if (tupleElements[i].kind === "variadic") {
				const generatedValuesArray = (arr[i] as unknown[]).map(val =>
					constant(val)
				)
				arrayWithoutOptionals.push(...generatedValuesArray)
				arrayWithOptionals.push(...generatedValuesArray)
			} else if (tupleElements[i].kind === "optionals")
				arrayWithoutOptionals.push(constant(arr[i]))
			else {
				arrayWithoutOptionals.push(constant(arr[i]))
				arrayWithOptionals.push(constant(arr[i]))
			}
		}
		if (arrayWithOptionals.length !== arrayWithoutOptionals.length) {
			return oneof(
				tuple(...arrayWithoutOptionals),
				tuple(...arrayWithOptionals)
			)
		}
		return tuple(...arrayWithoutOptionals)
	})
	return spreadVariadicElementsTuple
}

const buildProtoArbitrary = (node: nodeOfKind<"proto">, ctx: Ctx) => {
	switch (node.builtinName) {
		case "Array":
			if (ctx.refinements.exactLength === 0) return tuple()
			return array(anything())
		case "Set":
			return uniqueArray(anything()).map(arr => new Set(arr))
		case "Date":
			return buildDateArbitrary(ctx)
		default:
			throwInternalError(`${node.builtinName} is not implemented`)
	}
}
