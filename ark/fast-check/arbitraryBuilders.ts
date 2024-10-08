import type { RefinementKind } from "@ark/schema"
import {
	hasKey,
	stringAndSymbolicEntriesOf,
	throwInternalError
} from "@ark/util"
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
	type Arbitrary
} from "fast-check"
import {
	isStructureNode,
	isUnionNode,
	type Context,
	type NodeContext,
	type StructureNodeContext
} from "./arktypeFastCheck.ts"
import type { ruleByRefinementKind } from "./constraint.ts"
import {
	createFastCheckContext,
	updateFastCheckContext,
	type FastCheckContext
} from "./fastCheckContext.ts"
import {
	generateDateArbitrary,
	generateNumberArbitrary,
	generateStringArbitrary
} from "./terminalArbitraries.ts"

export const buildArbitraries = (
	nodeContext: NodeContext,
	aliasArbitrariesById: Record<string, NodeContext>,
	containsAlias: boolean
): Arbitrary<unknown> => {
	const fastCheckContext = createFastCheckContext(
		nodeContext,
		aliasArbitrariesById
	)

	if (containsAlias) {
		fastCheckContext.containsAlias = containsAlias
		//Since there's a possiblility of synthetic aliases we generate the alias arbitraries ahead of time
		eagerAliasArbitraryGeneration(fastCheckContext)
	}
	return getArbitrary(fastCheckContext, nodeContext)
}

export type ArbitraryBuilderKeys = keyof ArbitraryBuilders

type ArbitraryBuilders = {
	number: (fastCheckContext: FastCheckContext) => Arbitrary<number>
	string: (fastCheckContext: FastCheckContext) => Arbitrary<string>
	object: (
		fastCheckContext: FastCheckContext
	) => Arbitrary<Record<string, unknown>>
	union: (fastCheckContext: FastCheckContext) => Arbitrary<unknown>
	unit: (fastCheckContext: FastCheckContext) => Arbitrary<unknown>
	Array: (fastCheckContext: FastCheckContext) => Arbitrary<unknown[]>
	Date: (fastCheckContext: FastCheckContext) => Arbitrary<Date>
	symbol: (fastCheckContext: FastCheckContext) => Arbitrary<symbol>
	bigint: (fastCheckContext: FastCheckContext) => Arbitrary<bigint>
	Set: (fastCheckContext: FastCheckContext) => Arbitrary<Set<unknown>>
}

export const arbitraryBuilders: ArbitraryBuilders = {
	number: fastCheckContext => generateNumberArbitrary(fastCheckContext),
	bigint: _fastCheckContext => bigInt(),
	string: fastCheckContext => generateStringArbitrary(fastCheckContext),
	Date: fastCheckContext => generateDateArbitrary(fastCheckContext),
	object: fastCheckContext => generateObjectArbitrary(fastCheckContext),
	symbol: _fastCheckContext => constant(Symbol()),
	union: fastCheckContext => generateUnionArbitrary(fastCheckContext),
	Array: fastCheckContext => arrayArbitraryMapper(fastCheckContext),
	// Once a type can be defined for Set this can be changed to match that type
	Set: () => uniqueArray(anything()).map(arr => new Set(arr)),
	unit: fastCheckContext => constant(fastCheckContext.currentNodeContext.unit)
}

const handleAlias = (fastCheckContext: FastCheckContext) => {
	const tieStack = fastCheckContext.fastCheckTies
	if (tieStack.length) {
		const tie = tieStack.at(-1)!
		const id = fastCheckContext.currentNodeContext.id!
		return tie(id)
	}
	throwInternalError("Tie has not been initialized")
}

export const getKey = (nodeContext: NodeContext): keyof ArbitraryBuilders => {
	if (hasKey(arbitraryBuilders, nodeContext.rule)) return nodeContext.rule
	throwInternalError(`${nodeContext.rule} is not supported.`)
}

const getArbitraryConstraints = (
	nodeContext: NodeContext,
	constraintNames: RefinementKind[]
) => {
	const constraints: ruleByRefinementKind = {}
	for (const constraintName of constraintNames) {
		if (hasKey(nodeContext, constraintName))
			constraints[constraintName] = nodeContext[constraintName] as never
	}
	return constraints
}

const getArbitrary = (
	fastCheckContext: FastCheckContext,
	nodeContext: NodeContext
) => {
	const updatedContext = updateFastCheckContext(fastCheckContext, nodeContext)
	if (nodeContext.kind === "alias") return handleAlias(updatedContext)
	return arbitraryBuilders[getKey(nodeContext)](updatedContext)
}

