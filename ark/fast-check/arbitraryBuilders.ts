import {
	isKeyOf,
	stringAndSymbolicEntriesOf,
	throwInternalError,
} from "@ark/util"
import {
	anything,
	array,
	bigInt,
	constant,
	dictionary,
	integer,
	letrec,
	oneof,
	record,
	string,
	tuple,
	uniqueArray,
	type Arbitrary,
	type LetrecLooselyTypedBuilder,
	type LetrecValue
} from "fast-check"
import { isStructureNode, type NodeContext, type StructureNodeContext } from "./arktypeFastCheck.ts"
import {
	generateDateArbitrary,
	generateNumberArbitrary,
	generateStringArbitrary
} from "./generateTerminalArbitrary.ts"

type ArbitraryBuilders = {
	number: (fastCheckContext: FastCheckContext) => Arbitrary<number>
	string: (fastCheckContext: FastCheckContext) => Arbitrary<string>
	object: (
		fastCheckContext: FastCheckContext
	) => Arbitrary<Record<string, unknown>>
	union: (fastCheckContext: FastCheckContext) => Arbitrary<unknown>
	//todoshawn
	unit: (fastCheckContext: FastCheckContext) => Arbitrary<unknown>
	Array: (fastCheckContext: FastCheckContext) => Arbitrary<unknown[]>
	Date: (fastCheckContext: FastCheckContext) => Arbitrary<Date>
	symbol: (fastCheckContext: FastCheckContext) => Arbitrary<symbol>
	bigint: (fastCheckContext: FastCheckContext) => Arbitrary<bigint>
	Set: (fastCheckContext: FastCheckContext) => Arbitrary<Set<unknown>>
	alias: (fastCheckContext: FastCheckContext) => LetrecValue<unknown>
}

let inLetrec = false

export const buildArbitraries = (
	reducedNode: NodeContext,
	aliasArbitrariesById: Record<string, NodeContext>,
	containsAlias: boolean
): Arbitrary<unknown> => {
	const context = createFastCheckContext(reducedNode, aliasArbitrariesById)
	if (containsAlias) {
		context.hasAlias = containsAlias
		eagerArbitraryGeneration(context)
	}
	return arbitraryBuilders[getKey(reducedNode)](context)
}

export type FastCheckContext = {
	hasAlias: boolean
	fastCheckTies: LetrecLooselyTypedBuilder<unknown>[]
	convertedAliasNodesById: Record<string, NodeContext>
	fastCheckAliasArbitrariesById: Record<string, Arbitrary<unknown>>
	currentNodeContext: NodeContext
}

const createFastCheckContext = (
	node: NodeContext,
	convertedAliasNodesById: Record<string, NodeContext>
): FastCheckContext => ({
	//inLetrec now becomes fastCheckTies.length todoshawn
	hasAlias: false,
	fastCheckTies: [],
	convertedAliasNodesById,
	fastCheckAliasArbitrariesById: {},
	currentNodeContext: node
})

export const arbitraryBuilders: ArbitraryBuilders = {
	number: fastCheckContext => generateNumberArbitrary(fastCheckContext),
	bigint: fastCheckContext => bigInt(),
	string: fastCheckContext => generateStringArbitrary(fastCheckContext),
	Date: fastCheckContext => generateDateArbitrary(fastCheckContext),
	object: fastCheckContext => generateObjectArbitrary(fastCheckContext),
	symbol: fastCheckContext => constant(Symbol()),
	union: fastCheckContext => {
		const arbitraries: Arbitrary<unknown>[] = []
		//todoshawn need some kind of narrowing thing now
		for (const node of fastCheckContext.currentNodeContext.oneOf)
			arbitraries.push(arbitraryBuilders[getKey(node)](fastCheckContext))
		return oneof(...arbitraries)
	},
	Array: fastCheckContext => generateArrayArbitrary(fastCheckContext),
	// Once you can define a typed Set this can be changed to match that type
	Set: () =>
		uniqueArray(oneof(anything())).map(arr => new Set(arr)),
	alias: fastCheckContext => {
		const tieStack = fastCheckContext.fastCheckTies
		if (tieStack.length) {
			const tie = tieStack.at(-1)!
			const id = fastCheckContext.currentNodeContext.id!
			return tie(id)
		}
		throwInternalError("Tie has not been initialized")
	},
	unit: fastCheckContext => constant(fastCheckContext.currentNodeContext.rule)
}

