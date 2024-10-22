import {
	refinementKinds,
	type NodeKind,
	type nodeOfKind,
	type RefinementKind,
	type SequenceTuple
} from "@ark/schema"
import {
	hasKey,
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
	type LetrecLooselyTypedTie,
	type LetrecValue
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
			//todoshawn
			// Specifically in the case of unknown the root node is an empty intersection node
			if (rootNode === undefined) return anything()
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

const setRefinement = (
	refinementNode: nodeOfKind<RefinementKind>,
	ctx: Ctx
) => {
	if (refinementNode.hasKind("pattern")) {
		if (ctx.refinements.pattern !== undefined)
			throwInternalError("Multiple regexes on a single node is not supported.")
	}
	if (refinementNode.hasKindIn("min", "max")) {
		ctx.refinements[refinementNode.kind] =
			"exclusive" in refinementNode ?
				nearestFloat(
					refinementNode.rule,
					refinementNode.kind === "min" ? "+" : "-"
				)
			:	refinementNode.rule
	} else ctx.refinements[refinementNode.kind] = refinementNode.rule as never
}

const getRootAndSetCtxRefinements = (
	node: nodeOfKind<"intersection">,
	ctx: Ctx
) => {
	//todoshawn there's a possibility of multiple root nodes and it gigases me
	/**
	 * Part of my issue is that I'm simply throwing away information that I had believed was
	 * useless.
	 */
	let rootNodes: nodeOfKind<NodeKind>[] = []
	for (const child of node.children) {
		if (child.hasKindIn(...refinementKinds)) setRefinement(child, ctx)
		else rootNodes.push(child)
	}

	if (rootNodes.length > 1)
		rootNodes = rootNodes.filter(node => node.kind === "structure")

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

	if (hasKey(node.inner, "sequence") && node.sequence !== undefined) {
		const arrayArbitrary = buildArrayArbitrary(node.sequence, ctx)
		const objectNode = node.children.find(child =>
			child.hasKindIn("required", "optional")
		)
		if (objectNode === undefined) return arrayArbitrary
		const recordArbitrary = buildObjectArbitrary(node, ctx)
		return tuple(arrayArbitrary, recordArbitrary).map(([arr, record]) =>
			Object.assign(arr, record)
		)
	}

	return buildObjectArbitrary(node, ctx)
}

const buildObjectArbitrary = (node: nodeOfKind<"structure">, ctx: Ctx) => {
	if (ctx.isCyclic && !ctx.tieStack.length) {
		const objectArbitrary: LetrecValue<unknown> = letrec(tie => {
			ctx.tieStack.push(tie)
			const arbitraries = {
				root: buildObjectArbitrary(node, ctx),
				...ctx.arbitrariesByIntersectionId
			}
			ctx.tieStack.pop()
			return arbitraries
		})
		return (objectArbitrary as never)["root"] as Arbitrary<
			Record<string, unknown>
		>
	}

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
	//Arrays will always have a single element and the kind will be variadic
	if (node.tuple.length === 1 && node.tuple[0].kind === "variadic") {
		const elementsArbitrary = buildArbitrary(
			node.tuple[0].node as never,
			getCleanCtx(ctx)
		)
		const arrArbitrary = array(elementsArbitrary, ctx.refinements)
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

	const spreadVariadicElementsTuple: Arbitrary<unknown[]> =
		getSpreadVariadicElementsTuple(node.tuple, ctx)
	return spreadVariadicElementsTuple
}

const getSpreadVariadicElementsTuple = (
	tupleElements: SequenceTuple,
	ctx: Ctx
) => {
	const tupleArbitraries = []
	for (const element of tupleElements) {
		const arbitrary = buildArbitrary(element.node as never, getCleanCtx(ctx))
		if (element.kind === "variadic") tupleArbitraries.push(array(arbitrary))
		else tupleArbitraries.push(arbitrary)
	}

	return tuple(...tupleArbitraries).chain(arr => {
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
}

const buildProtoArbitrary = (node: nodeOfKind<"proto">, ctx: Ctx) => {
	switch (node.builtinName) {
		case "Array":
			if (ctx.refinements.exactLength === 0) return tuple()
			return array(anything(), ctx.refinements)
		case "Set":
			return uniqueArray(anything()).map(arr => new Set(arr))
		case "Date":
			return buildDateArbitrary(ctx)
		default:
			throwInternalError(`${node.builtinName} is not implemented`)
	}
}
