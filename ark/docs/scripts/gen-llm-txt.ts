#!/usr/bin/env bun

import fs from "node:fs"
import path from "node:path"

// Output file target
const outputFile: string = path.resolve(process.cwd(), "ark/docs/llms.mdx")

// Find all MDX files under `docsDir`
const mdxFiles: string[] = findMdxFiles(
	// process.cwd() is the root of the git repo
	path.resolve(process.cwd(), "ark/docs/content/docs/")
)

if (mdxFiles.length > 0) {
	await aggregateMdxFiles(mdxFiles)
	console.log(`Successfully aggregated MDX files to "ark/docs/llms.mdx" 🎉`)
} else {
	console.log("No MDX files found to aggregate 🫠")
}

function findMdxFiles(dirPath: string): string[] {
	let results: string[] = []

	if (!fs.existsSync(dirPath)) {
		console.warn(`Directory not found: ${dirPath}`)
		return results
	}

	try {
		const entries: fs.Dirent[] = fs.readdirSync(dirPath, {
			withFileTypes: true
		})

		for (const entry of entries) {
			const fullPath: string = path.join(dirPath, entry.name)
			if (entry.isDirectory()) {
				results = results.concat(findMdxFiles(fullPath))
			} else if (entry.isFile() && entry.name.endsWith(".mdx")) {
				results.push(fullPath)
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${dirPath}:`, error)
	}

	return results
}

async function aggregateMdxFiles(mdxFilePaths: string[]): Promise<void> {
	console.log(
		`Aggregating ${mdxFilePaths.length} MDX files into "ark/docs/llms.mdx"`
	)

	let combinedContent: string = ""
	const repoRoot = process.cwd()

	try {
		for (const filePath of mdxFilePaths) {
			// @ts-expect-error
			const file = Bun.file(filePath)
			const text = await file.text()
			const relativePath = path.relative(repoRoot, filePath)
			combinedContent += `// Relative Path: ${relativePath}\n\n${text}\n\n---\n\n`
		}
		// @ts-expect-error
		await Bun.write(outputFile, combinedContent)
	} catch (error) {
		console.error(`Error aggregating MDX files:`, error)
	}
}
