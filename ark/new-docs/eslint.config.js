// @ts-check

import tseslint from "typescript-eslint"

export default tseslint.config({
	ignores: ["components/code-snippets/snippets"],
	extends: ["next/core-web-vitals", "next/typescript"],
	rules: {
		"@typescript-eslint/explicit-module-boundary-types": "off"
	}
})
