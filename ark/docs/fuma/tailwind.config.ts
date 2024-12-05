import { createPreset } from "fumadocs-ui/tailwind-plugin"
import type { Config } from "tailwindcss"

export default {
	content: [
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./content/**/*.{md,mdx}",
		"./mdx-components.{ts,tsx}",
		"./node_modules/fumadocs-ui/dist/**/*.js"
	],
	presets: [
		createPreset({
			preset: "ocean",
			addGlobalColors: true
		})
	],
	theme: {
		extend: {
			colors: {
				highlight: "#f5cf8f",
				"ark-purple": "#ab25e9"
			}
		}
	}
} as const satisfies Config
