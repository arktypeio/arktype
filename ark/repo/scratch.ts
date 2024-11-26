import { configure } from "arktype/config"

configure({ clone: false })

import { type } from "arktype"

const userForm = type({
	age: "string.numeric.parse"
})

type.keywords.string.integer.root.atLeastLength(2).lessThanLength(6)
