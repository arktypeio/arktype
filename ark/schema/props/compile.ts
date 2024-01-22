import type { CompilationContext } from "../shared/compile.js"
import type { PropKind } from "../shared/define.js"
import type { IntersectionInner } from "../types/intersection.js"

export type PropsInner = Pick<IntersectionInner, PropKind>

export const compileProps = (props: PropsInner, ctx: CompilationContext) => {
	// if (props.sequence) {
	// }
	// if (props.index) {
	// }
}

type NamedPropsInner = Pick<PropsInner, "required" | "optional">

const compileLooseNamedProps = (
	props: NamedPropsInner,
	ctx: CompilationContext
) => {
	let body = ""
	props.required?.forEach((prop) => {
		body += prop.compileBody(ctx)
	})
}
