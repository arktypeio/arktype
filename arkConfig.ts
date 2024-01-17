/* eslint-disable @typescript-eslint/no-restricted-imports */
import { configure } from "@arktype/schema/config"
// import { type } from "arktype"

// const user = type("string")

configure({
	domain: {
		description: (inner) => `my special ${inner.domain}`
	}
})
