export const evaluatedBodies: string[] = []

// simulate a Content-Security-Policy that blocks eval
globalThis.Function = new Proxy(Function, {
	construct: (_, args) => {
		evaluatedBodies.push(args[args.length - 1])
		throw new EvalError("Refused to evaluate a string as JavaScript")
	}
})
