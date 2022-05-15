/** RGB 8-bits per channel. Each in range `0->255` or `0x00->0xff` */
interface Rgb {
    r: number
    g: number
    b: number
}
/**
 * Set changing text color to enabled or disabled
 * @param value
 */
export declare function setColorEnabled(value: boolean): void
/** Get whether text color change is enabled or disabled. */
export declare function getColorEnabled(): boolean
/**
 * Reset the text modified
 * @param str text to reset
 */
export declare function reset(str: string): string
/**
 * Make the text bold.
 * @param str text to make bold
 */
export declare function bold(str: string): string
/**
 * The text emits only a small amount of light.
 * @param str text to dim
 */
export declare function dim(str: string): string
/**
 * Make the text italic.
 * @param str text to make italic
 */
export declare function italic(str: string): string
/**
 * Make the text underline.
 * @param str text to underline
 */
export declare function underline(str: string): string
/**
 * Invert background color and text color.
 * @param str text to invert its color
 */
export declare function inverse(str: string): string
/**
 * Make the text hidden.
 * @param str text to hide
 */
export declare function hidden(str: string): string
/**
 * Put horizontal line through the center of the text.
 * @param str text to strike through
 */
export declare function strikethrough(str: string): string
/**
 * Set text color to black.
 * @param str text to make black
 */
export declare function black(str: string): string
/**
 * Set text color to red.
 * @param str text to make red
 */
export declare function red(str: string): string
/**
 * Set text color to green.
 * @param str text to make green
 */
export declare function green(str: string): string
/**
 * Set text color to yellow.
 * @param str text to make yellow
 */
export declare function yellow(str: string): string
/**
 * Set text color to blue.
 * @param str text to make blue
 */
export declare function blue(str: string): string
/**
 * Set text color to magenta.
 * @param str text to make magenta
 */
export declare function magenta(str: string): string
/**
 * Set text color to cyan.
 * @param str text to make cyan
 */
export declare function cyan(str: string): string
/**
 * Set text color to white.
 * @param str text to make white
 */
export declare function white(str: string): string
/**
 * Set text color to gray.
 * @param str text to make gray
 */
export declare function gray(str: string): string
/**
 * Set text color to bright black.
 * @param str text to make bright-black
 */
export declare function brightBlack(str: string): string
/**
 * Set text color to bright red.
 * @param str text to make bright-red
 */
export declare function brightRed(str: string): string
/**
 * Set text color to bright green.
 * @param str text to make bright-green
 */
export declare function brightGreen(str: string): string
/**
 * Set text color to bright yellow.
 * @param str text to make bright-yellow
 */
export declare function brightYellow(str: string): string
/**
 * Set text color to bright blue.
 * @param str text to make bright-blue
 */
export declare function brightBlue(str: string): string
/**
 * Set text color to bright magenta.
 * @param str text to make bright-magenta
 */
export declare function brightMagenta(str: string): string
/**
 * Set text color to bright cyan.
 * @param str text to make bright-cyan
 */
export declare function brightCyan(str: string): string
/**
 * Set text color to bright white.
 * @param str text to make bright-white
 */
export declare function brightWhite(str: string): string
/**
 * Set background color to black.
 * @param str text to make its background black
 */
export declare function bgBlack(str: string): string
/**
 * Set background color to red.
 * @param str text to make its background red
 */
export declare function bgRed(str: string): string
/**
 * Set background color to green.
 * @param str text to make its background green
 */
export declare function bgGreen(str: string): string
/**
 * Set background color to yellow.
 * @param str text to make its background yellow
 */
export declare function bgYellow(str: string): string
/**
 * Set background color to blue.
 * @param str text to make its background blue
 */
export declare function bgBlue(str: string): string
/**
 *  Set background color to magenta.
 * @param str text to make its background magenta
 */
export declare function bgMagenta(str: string): string
/**
 * Set background color to cyan.
 * @param str text to make its background cyan
 */
export declare function bgCyan(str: string): string
/**
 * Set background color to white.
 * @param str text to make its background white
 */
export declare function bgWhite(str: string): string
/**
 * Set background color to bright black.
 * @param str text to make its background bright-black
 */
export declare function bgBrightBlack(str: string): string
/**
 * Set background color to bright red.
 * @param str text to make its background bright-red
 */
export declare function bgBrightRed(str: string): string
/**
 * Set background color to bright green.
 * @param str text to make its background bright-green
 */
export declare function bgBrightGreen(str: string): string
/**
 * Set background color to bright yellow.
 * @param str text to make its background bright-yellow
 */
export declare function bgBrightYellow(str: string): string
/**
 * Set background color to bright blue.
 * @param str text to make its background bright-blue
 */
export declare function bgBrightBlue(str: string): string
/**
 * Set background color to bright magenta.
 * @param str text to make its background bright-magenta
 */
export declare function bgBrightMagenta(str: string): string
/**
 * Set background color to bright cyan.
 * @param str text to make its background bright-cyan
 */
export declare function bgBrightCyan(str: string): string
/**
 * Set background color to bright white.
 * @param str text to make its background bright-white
 */
export declare function bgBrightWhite(str: string): string
/**
 * Set text color using paletted 8bit colors.
 * https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit
 * @param str text color to apply paletted 8bit colors to
 * @param color code
 */
export declare function rgb8(str: string, color: number): string
/**
 * Set background color using paletted 8bit colors.
 * https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit
 * @param str text color to apply paletted 8bit background colors to
 * @param color code
 */
export declare function bgRgb8(str: string, color: number): string
/**
 * Set text color using 24bit rgb.
 * `color` can be a number in range `0x000000` to `0xffffff` or
 * an `Rgb`.
 *
 * To produce the color magenta:
 *
 * ```ts
 *      import { rgb24 } from "./colors.ts";
 *      rgb24("foo", 0xff00ff);
 *      rgb24("foo", {r: 255, g: 0, b: 255});
 * ```
 * @param str text color to apply 24bit rgb to
 * @param color code
 */
export declare function rgb24(str: string, color: number | Rgb): string
/**
 * Set background color using 24bit rgb.
 * `color` can be a number in range `0x000000` to `0xffffff` or
 * an `Rgb`.
 *
 * To produce the color magenta:
 *
 * ```ts
 *      import { bgRgb24 } from "./colors.ts";
 *      bgRgb24("foo", 0xff00ff);
 *      bgRgb24("foo", {r: 255, g: 0, b: 255});
 * ```
 * @param str text color to apply 24bit rgb to
 * @param color code
 */
export declare function bgRgb24(str: string, color: number | Rgb): string
/**
 * Remove ANSI escape codes from the string.
 * @param string to remove ANSI escape codes from
 */
export declare function stripColor(string: string): string
export {}
