import { type } from "arktype"
import type { Extra } from "./base.ts"

declare module "./base.ts" {
	interface Extra {
		x: string
	}
}

export const Augmented = type("object").as<{ extra: Extra }>()
