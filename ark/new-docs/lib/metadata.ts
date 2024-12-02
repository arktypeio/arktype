import { createMetadataImage } from "fumadocs-core/server"
import { source } from "../lib/source.ts"

export const metadataImage = createMetadataImage({
	imageRoute: "/docs-og",
	source
})
