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
