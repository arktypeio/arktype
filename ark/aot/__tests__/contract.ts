import type { PrecompileOptions } from "@ark/aot"
import type { MutatesInput } from "@ark/schema"
import { withPreset } from "@ark/aot/internal/presets.ts"

// what the differential, generated programs and shadow mode build with
export const testedOptions: PrecompileOptions = withPreset(
	JSON.parse(process.env.ARK_PRECOMPILE_OPTIONS ?? "{}")
)

// read without arktype, as a precompiled program's process doesn't load it
export const lackedMembers: string[] = Object.entries(
	testedOptions.members ?? {}
).flatMap(([member, kept]) => (kept === false ? [member] : []))

export const lacks = (member: string): boolean => lackedMembers.includes(member)

// `methods` is inherited, read as traverse since functions have toString
export const hasMember = (validator: object, member: string): boolean =>
	member === "methods" ? "traverse" in validator : member in validator

// as traverse() validates, with onFail null, where methods are dropped
export const traverse = (t: any, data: unknown): unknown =>
	lacks("methods") ? t(data, undefined, null) : t.traverse(data)

export const freezes: boolean = testedOptions.freeze !== false

export const mutatesInput: MutatesInput = testedOptions.mutatesInput ?? false

// a count can pass an undeclared key held beside a non-enumerable one
export const jsonInput: boolean = testedOptions.jsonInput === true

// errors "none" fails with one root issue and runs no Apply's morphs
export const detailsErrors: boolean = testedOptions.errors !== "none"

// errors without an arkKind, recognized by their class
export const leanErrors: boolean = testedOptions.optimizeErrors === "size"

// a first-issue build returns one of arktype's issues
export const firstIssue: boolean = testedOptions.errors === "first"

// a failed validation can leave writes in the objects it found valid, which
// errors "first" stops short of and "always" writes as each is reached
export const comparesFailedWrites: boolean =
	detailsErrors && !firstIssue && mutatesInput !== "always"
