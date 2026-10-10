import { scope } from "arktype"

let max = 10

const atMost = (list: string[]) => {
	const limit = max
	return list.length <= limit
}

const lists = scope({ list: ["string[]", ":", atMost] }).export()

const first = scope({ "Box<t>": { a: "t = []" } }).export()
const second = scope({ "Box<t>": { a: "t = []" } }).export()

export const First = first.Box(lists.list)

max = -1

// arktype checks the default string syntax writes as each Generic instantiates its body, though `list` comes from another Scope
export const Second = second.Box(lists.list)
