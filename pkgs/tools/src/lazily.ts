export const lazily = <Return extends object>(f: () => Return): Return => {
    let evaluated = false
    let result: any = {}
    return new Proxy(result, {
        get: (target, prop) => {
            if (!evaluated) {
                result = f()
                evaluated = true
            }
            return result[prop]
        }
    })
}
