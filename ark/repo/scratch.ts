// this must come first
import "./arkConfig.js"

import { type } from "arktype"

// create and validate types

const user = type({
	name: "string",
	age: "number"
})

const out = user({
	name: "David",
	age: 30
})
