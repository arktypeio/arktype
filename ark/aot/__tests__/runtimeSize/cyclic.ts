const even = (n: number): boolean => n === 0 || odd(n - 1)

const odd = (n: number): boolean => n !== 0 && even(n - 1)

// reads itself alone, which a count of references still drops
const countdown = (n: number): number => (n ? countdown(n - 1) : 0)

export const parity = (n: number): boolean => even(countdown(n))
