export const lazily = <F extends () => object>(f: F): ReturnType<F> => {
    let evaluated = false
    let result: any = {}
    return new Proxy(result, {
        get: (target, prop) => {
            if (!evaluated) {
                if (f.length) {
                    throw new Error(
                        `Lazily must be passed a function with no arguments, e.g. () => ({re: "do"}). ` +
                            `Instead, it received a function requiring ${f.length}.`
                    )
                }
                result = f()
                if (typeof result !== "object") {
                    throw new TypeError(
                        `Lazily must be passed a function that returns an object, e.g. () => ({re: "do"}). ` +
                            `Returned value was of type ${typeof result}.`
                    )
                }
                evaluated = true
            }
            return result[prop]
        }
    })
}
