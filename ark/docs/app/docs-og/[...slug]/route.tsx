import { generateOGImage } from "fumadocs-ui/og"
import { metadataImage } from "../../../lib/metadata"

export const GET = metadataImage.createAPI(page =>
	generateOGImage({
		title: page.data.title === "ArkType" ? "ArkType" : "ArkType Docs",
		description: page.data.title === "ArkType" ? "" : page.data.title,
		site: "ArkType"
		// font: {
		// 	title: {
		// 		families: ["Raleway"],
		// 		weight: "Bold",
		// 		size: 100
		// 	},
		// 	description: {
		// 		families: ["Raleway"],
		// 		weight: "SemiBold",
		// 		size: 40
		// 	}
		// }
		// fonts: [
		// 	fromPackageRoot("src", "assets", "Raleway.ttf"),
		// 	"https://fonts.googleapis.com/css?family=Raleway:300,400,500,700&display=swap"
		// ]
	})
)

export const generateStaticParams = () => metadataImage.generateParams()
