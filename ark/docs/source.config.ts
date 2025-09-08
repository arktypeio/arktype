import { defineConfig, defineDocs } from "fumadocs-mdx/config"
import { shikiConfig } from "./lib/shiki.ts"

export const docs = defineDocs({
	dir: "content/docs",
	docs: {
		async: true
	}
})

export default defineConfig({
	mdxOptions: {
		rehypeCodeOptions: shikiConfig
	}
})
