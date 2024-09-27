import { throwInternalError } from "@ark/util"
import {
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
	type Arbitrary
} from "fast-check"
import {
	generateDateArbitrary,
	generateNumberArbitrary,
	generateStringArbitrary
} from "./arbitraryGenerators.ts"
import type {
	ArrayNode,
	NodeDetails,
	RecordDetails,
	UnionNode
} from "./arktypeFastCheck.ts"

type ArbitraryBuilders = {
	number: (nodeDetails: NodeDetails) => Arbitrary<number>
	string: (nodeDetails: NodeDetails) => Arbitrary<string>
	object: (
		nodeDetails: ObjectNode,
		tie?: any
	) => Arbitrary<Record<string, unknown>>
	union: (nodeDetails: UnionNode, tie?: any) => Arbitrary<unknown>
	unit: (nodeDetails: NodeDetails) => Arbitrary<string> | Arbitrary<boolean>
	Array: (nodeDetails: ArrayNode, tie?: any) => Arbitrary<unknown[]>
	Date: (nodeDetails: NodeDetails) => Arbitrary<Date>
	symbol: (nodeDetails: NodeDetails) => Arbitrary<symbol>
	bigint: () => Arbitrary<bigint>
	Set: (nodeDetails: NodeDetails) => Arbitrary<Set<unknown>>
	alias: (nodeDetails: NodeDetails, tie?: any) => Arbitrary<unknown>
}

let hasAlias = false
let inLetrec = false

export const buildArbitraries = (
	node: NodeDetails,
	idToNodeDetails: any,
	containsAlias: boolean
): Arbitrary<unknown> => {
	if (containsAlias) {
		Object.assign(nodeDetailsById, idToNodeDetails)
		hasAlias = containsAlias
		eagerArbitraryGeneration()
	}
	return arbitraryBuilders[getKey(node)](node as never)
}

export const arbitraryBuilders: ArbitraryBuilders = {
	number: nodeDetails => generateNumberArbitrary(nodeDetails),
	bigint: () => bigInt(),
	string: nodeDetails => generateStringArbitrary(nodeDetails),
	Date: nodeDetails => generateDateArbitrary(nodeDetails),
	unit: nodeDetails => constant(nodeDetails.rule),
	object: (nodeDetails, tie) => generateObjectArbitrary(nodeDetails, tie),
	symbol: () => constant(Symbol()),
	union: (nodeDetails, tie) => {
		const arbitraries: Arbitrary<unknown>[] = []
		for (const node of nodeDetails.oneOf)
			arbitraries.push(arbitraryBuilders[getKey(node)](node as never, tie))
		return oneof(...arbitraries)
	},
	Array: (nodeDetails, tie) => generateArrayArbitrary(nodeDetails, tie),
	// Once you can define a typed Set this can be changed to match that type
	Set: () => uniqueArray(oneof(integer(), string())).map(arr => new Set(arr)),
	alias: (nodeDetails, tie) => tie(nodeDetails.id)
}

export const isArbitraryBuilderKey = (
	key: string
): key is keyof ArbitraryBuilders =>
	Object.keys(arbitraryBuilders).includes(key)

export const getKey = (nodeDetails: NodeDetails): keyof ArbitraryBuilders => {
	if (nodeDetails.kind === "unit" || nodeDetails.kind === "alias")
		return nodeDetails.kind
	else if (isArbitraryBuilderKey(nodeDetails.rule)) return nodeDetails.rule
	throwInternalError(`${nodeDetails.rule} is either not valid or implemented`)
}

