import type { IntersectionInner } from "../sets/intersection.js"
import type { CompilationContext } from "../shared/compile.js"
import type { PropKind } from "../shared/define.js"

export type PropsInner = Pick<IntersectionInner, PropKind>

export const compileProps = (props: PropsInner, ctx: CompilationContext) => {
	if (props.sequence || props.index) {
	}
}

type NamedPropsInner = Pick<PropsInner, "required" | "optional">

const compileLooseNamedProps = (
	props: NamedPropsInner,
	ctx: CompilationContext
) => {
	let body = ""
	props.required?.forEach((prop) => {
		body += prop.compileApply(ctx)
	})
}
