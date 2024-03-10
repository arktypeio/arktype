import { configure } from "arktype/config"
// import { type } from "arktype"

// const user = type("string")

configure({
	domain: {
		description: (inner) => `my special ${inner.domain}`
	}
})
