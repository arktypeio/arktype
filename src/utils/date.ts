export const getEpochs = (arg: ConstructorParameters<typeof Date>[0]) => {
    if (arg instanceof Date) {
        return arg.valueOf()
    }
    return new Date(arg).valueOf()
}
