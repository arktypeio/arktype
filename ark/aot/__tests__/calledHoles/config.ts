import { configure } from "arktype/config"

configure({
	predicate: {
		description: inner =>
			(inner.predicate as (data: unknown) => boolean)("x") ?
				"lenient"
			:	"strict"
	}
})
