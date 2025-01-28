import { configure } from "arktype/config"
configure({ numberAllowsNaN: true })

import { type } from "arktype"

if (!type("number").allows(Number.NaN))
	throw new Error(`global configuration not applied`)
