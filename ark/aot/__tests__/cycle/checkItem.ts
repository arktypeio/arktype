import { makeItem, makePositiveItem } from "./items.ts"

// errors print what a standalone validator keeps of arktype's
const codesOf = (out: unknown) =>
	(out as { issues: { code: string }[] }).issues.map(issue => issue.code)

// runs before items.ts imports arktype, which main.ts has loaded already
export const checkedItem = [
	codesOf(makeItem()({ id: "1" })),
	codesOf(makePositiveItem()({ id: -1 }))
]