const arrayArbitraryMapper = (
	fastCheckContext: FastCheckContext
): Arbitrary<unknown[]> => {
	const nodeContext = fastCheckContext.currentNodeContext
	if (isStructureNode(nodeContext)) {
		if (nodeContext.exactLength !== undefined)
			return generateTupleArbitrary(fastCheckContext)

		const innerArbitraryContext = nodeContext.arbitraryNodeDetails
		if (!innerArbitraryContext.length) {
			// For cases where we attach props to an Array
			if (Object.keys(nodeContext.nodeCollection).length)
				return assignObjectPropsToArray(array(anything()), fastCheckContext)

			return array(anything())
		}
		if (innerArbitraryContext.length === 1)
			return generateArrayArbitrary(fastCheckContext)
		return generateVariadicTupleArbitrary(fastCheckContext)
	}
	throwInternalError(
		"Expected a converted structure node when creating an array arbitrary."
	)
}

const generateTupleArbitrary = (fastCheckContext: FastCheckContext) => {
	const nodeContext = fastCheckContext.currentNodeContext
	if (!hasKey(nodeContext, "arbitraryNodeDetails")) return tuple()
	const arbitraryArray: Arbitrary<unknown>[] =
		nodeContext.arbitraryNodeDetails.map(kindAndNode =>
			getArbitrary(fastCheckContext, kindAndNode.node)
		)
	return tuple(...arbitraryArray)
}

const generateArrayArbitrary = (fastCheckContext: FastCheckContext) => {
	const nodeContext =
		fastCheckContext.currentNodeContext as StructureNodeContext

	const constraints = getArbitraryConstraints(nodeContext, [
		"minLength",
		"maxLength"
	])

	const arbitrary = getArbitrary(
		fastCheckContext,
		nodeContext.arbitraryNodeDetails[0].node
	)

	const arrArbitrary = array(arbitrary, constraints)

	/**
	 More complex structures containing many aliases will be more likely to generate an 
	 empty array to prevent the arbitrary from hanging or taking a very long time when
	 generating values
	 */
	const assembledArbitrary =
		fastCheckContext.fastCheckTies.length ?
			oneof(
				{
					maxDepth: fastCheckContext.numberOfAliasNodesInStructure > 2 ? 1 : 2,
					depthIdentifier: `id:${nodeContext.id!}`
				},
				{ arbitrary: constant([]), weight: 1 },
				{
					arbitrary: arrArbitrary,
					weight: fastCheckContext.numberOfAliasNodesInStructure > 2 ? 2 : 3
				}
			)
		:	arrArbitrary

	if (Object.keys(nodeContext.nodeCollection).length) {
		const updatedContext = updateFastCheckContext(fastCheckContext, nodeContext)
		return assignObjectPropsToArray(assembledArbitrary, updatedContext)
	}
	return assembledArbitrary
}

const generateVariadicTupleArbitrary = (fastCheckContext: FastCheckContext) => {
	const builder = (
		fastCheckContext.currentNodeContext as StructureNodeContext
	).arbitraryNodeDetails.map(nodeAndKind => {
		const arbitrary = getArbitrary(fastCheckContext, nodeAndKind.node)
		if (nodeAndKind.kind === "variadic") return array(arbitrary)

		return arbitrary
	})
	return tuple(...builder).chain(arr => {
		const newArr = []
		for (let i = 0; i < arr.length; i++) {
			if (
				(fastCheckContext.currentNodeContext as StructureNodeContext)
					.arbitraryNodeDetails[i].kind === "variadic"
			)
				// This is a work around to spread the variadic elements in a tuple
				newArr.push(...(arr[i] as unknown[]).map(val => constant(val)))
			else newArr.push(constant(arr[i]))
		}
		return tuple(...newArr)
	})
}

const assignObjectPropsToArray = (
	arrArbitrary: Arbitrary<Array<unknown>>,
	fastCheckContext: FastCheckContext
) => {
	const recordArbitrary = generateObjectArbitrary(fastCheckContext)
	return tuple(arrArbitrary, recordArbitrary).map(([arr, record]) =>
		Object.assign(arr, record)
	)
}

