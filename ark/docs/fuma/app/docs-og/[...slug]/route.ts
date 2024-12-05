import { metadataImage } from "../../../lib/metadata.js"
// import { fromPackageRoot } from "@ark/fs"
import { generateOGImage } from "fumadocs-ui/og"

export const GET = metadataImage.createAPI(page =>
	generateOGImage({
		title: page.data.title === "ArkType" ? "ArkType" : "ArkType Docs",
		description:
			page.data.title === "ArkType" ? page.data.description : page.data.title,
		site: "ArkType",
		fonts: [
			// fromPackageRoot("src", "assets", "Raleway.ttf"),
			// "https://fonts.googleapis.com/css?family=Raleway:300,400,500,700&display=swap"
		]
	})
)

export const generateStaticParams = (): {
	slug: string[]
	lang?: string
}[] => metadataImage.generateParams()

// TODO will handle this when moved into arktype repo
// docs: https://fumadocs.vercel.app/docs/ui/open-graph

// import { fromPackageRoot } from "@ark/fs"
// import { OGImageRoute } from "astro-og-canvas"
// import { getCollection } from "astro:content"

// // based on https://hideoo.dev/notes/starlight-og-images/

// // Get all entries from the `docs` content collection.
// const entries = await getCollection("docs")

// let defaultDescription = ""

// // Map the entry array to an object with the page ID as key and the
// // frontmatter data as value.
// const pages = Object.fromEntries(
// 	entries.map(({ data, id }) => {
// 		if (id === "index.mdx") defaultDescription = data.description!
// 		return [id, { data }]
// 	})
// )

// export const { getStaticPaths, GET } = OGImageRoute({
// 	// Pass down the documentation pages.
// 	pages,
// 	// Define the name of the parameter used in the endpoint path, here `slug`
// 	// as the file is named `[...slug].ts`.
// 	param: "slug",
// 	// Define a function called for each page to customize the generated image.
// 	getImageOptions: (_path, page: (typeof pages)[number]) => ({
// 		// Use the page title and description as the image title and description.
// 		title: page.data.title === "ArkType" ? "ArkType" : "ArkType Docs",
// 		description:
// 			page.data.title === "ArkType" ? defaultDescription : page.data.title,
// 		bgImage: {
// 			path: fromPackageRoot("src", "assets", "openGraphBackground.png")
// 		},
// 		font: {
// 			title: {
// 				families: ["Raleway"],
// 				weight: "Bold",
// 				size: 100
// 			},
// 			description: {
// 				families: ["Raleway"],
// 				weight: "SemiBold",
// 				size: 40
// 			}
// 		},
// 		fonts: [
// 			fromPackageRoot("src", "assets", "Raleway.ttf"),
// 			"https://fonts.googleapis.com/css?family=Raleway:300,400,500,700&display=swap"
// 		]
// 	})
// })