export const getKey = (fastCheckContext: FastCheckContext): keyof ArbitraryBuilders => {
	const currentNodeContext = fastCheckContext.currentNodeContext
	if (currentContext.kind === "unit" || currentContext.kind === "alias")
		return currentContext.kind
	else if (currentContext.rule in arbitraryBuilders) return currentContext.rule
	throwInternalError(`${currentContext.rule} is either not valid or implemented`)
}

const generateArrayArbitrary = (fastCheckContext: FastCheckContext) => {
	const condensedNodeContext = fastCheckContext.currentNodeContext
	if (condensedNodeContext.exactLength !== undefined) {
		const arbitraryArray: Arbitrary<unknown>[] =
			condensedNodeContext.arbitraryNodeDetails.map(kindAndNode =>
				arbitraryBuilders[getKey(kindAndNode.node)](kindAndNode.node as never)
			)
		return tuple(...arbitraryArray)
	}
	const innerArbitraryContext = condensedNodeContext.arbitraryNodeDetails
	if (!innerArbitraryContext.length) {
		// For cases where we attach props to an Array
		if (Object.keys(condensedNodeContext.nodeCollection).length)
			return assignObjectPropsToArray(array(anything()), fastCheckContext)

		return array(anything())
	}
	if (innerArbitraryContext.length === 1) {
		const elementNodeDetails = condensedNodeContext.arbitraryNodeDetails[0].node
		const key = getKey(elementNodeDetails)
		if (!isKeyOf(key, arbitraryBuilders)) throw new Error(`${key} not defined`)
		fastCheckContext.currentNodeContext = elementNodeDetails
		const arbitrary = arbitraryBuilders[key](fastCheckContext)
		const arrArbitrary = array(arbitrary, { minLength, maxLength })
		const arbitraryToReturn =
			inLetrec ?
				oneof(
					{ maxDepth: 1 },
					{ arbitrary: constant([]), weight: 2 },
					{ arbitrary: arrArbitrary, weight: 1 }
				)
			:	arrArbitrary

	}
		if (Object.keys(nodeCollection).length)
			return assignObjectPropsToArray(arbitraryToReturn, nodeDetails)
		return arbitraryToReturn
	} else {
		const builder = arbitraryNodeDetails.map(nodeAndKind => {
			const arbitrary = arbitraryBuilders[getKey(nodeAndKind.node)](
				nodeAndKind.node as never
			)
			if (nodeAndKind.kind === "variadic") return array(arbitrary)

			return arbitrary
		})
		return tuple(...builder).chain(arr => {
			const newArr = []
			for (let i = 0; i < arr.length; i++) {
				if (arbitraryNodeDetails[i].kind === "variadic")
					// This is a work around to spread the variadic elements in a tuple
					newArr.push(...(arr[i] as unknown[]).map(val => constant(val)))
				else newArr.push(constant(arr[i]))
			}
			return tuple(...newArr)
		})
	}
}

