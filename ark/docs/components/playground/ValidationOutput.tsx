import { hasArkKind } from "@ark/schema"
import { ParseError, type } from "arktype"

const editorStyles = {
	borderRadius: "16px",
	boxShadow:
		"0 10px 15px 0 rgba(0, 0, 0, 0.3), 0 15px 30px 0 rgba(0, 0, 0, 0.22)",
	transition: "all 0.3s cubic-bezier(.25,.8,.25,1)",
	backdropFilter: "blur(16px)",
	paddingTop: "16px"
}

const successBg = "#081617cc"
const failureBg = "#170808cc"

export interface ValidationOutputProps {
	definition?: string
	result?: type.errors | ParseError | unknown
}

export const ValidationOutput = ({
	definition,
	result
}: ValidationOutputProps) => (
	<div className="flex flex-col gap-4 h-full">
		<div className="flex-1 min-h-0">
			<div
				style={{ ...editorStyles, backgroundColor: "#08161791" }}
				className="editor-bg h-full p-4 rounded-2xl overflow-auto"
			>
				<h3 className="text-fd-foreground font-semibold mb-2">Definition</h3>
				<pre className="m-0 whitespace-pre-wrap">
					<code>{definition ?? "// No type defined yet"}</code>
				</pre>
			</div>
		</div>
		<div className="flex-1 min-h-0">
			<div
				style={{
					...editorStyles,
					backgroundColor: hasArkKind(result, "errors") ? failureBg : successBg
				}}
				className="h-full p-4 rounded-2xl overflow-auto"
			>
				<h3 className="text-fd-foreground font-semibold mb-2">Output</h3>
				<pre className="m-0 whitespace-pre-wrap">
					<code>
						{result === undefined ?
							null
						: result instanceof type.errors ?
							`❌ problems:\n\n${result.summary}`
						: result instanceof ParseError ?
							`❌ParseError:\n\n${result}`
						:	`✅ data:\n\n${JSON.stringify(result, null, 2)}`}
					</code>
				</pre>
			</div>
		</div>
	</div>
)
