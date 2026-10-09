import { configure } from "arktype/config"

configure({
	predicate: {
		description: node => `satisfying ${node.expression.toUpperCase()}`
	}
})
