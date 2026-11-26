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

// what holds an id's registration besides an alias referencing it. A node's
// inner holds its own: one bound to another scope, or built over a deferred
// Type, keeps the id and inner of the node it's from, so either holds what the
// other registered. A root cached until its context can resolve holds that context's
const registrationsByHolder = new WeakMap<object, Registration[]>()

const holdWeakly = (
	id: string,
	registration: Registration,
	holder: object | undefined
): void => {
	const held = registrations.get(id)
	if (!held || "to" in held || !held.deref()) {
		registrations.set(id, new WeakRef(registration))
		forgetCollected!.register(registration, id)
	}
	if (!holder) return
	const sharing = registrationsByHolder.get(holder)
	if (!sharing) registrationsByHolder.set(holder, [registration])
	else if (!sharing.includes(registration)) sharing.push(registration)
}

const registerTo = (id: string, to: Registration["to"]): true => {
	const registered = registrationOf(id)
	if (to === undefined) {
		// an alias holding it would otherwise hold the context it referenced
		if (registered) registered.to = to
		registrations.delete(id)
		return true
	}
	// kept as its context resolves, so an alias that referenced the context holds the node
	const registration = registered ?? { to }
	registration.to = to
	// only a node has an inner to hold what it's registered under. A context is
	// held while its definition parses, and whatever else as a record holds it
	const inner =
		forgetCollected &&
		arkKindOf(to) !== "context" &&
		(to as Partial<BaseNode> | null)?.inner
	if (inner && typeof inner === "object") holdWeakly(id, registration, inner)
	else registrations.set(id, registration)
	return true
}

/**
 * holds the context `id` is registered to as a node is held, by `holder` and
 * what references its id alone, where it would otherwise outlive its parse
 */
export const releaseContext = (id: string, holder?: object): void => {
	const registration = registrationOf(id)
	if (registration && forgetCollected) holdWeakly(id, registration, holder)
}

// an object to what reads it, so an id is read, written and deleted as its key.
// A key nothing is registered under is undefined, even one Object.prototype has,
// as is one assigned undefined
export const nodesById: Record<
	NodeId,
	BaseNode | BaseParseContext | undefined
> = new Proxy(Object.create(null), {
	get: (_, id) => registrationOf(id as string)?.to,
	set: (_, id, to) => registerTo(id as string, to),
	deleteProperty: (_, id) => registerTo(id as string, undefined),
	// no id is a property of the target, so one is defined only as assigning
	// its value would define it, and the target stays as it is
	defineProperty: (_, id, { configurable, enumerable, writable, value }) =>
		!!(configurable && enumerable && writable) &&
		registerTo(id as string, value),
	preventExtensions: () => false,
	has: (_, id) => registrationOf(id as string)?.to !== undefined,
	ownKeys: () =>
		[...registrations.keys()].filter(
			id => registrationOf(id)?.to !== undefined
		),
	getOwnPropertyDescriptor: (_, id) => {
		const value = registrationOf(id as string)?.to
		if (value !== undefined)
			return { value, writable: true, enumerable: true, configurable: true }
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
