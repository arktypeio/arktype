import "./config.ts"

import { type } from "arktype"

if (!type("number").allows(Number.NaN))
	throw new Error(`global configuration not applied`)

console.log("✅ importConfig passed")
