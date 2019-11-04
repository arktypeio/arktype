export const ifExists = async <T>(find: () => Promise<T>) => {
    try {
        return await find()
    } catch {
        return null
    }
}

export const APP_SECRET = process.env.APP_SECRET as string
