import {
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

export const nodesById: Record<
	NodeId,
	BaseNode | BaseParseContext | undefined
> = {}

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