const generateArrayArbitrary = (nodeDetails: ArrayNode, tie?: any) => {
	const {
		arbitraryNodeDetails = [],
		nodeCollection = {},
		minLength = 0,
		maxLength = 5,
		exactLength = undefined
	} = nodeDetails

	if (exactLength !== undefined) {
		const arbitraryArray: Arbitrary<unknown>[] = arbitraryNodeDetails.map(
			kindAndNode =>
				arbitraryBuilders[getKey(kindAndNode.node)](kindAndNode.node as never)
		)
		return tuple(...arbitraryArray)
	}
	if (arbitraryNodeDetails.length) {
		if (arbitraryNodeDetails.length === 1) {
			let arbitrary
			const elementNodeDetails = arbitraryNodeDetails[0].node
			const key = getKey(elementNodeDetails)
			if (isArbitraryBuilderKey(key))
				arbitrary = arbitraryBuilders[key](elementNodeDetails as never, tie)
			else throw new Error(`${key} not defined`)
			let arrArbitrary
			if (inLetrec) {
				arrArbitrary = oneof(
					{ maxDepth: 1 },
					{ arbitrary: constant([]), weight: 2 },
					{ arbitrary: array(arbitrary, { minLength, maxLength }), weight: 1 }
				)
			} else arrArbitrary = array(arbitrary, { minLength, maxLength })

			if (Object.keys(nodeCollection).length)
				return assignObjectPropsToArray(arrArbitrary, nodeDetails)
			return arrArbitrary
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

	// For ambigious types like type("Array") define random arbitraries to be used
	const defaultArbitrary = oneof(string(), integer())

	// For cases where we attach props to an Array
	if (Object.keys(nodeCollection).length)
		return assignObjectPropsToArray(array(defaultArbitrary), nodeDetails)

	return array(defaultArbitrary)
}

const generateObjectArbitrary = (
	nodeDetails: ObjectNode | ArrayNode,
	tie?: unknown
) => {
	const arbitrariesCollection: Record<string | symbol, Arbitrary<unknown>> = {}
	const { nodeCollection = {}, requiredKeys = [] } = nodeDetails
	if (isObjectNode(nodeDetails)) {
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

	const keysAndSymbols = [
		...Object.keys(nodeCollection),
		...Object.getOwnPropertySymbols(nodeCollection)
	]

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

const generateRecusiveCollection = (
	tie: any,
	nodeDetails: ObjectNode,
	id: string
) => {
	const collection: Record<string, any> = {}
	collection[id] = {}
	const { nodeCollection = {} } = nodeDetails
	Object.assign(collection, eagerlyGeneratedArbitraries)
	for (const key of Object.keys(nodeCollection)) {
		const node = nodeCollection[key]
		collection[id][key] = arbitraryBuilders[getKey(node)](node as never, tie)
		if (node.kind === "alias" && (nodeDetails.requiredKeys ?? []).includes(key))
			throwInternalError("Infinitely deep cycles are not supported.")
	}
	collection[id] = record(collection[id], {
		requiredKeys: (nodeDetails.requiredKeys ?? []) as never[]
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

export type ObjectNode = {
	isIndexSignature?: boolean
	onUndeclaredKey?: "delete" | "reject"
} & RecordDetails &
	NodeDetails

export const isObjectNode = (
	nodeDetails: NodeDetails
): nodeDetails is ObjectNode => nodeDetails.rule === "object"

const nodeDetailsById: Record<
	string,
	{ node: NodeDetails; aliasReference: string }
> = {}

const eagerlyGeneratedArbitraries: Record<string, Arbitrary<unknown>> = {}

const eagerArbitraryGeneration = () => {
	Object.entries(nodeDetailsById).forEach(([k, _]) => {
		const result = letrec(tie => {
			inLetrec = true
			const collection = generateAliasNodes(tie)
			inLetrec = false
			return collection
		}) as Record<string, Arbitrary<unknown>>
		eagerlyGeneratedArbitraries[k] = result[k]
	})
}

const generateAliasNodes = (tie: any) => {
	const collection: any = {}
	// Sort the nodes based on the Alias id so that they are generated in order
	const aliasNodeEntries = Object.entries(nodeDetailsById).sort((a, b) => {
		const aliasANumber = parseInt(a[1].aliasReference.match(/\d+$/)?.[0] || "")
		const aliasBNumber = parseInt(b[1].aliasReference.match(/\d+$/)?.[0] || "")
		if (isNaN(aliasANumber)) return 1
		if (isNaN(aliasBNumber)) return -1
		return aliasANumber - aliasBNumber
	})
	for (const [id, { node }] of aliasNodeEntries) {
		const arb = arbitraryBuilders[getKey(node)](node as never, tie)
		collection[id] = arb
	}
	return collection
}
