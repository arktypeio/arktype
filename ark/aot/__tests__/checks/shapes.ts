export const shape: { name: "string" | "number" } = { name: "string" }

// two sites read one binding, each at its own key
export const pair: { first: "string" | "number"; second: "string" } = {
	first: "string",
	second: "string"
}
