import { describe, it} from "mocha";
import type { astToString } from "../../src/parse/ast/utils.js";
import { attest } from "../attest/main.js";

describe('astToString', () => {
    it('no parentheses if nested ast is an array', () => {
        const t = {} as unknown as astToString<[["number", "[]"], "|", "number"]>
        attest(t).typed as "'number[]|number'"
    });
    it('parentheses if nested ast is an infix expression', () => {
        const t = {} as unknown as astToString<[["0", "|", "1"], "|", "string"]>
        attest(t).typed as "'(0|1)|string'"
    });
    it('defaults to "..." if input is bad', () => {
        const t = {} as unknown as astToString<["0", "///", "1"]>
        attest(t).typed as "'...'"
    });
});