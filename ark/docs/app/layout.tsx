import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import {
	bannerScript,
	ReleaseBanner
} from "../components/shell/ReleaseBanner.tsx"
import { SearchDialog } from "../components/shell/SearchDialog.tsx"
import { themeColors, themeScript } from "../components/shell/theme.ts"
import { TwoslashPopups } from "../components/TwoslashPopups.tsx"
import { hashRedirects } from "../lib/content/redirects.ts"
import { Analytics } from "./analytics.tsx"
import { atkinson, atkinsonItalic, cascadia, cascadiaCursive } from "./fonts.ts"
import "./global.css"
import "./styles/print.css"
import { defineMetadata, siteUrl, tagline } from "./metadata.ts"

export const metadata: Metadata = {
	...defineMetadata({}),
	metadataBase: new URL(siteUrl),
	title: {
		default: `ArkType: ${tagline}`,
		template: "%s · ArkType"
	},
	keywords: [
		"ArkType",
		"TypeScript",
		"JavaScript",
		"runtime validation",
		"schema",
		"type-safe",
		"validator",
		"syntax"
	],
	icons: {
		icon: "/image/favicon.svg"
	}
}

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: themeColors.light },
		{ media: "(prefers-color-scheme: dark)", color: themeColors.dark }
	],
	colorScheme: "dark light",
	viewportFit: "cover"
}

// runs before first paint: marks the theme and whether the banner was closed,
// follows a link to a section that moved before the old page shows, and marks
// persisted tab choices and the platform so CSS picks them and nothing shifts
// when the page hydrates
const prepaint = `${themeScript}${bannerScript}try{var t=location.hash&&${JSON.stringify(hashRedirects)}[location.pathname.replace(/(.)\\/$/,"$1")+location.hash.toLowerCase()];if(t)location.replace(t);var d=document.documentElement;if(/Mac|iPhone|iPad/.test(navigator.platform))d.dataset.mac="";var s=new URLSearchParams(location.search).get("syntax")||localStorage.getItem("ark-syntax");if(s)d.dataset.syntax=s;for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf("ark-tabs:")===0)d.setAttribute("data-tab-"+k.slice(9),localStorage.getItem(k))}}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			className={`${atkinson.variable} ${atkinsonItalic.variable} ${cascadia.variable} ${cascadiaCursive.variable}`}
			// lets Next turn off smooth scrolling while it resets the scroll on navigation
			data-scroll-behavior="smooth"
			suppressHydrationWarning
		>
			<head>
				<script dangerouslySetInnerHTML={{ __html: prepaint }} />
			</head>
			<body>
				<a href="#main" className="skip">
					Skip to content
				</a>
				<ReleaseBanner />
				{children}
				<SearchDialog />
				<TwoslashPopups />
				<Analytics />
			</body>
		</html>
	)
}
