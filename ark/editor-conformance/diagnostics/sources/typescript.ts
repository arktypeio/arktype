// Ordinary TypeScript errors, for the rules that must leave them alone (or,
// for the last rule, do to them what they do to ArkType's).
type User = { name: string; age: number }

export const wrongPrimitive: number = "five"
export const wrongLiteral: "abc" = "ab"
export const wrongObject: User = { name: "a", age: "b" }
export const missingProperty: User = { name: "a" }
export const unknownName = notDefined
export const takesNumber = (n: number) => n
export const wrongArgument = takesNumber("five")
export const takesLiteral = (s: "abc") => s
export const wrongLiteralArgument = takesLiteral("ab")
export const nestedMismatch: { a: { b: { c: number } } } = {
	a: { b: { c: "x" } }
}
