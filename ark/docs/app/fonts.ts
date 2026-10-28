import localFont from "next/font/local"

// latin subsets of the variable fonts from @fontsource-variable, and Cascadia
// Code's italic with ss01 baked in (SIL OFL 1.1, licenses beside the files)

export const atkinson = localFont({
	src: "./fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2",
	weight: "200 800",
	variable: "--font-atkinson",
	display: "swap",
	adjustFontFallback: "Arial",
	fallback: ["system-ui", "sans-serif"]
})

/** prose emphasis only, so it isn't preloaded; global.css gives it to `em` */
export const atkinsonItalic = localFont({
	src: "./fonts/atkinson-hyperlegible-next-latin-wght-italic.woff2",
	weight: "200 800",
	style: "italic",
	variable: "--font-atkinson-italic",
	display: "swap",
	adjustFontFallback: "Arial",
	preload: false
})

export const cascadia = localFont({
	src: "./fonts/cascadia-code-latin-wght-normal.woff2",
	weight: "200 700",
	variable: "--font-cascadia",
	display: "swap",
	// next can't measure a monospace fallback, so tokens.css declares one
	adjustFontFallback: false,
	fallback: ["Cascadia Fallback", "ui-monospace", "monospace"]
})

/** ArkDark's cursive, for declared names: the hero's lede and most code blocks */
export const cascadiaCursive = localFont({
	src: "./fonts/cascadia-code-italic.woff2",
	weight: "400",
	style: "italic",
	variable: "--font-cursive",
	display: "swap",
	adjustFontFallback: false
})
