import { type } from "arktype"

const Props = type({ title: "string > 0" })

export const Title = ({ title }) => (
	<h1 title="string | number">{type("string").or("number").expression}</h1>
)