const generateObjectArbitrary = (fastCheckContext: FastCheckContext) => {
	const arbitrariesCollection: Record<string | symbol, Arbitrary<unknown>> = {}
	const nodeContext = fastCheckContext.currentNodeContext
	if (!isStructureNode(nodeContext)) {
		throwInternalError(
			"Expected a condensed structure node when creating an object arbitrary."
		)
	}
	if (nodeContext.hasIndexSignature)
		generateIndexSignatureArbitrary(fastCheckContext, nodeContext)

	// type("object") won't be initialized with a nodeCollection so we can just return an object arbitrary
	if (!hasKey(nodeContext, "nodeCollection")) return object()

	const keysAndSymbols = stringAndSymbolicEntriesOf(nodeContext.nodeCollection)
	if (nodeContext.id in fastCheckContext.convertedObjects)
		return fastCheckContext.convertedObjects[nodeContext.id]

	if (
		fastCheckContext.containsAlias &&
		!fastCheckContext.fastCheckTies.length
	) {
		const aliasArbitrary = letrec(tie => {
			fastCheckContext.fastCheckTies.push(tie)
			const collection = generateRecusiveCollection(fastCheckContext, "root")
			fastCheckContext.fastCheckTies.pop()
			return collection
		})["root"] as Arbitrary<Record<string, unknown>>

		fastCheckContext.convertedObjects[nodeContext.id] = aliasArbitrary
		return aliasArbitrary
	}

	for (const [key, context] of keysAndSymbols) {
		if (
			(context as NodeContext).kind === "alias" &&
			nodeContext.requiredKeys.includes(key)
		)
			throwInternalError("Infinitely deep cycles are not supported.")

		arbitrariesCollection[key] = getArbitrary(
			fastCheckContext,
			context as never
		)
	}

	const objectArbitrary = record(arbitrariesCollection, {
		requiredKeys: nodeContext.requiredKeys as never
	})
	fastCheckContext.convertedObjects[nodeContext.id] = objectArbitrary
	return objectArbitrary
}

const generateRecusiveCollection = (
	fastCheckContext: FastCheckContext,
	id: "root"
) => {
	const collection: Record<string, Arbitrary<unknown>> = {
		...fastCheckContext.fastCheckAliasArbitrariesById
	}
	const nodeContext =
		fastCheckContext.currentNodeContext as StructureNodeContext
	const arbitrariesByKey = getArbitariesByKeyFromObject(
		fastCheckContext,
		nodeContext.nodeCollection
	)
	collection[id] = record(arbitrariesByKey, {
		requiredKeys: nodeContext.requiredKeys as never
	})

	return collection
}

const eagerAliasArbitraryGeneration = (fastCheckContext: FastCheckContext) => {
	fastCheckContext.fastCheckAliasArbitrariesById = letrec(tie => {
		fastCheckContext.fastCheckTies.push(tie)
		const collection = getArbitariesByKeyFromObject(
			fastCheckContext,
			fastCheckContext.convertedAliasNodesById
		)
		fastCheckContext.fastCheckTies.pop()
		return collection
	}) as Record<string, Arbitrary<unknown>>
}

const getArbitariesByKeyFromObject = (
	fastCheckContext: FastCheckContext,
	collection: Record<string, Context>
) => {
	const arbitariesByKey: Record<string, Arbitrary<unknown>> = {}
	for (const key in collection)
		arbitariesByKey[key] = getArbitrary(fastCheckContext, collection[key])
	return arbitariesByKey
}

const generateUnionArbitrary = (fastCheckContext: FastCheckContext) => {
	const arbitraries: Arbitrary<unknown>[] = []
	if (!isUnionNode(fastCheckContext.currentNodeContext)) {
		throwInternalError(
			"Expected a converted union node when creating a union arbitrary."
		)
	}
	for (const node of fastCheckContext.currentNodeContext.oneOf)
		arbitraries.push(getArbitrary(fastCheckContext, node))
	return oneof(...arbitraries)
}

const generateIndexSignatureArbitrary = (
	fastCheckContext: FastCheckContext,
	nodeContext: StructureNodeContext
) => {
	const keyNodeContext = nodeContext.nodeCollection["key"]
	const valueNodeContext = nodeContext.nodeCollection["value"]
	const keyArbitrary = getArbitrary(fastCheckContext, keyNodeContext)
	const valueArbitrary = getArbitrary(fastCheckContext, valueNodeContext)
	//keyArbitrary could be a symbol or string
	return dictionary(keyArbitrary as Arbitrary<never>, valueArbitrary)
}
