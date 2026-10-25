import { TopNav } from "../../components/shell/TopNav.tsx"
import { PlaygroundLoader } from "../../components/playground/PlaygroundLoader.tsx"
import { defineMetadata } from "../metadata.ts"

export const metadata = defineMetadata({
	title: "Playground",
	ogImage: "ogPlayground.png",
	url: "/playground",
	sharedTitle: "Playground · ArkType"
})

export default function PlaygroundPage() {
	return (
		<>
			<TopNav active="playground" />
			<main id="main" className="playground-page">
				<h1 className="visually-hidden">Playground</h1>
				<div className="playground-frame">
					<PlaygroundLoader />
				</div>
			</main>
		</>
	)
}