const generateObjectArbitrary = (fastCheckContext: FastCheckContext) => {
	const arbitrariesCollection: Record<string | symbol, Arbitrary<unknown>> = {}
	//todoshawn I want to be in control of the stuff I'm passing around internally meaning that default values should not be a thing
	//since it shouldve been setup already
	const nodeContext = fastCheckContext.currentNodeContext
	if (isStructureNode(nodeContext)) {
		if (nodeDetails.isIndexSignature) {
			const keyDetails = nodeCollection["key"]
			const valueDetails = nodeCollection["value"]

			const keyArbitrary = arbitraryBuilders[getKey(keyDetails)](
				keyDetails as never
			) as Arbitrary<string> | Arbitrary<symbol>

			const valueArbitrary = arbitraryBuilders[getKey(valueDetails)](
				valueDetails as never
			)
			//keyArbitrary could be a symbol or string
			return dictionary(keyArbitrary as Arbitrary<never>, valueArbitrary)
		}
	}

	const keysAndSymbols = stringAndSymbolicEntriesOf(nodeCollection)

	//todoshawn can maybe do a stack and then allows for letrecs in letrecs if it's needed
	if (hasAlias && !inLetrec) {
		const something = letrec(tie => {
			inLetrec = true
			const collection = generateRecusiveCollection(tie, nodeDetails, "root")
			inLetrec = false
			return collection
		})
		return something["root"] as Arbitrary<Record<string, unknown>>
	}
	keysAndSymbols.forEach(
		key =>
			(arbitrariesCollection[key] = arbitraryBuilders[
				getKey(nodeCollection[key])
			](nodeCollection[key] as never, tie))
	)
	return record(arbitrariesCollection, {
		requiredKeys: requiredKeys as never[]
	})
}

const generateRecusiveCollection = (context: FastCheckContext, id: string) => {
	const collection: Record<string, any> = {}
	collection[id] = {}
	const { nodeCollection = {} } = nodeDetails
	Object.assign(collection, eagerlyGeneratedArbitraries)
	for (const key of Object.keys(nodeCollection)) {
		const node = nodeCollection[key]
		collection[id][key] = arbitraryBuilders[getKey(node)](node as never, tie)
		if (node.kind === "alias" && nodeDetails.requiredKeys?.includes(key))
			throwInternalError("Infinitely deep cycles are not supported.")
	}
	collection[id] = record(collection[id], {
		requiredKeys: (nodeDetails.requiredKeys ?? []) as never
	})

	return collection
}

const assignObjectPropsToArray = (
	arrArbitrary: Arbitrary<Array<unknown>>,
	nodeDetails: ArrayNode
) => {
	const recordArbitrary = generateObjectArbitrary(nodeDetails)
	return tuple(arrArbitrary, recordArbitrary).map(([arr, record]) =>
		Object.assign(arr, record)
	)
}

//todoshawn make interface for all of these and it'll be cleaner
export interface FastCheckObjectNodeContext extends StructureNodeContext {
	isIndexSignature?: boolean
}

//todoshawn NodeDetails = fastcheckctx ideally
const eagerArbitraryGeneration = (context: FastCheckContext) => {
	Object.entries(context.convertedAliasNodesById).forEach(([k, _]) => {
		const result = letrec(tie => {
			context.fastCheckTies.push(tie)
			const collection = generateAliasNodes(tie)
			context.fastCheckTies.pop()
			return collection
		}) as Record<string, Arbitrary<unknown>>
		context.fastCheckAliasArbitrariesById[k] = result[k]
	})
}

const generateAliasNodes = (tie: any) => {
	const collection: any = {}
	// Sort the nodes based on the Alias id so that they are generated in order
	const aliasNodeEntries = Object.entries(nodeDetailsById).sort((a, b) => {
		//todoshawn maybe look at parseWellFormedInteger
		const aliasANumber = parseInt(a[1].aliasReference.match(/\d+$/)?.[0] || "")
		const aliasBNumber = parseInt(b[1].aliasReference.match(/\d+$/)?.[0] || "")
		if (isNaN(aliasANumber)) return 1
		if (isNaN(aliasBNumber)) return -1
		return aliasANumber - aliasBNumber
	})
	//todoshawn random node -> bad name
	for (const [id, { node }] of aliasNodeEntries) {
		const arb = arbitraryBuilders[getKey(node)](node as never, tie)
		collection[id] = arb
	}
	return collection
}

const extractSuffix = () => {}
