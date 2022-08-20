export class scanner {
    private chars: string[]
    private i: number

    constructor(def: string) {
        this.chars = [...def]
        this.i = 0
    }

    shift() {
        return this.chars[this.i++] ?? "END"
    }

    get lookahead() {
        return this.chars[this.i] ?? "END"
    }

    shiftUntil(condition: UntilCondition, opts?: ShiftUntilOptions) {
        let shifted = ""
        while (!condition(this, shifted)) {
            if (this.lookahead === "END") {
                return opts?.onInputEnd?.(this, shifted) ?? shifted
            }
            shifted += this.shift()
        }

        if (opts?.inclusive) {
            shifted += this.shift()
        }
        return shifted
    }
}

export namespace Scanner {
    export type Shift<
        Lookahead extends string,
        Unscanned extends string
    > = `${Lookahead}${Unscanned}`
}

export type UntilCondition = (scanner: scanner, shifted: string) => boolean

export type OnInputEndFn = (scanner: scanner, shifted: string) => string

export type ShiftUntilOptions = {
    onInputEnd?: OnInputEndFn
    inclusive?: boolean
}
