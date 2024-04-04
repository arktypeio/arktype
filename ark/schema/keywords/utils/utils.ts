import type { Schema } from "../../base.js"

export type spaceFromExports<exports> = {
	[k in keyof exports]: Schema<exports[k]>
}
