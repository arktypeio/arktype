import { type } from "arktype"

// Define environment variable requirements
const environmentSchema = type({
	DATA_PATH: "string = './data'"
})

const base = {
	get foo() {
		return "foo"
	}
}

// Validate environment variables
console.info("🔧 Parsing environment variables...")
const result = environmentSchema(process.env)

// Exit if validation fails
if (result instanceof type.errors) {
	console.error(result.summary)
	console.error("process exited with error code 1")
	process.exit(1)
}

// Export validated environment
const environment = result
export { environment }
