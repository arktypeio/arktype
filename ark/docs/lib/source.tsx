import type { autocomplete } from "@ark/util"
import { loader } from "fumadocs-core/source"
import { icons } from "lucide-react"
import { createElement } from "react"
import { docs } from "../.source"
import { Badge } from "../components/Badge.tsx"

export type IconName = keyof typeof icons | "Advanced"

export const source = loader({
	baseUrl: "/docs",
	source: docs.toFumadocsSource(),
	icon: (name?: autocomplete<IconName>) => {
		if (!name) return
		if (name in icons) return createElement(icons[name as never])

		if (name === "Advanced") {
			return (
				<Badge
					style={{
						height: "1rem",
						fontSize: 10,
						padding: "0 0.2rem",
						order: 1
					}}
				>
					advanced
				</Badge>
			)
		}

		throw new Error(`${name} is not a valid icon`)
	}
})
