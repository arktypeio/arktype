export class Scanner {
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
    export namespace T {
        export type Shift<
            Lookahead extends string,
            Unscanned extends string
        > = `${Lookahead}${Unscanned}`
    }
}

export type UntilCondition = (scanner: Scanner, shifted: string) => boolean

export type OnInputEndFn = (scanner: Scanner, shifted: string) => string

export type ShiftUntilOptions = {
    onInputEnd?: OnInputEndFn
    inclusive?: boolean
}
