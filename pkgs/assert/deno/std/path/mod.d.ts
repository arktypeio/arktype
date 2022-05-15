import * as _win32 from "./win32.js"
import * as _posix from "./posix.js"
export declare const win32: typeof _win32
export declare const posix: typeof _posix
export declare const basename: typeof _posix.basename | typeof _win32.basename,
    delimiter: string,
    dirname: typeof _posix.dirname | typeof _win32.dirname,
    extname: typeof _posix.extname | typeof _win32.extname,
    format: typeof _posix.format | typeof _win32.format,
    fromFileUrl: typeof _posix.fromFileUrl | typeof _win32.fromFileUrl,
    isAbsolute: typeof _win32.isAbsolute | typeof _posix.isAbsolute,
    join: typeof _posix.join | typeof _win32.join,
    normalize: typeof _win32.normalize | typeof _posix.normalize,
    parse: typeof _posix.parse | typeof _win32.parse,
    relative: typeof _posix.relative | typeof _win32.relative,
    resolve: typeof _win32.resolve | typeof _posix.resolve,
    sep: string,
    toFileUrl: typeof _posix.toFileUrl | typeof _win32.toFileUrl,
    toNamespacedPath:
        | typeof _posix.toNamespacedPath
        | typeof _win32.toNamespacedPath
export * from "./common.js"
export { SEP, SEP_PATTERN } from "./separator.js"
export * from "./_interface.js"
export * from "./glob.js"
