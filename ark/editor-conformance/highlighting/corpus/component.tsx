// @ts-nocheck
import { type } from "arktype"

const Props = type({ name: "string", "age?": "number.integer >= 0" })

export const Card = (props: typeof Props.infer) => (
	<div className="card | not a definition" data-type={type("string[]")}>
		{props.name}
		<Child schema={type({ id: "string.uuid" })} label="string | number" />
	</div>
)
