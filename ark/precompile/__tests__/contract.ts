import type { PrecompileOptions } from "@ark/precompile"

// the options ARK_PRECOMPILE_OPTIONS sets as JSON, which the differential, the generated programs and shadow mode build with, each comparing a validator with arktype as far as they let the two differ
export const testedOptions: PrecompileOptions = JSON.parse(
	process.env.ARK_PRECOMPILE_OPTIONS ?? "{}"
)

// read without arktype, as a precompiled program's process doesn't load it
export const lackedMembers: string[] = Object.entries(
	testedOptions.members ?? {}
).flatMap(([member, kept]) => (kept === false ? [member] : []))

export const lacks = (member: string): boolean => lackedMembers.includes(member)

// `methods` is what a validator inherits, which every function has a toString of
export const hasMember = (validator: object, member: string): boolean =>
	member === "methods" ? "traverse" in validator : member in validator

// what a validation returns with onFail null, as traverse() calls it, which a validator without methods is called for
export const traverse = (t: any, data: unknown): unknown =>
	lacks("methods") ? t(data, undefined, null) : t.traverse(data)

// whether a validator is frozen, which arktype's Types aren't, so it's observed against what the options promise
export const freezes: boolean = testedOptions.freeze !== false

// a validator writing what it transforms into its input returns that input, keeping what a copy wouldn't, like its keys' order, accessors and the keys it inherits, so neither which object it returns, what it leaves of the input nor how its output holds a key is compared
export const mutatesInput: boolean = testedOptions.mutatesInput === true

// what an issue holds of an object, which a validator writing its input can have written to before the validation failed
export const comparedDataOf = (data: unknown): unknown =>
	mutatesInput && typeof data === "object" && data !== null ? "object" : data
