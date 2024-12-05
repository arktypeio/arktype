import { createMetadataImage } from "fumadocs-core/server"
import { source } from "./source.js"

export const metadataImage = createMetadataImage({
	imageRoute: "/docs-og",
	source
})
