const describe = (value: unknown): string => `got ${value}`

export const described = (value: unknown): string => describe(value)
