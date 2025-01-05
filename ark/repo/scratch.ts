import * as fs from "fs"
import * as path from "path"
import { Project } from "ts-morph"
import ts from "typescript"

const project = new Project({
	tsConfigFilePath: "tsconfig.json"
})

interface DocRef {
	file: string
	symbol: string
	desc: string
	line: number
}

const findRefs = (file: string): DocRef[] => {
	const content = fs.readFileSync(file, "utf8")
	const src = ts.createSourceFile(file, content, ts.ScriptTarget.Latest)
	const refs: DocRef[] = []

	const visit = (node: ts.Node) => {
		const comments = ts.getLeadingCommentRanges(content, node.pos)

		if (comments?.length) {
			comments.forEach(comment => {
				const text = content.slice(comment.pos, comment.end)
				const match = text.match(/@docFrom\s+(\w+):\s*(.*)/)

				if (match) {
					refs.push({
						file,
						symbol: match[1],
						desc: match[2],
						line: src.getLineAndCharacterOfPosition(comment.pos).line
					})
				}
			})
		}

		ts.forEachChild(node, visit)
	}

	ts.forEachChild(src, visit)
	return refs
}

const expandRefs = (refs: DocRef[]) => {
	refs.forEach(ref => {
		// Find declaration using ts-morph
		const allFiles = project.getSourceFiles()
		const declarations = allFiles.flatMap(file =>
			file.getDescendantsOfKind(ts.SyntaxKind.Identifier).flatMap(i => {
				if (i.getText() !== ref.symbol) return []
				const declaration = i.getSymbol()?.getDeclarations()?.[0]
				return declaration?.asKind(ts.SyntaxKind.TypeAliasDeclaration) ?? []
			})
		)

		const declaration = declarations[0]
		if (!declaration) return

		// Get JSDoc from declaration
		const docs = declaration.getJsDocs()?.[0]?.getDescription()?.trim() ?? ""

		console.log(docs)

		const newDoc = `/**\n * ${ref.desc}\n *\n${docs
			.split("\n")
			.map(l => ` * ${l}`)
			.join("\n")}\n */`

		// Update file
		const content = fs.readFileSync(ref.file, "utf8")
		const lines = content.split("\n")
		lines[ref.line] = newDoc
		// fs.writeFileSync(ref.file, lines.join("\n"))
	})
}

// Usage: ts-node scripts/expandDocs.ts <file>
const config = ts.findConfigFile(
	process.cwd(),
	ts.sys.fileExists,
	"tsconfig.json"
)!

const { config: cfg } = ts.readConfigFile(config, ts.sys.readFile)
const { options, fileNames } = ts.parseJsonConfigFileContent(
	cfg,
	ts.sys,
	path.dirname(config)
)

const program = ts.createProgram(fileNames, options)
const refs = findRefs(process.argv[2])
expandRefs(refs, program)
