import * as fs from "fs"
import * as path from "path"
import ts from "typescript"

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

const expandRefs = (refs: DocRef[], program: ts.Program) => {
	const checker = program.getTypeChecker()

	refs.forEach(ref => {
		const src = program.getSourceFile(ref.file)!
		const symbol = checker
			.getSymbolsInScope(src, ts.SymbolFlags.Type)
			.find(s => s.name === ref.symbol)

		if (!symbol) return

		const docs = ts.displayPartsToString(
			symbol.getDocumentationComment(checker)
		)

		const newDoc = `/**\n * ${ref.desc}\n *\n${docs
			.split("\n")
			.map(l => ` * ${l}`)
			.join("\n")}\n */`

		const content = fs.readFileSync(ref.file, "utf8")
		const lines = content.split("\n")
		lines[ref.line] = newDoc
		fs.writeFileSync(ref.file, lines.join("\n"))
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
