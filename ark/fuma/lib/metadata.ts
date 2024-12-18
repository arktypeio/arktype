import { createMetadataImage } from "fumadocs-core/server"
import { source } from "./source.ts"

export const metadataImage = createMetadataImage({
	imageRoute: "/docs-og",
	source
})
