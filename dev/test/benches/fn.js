import { fn } from "./fn.js"

export const greet = fn({ name: "string[]", isWizard: "boolean" })(
	(data) => `${data.name.join(" ")}${data.isWizard ? "🧙‍♂️" : ":("}`
)

const result = greet({ name: ["Matt", "Pocock"], isWizard: true })
