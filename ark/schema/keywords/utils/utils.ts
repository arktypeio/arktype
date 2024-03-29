import type { TypeNode } from "../../base.js"

export type spaceFromExports<exports> = {
	[k in keyof exports]: TypeNode<exports[k]>
}
