// @ts-check

import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
	output: "export",
	reactStrictMode: true,
	serverExternalPackages: ["twoslash", "typescript"]
}

export default withMDX(config)
