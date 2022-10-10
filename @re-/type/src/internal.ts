export class InternalArktypeError extends Error {}

export const throwInternalError = (message: string) => {
    throw new InternalArktypeError(message)
}
