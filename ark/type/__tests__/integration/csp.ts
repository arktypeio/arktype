export const evaluatedBodies: string[] = []

// whether eval is refused, which a host like workerd starts after loading
export const csp = { refusesEval: true }

// simulate a Content-Security-Policy that blocks eval
globalThis.Function = new Proxy(Function, {
	construct: (target, args, newTarget) => {
		evaluatedBodies.push(args[args.length - 1])
		if (csp.refusesEval)
			throw new EvalError("Refused to evaluate a string as JavaScript")
		return Reflect.construct(target, args, newTarget)
	}
})
