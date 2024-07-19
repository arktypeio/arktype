import { $ark, register } from "@ark/util"
import type { NonNegativeIntegerString } from "../keywords/internal.js"

let _registryName = "$ark"
let suffix = 2

while (_registryName in globalThis) _registryName = `$ark${suffix++}`

export const registryName = _registryName
;(globalThis as any)[registryName] = $ark

export const reference = (name: string): RegisteredReference =>
	`${registryName}.${name}` as never

export const registeredReference = (
	value: object | symbol
): RegisteredReference => reference(register(value))

export type RegisteredReference<to extends string = string> =
	`$ark${"" | NonNegativeIntegerString}.${to}`
