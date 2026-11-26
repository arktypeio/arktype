/// <reference lib="es2021.weakref" />

import {
	arkKindOf,
	holdsWeakly,
	nameOf,
	register,
	registry,
	type Brand,
	type NonNegativeIntegerLiteral
} from "@ark/util"
import type { ArkSchemaRegistry } from "../config.ts"
import type { BaseNode } from "../node.ts"
import type { BaseParseContext } from "../parse.ts"
import type { BaseRoot } from "../roots/root.ts"

let _registryName = "$ark"
let suffix = 2

while (_registryName in globalThis) _registryName = `$ark${suffix++}`

export const registryName = _registryName
;(globalThis as any)[registryName] = registry

export const $ark: ArkSchemaRegistry = registry as never

export type NodeId = Brand<string, "NodeId">

/**
 * what an id is registered to. Whatever can read a node by its id holds the
 * id's registration, so the node is kept exactly as long as it can be reached
 */
export interface Registration {
	to: BaseNode | BaseParseContext | undefined
}

// a context is held while its definition parses, and a node only by what
// holds its registration, so a cyclic Type nothing references is collected
const registrations = new Map<string, Registration | WeakRef<Registration>>()

const forgetCollected =
	holdsWeakly ?
		new FinalizationRegistry<string>(id => {
			// the id may have been registered again before its registration was collected
			if (!registrationOf(id)) registrations.delete(id)
		})
	:	undefined

/** the registration of `id`, which an alias referencing it holds */
export const registrationOf = (id: string): Registration | undefined => {
	const held = registrations.get(id)
	return held && ("to" in held ? held : held.deref())
}

// a node bound to another scope, or built over a deferred Type, keeps the id
// and inner of the node it's from, so either holds what the other registered
const registrationsByInner = new WeakMap<object, Registration[]>()

const registerTo = (id: string, to: BaseNode | BaseParseContext): void => {
	const held = registrations.get(id)
	const registered = held && ("to" in held ? held : held.deref())
	// kept as its context resolves, so an alias that referenced the context holds the node
	const registration = registered ?? { to }
	registration.to = to
	if (!forgetCollected || arkKindOf(to) === "context") {
		registrations.set(id, registration)
		return
	}
	if (!registered || registered === held) {
		registrations.set(id, new WeakRef(registration))
		forgetCollected.register(registration, id)
	}
	const { inner } = to as BaseNode
	const sharing = registrationsByInner.get(inner)
	if (!sharing) registrationsByInner.set(inner, [registration])
	else if (!sharing.includes(registration)) sharing.push(registration)
}

// an object to what reads it, so an id is read, written and deleted as its key.
// A key nothing is registered under is undefined, even one Object.prototype has
export const nodesById: Record<
	NodeId,
	BaseNode | BaseParseContext | undefined
> = new Proxy(Object.create(null), {
	get: (_, id) => registrationOf(id as string)?.to,
	set: (_, id, to) => {
		registerTo(id as string, to)
		return true
	},
	deleteProperty: (_, id) => {
		const registration = registrationOf(id as string)
		// an alias holding it would otherwise hold the context it referenced
		if (registration) registration.to = undefined
		registrations.delete(id as string)
		return true
	},
	has: (_, id) => registrationOf(id as string)?.to !== undefined,
	ownKeys: () =>
		[...registrations.keys()].filter(
			id => registrationOf(id)?.to !== undefined
		),
	getOwnPropertyDescriptor: (_, id) => {
		const value = registrationOf(id as string)?.to
		return (
			value && { value, writable: true, enumerable: true, configurable: true }
		)
	}
})

$ark.nodesById = nodesById

export const ambientResolver: {
	resolve?: (name: string) => BaseRoot | undefined
} = {}

export const reference = (name: string): RegisteredReference =>
	`${registryName}.${name}` as never

export const registeredReference = (
	value: object | symbol
): RegisteredReference => reference(register(value))

export const namedReference = (value: object | symbol): RegisteredReference =>
	reference(nameOf(value))

export type RegisteredReference<to extends string = string> =
	`$ark${"" | NonNegativeIntegerLiteral}.${to}`
