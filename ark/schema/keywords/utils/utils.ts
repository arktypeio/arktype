import type { SchemaNode } from "../../base.js"

export type spaceFromExports<exports> = {
	[k in keyof exports]: SchemaNode<exports[k]>
}
