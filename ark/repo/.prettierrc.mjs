// .prettierrc.mjs
/** @type {import("prettier").Config} */
export default {
	useTabs: true,
	semi: false,
	trailingComma: "none",
	experimentalTernaries: true,
	arrowParens: "avoid",
	plugins: ["prettier-plugin-astro"],
	overrides: [
		{
			files: "*.astro",
			options: {
				parser: "astro"
			}
		}
	]
}
