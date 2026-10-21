"use client"

import dynamic from "next/dynamic"

// Monaco can't render on the server, and loading it in its own chunk keeps
// the page's first paint independent of it
export const PlaygroundLoader = dynamic(
	() =>
		import("./Playground.tsx").then(module => () => (
			<module.Playground withResults={true} />
		)),
	{
		ssr: false,
		loading: () => <p className="playground-loading">Loading playground…</p>
	}
)
