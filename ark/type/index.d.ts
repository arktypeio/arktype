import * as _ark_schema from '@ark/schema';
import { arkKind, BaseRoot, BaseParseContext, GenericAst, GenericParamAst, writeUnsatisfiedParameterConstraintMessage, GenericRoot, genericParamNames, resolvableReferenceIn, writeUnresolvableMessage, writeNonSubmoduleDotMessage, emptyBrandNameMessage, writeUnboundableMessage, writeUnassignableDefaultValueMessage, writeIndivisibleMessage, writeNonStructuralOperandMessage, PrivateDeclaration, writeMissingSubmoduleAccessMessage, UndeclaredKeyBehavior, writeInvalidPropertyKeyMessage, Morph, unwrapDefault, Predicate, Sequence, postfixAfterOptionalOrDefaultableMessage, BaseMappedPropInner, OptionalMappedPropInner, Prop, InclusiveNumericRangeSchema, ExclusiveNumericRangeSchema, ExactLength, InclusiveDateRangeSchema, ExclusiveDateRangeSchema, Divisor, Pattern, ArkErrors, RootSchema, BaseParseOptions, ArkSchemaScopeConfig, BaseNode, exportedNameOf, toInternalScope, NodeKind, RootKind, NodeSchema, nodeOfKind, reducibleKindOf, PreparsedNodeResolution, writeDuplicateAliasError, BaseScope, ResolvedScopeConfig, AliasDefEntry, GenericParamDef, BaseParseContextInput, JsonSchema, Disjoint, StandardSchemaV1, flatResolutionsOf, LazyGenericBody, RootModule, ArkError } from '@ark/schema';
export { ArkError, ArkErrors, ArkSchemaConfig, ArkSchemaScopeConfig, JsonSchema } from '@ark/schema';
import * as util from '@ark/util';
import { anyOrNever, Scanner, EscapeChar, WhitespaceChar, requireKeys, ErrorMessage, Completion, defined, Stringifiable, Hkt, array, typeToString, NumberLiteral, join, lastOf, BigintLiteral, trim as trim$1, writeMalformedNumericLiteralMessage, ErrorType, Key, show, merge, Constructor, satisfy, conform, ifEmptyObjectLiteral, Fn, Primitive, objectKindOrDomainOf, equals, requiredKeyOf, optionalKeyOf, arkKeyOf, arkIndexableOf, arkGet, toArkKey, listable, intersectUnion, inferred, JsonStructure, Callable, flattenListable, Brand, noSuggest, unset, numericStringKeyOf, isDisjoint, unionToTuple, propValueOf, Json, omit, pick, Digit, liftArray, EcmascriptObjects, PlatformObjects, isSafelyMappable, intersectArrays } from '@ark/util';
export { Hkt, inferred } from '@ark/util';
import { ArkSchemaConfig } from '@ark/schema/config';

type TypeMeta = Omit<ArkEnv.meta, "onFail">;
type TypeMetaInput = string | TypeMeta;
type KeywordConfig = {
    [k in keyof Ark.flat as parseConfigurableFlatAlias<k, Ark.flat[k]>]?: TypeMetaInput;
};
type parseConfigurableFlatAlias<k extends string, v> = [
    v
] extends [anyOrNever] ? k : v extends {
    [arkKind]: "generic" | "module";
} ? never : k extends `${infer prefix}.root` ? prefix : k;
interface ArkConfig extends ArkSchemaConfig {
    keywords?: KeywordConfig;
}
declare const configure: <config extends ArkConfig>(config: config) => config;
declare global {
    export interface ArkEnv {
        $(): Ark;
    }
}
/**
 * This mirrors the global ArkEnv namespace as a local export. We use it instead
 * of the global internally due to a bug in twoslash that prevents `ark/docs`
 * from building if we refer to the global directly.
 *
 * If, in the future, docs can build while arktype refers to `ArkEnv.$` directly,
 * this can be removed.
 */
declare namespace ArkAmbient {
    type $ = ReturnType<ArkEnv["$"]>;
    type meta = ArkEnv.meta;
    type prototypes = ArkEnv.prototypes;
}

type StringifiablePrefixOperator = "keyof";
declare const minComparators: {
    readonly ">": true;
    readonly ">=": true;
};
type MinComparator = keyof typeof minComparators;
declare const maxComparators: {
    readonly "<": true;
    readonly "<=": true;
};
type MaxComparator = keyof typeof maxComparators;
declare const comparators: {
    ">": boolean;
    ">=": boolean;
    "<": boolean;
    "<=": boolean;
    "==": boolean;
};
type Comparator = keyof typeof comparators;
type InvertedComparators = {
    "<": ">";
    ">": "<";
    "<=": ">=";
    ">=": "<=";
    "==": "==";
};
type BranchOperator = "&" | "|" | "|>";
type OpenLeftBound = {
    limit: LimitLiteral;
    comparator: MinComparator;
};
declare const writeUnmatchedGroupCloseMessage: <unscanned extends string>(unscanned: unscanned) => writeUnmatchedGroupCloseMessage<unscanned>;
type writeUnmatchedGroupCloseMessage<unscanned extends string> = `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}`;
declare const writeUnclosedGroupMessage: <missingChar extends string>(missingChar: missingChar) => writeUnclosedGroupMessage<missingChar>;
type writeUnclosedGroupMessage<missingChar extends string> = `Missing ${missingChar}`;
declare const writeOpenRangeMessage: <min extends LimitLiteral, comparator extends MinComparator>(min: min, comparator: comparator) => writeOpenRangeMessage<min, comparator>;
type writeOpenRangeMessage<min extends LimitLiteral, comparator extends MinComparator> = `Left bounds are only valid when paired with right bounds (try ...${comparator}${min})`;
type writeUnpairableComparatorMessage<comparator extends Comparator> = `Left-bounded expressions must specify their limits using < or <= (was ${comparator})`;
declare const writeUnpairableComparatorMessage: <comparator extends Comparator>(comparator: comparator) => writeUnpairableComparatorMessage<comparator>;
declare const writeMultipleLeftBoundsMessage: <openLimit extends LimitLiteral, openComparator extends MinComparator, limit extends LimitLiteral, comparator extends MinComparator>(openLimit: openLimit, openComparator: openComparator, limit: limit, comparator: comparator) => writeMultipleLeftBoundsMessage<openLimit, openComparator, limit, comparator>;
type writeMultipleLeftBoundsMessage<openLimit extends LimitLiteral, openComparator extends MinComparator, limit extends LimitLiteral, comparator extends MinComparator> = `An expression may have at most one left bound (parsed ${openLimit}${InvertedComparators[openComparator]}, ${limit}${InvertedComparators[comparator]})`;

declare class ArkTypeScanner<lookahead extends string = string> extends Scanner<lookahead> {
    shiftUntilNextTerminator(): string;
    static terminatingChars: {
        readonly " ": 1;
        readonly "\n": 1;
        readonly "\t": 1;
        readonly "<": 1;
        readonly ">": 1;
        readonly "=": 1;
        readonly "|": 1;
        readonly "&": 1;
        readonly ")": 1;
        readonly "[": 1;
        readonly "%": 1;
        readonly ",": 1;
        readonly ":": 1;
        readonly "?": 1;
        readonly "#": 1;
    };
    static finalizingLookaheads: {
        readonly ">": 1;
        readonly ",": 1;
        readonly "": 1;
        readonly "=": 1;
        readonly "?": 1;
    };
    static lookaheadIsFinalizing: (lookahead: string, unscanned: string) => lookahead is ">" | "," | "=" | "?";
}
declare namespace ArkTypeScanner {
    type lookaheadIsFinalizing<lookahead extends string, unscanned extends string> = lookahead extends ">" ? unscanned extends `=${infer nextUnscanned}` ? nextUnscanned extends `=${string}` ? true : false : ArkTypeScanner.skipWhitespace<unscanned> extends ("" | `${TerminatingChar}${string}`) ? true : false : lookahead extends "=" ? unscanned extends `=${string}` ? false : true : lookahead extends "," | "?" ? true : false;
    type TerminatingChar = keyof typeof ArkTypeScanner.terminatingChars;
    type FinalizingLookahead = keyof typeof ArkTypeScanner.finalizingLookaheads;
    type InfixToken = Comparator | "|" | "&" | "%" | ":" | "=>" | "|>" | "#" | "@" | "=";
    type PostfixToken = "[]" | "?";
    type OperatorToken = InfixToken | PostfixToken;
    type shift<lookahead extends string, unscanned extends string> = `${lookahead}${unscanned}`;
    type shiftUntil<unscanned extends string, terminator extends string, scanned extends string = ""> = unscanned extends shift<infer lookahead, infer nextUnscanned> ? lookahead extends terminator ? scanned extends `${infer base}${EscapeChar}` ? shiftUntil<nextUnscanned, terminator, `${base}${lookahead}`> : [scanned, unscanned] : shiftUntil<nextUnscanned, terminator, `${scanned}${lookahead}`> : [scanned, ""];
    type shiftUntilNot<unscanned extends string, nonTerminator extends string, scanned extends string = ""> = unscanned extends shift<infer lookahead, infer nextUnscanned> ? lookahead extends nonTerminator ? shiftUntilNot<nextUnscanned, nonTerminator, `${scanned}${lookahead}`> : [scanned, unscanned] : [scanned, ""];
    type shiftUntilNextTerminator<unscanned extends string> = shiftUntil<unscanned, TerminatingChar>;
    type skipWhitespace<unscanned extends string> = shiftUntilNot<unscanned, WhitespaceChar>[1];
    type shiftResult<scanned extends string, unscanned extends string> = [
        scanned,
        unscanned
    ];
}

type BranchState$1 = {
    prefixes: StringifiablePrefixOperator[];
    leftBound: OpenLeftBound | null;
    intersection: BaseRoot | null;
    union: BaseRoot | null;
    pipe: BaseRoot | null;
};
type DynamicStateWithRoot = requireKeys<DynamicState, "root">;
declare class DynamicState {
    root: BaseRoot | undefined;
    branches: BranchState$1;
    finalizer: ArkTypeScanner.FinalizingLookahead | undefined;
    groups: BranchState$1[];
    scanner: ArkTypeScanner;
    ctx: BaseParseContext;
    constructor(scanner: ArkTypeScanner, ctx: BaseParseContext);
    error(message: string): never;
    hasRoot(): this is DynamicStateWithRoot;
    setRoot(root: BaseRoot): void;
    unsetRoot(): this["root"];
    constrainRoot(...args: Parameters<BaseRoot<any>["constrain"]>): void;
    finalize(finalizer: ArkTypeScanner.FinalizingLookahead): void;
    reduceLeftBound(limit: LimitLiteral, comparator: Comparator): void;
    finalizeBranches(): void;
    finalizeGroup(): void;
    addPrefix(prefix: StringifiablePrefixOperator): void;
    applyPrefixes(): void;
    pushRootToBranch(token: BranchOperator): void;
    parseUntilFinalizer(): DynamicStateWithRoot;
    parseOperator(this: DynamicStateWithRoot): void;
    parseOperand(): void;
    private assertRangeUnset;
    reduceGroupOpen(): void;
    previousOperator(): MinComparator | StringifiablePrefixOperator | ArkTypeScanner.InfixToken | undefined;
    shiftedByOne(): this;
}

type StaticState = {
    root: unknown;
    branches: BranchState;
    groups: BranchState[];
    finalizer: ArkTypeScanner.FinalizingLookahead | ErrorMessage | undefined;
    scanned: string;
    unscanned: string;
};
type BranchState = {
    prefixes: StringifiablePrefixOperator[];
    leftBound: OpenLeftBound | undefined;
    intersection: unknown;
    pipe: unknown;
    union: unknown;
};
declare namespace state {
    type initialize<def extends string> = from<{
        root: undefined;
        branches: initialBranches;
        groups: [];
        finalizer: undefined;
        scanned: "";
        unscanned: def;
    }>;
    type error<message extends string> = from<{
        root: ErrorMessage<message>;
        branches: initialBranches;
        groups: [];
        finalizer: ErrorMessage<message>;
        scanned: "";
        unscanned: "";
    }>;
    type completion<text extends string> = from<{
        root: Completion<text>;
        branches: initialBranches;
        groups: [];
        finalizer: Completion<text>;
        scanned: "";
        unscanned: "";
    }>;
    type initialBranches = branchesFrom<{
        prefixes: [];
        leftBound: undefined;
        intersection: undefined;
        pipe: undefined;
        union: undefined;
    }>;
    type updateScanned<previousScanned extends string, previousUnscanned extends string, updatedUnscanned extends string> = previousUnscanned extends `${infer justScanned}${updatedUnscanned}` ? `${previousScanned}${justScanned}` : previousScanned;
    type setRoot<s extends StaticState, root, unscanned extends string = s["unscanned"]> = from<{
        root: root;
        branches: s["branches"];
        groups: s["groups"];
        finalizer: s["finalizer"];
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>;
        unscanned: unscanned;
    }>;
    type addPrefix<s extends StaticState, prefix extends StringifiablePrefixOperator, unscanned extends string = s["unscanned"]> = from<{
        root: s["root"];
        branches: {
            prefixes: [...s["branches"]["prefixes"], prefix];
            leftBound: s["branches"]["leftBound"];
            intersection: s["branches"]["intersection"];
            pipe: s["branches"]["pipe"];
            union: s["branches"]["union"];
        };
        groups: s["groups"];
        finalizer: s["finalizer"];
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>;
        unscanned: unscanned;
    }>;
    type reduceBranch<s extends StaticState, token extends BranchOperator, unscanned extends string> = s["branches"]["leftBound"] extends {} ? openRangeError<s["branches"]["leftBound"]> : from<{
        root: undefined;
        branches: {
            prefixes: [];
            leftBound: undefined;
            intersection: token extends "&" ? mergeToIntersection<s> : undefined;
            union: token extends "|" ? mergeToUnion<s> : token extends "|>" ? undefined : s["branches"]["union"];
            pipe: token extends "|>" ? mergeToPipe<s> : s["branches"]["pipe"];
        };
        groups: s["groups"];
        finalizer: s["finalizer"];
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>;
        unscanned: unscanned;
    }>;
    type reduceLeftBound<s extends StaticState, limit extends LimitLiteral, comparator extends Comparator, unscanned extends string> = comparator extends "<" | "<=" ? s["branches"]["leftBound"] extends {} ? state.error<writeMultipleLeftBoundsMessage<s["branches"]["leftBound"]["limit"], s["branches"]["leftBound"]["comparator"], limit, InvertedComparators[comparator]>> : from<{
        root: undefined;
        branches: {
            prefixes: s["branches"]["prefixes"];
            leftBound: {
                limit: limit;
                comparator: InvertedComparators[comparator];
            };
            intersection: s["branches"]["intersection"];
            pipe: s["branches"]["pipe"];
            union: s["branches"]["union"];
        };
        groups: s["groups"];
        finalizer: s["finalizer"];
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>;
        unscanned: unscanned;
    }> : state.error<writeUnpairableComparatorMessage<comparator>>;
    type reduceRange<s extends StaticState, minLimit extends LimitLiteral, minComparator extends MinComparator, maxComparator extends MaxComparator, maxLimit extends LimitLiteral, unscanned extends string> = state.from<{
        root: [minLimit, minComparator, [s["root"], maxComparator, maxLimit]];
        branches: {
            prefixes: s["branches"]["prefixes"];
            leftBound: undefined;
            intersection: s["branches"]["intersection"];
            pipe: s["branches"]["pipe"];
            union: s["branches"]["union"];
        };
        groups: s["groups"];
        finalizer: s["finalizer"];
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>;
        unscanned: unscanned;
    }>;
    type reduceSingleBound<s extends StaticState, comparator extends Comparator, limit extends number | string, unscanned extends string> = state.from<{
        root: [s["root"], comparator, limit];
        branches: {
            prefixes: s["branches"]["prefixes"];
            leftBound: undefined;
            intersection: s["branches"]["intersection"];
            pipe: s["branches"]["pipe"];
            union: s["branches"]["union"];
        };
        groups: s["groups"];
        finalizer: s["finalizer"];
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>;
        unscanned: unscanned;
    }>;
    type mergeToIntersection<s extends StaticState> = s["branches"]["intersection"] extends undefined ? mergePrefixes<s> : [s["branches"]["intersection"], "&", mergePrefixes<s>];
    type mergeToUnion<s extends StaticState> = s["branches"]["union"] extends undefined ? mergeToIntersection<s> : [s["branches"]["union"], "|", mergeToIntersection<s>];
    type mergeToPipe<s extends StaticState> = s["branches"]["pipe"] extends undefined ? mergeToUnion<s> : [s["branches"]["pipe"], "|>", mergeToUnion<s>];
    type mergePrefixes<s extends StaticState, remaining extends unknown[] = s["branches"]["prefixes"]> = remaining extends [infer head, ...infer tail] ? [
        head,
        mergePrefixes<s, tail>
    ] : s["root"];
    type popGroup<stack extends BranchState[], top extends BranchState> = [
        ...stack,
        top
    ];
    type finalizeGroup<s extends StaticState, unscanned extends string> = s["branches"]["leftBound"] extends {} ? openRangeError<s["branches"]["leftBound"]> : s["groups"] extends popGroup<infer stack, infer top> ? from<{
        groups: stack;
        branches: top;
        root: mergeToPipe<s>;
        finalizer: s["finalizer"];
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>;
        unscanned: unscanned;
    }> : state.error<writeUnmatchedGroupCloseMessage<unscanned>>;
    type reduceGroupOpen<s extends StaticState, unscanned extends string> = from<{
        groups: [...s["groups"], s["branches"]];
        branches: initialBranches;
        root: undefined;
        finalizer: s["finalizer"];
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>;
        unscanned: unscanned;
    }>;
    type finalize<s extends StaticState, finalizer extends ArkTypeScanner.FinalizingLookahead> = s["groups"] extends [] ? s["branches"]["leftBound"] extends {} ? openRangeError<s["branches"]["leftBound"]> : from<{
        root: mergeToPipe<s>;
        groups: s["groups"];
        branches: initialBranches;
        finalizer: finalizer;
        scanned: s["scanned"];
        unscanned: s["unscanned"];
    }> : state.error<writeUnclosedGroupMessage<")">>;
    type openRangeError<range extends defined<BranchState["leftBound"]>> = state.error<writeOpenRangeMessage<range["limit"], range["comparator"]>>;
    type previousOperator<s extends StaticState> = s["branches"]["leftBound"] extends {} ? s["branches"]["leftBound"]["comparator"] : s["branches"]["prefixes"] extends ([
        ...unknown[],
        infer tail extends string
    ]) ? tail : s["branches"]["intersection"] extends {} ? "&" : s["branches"]["union"] extends {} ? "|" : undefined;
    type scanTo<s extends StaticState, unscanned extends string> = from<{
        root: s["root"];
        branches: s["branches"];
        groups: s["groups"];
        finalizer: s["finalizer"];
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>;
        unscanned: unscanned;
    }>;
    type from<s extends StaticState> = s;
    type branchesFrom<b extends BranchState> = b;
}

type StringLiteral<Text extends string = string> = DoubleQuotedStringLiteral<Text> | SingleQuotedStringLiteral<Text>;
type DoubleQuotedStringLiteral<Text extends string = string> = `"${Text}"`;
type SingleQuotedStringLiteral<Text extends string = string> = `'${Text}'`;
declare const parseEnclosed: (s: DynamicState, enclosing: EnclosingStartToken) => void;
type parseEnclosed<s extends StaticState, enclosingStart extends EnclosingStartToken, unscanned extends string> = ArkTypeScanner.shiftUntil<unscanned, EnclosingTokens[enclosingStart]> extends ArkTypeScanner.shiftResult<infer scanned, infer nextUnscanned> ? nextUnscanned extends "" ? state.error<writeUnterminatedEnclosedMessage<scanned, enclosingStart>> : state.setRoot<s, InferredAst<enclosingStart extends EnclosingQuote ? scanned : enclosingStart extends "/" ? string : Date, `${enclosingStart}${scanned}${EnclosingTokens[enclosingStart]}`>, nextUnscanned extends ArkTypeScanner.shift<string, infer unscanned> ? unscanned : ""> : never;
declare const enclosingQuote: {
    readonly "'": 1;
    readonly '"': 1;
};
type EnclosingQuote = keyof typeof enclosingQuote;
declare const enclosingTokens: {
    readonly "d'": "'";
    readonly 'd"': "\"";
    readonly "'": "'";
    readonly '"': "\"";
    readonly "/": "/";
};
type EnclosingTokens = typeof enclosingTokens;
type EnclosingStartToken = keyof EnclosingTokens;
declare const enclosingCharDescriptions: {
    readonly '"': "double-quote";
    readonly "'": "single-quote";
    readonly "/": "forward slash";
};
type enclosingCharDescriptions = typeof enclosingCharDescriptions;
declare const writeUnterminatedEnclosedMessage: <fragment extends string, enclosingStart extends EnclosingStartToken>(fragment: fragment, enclosingStart: enclosingStart) => writeUnterminatedEnclosedMessage<fragment, enclosingStart>;
type writeUnterminatedEnclosedMessage<fragment extends string, enclosingStart extends EnclosingStartToken> = `${enclosingStart}${fragment} requires a closing ${enclosingCharDescriptions[EnclosingTokens[enclosingStart]]}`;

type astToString<ast> = ast extends InferredAst | DefAst ? ast[2] : ast extends PostfixExpression<infer operator, infer operand> ? operator extends "[]" ? `${astToString<operand>}[]` : never : ast extends InfixExpression<infer operator, infer l, infer r> ? operator extends "&" | "|" | "%" | Comparator ? `${astToString<l>} ${operator} ${astToString<r>}` : never : ast extends Stringifiable ? `${ast extends bigint ? `${ast}n` : ast}` : "...";
type writeConstrainedMorphMessage<constrainedAst> = `To constrain the output of ${astToString<constrainedAst>}, pipe like myMorph.to('number > 0').
To constrain the input, intersect like myMorph.and('number > 0').`;

type GenericInstantiationAst<generic extends GenericAst = GenericAst, argAsts extends unknown[] = unknown[]> = [generic, "<>", argAsts];
type inferGenericInstantiation<g extends GenericAst, argAsts extends unknown[], $, args> = g["bodyDef"] extends Hkt ? Hkt.apply<g["bodyDef"], {
    [i in keyof argAsts]: inferExpression<argAsts[i], $, args>;
}> : inferDefinition<g["bodyDef"], resolveScope<g["$"], $>, {
    [i in keyof g["names"] & `${number}` as g["names"][i]]: inferExpression<argAsts[i & keyof argAsts], resolveScope<g["arg$"], $>, args>;
}>;
type validateGenericInstantiation<g extends GenericAst, argAsts extends unknown[], $, args> = validateGenericArgs<g["paramsAst"], argAsts, $, args, []>;
type validateGenericArgs<params extends array<GenericParamAst>, argAsts extends array, $, args, indices extends 1[]> = argAsts extends readonly [infer arg, ...infer argsTail] ? validateAst<arg, $, args> extends infer e extends ErrorMessage ? e : inferAstRoot<arg, $, args> extends params[indices["length"]][1] ? validateGenericArgs<params, argsTail, $, args, [...indices, 1]> : ErrorMessage<writeUnsatisfiedParameterConstraintMessage<params[indices["length"]][0], typeToString<params[indices["length"]][1]>, astToString<arg>>> : undefined;
type resolveScope<g$, $> = g$ extends UnparsedScope ? $ : g$;

declare const parseUnenclosed: (s: DynamicState) => void;
type parseUnenclosed<s extends StaticState, $, args> = ArkTypeScanner.shiftUntilNextTerminator<s["unscanned"]> extends (ArkTypeScanner.shiftResult<infer token, infer unscanned>) ? tryResolve<s, unscanned, token, $, args> extends state.from<infer s> ? s : never : never;
type parseResolution<s extends StaticState, unscanned extends string, alias extends string, resolution, $, args> = resolutionToAst<alias, resolution> extends infer ast ? ast extends GenericAst ? parseGenericInstantiation<alias, ast, state.scanTo<s, unscanned>, $, args> : state.setRoot<s, ast, unscanned> : never;
declare const parseGenericInstantiation: (name: string, g: GenericRoot, s: DynamicState) => BaseRoot;
type parseGenericInstantiation<name extends string, g extends GenericAst, s extends StaticState, $, args> = ArkTypeScanner.skipWhitespace<s["unscanned"]> extends `<${infer unscanned}` ? parseGenericArgs<name, g, unscanned, $, args> extends infer result ? result extends ParsedArgs<infer argAsts, infer nextUnscanned> ? state.setRoot<s, GenericInstantiationAst<g, argAsts>, nextUnscanned> : result : never : state.error<writeInvalidGenericArgCountMessage<name, genericParamNames<g["paramsAst"]>, [
]>>;
type tryResolve<s extends StaticState, unscanned extends string, token extends string, $, args> = token extends keyof args ? parseResolution<s, unscanned, token, args[token], $, args> : token extends keyof $ ? parseResolution<s, unscanned, token, $[token], $, args> : `#${token}` extends keyof $ ? parseResolution<s, unscanned, token, $[`#${token}`], $, args> : token extends keyof ArkAmbient.$ ? parseResolution<s, unscanned, token, ArkAmbient.$[token], $, args> : token extends NumberLiteral<infer n> ? state.setRoot<s, InferredAst<n, token>, unscanned> : token extends (`${infer submodule extends keyof $ & string}.${infer reference}`) ? tryResolveSubmodule<token, $[submodule], reference, s, unscanned, $, args, [
    submodule
]> : token extends (`${infer submodule extends keyof ArkAmbient.$ & string}.${infer reference}`) ? tryResolveSubmodule<token, ArkAmbient.$[submodule], reference, s, unscanned, $, args, [
    submodule
]> : token extends BigintLiteral<infer b> ? state.setRoot<s, InferredAst<b, token>, unscanned> : token extends "keyof" ? state.addPrefix<s, "keyof", unscanned> : unresolvableState<s, token, $, args, []>;
type tryResolveSubmodule<token extends string, resolution, reference extends string, s extends StaticState, unscanned extends string, $, args, submodulePath extends string[]> = resolution extends {
    [arkKind]: "module";
} ? reference extends keyof resolution ? parseResolution<s, unscanned, token, resolution[reference], $, args> : reference extends (`${infer nestedSubmodule extends keyof resolution & string}.${infer nestedReference}`) ? tryResolveSubmodule<token, resolution[nestedSubmodule], nestedReference, s, unscanned, $, args, [
    ...submodulePath,
    nestedSubmodule
]> : unresolvableState<s, reference, resolution, {}, submodulePath> : state.error<writeNonSubmoduleDotMessage<lastOf<submodulePath>>>;
/** Provide valid completions for the current token, or fallback to an
 * unresolvable error if there are none */
type unresolvableState<s extends StaticState, token extends string, resolutions, args, submodulePath extends string[]> = [
    token,
    s["unscanned"]
] extends ([
    "",
    ArkTypeScanner.shift<"#", infer unscanned>
]) ? ArkTypeScanner.shiftUntilNextTerminator<unscanned> extends (ArkTypeScanner.shiftResult<infer name, string>) ? state.error<writePrefixedPrivateReferenceMessage<name>> : never : validReferenceFromToken<token, resolutions, args, submodulePath> extends (never) ? state.error<writeUnresolvableMessage<qualifiedReference<token, submodulePath>>> : state.completion<`${s["scanned"]}${qualifiedReference<validReferenceFromToken<token, resolutions, args, submodulePath>, submodulePath>}`>;
type qualifiedReference<reference extends string, submodulePath extends string[]> = join<[...submodulePath, reference], ".">;
type validReferenceFromToken<token extends string, $, args, submodulePath extends string[]> = Extract<submodulePath["length"] extends 0 ? BaseCompletions<$, args> : resolvableReferenceIn<$>, `${token}${string}`>;
type writeMissingRightOperandMessage<token extends string, unscanned extends string = ""> = `Token '${token}' requires a right operand${unscanned extends "" ? "" : ` before '${unscanned}'`}`;
declare const writeMissingRightOperandMessage: <token extends string, unscanned extends string>(token: token, unscanned?: unscanned) => writeMissingRightOperandMessage<token, unscanned>;

declare const parseOperand: (s: DynamicState) => void;
type parseOperand<s extends StaticState, $, args> = s["unscanned"] extends (ArkTypeScanner.shift<infer lookahead, infer unscanned>) ? lookahead extends "(" ? state.reduceGroupOpen<s, unscanned> : lookahead extends EnclosingStartToken ? parseEnclosed<s, lookahead, unscanned> : lookahead extends WhitespaceChar ? parseOperand<state.scanTo<s, unscanned>, $, args> : lookahead extends "d" ? unscanned extends (ArkTypeScanner.shift<infer enclosing extends EnclosingQuote, infer nextUnscanned>) ? parseEnclosed<s, `d${enclosing}`, nextUnscanned> : parseUnenclosed<s, $, args> : parseUnenclosed<s, $, args> : state.completion<`${s["scanned"]}${BaseCompletions<$, args>}`>;

type UnitLiteralKeyword = "null" | "undefined" | "true" | "false";
type UnitLiteral = StringLiteral | BigintLiteral | NumberLiteral | DateLiteral | UnitLiteralKeyword;
type ParsedDefaultableProperty = readonly [BaseRoot, "=", unknown];
declare const parseDefault: (s: DynamicStateWithRoot) => ParsedDefaultableProperty;
type parseDefault<root, unscanned extends string> = trim$1<unscanned> extends infer defaultValue extends UnitLiteral ? [
    root,
    "=",
    defaultValue
] : ErrorMessage<writeNonLiteralDefaultMessage<trim$1<unscanned>>>;
declare const writeNonLiteralDefaultMessage: <defaultDef extends string>(defaultDef: defaultDef) => writeNonLiteralDefaultMessage<defaultDef>;
type writeNonLiteralDefaultMessage<defaultDef extends string> = `Default value '${defaultDef}' must a literal value`;

declare const parseBound: (s: DynamicStateWithRoot, start: ComparatorStartChar) => void;
type parseBound<s extends StaticState, start extends ComparatorStartChar, unscanned extends string, $, args> = shiftComparator<start, unscanned> extends infer shiftResultOrError ? shiftResultOrError extends (ArkTypeScanner.shiftResult<infer comparator extends Comparator, infer nextUnscanned>) ? s["root"] extends (InferredAst<Date | number, `${infer limit extends number | DateLiteral}`>) ? state.reduceLeftBound<s, limit, comparator, nextUnscanned> : parseRightBound<state.scanTo<s, nextUnscanned>, comparator, $, args> : shiftResultOrError : never;
type OneCharComparator = ">" | "<";
type ComparatorStartChar = Comparator extends `${infer char}${string}` ? char : never;
declare const shiftComparator: (s: DynamicState, start: ComparatorStartChar) => Comparator;
type shiftComparator<start extends ComparatorStartChar, unscanned extends string> = unscanned extends `=${infer nextUnscanned}` ? [`${start}=`, nextUnscanned] : [start & OneCharComparator, unscanned];
declare const parseRightBound: (s: DynamicStateWithRoot, comparator: Comparator) => void;
type parseRightBound<s extends StaticState, comparator extends Comparator, $, args> = parseOperand<s, $, args> extends infer nextState extends StaticState ? nextState["root"] extends (InferredAst<unknown, `${infer limit extends number | DateLiteral}`>) ? s["branches"]["leftBound"] extends {} ? comparator extends MaxComparator ? state.reduceRange<s, s["branches"]["leftBound"]["limit"], s["branches"]["leftBound"]["comparator"], comparator, limit, nextState["unscanned"]> : state.error<writeUnpairableComparatorMessage<comparator>> : state.reduceSingleBound<s, comparator, limit, nextState["unscanned"]> : state.error<writeInvalidLimitMessage<comparator, astToString<nextState["root"]>, "right">> : never;
declare const writeInvalidLimitMessage: <comparator extends Comparator, limit extends string | number, boundKind extends BoundExpressionKind>(comparator: comparator, limit: limit, boundKind: boundKind) => writeInvalidLimitMessage<comparator, limit, boundKind>;
type writeInvalidLimitMessage<comparator extends Comparator, limit extends string | number, boundKind extends BoundExpressionKind> = `Comparator ${boundKind extends "left" ? InvertedComparators[comparator] : comparator} must be ${boundKind extends "left" ? "preceded" : "followed"} by a corresponding literal (was ${limit})`;
type BoundExpressionKind = "left" | "right";

declare const parseBrand: (s: DynamicStateWithRoot) => void;
type parseBrand<s extends StaticState, unscanned extends string> = ArkTypeScanner.shiftUntilNextTerminator<ArkTypeScanner.skipWhitespace<unscanned>> extends (ArkTypeScanner.shiftResult<`${infer brandName}`, infer nextUnscanned>) ? brandName extends "" ? state.error<emptyBrandNameMessage> : state.setRoot<s, [s["root"], "#", brandName], nextUnscanned> : never;

declare const parseDivisor: (s: DynamicStateWithRoot) => void;
type parseDivisor<s extends StaticState, unscanned extends string> = ArkTypeScanner.shiftUntilNextTerminator<ArkTypeScanner.skipWhitespace<unscanned>> extends ArkTypeScanner.shiftResult<infer scanned, infer nextUnscanned> ? scanned extends `${infer divisor extends number}` ? divisor extends 0 ? state.error<writeInvalidDivisorMessage<0>> : state.setRoot<s, [s["root"], "%", divisor], nextUnscanned> : state.error<writeInvalidDivisorMessage<scanned>> : never;
declare const writeInvalidDivisorMessage: <divisor extends string | number>(divisor: divisor) => writeInvalidDivisorMessage<divisor>;
type writeInvalidDivisorMessage<divisor extends string | number> = `% operator must be followed by a non-zero integer literal (was ${divisor})`;

declare const parseOperator: (s: DynamicStateWithRoot) => void;
type parseOperator<s extends StaticState, $, args> = s["unscanned"] extends (ArkTypeScanner.shift<infer lookahead, infer unscanned>) ? lookahead extends "[" ? unscanned extends ArkTypeScanner.shift<"]", infer nextUnscanned> ? state.setRoot<s, [s["root"], "[]"], nextUnscanned> : state.error<incompleteArrayTokenMessage> : lookahead extends "|" ? unscanned extends ArkTypeScanner.shift<">", infer nextUnscanned> ? state.reduceBranch<s, "|>", nextUnscanned> : state.reduceBranch<s, lookahead, unscanned> : lookahead extends "&" ? state.reduceBranch<s, lookahead, unscanned> : lookahead extends ")" ? state.finalizeGroup<s, unscanned> : ArkTypeScanner.lookaheadIsFinalizing<lookahead, unscanned> extends true ? state.finalize<state.scanTo<s, unscanned>, lookahead & ArkTypeScanner.FinalizingLookahead> : lookahead extends ComparatorStartChar ? parseBound<s, lookahead, unscanned, $, args> : lookahead extends "%" ? parseDivisor<s, unscanned> : lookahead extends "#" ? parseBrand<s, unscanned> : lookahead extends WhitespaceChar ? parseOperator<state.scanTo<s, unscanned>, $, args> : state.error<writeUnexpectedCharacterMessage<lookahead>> : state.finalize<s, "">;
declare const writeUnexpectedCharacterMessage: <char extends string, shouldBe extends string>(char: char, shouldBe?: shouldBe) => writeUnexpectedCharacterMessage<char, shouldBe>;
type writeUnexpectedCharacterMessage<char extends string, shouldBe extends string = ""> = `'${char}' is not allowed here${shouldBe extends "" ? "" : ` (should be ${shouldBe})`}`;
declare const incompleteArrayTokenMessage = "Missing expected ']'";
type incompleteArrayTokenMessage = typeof incompleteArrayTokenMessage;

declare const parseString: (def: string, ctx: BaseParseContext) => InnerParseResult;
/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions.
 */
type parseString<def extends string, $, args> = def extends keyof $ ? resolutionToAst<def, $[def]> : def extends `${infer child}[]` ? child extends keyof $ ? [
    resolutionToAst<child, $[child]>,
    "[]"
] : fullStringParse<state.initialize<def>, $, args> : fullStringParse<state.initialize<def>, $, args>;
type inferString<def extends string, $, args> = inferAstRoot<parseString<def, $, args>, $, args>;
type BaseCompletions<$, args, otherSuggestions extends string = never> = resolvableReferenceIn<$> | resolvableReferenceIn<ArkAmbient.$> | (keyof args & string) | StringifiablePrefixOperator | otherSuggestions;
declare const fullStringParse: (s: DynamicState) => InnerParseResult;
type fullStringParse<s extends StaticState, $, args> = extractFinalizedResult<parseUntilFinalizer<s, $, args>>;
declare const parseUntilFinalizer: (s: DynamicState) => DynamicStateWithRoot;
type parseUntilFinalizer<s extends StaticState, $, args> = s["finalizer"] extends undefined ? parseUntilFinalizer<next<s, $, args>, $, args> : s;
declare const next: (s: DynamicState) => void;
type next<s extends StaticState, $, args> = s["root"] extends undefined ? parseOperand<s, $, args> : parseOperator<s, $, args>;
type extractFinalizedResult<s extends StaticState> = s["finalizer"] extends "" ? s["root"] : s["finalizer"] extends ErrorMessage ? s["finalizer"] : s["finalizer"] extends "?" ? [s["root"], "?"] : s["finalizer"] extends "=" ? parseDefault<s["root"], s["unscanned"]> : ErrorMessage<writeUnexpectedCharacterMessage<s["finalizer"] & string>>;

declare const parseGenericArgs: (name: string, g: GenericRoot, s: DynamicState) => BaseRoot[];
type parseGenericArgs<name extends string, g extends GenericAst, unscanned extends string, $, args> = _parseGenericArgs<name, g, unscanned, $, args, [], []>;
type ParsedArgs<result extends unknown[] = unknown[], unscanned extends string = string> = {
    result: result;
    unscanned: unscanned;
};
declare const _parseGenericArgs: (name: string, g: GenericRoot, s: DynamicState, argNodes: BaseRoot[]) => BaseRoot[];
type _parseGenericArgs<name extends string, g extends GenericAst, unscanned extends string, $, args, argDefs extends string[], argAsts extends unknown[]> = parseUntilFinalizer<state.initialize<unscanned>, $, args> extends (infer finalArgState extends StaticState) ? {
    defs: [
        ...argDefs,
        finalArgState["scanned"] extends `${infer def}${"," | ">"}` ? def : finalArgState["scanned"]
    ];
    asts: [...argAsts, finalArgState["root"]];
    unscanned: finalArgState["unscanned"];
} extends ({
    defs: infer nextDefs extends string[];
    asts: infer nextAsts extends unknown[];
    unscanned: infer nextUnscanned extends string;
}) ? finalArgState["finalizer"] extends ">" ? nextAsts["length"] extends g["paramsAst"]["length"] ? ParsedArgs<nextAsts, nextUnscanned> : state.error<writeInvalidGenericArgCountMessage<name, genericParamNames<g["paramsAst"]>, nextDefs>> : finalArgState["finalizer"] extends "," ? _parseGenericArgs<name, g, nextUnscanned, $, args, nextDefs, nextAsts> : finalArgState["finalizer"] extends ErrorMessage ? finalArgState : state.error<writeUnclosedGroupMessage<">">> : never : never;
declare const writeInvalidGenericArgCountMessage: <name extends string, params extends array<string>, argDefs extends array<string>>(name: name, params: params, argDefs: argDefs) => writeInvalidGenericArgCountMessage<name, params, argDefs>;
type writeInvalidGenericArgCountMessage<name extends string, params extends array<string>, argDefs extends array<string>> = `${name}<${join<params, ", ">}> requires exactly ${params["length"]} args (got ${argDefs["length"]}${argDefs["length"] extends (0) ? "" : `: ${join<argDefs, ",">}`})`;

type validateRange<l, comparator extends Comparator, r, $, args> = [
    l
] extends [LimitLiteral] ? validateBound<r, comparator, l, "left", $, args> : [l] extends [[infer leftAst, Comparator, unknown]] ? ErrorMessage<writeDoubleRightBoundMessage<astToString<leftAst>>> : validateBound<l, comparator, r & LimitLiteral, "right", $, args>;
type validateBound<boundedAst, comparator extends Comparator, limit extends LimitLiteral, boundKind extends BoundExpressionKind, $, args> = inferAstRoot<boundedAst, $, args> extends infer bounded ? isNumericallyBoundable<bounded> extends true ? limit extends number ? validateAst<boundedAst, $, args> : ErrorMessage<writeInvalidLimitMessage<comparator, limit, boundKind>> : [bounded] extends [Date] ? validateAst<boundedAst, $, args> : [bounded] extends [InferredMorph] ? ErrorMessage<writeConstrainedMorphMessage<boundedAst>> : ErrorMessage<writeUnboundableMessage<typeToString<bounded>>> : never;
type isNumericallyBoundable<bounded> = [
    bounded
] extends [number] ? true : [bounded] extends [string] ? true : [bounded] extends [array] ? true : false;
declare const writeDoubleRightBoundMessage: <root extends string>(root: root) => writeDoubleRightBoundMessage<root>;
type writeDoubleRightBoundMessage<root extends string> = `Expression ${root} must have at most one right bound`;

type validateDefault<baseAst, unitLiteral extends UnitLiteral, $, args> = validateAst<baseAst, $, args> extends infer e extends ErrorMessage ? e : type.infer<unitLiteral> extends inferAstIn<baseAst, $, args> ? undefined : ErrorMessage<writeUnassignableDefaultValueMessage<astToString<baseAst>, unitLiteral>>;

type validateDivisor<l, $, args> = inferAstRoot<l, $, args> extends infer data ? [
    data
] extends [number] ? validateAst<l, $, args> : [data] extends [InferredMorph] ? ErrorMessage<writeConstrainedMorphMessage<l>> : ErrorMessage<writeIndivisibleMessage<data>> : never;

type validateKeyof<operandAst, $, args> = inferAstRoot<operandAst, $, args> extends infer data ? [
    data
] extends [object] ? validateAst<operandAst, $, args> : ErrorMessage<writeNonStructuralOperandMessage<"keyof", typeToString<data>>> : never;

type validateAst<ast, $, args> = ast extends ErrorMessage ? ast : ast extends InferredAst ? validateInferredAst<ast[0], ast[2]> : ast extends DefAst ? ast[2] extends PrivateDeclaration<infer name> ? ErrorMessage<writePrefixedPrivateReferenceMessage<name>> : undefined : ast extends PostfixExpression<"[]" | "?", infer operand> ? validateAst<operand, $, args> : ast extends InfixExpression<infer operator, infer l, infer r> ? operator extends BranchOperator ? validateInfix<ast, $, args> : operator extends Comparator ? validateRange<l, operator, r, $, args> : operator extends "%" ? validateDivisor<l, $, args> : operator extends "=" ? validateDefault<l, r & UnitLiteral, $, args> : operator extends "#" ? validateAst<l, $, args> : ErrorMessage<writeUnexpectedExpressionMessage<astToString<ast>>> : ast extends ["keyof", infer operand] ? validateKeyof<operand, $, args> : ast extends GenericInstantiationAst<infer g, infer argAsts> ? validateGenericInstantiation<g, argAsts, $, args> : ErrorMessage<writeUnexpectedExpressionMessage<astToString<ast>>> & {
    ast: ast;
};
type writeUnexpectedExpressionMessage<expression extends string> = `Failed to parse the expression resulting from ${expression}`;
declare const writePrefixedPrivateReferenceMessage: <name extends string>(name: name) => writePrefixedPrivateReferenceMessage<name>;
type writePrefixedPrivateReferenceMessage<name extends string> = `Private type references should not include '#'. Use '${name}' instead.`;
type validateInferredAst<inferred, def extends string> = def extends NumberLiteral ? number extends inferred ? ErrorMessage<writeMalformedNumericLiteralMessage<def, "number">> : undefined : def extends BigintLiteral ? bigint extends inferred ? ErrorMessage<writeMalformedNumericLiteralMessage<def, "bigint">> : undefined : [inferred] extends [anyOrNever] ? undefined : def extends PrivateDeclaration<infer name> ? ErrorMessage<writePrefixedPrivateReferenceMessage<name>> : inferred extends Generic ? ErrorMessage<writeInvalidGenericArgCountMessage<def, inferred["names"], []>> : inferred extends {
    [arkKind]: "module";
} ? "root" extends keyof inferred ? undefined : ErrorMessage<writeMissingSubmoduleAccessMessage<def>> : def extends ErrorMessage ? def : undefined;
type validateString<def extends string, $, args> = parseString<def, $, args> extends infer ast ? validateAst<ast, $, args> extends infer result extends ErrorMessage ? result extends Completion<infer text> ? text : result : def : never;
type validateInfix<ast extends InfixExpression, $, args> = validateAst<ast[0], $, args> extends infer e extends ErrorMessage ? e : validateAst<ast[2], $, args> extends infer e extends ErrorMessage ? e : undefined;
declare const shallowOptionalMessage = "Optional definitions like 'string?' are only valid as properties in an object or tuple";
type shallowOptionalMessage = typeof shallowOptionalMessage;
declare const shallowDefaultableMessage = "Defaultable definitions like 'number = 0' are only valid as properties in an object or tuple";
type shallowDefaultableMessage = typeof shallowDefaultableMessage;

type ParsedOptionalProperty = readonly [BaseRoot, "?"];
type validateProperty<def, keyKind extends ParsedKeyKind, $, args> = [
    def
] extends [anyOrNever] ? 
/** this extra [anyOrNever] check is required to ensure that nested `type` invocations
 * like the following are not prematurely validated by the outer call:
 *
 * ```ts
 * type({
 * 	"test?": type("string").pipe(x => x === "true")
 * })
 * ```
 */
def : keyKind extends "spread" ? def extends validateInnerDefinition<def, $, args> ? inferDefinition<def, $, args> extends object ? def : ErrorType<writeInvalidSpreadTypeMessage<typeToString<inferDefinition<def, $, args>>>> : validateInnerDefinition<def, $, args> : keyKind extends "undeclared" ? UndeclaredKeyBehavior : keyKind extends "required" ? validateInnerDefinition<def, $, args> : def extends OptionalPropertyDefinition ? ErrorMessage<invalidOptionalKeyKindMessage> : isDefaultable<def, $, args> extends true ? ErrorMessage<invalidDefaultableKeyKindMessage> : validateInnerDefinition<def, $, args>;
type isDefaultable<def, $, args> = def extends DefaultablePropertyTuple ? true : def extends PossibleDefaultableStringDefinition ? parseString<def, $, args> extends DefaultablePropertyTuple ? true : false : false;
type OptionalPropertyDefinition<baseDef = unknown> = OptionalPropertyTuple<baseDef> | OptionalPropertyString<baseDef & string>;
type OptionalPropertyString<baseDef extends string = string> = `${baseDef}?`;
type OptionalPropertyTuple<baseDef = unknown> = readonly [baseDef, "?"];
type PossibleDefaultableStringDefinition = `${string}=${string}`;
type DefaultablePropertyTuple<baseDef = unknown, thunkableProperty = unknown> = readonly [baseDef, "=", thunkableProperty];
declare const invalidOptionalKeyKindMessage = "Only required keys may make their values optional, e.g. { [mySymbol]: ['number', '?'] }";
type invalidOptionalKeyKindMessage = typeof invalidOptionalKeyKindMessage;
declare const invalidDefaultableKeyKindMessage = "Only required keys may specify default values, e.g. { value: 'number = 0' }";
type invalidDefaultableKeyKindMessage = typeof invalidDefaultableKeyKindMessage;

type inferObjectLiteral<def extends object, $, args> = show<"..." extends keyof def ? merge<inferDefinition<def["..."], $, args>, _inferObjectLiteral<def, $, args>> : _inferObjectLiteral<def, $, args>>;
/**
 * Infers the contents of an object literal, ignoring a spread definition
 */
type _inferObjectLiteral<def extends object, $, args> = {
    -readonly [k in keyof def as nonOptionalKeyFromEntry<k, def[k], $, args>]: inferDefinition<def[k], $, args>;
} & {
    -readonly [k in keyof def as optionalKeyFromEntry<k, def[k]>]?: def[k] extends OptionalPropertyDefinition<infer baseDef> ? inferDefinition<baseDef, $, args> : inferDefinition<def[k], $, args>;
};
type validateObjectLiteral<def, $, args> = {
    [k in keyof def]: preparseKey<k> extends (infer parsedKey extends PreparsedKey) ? parsedKey extends PreparsedEntryKey<"index"> ? validateString<parsedKey["normalized"], $, args> extends (ErrorMessage<infer message>) ? ErrorType<message> : inferDefinition<parsedKey["normalized"], $, args> extends Key ? validateProperty<def[k], parsedKey["kind"], $, args> : ErrorMessage<writeInvalidPropertyKeyMessage<parsedKey["normalized"]>> : validateProperty<def[k], parsedKey["kind"], $, args> : never;
};
type nonOptionalKeyFromEntry<k extends PropertyKey, v, $, args> = preparseKey<k> extends infer parsedKey ? parsedKey extends PreparsedEntryKey<"required"> ? [
    v
] extends [OptionalPropertyDefinition] ? [
    v
] extends [anyOrNever] ? parsedKey["normalized"] : never : parsedKey["normalized"] : parsedKey extends PreparsedEntryKey<"index"> ? inferDefinition<parsedKey["normalized"], $, args> & Key : never : never;
type optionalKeyFromEntry<k extends PropertyKey, v> = preparseKey<k> extends infer parsedKey ? parsedKey extends PreparsedEntryKey<"optional"> ? parsedKey["normalized"] : v extends OptionalPropertyDefinition ? k : never : never;
type normalizedKeyKind<kind extends EntryKeyKind> = kind extends "index" ? string : Key;
type PreparsedEntryKey<kind extends EntryKeyKind = EntryKeyKind, normalized extends normalizedKeyKind<kind> = normalizedKeyKind<kind>> = {
    kind: kind;
    normalized: normalized;
};
type PreparsedSpecialKey<kind extends SpecialKeyKind = SpecialKeyKind> = {
    kind: kind;
};
type PreparsedKey = PreparsedEntryKey | PreparsedSpecialKey;
declare namespace PreparsedKey {
    type from<t extends PreparsedKey> = t;
}
type ParsedKeyKind = EntryKeyKind | SpecialKeyKind;
type EntryKeyKind = "required" | "optional" | "index";
type SpecialKeyKind = "spread" | "undeclared";
type MetaKey = "..." | "+";
type IndexKey<def extends string = string> = `[${def}]`;
declare const preparseKey: (key: Key) => PreparsedKey;
type preparseKey<k> = k extends symbol ? PreparsedKey.from<{
    kind: "required";
    normalized: k;
}> : k extends `${infer inner}?` ? inner extends `${infer baseName}${EscapeChar}` ? PreparsedKey.from<{
    kind: "required";
    normalized: `${baseName}?`;
}> : PreparsedKey.from<{
    kind: "optional";
    normalized: inner;
}> : k extends "+" ? {
    kind: "undeclared";
} : k extends "..." ? {
    kind: "spread";
} : k extends `${EscapeChar}${infer escapedMeta extends MetaKey}` ? PreparsedKey.from<{
    kind: "required";
    normalized: escapedMeta;
}> : k extends IndexKey<infer def> ? PreparsedKey.from<{
    kind: "index";
    normalized: def;
}> : PreparsedKey.from<{
    kind: "required";
    normalized: k extends (`${EscapeChar}${infer escapedIndexKey extends IndexKey}`) ? escapedIndexKey : k extends Key ? k : `${k & number}`;
}>;
declare const writeInvalidSpreadTypeMessage: <def extends string>(def: def) => writeInvalidSpreadTypeMessage<def>;
type writeInvalidSpreadTypeMessage<def extends string> = `Spread operand must resolve to an object literal type (was ${def})`;

type maybeValidateTupleExpression<def extends array, $, args> = def extends IndexZeroExpression ? validatePrefixExpression<def, $, args> : def extends IndexOneExpression ? validateIndexOneExpression<def, $, args> : def extends (readonly ["", ...unknown[]] | readonly [unknown, "", ...unknown[]]) ? readonly [
    def[0] extends "" ? BaseCompletions<$, args, IndexZeroOperator | "..."> : def[0],
    def[1] extends "" ? BaseCompletions<$, args, IndexOneOperator | "..."> : def[1]
] : null;
type inferTupleExpression<def extends TupleExpression, $, args> = def[1] extends "[]" ? inferDefinition<def[0], $, args>[] : def[1] extends "?" ? inferDefinition<def[0], $, args> : def[1] extends "&" ? inferIntersection<inferDefinition<def[0], $, args>, inferDefinition<def[2], $, args>> : def[1] extends "|" ? inferDefinition<def[0], $, args> | inferDefinition<def[2], $, args> : def[1] extends ":" ? inferPredicate<inferDefinition<def[0], $, args>, def[2]> : def[1] extends "=>" ? parseMorph<def[0], def[2], $, args> : def[1] extends "|>" ? parseTo<def[0], def[2], $, args> : def[1] extends "=" ? withDefault<inferDefinition<def[0], $, args>, unwrapDefault<def[2]>> : def[1] extends "@" ? inferDefinition<def[0], $, args> : def extends readonly ["===", ...infer values] ? values[number] : def extends (readonly ["instanceof", ...infer constructors extends Constructor[]]) ? InstanceType<constructors[number]> : def[0] extends "keyof" ? inferKeyOfExpression<def[1], $, args> : never;
type validatePrefixExpression<def extends IndexZeroExpression, $, args> = def["length"] extends 1 ? readonly [writeMissingRightOperandMessage<def[0]>] : def[0] extends "keyof" ? readonly [def[0], validateDefinition<def[1], $, args>] : def[0] extends "===" ? readonly [def[0], ...unknown[]] : def[0] extends "instanceof" ? readonly [def[0], ...Constructor[]] : never;
type validateIndexOneExpression<def extends IndexOneExpression, $, args> = def[1] extends TuplePostfixOperator ? readonly [validateDefinition<def[0], $, args>, def[1]] : readonly [
    validateDefinition<def[0], $, args>,
    def["length"] extends 2 ? writeMissingRightOperandMessage<def[1]> : def[1],
    def[1] extends "|" ? validateDefinition<def[2], $, args> : def[1] extends "&" ? validateDefinition<def[2], $, args> : def[1] extends ":" ? Predicate<type.infer.Out<def[0], $, args>> : def[1] extends "=>" ? Morph<type.infer.Out<def[0], $, args>> : def[1] extends "|>" ? validateDefinition<def[2], $, args> : def[1] extends "=" ? defaultFor<type.infer.In<def[0], $, args>> : def[1] extends "@" ? TypeMetaInput : validateDefinition<def[2], $, args>
];
type inferKeyOfExpression<operandDef, $, args> = show<keyof inferDefinition<operandDef, $, args>>;
type TupleExpression = IndexZeroExpression | IndexOneExpression;
type ArgTwoOperator = Exclude<IndexOneOperator, "?" | "=">;
type parseTo<inDef, outDef, $, args> = inferPipe<inferDefinition<inDef, $, args>, inferDefinition<outDef, $, args>>;
type parseMorph<inDef, morph, $, args> = morph extends Morph ? inferMorphOut<morph> extends infer out ? (In: distill.In<inferDefinition<inDef, $, args>>) => Out<out> : never : never;
type IndexOneExpression<token extends string = IndexOneOperator> = readonly [unknown, token, ...unknown[]];
type IndexOneParser<token extends string> = (def: IndexOneExpression<token>, ctx: BaseParseContext) => BaseRoot;
declare const postfixParsers: {
    "?": IndexOneParser<"?">;
    "[]": IndexOneParser<"[]">;
};
type TuplePostfixOperator = keyof typeof postfixParsers;
declare const infixParsers: {
    "|": IndexOneParser<"|">;
    "=": IndexOneParser<"=">;
    "|>": IndexOneParser<"|>">;
    "&": IndexOneParser<"&">;
    "=>": IndexOneParser<"=>">;
    ":": IndexOneParser<":">;
    "@": IndexOneParser<"@">;
};
type TupleInfixOperator = keyof typeof infixParsers;
declare const indexOneParsers: {
    "|": IndexOneParser<"|">;
    "=": IndexOneParser<"=">;
    "|>": IndexOneParser<"|>">;
    "&": IndexOneParser<"&">;
    "=>": IndexOneParser<"=>">;
    ":": IndexOneParser<":">;
    "@": IndexOneParser<"@">;
    "?": IndexOneParser<"?">;
    "[]": IndexOneParser<"[]">;
};
type IndexOneOperator = keyof typeof indexOneParsers;
type IndexZeroParser<token extends string> = (def: IndexZeroExpression<token>, ctx: BaseParseContext) => BaseRoot;
type IndexZeroExpression<token extends string = IndexZeroOperator> = readonly [
    token,
    ...unknown[]
];
declare const indexZeroParsers: {
    keyof: IndexZeroParser<"keyof">;
    instanceof: IndexZeroParser<"instanceof">;
    "===": IndexZeroParser<"===">;
};
type IndexZeroOperator = keyof typeof indexZeroParsers;

type validateTupleLiteral<def extends array, $, args> = parseSequence<def, $, args> extends infer s extends SequenceParseState ? Readonly<s["validated"]> : never;
type inferTupleLiteral<def extends array, $, args> = parseSequence<def, $, args> extends infer s extends SequenceParseState ? s["inferred"] : never;
type SequencePhase = satisfy<keyof Sequence.Inner, SequencePhase.prefix | SequencePhase.optionals | SequencePhase.defaultables | SequencePhase.postfix>;
declare namespace SequencePhase {
    type prefix = "prefix";
    type optionals = "optionals";
    type defaultables = "defaultables";
    type postfix = "postfix";
}
type SequenceParseState = {
    unscanned: array;
    inferred: array;
    validated: array;
    phase: SequencePhase;
};
type parseSequence<def extends array, $, args> = parseNextElement<{
    unscanned: def;
    inferred: [];
    validated: [];
    phase: SequencePhase.prefix;
}, $, args>;
type PreparsedElementKind = "required" | SequencePhase.optionals | SequencePhase.defaultables;
type PreparsedElement = {
    head: unknown;
    tail: array;
    inferred: unknown;
    validated: unknown;
    kind: PreparsedElementKind;
    spread: boolean;
};
declare namespace PreparsedElement {
    type from<result extends PreparsedElement> = result;
    type required = "required";
    type optionals = "optionals";
    type defaultables = "defaultables";
}
type preparseNextState<s extends SequenceParseState, $, args> = s["unscanned"] extends readonly ["...", infer head, ...infer tail] ? preparseNextElement<head, tail, true, $, args> : s["unscanned"] extends readonly [infer head, ...infer tail] ? preparseNextElement<head, tail, false, $, args> : null;
type preparseNextElement<head, tail extends array, spread extends boolean, $, args> = PreparsedElement.from<{
    head: head;
    tail: tail;
    inferred: inferDefinition<head, $, args>;
    validated: validateInnerDefinition<head, $, args>;
    kind: head extends OptionalPropertyDefinition ? PreparsedElement.optionals : head extends DefaultablePropertyTuple ? PreparsedElement.defaultables : isDefaultable<head, $, args> extends true ? PreparsedElement.defaultables : PreparsedElement.required;
    spread: spread;
}>;
type parseNextElement<s extends SequenceParseState, $, args> = preparseNextState<s, $, args> extends infer next extends PreparsedElement ? parseNextElement<{
    unscanned: next["tail"];
    inferred: nextInferred<s, next>;
    validated: nextValidated<s, next>;
    phase: next["kind"] extends (SequencePhase.optionals | SequencePhase.defaultables) ? next["kind"] : number extends nextInferred<s, next>["length"] ? s["phase"] : SequencePhase.prefix;
}, $, args> : s;
type nextInferred<s extends SequenceParseState, next extends PreparsedElement> = next["spread"] extends true ? [
    ...s["inferred"],
    ...conform<next["inferred"], array>
] : next["kind"] extends SequencePhase.optionals ? [
    ...s["inferred"],
    next["inferred"]?
] : [...s["inferred"], next["inferred"]];
type nextValidated<s extends SequenceParseState, next extends PreparsedElement> = [
    ...s["validated"],
    ...nextValidatedSpreadOperatorIfPresent<s, next>,
    nextValidatedElement<s, next>
];
type nextValidatedSpreadOperatorIfPresent<s extends SequenceParseState, next extends PreparsedElement> = next["spread"] extends true ? [
    next["inferred"] extends infer spreadOperand extends array ? [
        number,
        number
    ] extends ([
        s["inferred"]["length"],
        spreadOperand["length"]
    ]) ? ErrorMessage<multipleVariadicMessage> : "..." : ErrorMessage<writeNonArraySpreadMessage<next["head"]>>
] : [];
type nextValidatedElement<s extends SequenceParseState, next extends PreparsedElement> = next["kind"] extends SequencePhase.optionals ? next["spread"] extends true ? ErrorMessage<spreadOptionalMessage> : s["phase"] extends SequencePhase.postfix ? ErrorMessage<optionalOrDefaultableAfterVariadicMessage> : next["validated"] : next["kind"] extends SequencePhase.defaultables ? next["spread"] extends true ? ErrorMessage<spreadDefaultableMessage> : s["phase"] extends SequencePhase.optionals ? ErrorMessage<defaultablePostOptionalMessage> : s["phase"] extends SequencePhase.postfix ? ErrorMessage<optionalOrDefaultableAfterVariadicMessage> : next["validated"] : [s["phase"], next["spread"]] extends ([
    SequencePhase.optionals | SequencePhase.defaultables,
    false
]) ? ErrorMessage<postfixAfterOptionalOrDefaultableMessage> : next["validated"];
declare const writeNonArraySpreadMessage: <operand extends string>(operand: operand) => writeNonArraySpreadMessage<operand>;
type writeNonArraySpreadMessage<operand> = `Spread element must be an array${operand extends string ? ` (was ${operand})` : ""}`;
declare const multipleVariadicMesage = "A tuple may have at most one variadic element";
type multipleVariadicMessage = typeof multipleVariadicMesage;
declare const optionalOrDefaultableAfterVariadicMessage = "An optional element may not follow a variadic element";
type optionalOrDefaultableAfterVariadicMessage = typeof optionalOrDefaultableAfterVariadicMessage;
declare const spreadOptionalMessage = "A spread element cannot be optional";
type spreadOptionalMessage = typeof spreadOptionalMessage;
declare const spreadDefaultableMessage = "A spread element cannot have a default";
type spreadDefaultableMessage = typeof spreadDefaultableMessage;
declare const defaultablePostOptionalMessage = "A defaultable element may not follow an optional element without a default";
type defaultablePostOptionalMessage = typeof defaultablePostOptionalMessage;

type inferDefinition<def, $, args> = [
    def
] extends [anyOrNever] ? def : def extends type.cast<infer t> ? ifEmptyObjectLiteral<def, object, t> : def extends ThunkCast<infer t> ? t : def extends string ? inferString<def, $, args> : def extends array ? inferTuple<def, $, args> : def extends RegExp ? string : def extends object ? inferObjectLiteral<def, $, args> : never;
type validateDefinition<def, $, args> = null extends undefined ? ErrorMessage<`'strict' or 'strictNullChecks' must be set to true in your tsconfig's 'compilerOptions'`> : [def] extends [anyOrNever] ? def : def extends OptionalPropertyDefinition ? ErrorMessage<shallowOptionalMessage> : isDefaultable<def, $, args> extends true ? ErrorMessage<shallowDefaultableMessage> : validateInnerDefinition<def, $, args>;
type validateInnerDefinition<def, $, args> = [
    def
] extends [Terminal] ? def : def extends string ? validateString<def, $, args> : def extends array ? validateTuple<def, $, args> : def extends BadDefinitionType ? ErrorMessage<writeBadDefinitionTypeMessage<objectKindOrDomainOf<def>>> : unknown extends def ? BaseCompletions<$, args> | {} : RegExp extends def ? def : validateObjectLiteral<def, $, args>;
type validateTuple<def extends array, $, args> = maybeValidateTupleExpression<def, $, args> extends infer result ? result extends null ? validateTupleLiteral<def, $, args> : result : never;
type inferTuple<def extends array, $, args> = def extends TupleExpression ? inferTupleExpression<def, $, args> : inferTupleLiteral<def, $, args>;
type validateDeclared<declared, def, $, args> = def extends type.validate<def, $, args> ? validateInference<def, declared, $, args> : type.validate<def, $, args>;
type validateInference<def, declared, $, args> = def extends RegExp | type.cast<unknown> | ThunkCast | TupleExpression ? validateShallowInference<def, declared, $, args> : def extends array ? declared extends array ? {
    [i in keyof declared]: i extends keyof def ? validateInference<def[i], declared[i], $, args> : declared[i];
} : show<declarationMismatch<def, declared, $, args>> : def extends object ? show<{
    [k in requiredKeyOf<declared>]: k extends keyof def ? validateInference<def[k], declared[k], $, args> : declared[k];
} & {
    [k in optionalKeyOf<declared> & string as `${k}?`]: `${k}?` extends (keyof def) ? validateInference<def[`${k}?`], defined<declared[k]>, $, args> : declared[k];
}> : validateShallowInference<def, declared, $, args>;
type validateShallowInference<def, declared, $, args> = equals<inferDefinition<def, $, args>, declared> extends true ? def : show<declarationMismatch<def, declared, $, args>>;
type declarationMismatch<def, declared, $, args> = {
    declared: declared;
    inferred: inferDefinition<def, $, args>;
};
type Terminal = type.cast<unknown> | Fn;
type ThunkCast<t = unknown> = () => type.cast<t>;
type BadDefinitionType = Exclude<Primitive, string>;
declare const writeBadDefinitionTypeMessage: <actual extends string>(actual: actual) => writeBadDefinitionTypeMessage<actual>;
type writeBadDefinitionTypeMessage<actual extends string> = `Type definitions must be strings or objects (was ${actual})`;

type inferAstRoot<ast, $, args> = ast extends array ? inferExpression<ast, $, args> : never;
type inferAstIn<ast, $, args> = distill.In<inferAstRoot<ast, $, args>>;
type DefAst<def = unknown, alias extends string = string> = [
    def,
    "def",
    alias
];
type InferredAst<t = unknown, def extends string = string> = [
    t,
    "inferred",
    def
];
type inferExpression<ast, $, args> = ast extends array ? ast extends InferredAst<infer resolution> ? resolution : ast extends DefAst<infer def> ? inferDefinition<def, $, args> : ast extends GenericInstantiationAst<infer g, infer argAsts> ? inferGenericInstantiation<g, argAsts, $, args> : ast[1] extends "[]" ? inferExpression<ast[0], $, args>[] : ast[1] extends "|" ? inferExpression<ast[0], $, args> | inferExpression<ast[2], $, args> : ast[1] extends "&" ? inferIntersection<inferExpression<ast[0], $, args>, inferExpression<ast[2], $, args>> : ast[1] extends "|>" ? inferPipe<inferExpression<ast[0], $, args>, inferExpression<ast[2], $, args>> : ast[1] extends "=" ? type.infer<ast[2]> extends infer defaultValue ? withDefault<inferExpression<ast[0], $, args>, defaultValue> : never : ast[1] extends "#" ? type.brand<inferExpression<ast[0], $, args>, ast[2]> : ast[1] extends Comparator ? ast[0] extends LimitLiteral ? inferExpression<ast[2], $, args> : inferExpression<ast[0], $, args> : ast[1] extends "%" ? inferExpression<ast[0], $, args> : ast[1] extends "?" ? inferExpression<ast[0], $, args> : ast[0] extends "keyof" ? arkKeyOf<inferExpression<ast[1], $, args>> : never : never;
type PostfixExpression<operator extends ArkTypeScanner.PostfixToken = ArkTypeScanner.PostfixToken, operand = unknown> = readonly [operand, operator];
type InfixExpression<operator extends ArkTypeScanner.InfixToken = ArkTypeScanner.InfixToken, l = unknown, r = unknown> = [l, operator, r];

/** @ts-ignore cast variance */
interface Type$6<out t extends object = object, $ = {}> extends Type<t, $> {
    readonly(): t extends array ? Type$5<{
        readonly [i in keyof t]: t[i];
    }, $> : Type$6<{
        readonly [k in keyof t]: t[k];
    }, $>;
    keyof(): instantiateType<arkKeyOf<t>, $>;
    /**
     * Get the `Type` of a property of this `Type<object>`.
     * @example type({ foo: "string" }).get("foo") // Type<string>
     */
    get<const k1 extends arkIndexableOf<t>, r = instantiateType<arkGet<t, k1>, $>>(k1: k1 | type.cast<k1>): r extends infer _ ? _ : never;
    get<const k1 extends arkIndexableOf<t>, const k2 extends arkIndexableOf<arkGet<t, k1>>, r = instantiateType<arkGet<arkGet<t, k1>, k2>, $>>(k1: k1 | type.cast<k1>, k2: k2 | type.cast<k2>): r extends infer _ ? _ : never;
    get<const k1 extends arkIndexableOf<t>, const k2 extends arkIndexableOf<arkGet<t, k1>>, const k3 extends arkIndexableOf<arkGet<arkGet<t, k1>, k2>>, r = instantiateType<arkGet<arkGet<arkGet<t, k1>, k2>, k3>, $>>(k1: k1 | type.cast<k1>, k2: k2 | type.cast<k2>, k3: k3 | type.cast<k3>): r extends infer _ ? _ : never;
    /**
     * Create a copy of this `Type` with only the specified properties.
     * @example type({ foo: "string", bar: "number" }).pick("foo") // Type<{ foo: string }>
     */
    pick<const key extends arkKeyOf<t> = never>(...keys: (key | type.cast<key>)[]): Type$6<{
        [k in keyof t as Extract<toArkKey<t, k>, key>]: t[k];
    }, $>;
    /**
     * Create a copy of this `Type` with all properties except the specified ones.
     * @example type({ foo: "string", bar: "number" }).omit("foo") // Type<{ bar: number }>
     */
    omit<const key extends arkKeyOf<t> = never>(...keys: (key | type.cast<key>)[]): Type$6<{
        [k in keyof t as Exclude<toArkKey<t, k>, key>]: t[k];
    }, $>;
    /**
     * Merge another `Type` definition, overriding properties of this `Type` with the duplicate keys.
     * @example type({ a: "1", b: "2" }).merge({ b: "3", c: "4" }) // Type<{ a: 1, b: 3, c: 4 }>
     */
    merge<const def, inferredDef = type.infer<def, $>, r = Type$6<merge<t, inferredDef>, $>>(def: type.validate<def, $> & (inferredDef extends object ? unknown : ErrorType<"Merged type must be an object", [actual: inferredDef]>)): r extends infer _ ? _ : never;
    /**
     * Create a copy of this `Type` with all properties required.
     * @example const T = type({ "foo?"": "string" }).required() // Type<{ foo: string }>
     */
    required(): Type$6<{
        [k in keyof t]-?: t[k];
    }, $>;
    /**
     * Create a copy of this `Type` with all properties optional.
     * @example: const T = type({ foo: "string" }).optional() // Type<{ foo?: string }>
     */
    partial(): Type$6<{
        [k in keyof t]?: t[k];
    }, $>;
    map<transformed extends listable<MappedTypeProp>, r = Type$6<constructMapped<t, transformed>, $>>(flatMapEntry: (entry: typePropOf<t, $>) => transformed): r extends infer _ ? _ : never;
    /**
     * List of property info of this `Type<object>`.
     * @example type({ foo: "string = "" }).props // [{ kind: "required", key: "foo", value: Type<string>, default: "" }]
     */
    props: array<typePropOf<t, $>>;
}
type typePropOf<o, $> = keyof o extends infer k ? k extends keyof o ? typeProp<o, k, $> : never : never;
type typeProp<o, k extends keyof o, $, t = o[k] & ({} | null)> = t extends Default<infer t, infer defaultValue> ? DefaultedTypeProp<k & Key, t, defaultValue, $> : BaseTypeProp<k extends optionalKeyOf<o> ? "optional" : "required", k & Key, t, $>;
interface BaseTypeProp<kind extends Prop.Kind = Prop.Kind, k extends Key = Key, 
/** @ts-ignore cast variance */
out v = unknown, $ = {}> {
    kind: kind;
    key: k;
    value: instantiateType<v, $>;
    meta: ArkEnv.meta;
    toJSON: () => JsonStructure;
}
interface DefaultedTypeProp<k extends Key = Key, v = unknown, defaultValue = v, $ = {}> extends BaseTypeProp<"optional", k, v, $> {
    default: defaultValue;
}
type MappedTypeProp<k extends Key = Key, v = unknown> = BaseMappedTypeProp<k, v> | OptionalMappedTypeProp<k, v>;
type BaseMappedTypeProp<k extends Key, v> = merge<BaseMappedPropInner, {
    key: k;
    value: type.cast<v>;
}>;
type OptionalMappedTypeProp<k extends Key, v> = merge<OptionalMappedPropInner, {
    key: k;
    value: type.cast<v>;
    default?: v;
}>;
type constructMapped<t, transformed extends listable<MappedTypeProp>> = show<intersectUnion<fromTypeProps<t, transformed extends array ? transformed : [transformed]>>>;
type fromTypeProps<t, props extends array<MappedTypeProp>> = show<{
    [prop in props[number] as Extract<applyHomomorphicOptionality<t, prop>, {
        kind: "required";
    }>["key"]]: prop["value"][inferred];
} & {
    [prop in props[number] as Extract<applyHomomorphicOptionality<t, prop>, {
        kind: "optional";
        default?: never;
    }>["key"]]?: prop["value"][inferred];
} & {
    [prop in props[number] as Extract<applyHomomorphicOptionality<t, prop>, {
        kind: "optional";
        default: unknown;
    }>["key"]]: withDefault<prop["value"][inferred], prop["default" & keyof prop]>;
}>;
type applyHomomorphicOptionality<t, prop extends MappedTypeProp> = prop["kind"] extends string ? prop : prop & {
    kind: prop["key"] extends optionalKeyOf<t> ? "optional" : "required";
};

interface Type$5<
/** @ts-ignore cast variance */
out t extends readonly unknown[] = readonly unknown[], $ = {}> extends Type$6<t, $> {
    atLeastLength(schema: InclusiveNumericRangeSchema): this;
    atMostLength(schema: InclusiveNumericRangeSchema): this;
    moreThanLength(schema: ExclusiveNumericRangeSchema): this;
    lessThanLength(schema: ExclusiveNumericRangeSchema): this;
    exactlyLength(schema: ExactLength.Schema): this;
}

/** @ts-ignore cast variance */
interface Type$4<out t extends globalThis.Date = globalThis.Date, $ = {}> extends Type$6<t, $> {
    atOrAfter(schema: InclusiveDateRangeSchema): this;
    atOrBefore(schema: InclusiveDateRangeSchema): this;
    laterThan(schema: ExclusiveDateRangeSchema): this;
    earlierThan(schema: ExclusiveDateRangeSchema): this;
}

/** @ts-ignore cast variance */
interface Type$3<out t extends number = number, $ = {}> extends Type<t, $> {
    divisibleBy(schema: Divisor.Schema): this;
    atLeast(schema: InclusiveNumericRangeSchema): this;
    atMost(schema: InclusiveNumericRangeSchema): this;
    moreThan(schema: ExclusiveNumericRangeSchema): this;
    lessThan(schema: ExclusiveNumericRangeSchema): this;
}

/** @ts-ignore cast variance */
interface Type$2<out t extends string = string, $ = {}> extends Type<t, $> {
    matching(schema: Pattern.Schema): this;
    atLeastLength(schema: InclusiveNumericRangeSchema): this;
    atMostLength(schema: InclusiveNumericRangeSchema): this;
    moreThanLength(schema: ExclusiveNumericRangeSchema): this;
    lessThanLength(schema: ExclusiveNumericRangeSchema): this;
    exactlyLength(schema: ExactLength.Schema): this;
}

type instantiateType<t, $> = [
    t
] extends [anyOrNever] ? Type<t, $> : [t] extends [object] ? [
    t
] extends [array] ? Type$5<t, $> : [t] extends [Date] ? Type$4<t, $> : Type$6<t, $> : [t] extends [string] ? Type$2<t, $> : [t] extends [number] ? Type$3<t, $> : Type<t, $>;

/** The convenience properties attached to `type` */
type TypeParserAttachments = Omit<TypeParser, never>;
interface TypeParser<$ = {}> extends Ark.boundTypeAttachments<$> {
    /**
     * Create a {@link Type} from your definition.
     *
     * @example const person = type({ name: "string" })
     */
    <const def, r = type.instantiate<def, $>>(def: type.validate<def, $>): r extends infer _ ? _ : never;
    /**
     * Create a {@link Generic} from a parameter string and body definition.
     *
     * @param params A string like "<t, n extends number>" specifying the
     * {@link Generic}'s parameters and any associated constraints via `extends`.
     *
     * @param def The definition for the body of the {@link Generic}. Can reference the
     * parameter names specified in the previous argument in addition to aliases
     * from its {@link Scope}.
     *
     * @example const boxOf = type("<t extends string | number>", { contents: "t" })
     */
    <const params extends ParameterString, const def, r = Generic<parseValidGenericParams<params, $>, def, $>>(params: validateParameterString<params, $>, def: type.validate<def, $, baseGenericConstraints<parseValidGenericParams<params, $>>>): r extends infer _ ? _ : never;
    /**
     * Create a {@link Type} from a [tuple expression](http://localhost:3000/docs/expressions)
     * spread as this function's arguments.
     *
     * @example type("string", "|", { foo: "number" })
     */
    <const zero, const one, const rest extends array, r = type.instantiate<[zero, one, ...rest], $>>(_0: zero extends IndexZeroOperator ? zero : type.validate<zero, $>, _1: zero extends "keyof" ? type.validate<one, $> : zero extends "instanceof" ? conform<one, Constructor> : zero extends "===" ? conform<one, unknown> : conform<one, ArgTwoOperator>, ..._2: zero extends "===" ? rest : zero extends "instanceof" ? conform<rest, readonly Constructor[]> : one extends TupleInfixOperator ? one extends ":" ? [Predicate<distill.In<type.infer<zero, $>>>] : one extends "=>" ? [Morph<distill.Out<type.infer<zero, $>>, unknown>] : one extends "|>" ? [type.validate<rest[0], $>] : one extends "@" ? [TypeMetaInput] : [type.validate<rest[0], $>] : []): r extends infer _ ? _ : never;
    /**
     * An alias of the {@link ArkErrors} class, an instance of which is returned when a {@link Type}
     * is invoked with invalid input.
     *
     * @example
     * const out = myType(data)
     *
     * if(out instanceof type.errors) console.log(out.summary)
     *
     */
    errors: typeof ArkErrors;
    hkt: typeof Hkt;
    keywords: typeof keywords;
    /**
     * The {@link Scope} in which definitions passed to this function will be parsed.
     */
    $: Scope<$>;
    /**
     * An alias of `type` with no type-level validation or inference.
     *
     * Useful when wrapping `type` or using it to parse a dynamic definition.
     */
    raw(def: unknown): Type<any, $>;
    module: ModuleParser;
    scope: ScopeParser;
    define: DefinitionParser<$>;
    generic: GenericParser<$>;
    match: MatchParser<$>;
    schema: SchemaParser<$>;
    /**
     * Create a {@link Type} that is satisfied only by a value strictly equal (`===`) to the argument passed to this function.
     * @example const foo = type.unit('foo') // {@link Type}<'foo'>
     * @example const sym: unique symbol = Symbol(); type.unit(sym) // {@link Type}<typeof sym>
     */
    unit: UnitTypeParser<$>;
    /**
     * Create a {@link Type} that is satisfied only by a value strictly equal (`===`) to one of the arguments passed to this function.
     * @example const enum = type.enumerated('foo', 'bar', obj) // obj is a by-reference object
     * @example const tupleForm = type(['===', 'foo', 'bar', obj])
     * @example const argsForm = type('===', 'foo', 'bar', obj)
     */
    enumerated: EnumeratedTypeParser<$>;
    /**
     * Create a {@link Type} that is satisfied only by a value of a specific class.
     * @example const array = type.instanceOf(Array)
     */
    instanceOf: InstanceOfTypeParser<$>;
}
declare class InternalTypeParser extends Callable<(...args: unknown[]) => BaseRoot | Generic, TypeParserAttachments> {
    constructor($: InternalScope);
}
type DeclarationParser<$> = <preinferred>() => {
    type: <const def>(def: validateDeclared<preinferred, def, $, bindThis<def>>) => Type$1<preinferred, $>;
};
type UnitTypeParser<$> = <const t>(value: t) => Type$1<t, $>;
type InstanceOfTypeParser<$> = <const t extends object>(ctor: Constructor<t>) => Type$1<t, $>;
type EnumeratedTypeParser<$> = <const values extends readonly unknown[]>(...values: values) => Type$1<values[number], $>;
type DefinitionParser<$> = <const def>(def: type.validate<def, $>) => def;
type SchemaParser<$> = (schema: RootSchema, opts?: BaseParseOptions) => Type$1<unknown, $>;
type TypeConstructor<t = unknown, $ = {}> = new (def: unknown, $: Scope<$>) => Type$1<t, $>;
type Type$1<t = unknown, $ = {}> = instantiateType<t, $>;
declare const Type$1: TypeConstructor;

interface ArkScopeConfig extends ArkSchemaScopeConfig {
}
interface ScopeParser {
    <const def>(def: scope.validate<def>, config?: ArkScopeConfig): Scope<scope.infer<def>>;
    define: <const def>(def: scope.validate<def>) => def;
}
type ModuleParser = <const def>(def: scope.validate<def>, config?: ArkScopeConfig) => scope.infer<def> extends infer $ ? Module<{
    [k in exportedNameOf<$>]: $[k];
}> : never;
type bindThis<def> = {
    this: Def<def>;
};
/** nominal type for an unparsed definition used during scope bootstrapping */
type Def<def = {}> = Brand<def, "unparsed">;
/** sentinel indicating a scope that will be associated with a generic has not yet been parsed */
type UnparsedScope = "$";
/** These are legal as values of a scope but not as definitions in other contexts */
type PreparsedResolution = PreparsedNodeResolution;
type bootstrapAliases<def> = {
    [k in Exclude<keyof def, GenericDeclaration>]: def[k] extends (PreparsedResolution) ? def[k] extends {
        t: infer g extends GenericAst;
    } ? g : def[k] extends Module<infer $> | BoundModule<infer $, any> ? Submodule<$> : def[k] : def[k] extends (() => infer thunkReturn extends PreparsedResolution) ? thunkReturn extends {
        t: infer g extends GenericAst;
    } ? g : thunkReturn extends Module<infer $> | BoundModule<infer $, any> ? Submodule<$> : thunkReturn : Def<def[k]>;
} & {
    [k in keyof def & GenericDeclaration as extractGenericName<k>]: GenericAst<parseValidGenericParams<extractGenericParameters<k>, bootstrapAliases<def>>, def[k], UnparsedScope>;
};
type inferBootstrapped<$> = {
    [name in keyof $]: $[name] extends Def<infer def> ? inferDefinition<def, $, {}> : $[name] extends {
        t: infer g extends GenericAst;
    } ? bindGenericToScope<g, $> : $[name];
} & unknown;
type bindGenericToScope<g extends GenericAst, $> = GenericAst<g["paramsAst"], g["bodyDef"], g["$"] extends UnparsedScope ? $ : g["$"], $>;
type extractGenericName<k> = k extends GenericDeclaration<infer name> ? name : never;
type extractGenericParameters<k> = k extends `${string}<${infer params}>` ? ParameterString<params> : never;
type resolutionToAst<alias extends string, resolution> = [
    resolution
] extends [anyOrNever] ? InferredAst<resolution, alias> : resolution extends Def<infer def> ? DefAst<def, alias> : resolution extends {
    [arkKind]: "module";
    root: infer root;
} ? InferredAst<root, alias> : resolution extends GenericAst ? resolution : InferredAst<resolution, alias>;
interface ResolvedTypeScopeConfig extends ResolvedScopeConfig {
    keywords?: Record<string, TypeMetaInput>;
}
interface InternalScope {
    constructor: typeof InternalScope;
}
declare class InternalScope<$ extends {} = {}> extends BaseScope<$> {
    resolvedConfig: ResolvedTypeScopeConfig;
    get ambientAttachments(): Ark.boundTypeAttachments<$> | undefined;
    protected preparseOwnAliasEntry(alias: string, def: unknown): AliasDefEntry;
    parseGenericParams(def: string, opts: BaseParseOptions): array<GenericParamDef>;
    protected normalizeRootScopeValue(resolution: unknown): unknown;
    protected preparseOwnDefinitionFormat(def: unknown, opts: BaseParseOptions): BaseRoot | BaseParseContextInput;
    parseOwnDefinitionFormat(def: unknown, ctx: BaseParseContext): BaseRoot;
    unit: UnitTypeParser<$>;
    enumerated: EnumeratedTypeParser<$>;
    instanceOf: InstanceOfTypeParser<$>;
    match: InternalMatchParser;
    declare: () => {
        type: InternalTypeParser;
    };
    define<def>(def: def): def;
    type: InternalTypeParser;
    static scope: ScopeParser;
    static module: ModuleParser;
}
declare const scope: ScopeParser;
declare namespace scope {
    type validate<def> = {
        [k in keyof def]: k extends noSuggest ? unknown : parseScopeKey<k, def>["params"] extends infer params ? params extends array<GenericParamAst> ? params["length"] extends 0 ? def[k] extends type.Any | PreparsedResolution ? def[k] : k extends (PrivateDeclaration<infer name extends keyof def & string>) ? ErrorType<writeDuplicateAliasError<name>> : type.validate<def[k], bootstrapAliases<def>, {}> : type.validate<def[k], bootstrapAliases<def>, baseGenericConstraints<params>> : params : never;
    };
    type infer<def> = inferBootstrapped<bootstrapAliases<def>>;
}
interface ScopeConstructor {
    new <$ = {}>(...args: ConstructorParameters<typeof InternalScope>): Scope<$>;
    scope: ScopeParser;
    module: ModuleParser;
}
interface Scope<$ = {}> {
    t: $;
    [arkKind]: "scope";
    config: ArkScopeConfig;
    references: readonly BaseNode[];
    json: JsonStructure;
    exportedNames: array<exportedNameOf<$>>;
    /** The set of names defined at the root-level of the scope mapped to their
     * corresponding definitions.**/
    aliases: Record<string, unknown>;
    internal: toInternalScope<$>;
    defineSchema<const def extends RootSchema>(schema: def): def;
    node<kinds extends NodeKind | array<RootKind>>(kinds: kinds, schema: NodeSchema<flattenListable<kinds>>, opts?: BaseParseOptions): nodeOfKind<reducibleKindOf<flattenListable<kinds>>>;
    unit: UnitTypeParser<$>;
    enumerated: EnumeratedTypeParser<$>;
    type: TypeParser<$>;
    match: MatchParser<$>;
    declare: DeclarationParser<$>;
    define: DefinitionParser<$>;
    generic: GenericParser<$>;
    schema: SchemaParser<$>;
    import(): Module<{
        [k in exportedNameOf<$> as PrivateDeclaration<k>]: $[k];
    }>;
    import<names extends exportedNameOf<$>[]>(...names: names): BoundModule<{
        [k in names[number] as PrivateDeclaration<k>]: $[k];
    } & unknown, $>;
    export(): Module<{
        [k in exportedNameOf<$>]: $[k];
    }>;
    export<names extends exportedNameOf<$>[]>(...names: names): BoundModule<{
        [k in names[number]]: $[k];
    } & unknown, $>;
    resolve<name extends exportedNameOf<$>>(name: name): instantiateExport<$[name], $>;
}
declare const Scope: ScopeConstructor;
type parseScopeKey<k, def> = k extends `${infer name}<${infer params}>` ? parseGenericScopeKey<name, params, def> : {
    name: k;
    params: [];
};
type parseGenericScopeKey<name extends string, params extends string, def> = {
    name: name;
    params: parseGenericParams<params, bootstrapAliases<def>>;
};
type InnerParseResult = BaseRoot | ParsedOptionalProperty | ParsedDefaultableProperty;

/** @ts-ignore cast variance */
interface Inferred<out t = unknown, $ = {}> {
    internal: BaseRoot;
    [inferred]: t;
    /**
     * precompiled JS used to optimize validation
     *
     * ⚠️ will be `undefined` in [jitless](https://arktype.io/docs/configuration#jitless) mode
     */
    precompilation: string | undefined;
    /**
     * generic parameter representing this Type
     *
     * @typeonly
     *
     * ⚠️ May contain types representing morphs or default values that would
     * be inaccurate if used directly for runtime values. In those cases,
     * you should use {@link infer} or {@link inferIn} on this object instead.
     */
    t: t;
    /**
     * #### {@link Scope} in which chained methods are parsed
     */
    $: Scope<$>;
    /**
     * #### type of output this returns
     *
     * @typeonly
     *
     * @example
     * const parseNumber = type("string").pipe(s => Number.parseInt(s))
     * type ParsedNumber = typeof parseNumber.infer // number
     */
    infer: this["inferOut"];
    /**
     * type of output this returns
     *
     * 🔗 alias of {@link infer}
     * @typeonly
     *
     *
     * @example
     * const parseNumber = type("string").pipe(s => Number.parseInt(s))
     * type ParsedNumber = typeof parseNumber.infer // number
     */
    inferOut: distill.Out<t>;
    /**
     * type of output that can be introspected at runtime (e.g. via {@link out})
     *
     * ⚠️ If your Type contains morphs, they will be inferred as `unknown` unless
     * they are an ArkType keyword or have an explicitly defined output validator.
     *
     * @typeonly
     *
     * @example
     * const unmorphed = type("string")
     * // with no morphs, we can introspect the input and output as a single Type
     * type UnmorphedOut = typeof unmorphed.inferIntrospectableOut // string
     *
     * const morphed = type("string").pipe(s => s.length)
     * // with a standard user-defined morph, TypeScript can infer a
     * // return type from your function, but we have no way to
     * // know the shape at runtime
     * type MorphOut = typeof morphed.inferIntrospectableOut  // unknown
     *
     * const validated = type("string").pipe(s => s.length).to("number")
     * // morphs with validated output, including all morph keywords, are introspectable
     * type ValidatedMorphOut = typeof validated.inferIntrospectableOut
     */
    inferIntrospectableOut: distill.introspectable.Out<t>;
    /**
     * #### type of input this allows
     *
     * @typeonly
     *
     * @example
     * const parseNumber = type("string").pipe(s => Number.parseInt(s))
     * type UnparsedNumber = typeof parseNumber.inferIn // string
     */
    inferIn: distill.In<t>;
    /**
     * #### internal JSON representation
     */
    json: JsonStructure;
    /**
     * alias of {@link json} for `JSON.stringify` compatibility
     */
    toJSON(): JsonStructure;
    /**
     * #### generate a JSON Schema
     *
     * @throws {JsonSchema.UnjsonifiableError} if this cannot be converted to JSON Schema
     */
    toJsonSchema(): JsonSchema;
    /**
     * #### metadata like custom descriptions and error messages
     *
     * ✅ type {@link https://arktype.io/docs/configuration#custom | can be customized} for your project
     */
    meta: ArkAmbient.meta;
    /**
     * #### human-readable English description
     *
     * ✅ works best for primitive values
     *
     * @example
     * const n = type("0 < number <= 100")
     * console.log(n.description) // positive and at most 100
     */
    description: string;
    /**
     * #### syntax string similar to native TypeScript
     *
     * ✅ works well for both primitives and structures
     *
     * @example
     * const loc = type({ coords: ["number", "number"] })
     * console.log(loc.expression) // { coords: [number, number] }
     */
    expression: string;
    /**
     * #### validate and return transformed data or throw
     *
     * ✅ sugar to avoid checking for {@link type.errors} if they are unrecoverable
     *
     * @example
     * const criticalPayload = type({
     *     superImportantValue: "string"
     * })
     * // throws TraversalError: superImportantValue must be a string (was missing)
     * const data = criticalPayload.assert({ irrelevantValue: "whoops" })
     * console.log(data.superImportantValue) // valid output can be accessed directly
     *
     * @throws {TraversalError}
     */
    assert(data: unknown): this["infer"];
    /**
     * #### check input without applying morphs
     *
     * ✅ good for stuff like filtering that doesn't benefit from detailed errors
     *
     * @example
     * const numeric = type("number | bigint")
     * // [0, 2n]
     * const numerics = [0, "one", 2n].filter(numeric.allows)
     */
    allows(data: unknown): data is this["inferIn"];
    /**
     * #### add metadata to shallow references
     *
     * ⚠️ does not affect error messages within properties of an object
     *
     * @example
     * const notOdd = type("number % 2").configure({ description: "not odd" })
     * // all constraints at the root are affected
     * const odd = notOdd(3) // must be not odd (was 3)
     * const nonNumber = notOdd("two") // must be not odd (was "two")
     *
     * const notOddBox = type({
     *    // we should have referenced notOdd or added meta here
     *    notOdd: "number % 2",
     * // but instead chained from the root object
     * }).configure({ description: "not odd" })
     * // error message at path notOdd is not affected
     * const oddProp = notOddBox({ notOdd: 3 }) // notOdd must be even (was 3)
     * // error message at root is affected, leading to a misleading description
     * const nonObject = notOddBox(null) // must be not odd (was null)
     */
    configure<meta extends TypeMetaInput>(meta: meta): this;
    /**
     * #### add description to shallow references
     *
     * 🔗 equivalent to `.configure({ description })` (see {@link configure})
     * ⚠️ does not affect error messages within properties of an object
     *
     * @example
     * const aToZ = type(/^a.*z$/).describe("a string like 'a...z'")
     * const good = aToZ("alcatraz") // "alcatraz"
     * // ArkErrors: must be a string like 'a...z' (was "albatross")
     * const badPattern = aToZ("albatross")
     */
    describe(description: string): this;
    /**
     * #### apply undeclared key behavior
     *
     * {@inheritDoc UndeclaredKeyBehavior}
     */
    onUndeclaredKey(behavior: UndeclaredKeyBehavior): this;
    /**
     * #### deeply apply undeclared key behavior
     *
     * {@inheritDoc UndeclaredKeyBehavior}
     **/
    onDeepUndeclaredKey(behavior: UndeclaredKeyBehavior): this;
    /**
     * #### alias for {@link assert} with typed input
     *
     * @example
     * const t = type({ foo: "string" });
     * // TypeScript: foo must be a string (was 5)
     * const data = t.from({ foo: 5 });
     */
    from(literal: this["inferIn"]): this["infer"];
    /**
     * #### deeply extract inputs
     *
     * ✅ will never include morphs
     * ✅ good for generating JSON Schema or other non-transforming formats
     *
     * @example
     * const createUser = type({
     *    age: "string.numeric.parse"
     * })
     * // { age: 25 } (age parsed to a number)
     * const out = createUser({ age: "25" })
     * // { age: "25" } (age is still a string)
     * const inOut = createUser.in({ age: "25" })
     */
    get in(): instantiateType<this["inferIn"], $>;
    /**
     * #### deeply extract outputs
     *
     * ✅ will never include morphs
     * ⚠️ if your type includes morphs, their output will likely be unknown unless they
     * were defined with an explicit output validator via `.to(outputDef)` or `.pipe(morph, outputType)`
     *
     * @example
     * const userMorph = type("string[]").pipe(a => a.join(","))
     *
     * const t = type({
     *    // all keywords have introspectable output
     *    keyword: "string.numeric.parse",
     *    // TypeScript knows this returns a boolean, but we can't introspect that at runtime
     *    unvalidated: userMorph,
     *    // if needed, it can be made introspectable with an output validator
     *    validated: userMorph.to("string")
     * })
     *
     * // Type<{ keyword: number; unvalidated: unknown; validated: string }>
     * const baseOut = base.out
     */
    get out(): instantiateType<this["inferIntrospectableOut"], $>;
    /**
     * #### add a compile-time brand to output
     *
     * @typenoop
     *
     * @example
     * const palindrome = type("string")
     *     .narrow(s => s === [...s].reverse().join(""))
     *     .brand("palindrome")
     * // Brand<string, "palindrome">
     * const out = palindrome.assert("racecar")
     */
    brand<const name extends string, r = instantiateType<type.brand<t, name>, $>>(name: name): r extends infer _ ? _ : never;
    /**
     * #### an array of this
     *
     * @example
     * // Type<{ rebmun: number }[]>
     * const t = type({ rebmun: "number" }).array();
     */
    array(): Type$5<t[], $>;
    /**
     * #### {@link https://arktype.io/docs/objects#properties-optional | optional definition}
     *
     * @chainedDefinition
     *
     * @example
     * const prop = type({ foo: "number" })
     * // Type<{ bar?: { foo: number } }>
     * const obj = type({ bar: prop.optional() })
     */
    optional(): [this, "?"];
    /**
     * #### {@link https://arktype.io/docs/objects#properties-defaultable | defaultable definition}
     *
     * ✅ object defaults can be returned from a function
     * ⚠️ throws if the default value is not allowed
     * @chainedDefinition
     *
     * @example
     * // Type<{ count: Default<number, 0> }>
     * const state = type({ count: type.number.default(0) })
     * const prop = type({ nested: "boolean" })
     * const forObj = type({
     *     key: nested.default(() => ({ nested: false }))
     * })
     */
    default<const value extends defaultFor<this["inferIn"]>>(value: value): [this, "=", value];
    /**
     * #### apply a predicate function to input
     *
     * ⚠️ the behavior of {@link narrow}, this method's output counterpart, is usually more desirable
     * ✅ most useful for morphs with input types that are re-used externally
     * @predicateCast
     *
     * @example
     * const stringifyUser = type({ name: "string" }).pipe(user => JSON.stringify(user))
     * const stringifySafe = stringifyUser.filter(user => user.name !== "Bobby Tables")
     * // Type<(In: `${string}Z`) => To<Date>>
     * const withPredicate = type("string.date.parse").filter((s): s is `${string}Z` =>
     *     s.endsWith("Z")
     * )
     */
    filter<narrowed extends this["inferIn"] = never, r = instantiateType<[
        narrowed
    ] extends [never] ? t : t extends InferredMorph<any, infer o> ? (In: narrowed) => o : narrowed, $>>(predicate: Predicate.Castable<this["inferIn"], narrowed>): r extends infer _ ? _ : never;
    /**
     * #### apply a predicate function to output
     *
     * ✅ go-to fallback for validation not composable via builtin types and operators
     * ✅ runs after all other validators and morphs, if present
     * @predicateCast
     *
     * @example
     * const palindrome = type("string").narrow(s => s === [...s].reverse().join(""))
     *
     * const palindromicEmail = type("string.date.parse").narrow((date, ctx) =>
     *		date.getFullYear() === 2025 || ctx.mustBe("the current year")
     * )
     * // Type<`${string}.tsx`>
     * const withPredicate = type("string").narrow((s): s is `${string}.tsx` => /\.tsx?$/.test(s))
     */
    narrow<narrowed extends this["infer"] = never, r = instantiateType<[
        narrowed
    ] extends [never] ? t : t extends InferredMorph<infer i, infer o> ? o extends To ? (In: i) => To<narrowed> : (In: i) => Out<narrowed> : narrowed, $>>(predicate: Predicate.Castable<this["infer"], narrowed>): r extends infer _ ? _ : never;
    /**
     * #### pipe output through arbitrary transformations or other Types
     *
     * @example
     * const user = type({ name: "string" })
     *
     * // parse a string and validate that the result as a user
     * const parseUser = type("string").pipe(s => JSON.parse(s), user)
     */
    pipe: ChainedPipe<t, $>;
    /**
     * #### parse a definition as an output validator
     *
     * 🔗 `to({ name: "string" })` is equivalent to `.pipe(type({ name: "string" }))`
     *
     * @example
     * // parse a string and validate that the result as a user
     * const parseUser = type("string").pipe(s => JSON.parse(s)).to({ name: "string" })
     */
    to<const def, r = instantiateType<inferPipe<t, type.infer<def, $>>, $>>(def: type.validate<def, $>): r extends infer _ ? _ : never;
}
/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}> extends Callable<(data: unknown) => distill.Out<t> | ArkEnv.onFail>, Inferred<t, $> {
    /**
     * #### cast the way this is inferred
     *
     * @typenoop
     *
     * @example
     * // Type<`LEEEEEEEE${string}ROY`>
     * const leeroy = type(/^LE{8,}ROY$/).as<`LEEEEEEEE${string}ROY`>()
     */
    as<castTo = unset>(...args: validateChainedAsArgs<castTo>): instantiateType<castTo, $>;
    /**
     * #### intersect the parsed Type, throwing if the result is unsatisfiable
     *
     * @example
     * // Type<{ foo: number; bar: string }>
     * const t = type({ foo: "number" }).and({ bar: "string" })
     * // ParseError: Intersection at foo of number and string results in an unsatisfiable type
     * const bad = type({ foo: "number" }).and({ foo: "string" })
     */
    and<const def, r = instantiateType<inferIntersection<t, type.infer<def, $>>, $>>(def: type.validate<def, $>): r extends infer _ ? _ : never;
    /**
     * #### union with the parsed Type
     *
     * ⚠️ a union that could apply different morphs to the same data is a ParseError ([docs](https://arktype.io/docs/expressions/union-morphs))
     *
     * @example
     * // Type<string | { box: string }>
     * const t = type("string").or({ box: "string" })
     */
    or<const def, r = instantiateType<t | type.infer<def, $>, $>>(def: type.validate<def, $>): r extends infer _ ? _ : never;
    /**
     * #### intersect the parsed Type, returning an introspectable {@link Disjoint} if the result is unsatisfiable
     *
     * @example
     * // Type<{ foo: number; bar: string }>
     * const t = type({ foo: "number" }).intersect({ bar: "string" })
     * const bad = type("number > 10").intersect("number < 5")
     * // logs "Intersection of > 10 and < 5 results in an unsatisfiable type"
     * if (bad instanceof Disjoint) console.log(`${bad.summary}`)
     */
    intersect<const def, r = instantiateType<inferIntersection<t, type.infer<def, $>>, $>>(def: type.validate<def, $>): r extends infer _ ? _ | Disjoint : never;
    /**
     * #### check if the parsed Type's constraints are identical
     *
     * ✅ equal types have identical input and output constraints and transforms
     * @ignoresMeta
     *
     * @example
     * const divisibleBy6 = type.number.divisibleBy(6).moreThan(0)
     * // false (left side must also be positive)
     * divisibleBy6.equals("number % 6")
     * // false (right side has an additional <100 constraint)
     * console.log(divisibleBy6.equals("0 < (number % 6) < 100"))
     * const thirdTry = type("(number % 2) > 0").divisibleBy(3)
     * // true (types are normalized and reduced)
     * console.log(divisibleBy6.equals(thirdTry))
     */
    equals<const def>(def: type.validate<def, $>): boolean;
    /**
     * #### narrow this based on an {@link equals} check
     *
     * @ignoresMeta
     *
     * @example
     * const n = type.raw(`${Math.random()}`)
     * // Type<0.5> | undefined
     * const ez = n.ifEquals("0.5")
     */
    ifEquals<const def, r = type.instantiate<def, $>>(def: type.validate<def, $>): r extends infer _ ? _ | undefined : never;
    /**
     * #### check if this is a subtype of the parsed Type
     *
     * ✅ a subtype must include all constraints from the base type
     * ✅ unlike {@link equals}, additional constraints may be present
     * @ignoresMeta
     *
     * @example
     * type.string.extends("unknown") // true
     * type.string.extends(/^a.*z$/) // false
     */
    extends<const def>(other: type.validate<def, $>): boolean;
    /**
     * #### narrow this based on an {@link extends} check
     *
     * @ignoresMeta
     *
     * @example
     * const n = type(Math.random() > 0.5 ? "true" : "0") // Type<0 | true>
     * const ez = n.ifExtends("boolean") // Type<true> | undefined
     */
    ifExtends<const def, r = type.instantiate<def, $>>(other: type.validate<def, $>): r extends infer _ ? _ | undefined : never;
    /**
     * #### check if a value could satisfy this and the parsed Type
     *
     * ⚠️ will return true unless a {@link Disjoint} can be proven
     *
     * @example
     * type.string.overlaps("string | number") // true (e.g. "foo")
     * type("string | number").overlaps("1") // true (1)
     * type("number > 0").overlaps("number < 0") // false (no values exist)
     *
     * const noAt = type("string").narrow(s => !s.includes("@"))
     * noAt.overlaps("string.email") // true (no values exist, but not provable)
     */
    overlaps<const def>(r: type.validate<def, $>): boolean;
    /**
     * #### extract branches {@link extend}ing the parsed Type
     *
     * @example
     * // Type<true | 0 | 2>
     * const t = type("boolean | 0 | 'one' | 2 | bigint").extract("number | 0n | true")
     */
    extract<const def, r = instantiateType<t extends type.infer<def, $> ? t : never, $>>(r: type.validate<def, $>): r extends infer _ extends r ? _ : never;
    /**
     * #### exclude branches {@link extend}ing the parsed Type
     *
     * @example
     *
     * // Type<false | 'one' | bigint>
     * const t = type("boolean | 0 | 'one' | 2 | bigint").exclude("number | 0n | true")
     */
    exclude<const def, r = instantiateType<t extends type.infer<def, $> ? never : t, $>>(r: type.validate<def, $>): r extends infer _ ? _ : never;
    /**
     * @experimental
     * Map and optionally reduce branches of a union. Types that are not unions
     * are treated as a single branch.
     *
     * @param mapBranch - the mapping function, accepting a branch Type
     *     Returning another `Type` is common, but any value can be returned and
     *     inferred as part of the output.
     *
     * @param [reduceMapped] - an operation to perform on the mapped branches
     *     Can be used to e.g. merge an array of returned Types representing
     *     branches back to a single union.
     */
    distribute<mapOut, reduceOut = mapOut[]>(mapBranch: (branch: Type, i: number, branches: array<Type>) => mapOut, reduceMapped?: (mappedBranches: mapOut[]) => reduceOut): reduceOut;
    /** The Type's [StandardSchema](https://github.com/standard-schema/standard-schema) properties */
    "~standard": StandardSchemaV1.ArkTypeProps<this["inferIn"], this["inferOut"]>;
    /** @deprecated */
    apply: Function["apply"];
    /** @deprecated */
    bind: Function["bind"];
    /** @deprecated */
    call: Function["call"];
    /** @deprecated */
    caller: Function;
    /** @deprecated */
    length: number;
    /** @deprecated */
    name: string;
    /** @deprecated */
    prototype: Function["prototype"];
    /** @deprecated */
    arguments: Function["arguments"];
    /** @deprecated */
    Symbol: never;
}
interface ChainedPipeSignature<t, $> {
    <a extends Morph<distill.Out<t>>, r = instantiateType<inferPipes<t, [a]>, $>>(a: a): r extends infer _ ? _ : never;
    <a extends Morph<distill.Out<t>>, b extends Morph<inferMorphOut<a>>, r = instantiateType<inferPipes<t, [a, b]>, $>>(a: a, b: b): r extends infer _ ? _ : never;
    <a extends Morph<distill.Out<t>>, b extends Morph<inferMorphOut<a>>, c extends Morph<inferMorphOut<b>>, r = instantiateType<inferPipes<t, [a, b, c]>, $>>(a: a, b: b, c: c): r extends infer _ ? _ : never;
    <a extends Morph<distill.Out<t>>, b extends Morph<inferMorphOut<a>>, c extends Morph<inferMorphOut<b>>, d extends Morph<inferMorphOut<c>>, r = instantiateType<inferPipes<t, [a, b, c, d]>, $>>(a: a, b: b, c: c, d: d): r extends infer _ ? _ : never;
    <a extends Morph<distill.Out<t>>, b extends Morph<inferMorphOut<a>>, c extends Morph<inferMorphOut<b>>, d extends Morph<inferMorphOut<c>>, e extends Morph<inferMorphOut<d>>, r = instantiateType<inferPipes<t, [a, b, c, d, e]>, $>>(a: a, b: b, c: c, d: d, e: e): r extends infer _ ? _ : never;
    <a extends Morph<distill.Out<t>>, b extends Morph<inferMorphOut<a>>, c extends Morph<inferMorphOut<b>>, d extends Morph<inferMorphOut<c>>, e extends Morph<inferMorphOut<d>>, f extends Morph<inferMorphOut<e>>, r = instantiateType<inferPipes<t, [a, b, c, d, e, f]>, $>>(a: a, b: b, c: c, d: d, e: e, f: f): r extends infer _ ? _ : never;
    <a extends Morph<distill.Out<t>>, b extends Morph<inferMorphOut<a>>, c extends Morph<inferMorphOut<b>>, d extends Morph<inferMorphOut<c>>, e extends Morph<inferMorphOut<d>>, f extends Morph<inferMorphOut<e>>, g extends Morph<inferMorphOut<f>>, r = instantiateType<inferPipes<t, [a, b, c, d, e, f, g]>, $>>(a: a, b: b, c: c, d: d, e: e, f: f, g: g): r extends infer _ ? _ : never;
}
interface ChainedPipe<t, $> extends ChainedPipeSignature<t, $> {
    try: ChainedPipeSignature<t, $>;
}
type validateChainedAsArgs<t> = [
    t
] extends [unset] ? [
    t
] extends [anyOrNever] ? [
] : [
    ErrorMessage<"as requires an explicit type parameter like myType.as<t>()">
] : [];

type MatchParserContext<input = unknown> = {
    cases: Morph[];
    $: unknown;
    input: input;
    checked: boolean;
    key: PropertyKey | null;
};
declare namespace ctx {
    type from<ctx extends MatchParserContext> = ctx;
    type init<$, input = unknown, checked extends boolean = false> = from<{
        cases: [];
        $: $;
        input: input;
        checked: checked;
        key: null;
    }>;
    type atKey<ctx extends MatchParserContext, key extends string> = from<{
        cases: ctx["cases"];
        $: ctx["$"];
        input: ctx["input"];
        checked: ctx["checked"];
        key: key;
    }>;
}
interface MatchParser<$> extends CaseMatchParser<ctx.init<$>> {
    in<const def>(def: type.validate<def, $>): ChainableMatchParser<ctx.init<$, type.infer<def, $>, true>>;
    in<const typedInput = never>(...args: [typedInput] extends [never] ? [
        ErrorMessage<"in requires a definition or type argument (in('string') or in<string>())">
    ] : []): ChainableMatchParser<ctx.init<$, typedInput>>;
    in<const def>(def: type.validate<def, $>): ChainableMatchParser<ctx.init<$, type.infer<def, $>, true>>;
    case: CaseParser<ctx.init<$>>;
    at: AtParser<ctx.init<$>>;
}
type addCasesToContext<ctx extends MatchParserContext, cases extends unknown[]> = cases extends Morph[] ? ctx.from<{
    $: ctx["$"];
    input: ctx["input"];
    cases: [...ctx["cases"], ...cases];
    checked: ctx["checked"];
    key: ctx["key"];
}> : never;
type addDefaultToContext<ctx extends MatchParserContext, defaultCase extends DefaultCase<ctx>> = ctx.from<{
    $: ctx["$"];
    input: defaultCase extends "never" ? Morph.In<ctx["cases"][number]> : ctx["input"];
    cases: defaultCase extends "never" | "assert" ? ctx["cases"] : defaultCase extends Morph ? ctx["checked"] extends true ? [
        (In: unknown) => ArkErrors,
        ...ctx["cases"],
        defaultCase
    ] : [...ctx["cases"], defaultCase] : [
        ...ctx["cases"],
        (In: ctx["input"]) => ArkErrors
    ];
    checked: ctx["checked"];
    key: ctx["key"];
}>;
type CaseKeyKind = "def" | "string";
type casesToMorphTuple<cases, ctx extends MatchParserContext, kind extends CaseKeyKind> = unionToTuple<propValueOf<{
    [def in Exclude<keyof cases, "default">]: cases[def] extends (Morph<never, infer o>) ? kind extends "def" ? (In: inferCaseArg<def extends number ? `${number}` : def, ctx, "in">) => o : (In: maybeLiftToKey<def, ctx>) => o : never;
}>>;
type addCasesToParser<cases, ctx extends MatchParserContext, kind extends CaseKeyKind> = cases extends {
    default: infer defaultDef extends DefaultCase<ctx>;
} ? finalizeMatchParser<addCasesToContext<ctx, casesToMorphTuple<cases, ctx, kind>>, defaultDef> : ChainableMatchParser<addCasesToContext<ctx, casesToMorphTuple<cases, ctx, kind>>>;
type inferCaseArg<def, ctx extends MatchParserContext, endpoint extends "in" | "out"> = _finalizeCaseArg<maybeLiftToKey<type.infer<def, ctx["$"]>, ctx>, ctx, endpoint>;
type maybeLiftToKey<t, ctx extends MatchParserContext> = ctx["key"] extends PropertyKey ? {
    [k in ctx["key"]]: t;
} : t;
type _finalizeCaseArg<t, ctx extends MatchParserContext, endpoint extends "in" | "out"> = [
    distill<t, "in">,
    distill<t, endpoint>
] extends [infer i, infer result] ? i extends ctx["input"] ? result : Extract<ctx["input"], i> extends never ? result : Extract<ctx["input"], result> : never;
type CaseParser<ctx extends MatchParserContext> = <const def, ret>(def: type.validate<def, ctx["$"]>, resolve: (In: inferCaseArg<def, ctx, "out">) => ret) => ChainableMatchParser<addCasesToContext<ctx, [(In: inferCaseArg<def, ctx, "in">) => ret]>>;
type validateKey<key extends Key, ctx extends MatchParserContext> = ctx["key"] extends Key ? ErrorMessage<doubleAtMessage> : ctx["cases"]["length"] extends 0 ? keyof ctx["input"] extends never ? key : conform<key, keyof ctx["input"]> : ErrorMessage<chainedAtMessage>;
interface StringsParser<ctx extends MatchParserContext> {
    <const cases>(def: cases extends validateStringCases<cases, ctx> ? cases : validateStringCases<cases, ctx>): addCasesToParser<cases, ctx, "string">;
}
type validateStringCases<cases, ctx extends MatchParserContext> = {
    [k in keyof cases | stringValue<ctx> | "default"]?: k extends "default" ? DefaultCase<ctx> : k extends stringValue<ctx> ? (In: _finalizeCaseArg<maybeLiftToKey<k, ctx>, ctx, "out">) => unknown : ErrorType<`${k & string} must be a possible string value`>;
};
type stringValue<ctx extends MatchParserContext> = ctx["key"] extends keyof ctx["input"] ? ctx["input"][ctx["key"]] extends string ? ctx["input"][ctx["key"]] : never : ctx["input"] extends string ? ctx["input"] : never;
interface AtParser<ctx extends MatchParserContext> {
    <const key extends string>(key: validateKey<key, ctx>): ChainableMatchParser<ctx.atKey<ctx, key>>;
    <const key extends string, const cases, ctxAtKey extends MatchParserContext = ctx.atKey<ctx, key>>(key: validateKey<key, ctx>, cases: cases extends validateCases<cases, ctxAtKey> ? cases : errorCases<cases, ctxAtKey>): addCasesToParser<cases, ctxAtKey, "def">;
}
interface ChainableMatchParser<ctx extends MatchParserContext> {
    case: CaseParser<ctx>;
    match: CaseMatchParser<ctx>;
    default: DefaultMethod<ctx>;
    at: AtParser<ctx>;
    /** @experimental */
    strings: StringsParser<ctx>;
}
type DefaultCaseKeyword = "never" | "assert" | "reject";
type DefaultCase<ctx extends MatchParserContext = MatchParserContext<any>> = DefaultCaseKeyword | Morph<ctx["input"]>;
type DefaultMethod<ctx extends MatchParserContext> = <const def extends DefaultCase<ctx>>(def: def) => finalizeMatchParser<ctx, def>;
type validateCases<cases, ctx extends MatchParserContext> = {
    [def in keyof cases | BaseCompletions<ctx["$"], {}, "default">]?: def extends "default" ? DefaultCase<ctx> : def extends number ? (In: inferCaseArg<`${def}`, ctx, "out">) => unknown : def extends type.validate<def, ctx["$"]> ? (In: inferCaseArg<def, ctx, "out">) => unknown : type.validate<def, ctx["$"]>;
};
type errorCases<cases, ctx extends MatchParserContext> = {
    [def in keyof cases]?: def extends "default" ? DefaultCase<ctx> : def extends number ? (In: inferCaseArg<`${def}`, ctx, "out">) => unknown : def extends type.validate<def, ctx["$"]> ? (In: inferCaseArg<def, ctx, "out">) => unknown : ErrorType<type.validate<def, ctx["$"]>>;
} & {
    [k in BaseCompletions<ctx["$"], {}>]?: (In: inferCaseArg<k, ctx, "out">) => unknown;
} & {
    default?: DefaultCase<ctx>;
};
type CaseMatchParser<ctx extends MatchParserContext> = <const cases>(def: cases extends validateCases<cases, ctx> ? cases : errorCases<cases, ctx>) => addCasesToParser<cases, ctx, "def">;
type finalizeMatchParser<ctx extends MatchParserContext, defaultCase extends DefaultCase<ctx>> = addDefaultToContext<ctx, defaultCase> extends (infer ctx extends MatchParserContext) ? Match<ctx["input"], ctx["cases"]> : never;
interface Match<In = any, cases extends Morph[] = Morph[]> extends Inferred<(In: Morph.In<cases[number]>) => Out<ReturnType<cases[number]>>> {
    <const data extends In>(data: data): {
        [i in numericStringKeyOf<cases>]: isDisjoint<data, Morph.In<cases[i]>> extends true ? never : Morph.Out<cases[i]>;
    }[numericStringKeyOf<cases>];
}
declare class InternalMatchParser extends Callable<InternalCaseParserFn> {
    $: InternalScope;
    constructor($: InternalScope);
    in(def?: unknown): InternalChainedMatchParser;
    at(key: Key, cases?: InternalCases): InternalChainedMatchParser | Match;
    case(when: unknown, then: Morph): InternalChainedMatchParser;
}
type InternalCases = Record<string, Morph | DefaultCase>;
type InternalCaseParserFn = (cases: InternalCases) => InternalChainedMatchParser | Match;
type CaseEntry = [BaseRoot, Morph] | ["default", DefaultCase];
declare class InternalChainedMatchParser extends Callable<InternalCaseParserFn> {
    $: InternalScope;
    in: BaseRoot | undefined;
    protected key: Key | undefined;
    protected branches: BaseRoot[];
    constructor($: InternalScope, In?: BaseRoot);
    at(key: Key, cases?: InternalCases): InternalChainedMatchParser | Match;
    case(def: unknown, resolver: Morph): InternalChainedMatchParser;
    protected caseEntry(node: BaseRoot, resolver: Morph): InternalChainedMatchParser;
    match(cases: InternalCases): InternalChainedMatchParser | Match;
    strings(cases: InternalCases): InternalChainedMatchParser | Match;
    protected caseEntries(entries: CaseEntry[]): InternalChainedMatchParser | Match;
    default(defaultCase: DefaultCase): Match;
}
declare const chainedAtMessage = "A key matcher must be specified before the first case i.e. match.at('foo') or match.in<object>().at('bar')";
type chainedAtMessage = typeof chainedAtMessage;
declare const doubleAtMessage = "At most one key matcher may be specified per expression";
type doubleAtMessage = typeof doubleAtMessage;

declare class MergeHkt extends Hkt<[base: object, props: object]> {
    body: util.merge<this[0], this[1]>;
}
declare const Merge: _ark_schema.GenericRoot<readonly [["base", object], ["props", object]], MergeHkt>;
declare const arkBuiltins: arkBuiltins;
type arkBuiltins = Module<arkBuiltins.$>;
declare namespace arkBuiltins {
    type submodule = Submodule<$>;
    type $ = {
        Key: Key;
        Merge: typeof Merge.t;
    };
}

declare const number: number.module;
declare namespace number {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: number;
        epoch: number;
        integer: number;
        safe: number;
        NaN: number;
        Infinity: number;
        NegativeInfinity: number;
    };
}

declare const stringInteger: stringInteger.module;
declare namespace stringInteger {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: string;
        parse: (In: string) => To<number>;
    };
}
declare const base64: Module<{
    root: unknown;
    url: unknown;
}>;
declare namespace base64 {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: string;
        url: string;
    };
}
declare const capitalize: capitalize.module;
declare namespace capitalize {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: (In: string) => To<string>;
        preformatted: string;
    };
}
declare const stringDate: stringDate.module;
declare namespace stringDate {
    type module = Module<stringDate.submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: string;
        parse: (In: string) => To<Date>;
        iso: iso.submodule;
        epoch: epoch.submodule;
    };
    namespace iso {
        type submodule = Submodule<$>;
        type $ = {
            root: string;
            parse: (In: string) => To<Date>;
        };
    }
    namespace epoch {
        type submodule = Submodule<$>;
        type $ = {
            root: string;
            parse: (In: string) => To<Date>;
        };
    }
}
declare const ip: ip.module;
declare namespace ip {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: string;
        v4: string;
        v6: string;
    };
}
declare namespace stringJson {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: string;
        parse: (In: string) => To<Json>;
    };
}
declare namespace lower {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: (In: string) => To<string>;
        preformatted: string;
    };
}
declare const normalize: Module<{
    root: unknown;
    NFC: Submodule<{
        root: unknown;
        preformatted: unknown;
    }>;
    NFD: Submodule<{
        root: unknown;
        preformatted: unknown;
    }>;
    NFKC: Submodule<{
        root: unknown;
        preformatted: unknown;
    }>;
    NFKD: Submodule<{
        root: unknown;
        preformatted: unknown;
    }>;
}>;
declare namespace normalize {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: (In: string) => To<string>;
        NFC: NFC.submodule;
        NFD: NFD.submodule;
        NFKC: NFKC.submodule;
        NFKD: NFKD.submodule;
    };
    namespace NFC {
        type submodule = Submodule<$>;
        type $ = {
            root: (In: string) => To<string>;
            preformatted: string;
        };
    }
    namespace NFD {
        type submodule = Submodule<$>;
        type $ = {
            root: (In: string) => To<string>;
            preformatted: string;
        };
    }
    namespace NFKC {
        type submodule = Submodule<$>;
        type $ = {
            root: (In: string) => To<string>;
            preformatted: string;
        };
    }
    namespace NFKD {
        type submodule = Submodule<$>;
        type $ = {
            root: (In: string) => To<string>;
            preformatted: string;
        };
    }
}
declare namespace stringNumeric {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: string;
        parse: (In: string) => To<number>;
    };
}
declare namespace trim {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: (In: string) => To<string>;
        preformatted: string;
    };
}
declare const upper: upper.module;
declare namespace upper {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: (In: string) => To<string>;
        preformatted: string;
    };
}
declare const url: url.module;
declare namespace url {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: string;
        parse: (In: string) => To<URL>;
    };
}
declare const uuid: Module<{
    root: string;
    v4: unknown;
    v6: unknown;
    v1: unknown;
    v2: unknown;
    v3: unknown;
    v5: unknown;
    v7: unknown;
    v8: unknown;
}>;
declare namespace uuid {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: string;
        v1: string;
        v2: string;
        v3: string;
        v4: string;
        v5: string;
        v6: string;
        v7: string;
        v8: string;
    };
    namespace $ {
        type flat = {};
    }
}
declare const string: Module<{
    integer: Submodule<stringInteger.submodule>;
    trim: Submodule<trim.submodule>;
    normalize: Submodule<{
        root: unknown;
        NFC: Submodule<{
            root: unknown;
            preformatted: unknown;
        }>;
        NFD: Submodule<{
            root: unknown;
            preformatted: unknown;
        }>;
        NFKC: Submodule<{
            root: unknown;
            preformatted: unknown;
        }>;
        NFKD: Submodule<{
            root: unknown;
            preformatted: unknown;
        }>;
    }>;
    root: unknown;
    json: Submodule<stringJson.submodule>;
    date: Submodule<stringDate.submodule>;
    lower: Submodule<lower.submodule>;
    upper: Submodule<upper.submodule>;
    alpha: unknown;
    alphanumeric: unknown;
    hex: unknown;
    base64: Submodule<{
        root: unknown;
        url: unknown;
    }>;
    capitalize: Submodule<capitalize.submodule>;
    creditCard: unknown;
    digits: unknown;
    email: unknown;
    ip: Submodule<ip.submodule>;
    numeric: Submodule<stringNumeric.submodule>;
    semver: unknown;
    url: Submodule<url.submodule>;
    uuid: Submodule<{
        root: string;
        v4: unknown;
        v6: unknown;
        v1: unknown;
        v2: unknown;
        v3: unknown;
        v5: unknown;
        v7: unknown;
        v8: unknown;
    }>;
}>;
declare namespace string {
    type module = Module<string.submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: string;
        alpha: string;
        alphanumeric: string;
        hex: string;
        base64: base64.submodule;
        capitalize: capitalize.submodule;
        creditCard: string;
        date: stringDate.submodule;
        digits: string;
        email: string;
        integer: stringInteger.submodule;
        ip: ip.submodule;
        json: stringJson.submodule;
        lower: lower.submodule;
        normalize: normalize.submodule;
        numeric: stringNumeric.submodule;
        semver: string;
        trim: trim.submodule;
        upper: upper.submodule;
        url: url.submodule;
        uuid: uuid.submodule;
    };
}

declare const arkTsKeywords: arkTsKeywords;
type arkTsKeywords = Module<arkTsKeywords.$>;
declare namespace arkTsKeywords {
    type submodule = Submodule<$>;
    type $ = {
        bigint: bigint;
        boolean: boolean;
        false: false;
        never: never;
        null: null;
        number: number;
        object: object;
        string: string;
        symbol: symbol;
        true: true;
        unknown: unknown;
        undefined: undefined;
    };
}
declare const unknown: Module<{
    any: unknown;
    root: unknown;
}>;
declare namespace unknown {
    type submodule = Submodule<$>;
    type $ = {
        root: unknown;
        any: any;
    };
}
declare const json: Module<{
    stringify: unknown;
    root: unknown;
}>;
declare namespace json {
    type submodule = Submodule<$>;
    type $ = {
        root: Json;
        stringify: (In: Json) => To<string>;
    };
}
declare const object: Module<{
    root: unknown;
    json: Submodule<{
        stringify: unknown;
        root: unknown;
    }>;
}>;
declare namespace object {
    type submodule = Submodule<$>;
    type $ = {
        root: object;
        json: json.submodule;
    };
}
declare class RecordHkt extends Hkt<[Key, unknown]> {
    body: Record$1<this[0], this[1]>;
    description: string;
}
declare const Record$1: _ark_schema.GenericRoot<readonly [["K", Key], ["V", unknown]], RecordHkt>;
declare class PickHkt extends Hkt<[object, Key]> {
    body: pick<this[0], this[1] & keyof this[0]>;
}
declare const Pick: _ark_schema.GenericRoot<readonly [["T", object], ["K", Key]], PickHkt>;
declare class OmitHkt extends Hkt<[object, Key]> {
    body: omit<this[0], this[1] & keyof this[0]>;
}
declare const Omit$1: _ark_schema.GenericRoot<readonly [["T", object], ["K", Key]], OmitHkt>;
declare class PartialHkt extends Hkt<[object]> {
    body: show<Partial<this[0]>>;
}
declare const Partial: _ark_schema.GenericRoot<readonly [["T", object]], PartialHkt>;
declare class RequiredHkt extends Hkt<[object]> {
    body: show<Required<this[0]>>;
}
declare const Required: _ark_schema.GenericRoot<readonly [["T", object]], RequiredHkt>;
declare class ExcludeHkt extends Hkt<[unknown, unknown]> {
    body: Exclude$1<this[0], this[1]>;
}
declare const Exclude$1: _ark_schema.GenericRoot<readonly [["T", unknown], ["U", unknown]], ExcludeHkt>;
declare class ExtractHkt extends Hkt<[unknown, unknown]> {
    body: Extract$1<this[0], this[1]>;
}
declare const Extract$1: _ark_schema.GenericRoot<readonly [["T", unknown], ["U", unknown]], ExtractHkt>;
declare const arkTsGenerics: arkTsGenerics.module;
declare namespace arkTsGenerics {
    type module = Module<arkTsGenerics.$>;
    type submodule = Submodule<$>;
    type $ = {
        Exclude: typeof Exclude$1.t;
        Extract: typeof Extract$1.t;
        Omit: typeof Omit$1.t;
        Partial: typeof Partial.t;
        Pick: typeof Pick.t;
        Record: typeof Record$1.t;
        Required: typeof Required.t;
    };
}

interface Ark extends Omit<Ark.keywords, keyof Ark.wrapped>, Ark.wrapped {
}
declare namespace Ark {
    interface keywords extends arkTsKeywords.$, arkTsGenerics.$, arkPrototypes.keywords, arkBuiltins.$ {
    }
    interface wrapped extends arkPrototypes.wrapped {
        string: string.submodule;
        number: number.submodule;
        object: object.submodule;
        unknown: unknown.submodule;
    }
    type flat = flatResolutionsOf<Ark>;
    interface typeAttachments extends arkTsKeywords.$ {
        arrayIndex: arkPrototypes.$["Array"]["index"];
        Key: arkBuiltins.$["Key"];
        Record: arkTsGenerics.$["Record"];
        Date: arkPrototypes.$["Date"];
        Array: arkPrototypes.$["Array"]["root"];
    }
    interface boundTypeAttachments<$> extends Omit<BoundModule<typeAttachments, $>, arkKind> {
    }
}
declare const ark: Scope<Ark>;
declare const keywords: Module<Ark>;
declare const type: TypeParser<{}>;
declare namespace type {
    interface cast<to> {
        [inferred]?: to;
    }
    type errors = ArkErrors;
    type infer<def, $ = {}, args = bindThis<def>> = inferDefinition<def, $, args>;
    namespace infer {
        type In<def, $ = {}, args = {}> = distill.In<inferDefinition<def, $, args>>;
        type Out<def, $ = {}, args = {}> = distill.Out<inferDefinition<def, $, args>>;
        namespace introspectable {
            type Out<def, $ = {}, args = {}> = distill.introspectable.Out<inferDefinition<def, $, args>>;
        }
    }
    type validate<def, $ = {}, args = bindThis<def>> = validateDefinition<def, $, args>;
    type instantiate<def, $ = {}, args = bindThis<def>> = instantiateType<inferDefinition<def, $, args>, $>;
    type brand<t, id> = t extends InferredMorph<infer i, infer o> ? o["introspectable"] extends true ? (In: i) => To<Brand<o["t"], id>> : (In: i) => Out<Brand<o["t"], id>> : Brand<t, id>;
    /** @ts-ignore cast variance */
    interface Any<out t = any> extends Type<t, any> {
    }
}
type type<t = unknown, $ = {}> = Type$1<t, $>;
declare const match: MatchParser<{}>;
declare const generic: GenericParser<{}>;
declare const define: DefinitionParser<{}>;
declare const declare: DeclarationParser<{}>;

type ParameterString<params extends string = string> = `<${params}>`;
type extractParams<s extends ParameterString> = s extends ParameterString<infer params> ? params : never;
type validateParameterString<s extends ParameterString, $> = parseGenericParams<extractParams<s>, $> extends infer e extends ErrorMessage ? e : s;
type validateGenericArg<arg, param extends GenericParamAst, $> = type.infer<arg, $> extends param[1] ? unknown : ErrorType<`Invalid argument for ${param[0]}`, [expected: param[1]]>;
type GenericInstantiator<params extends array<GenericParamAst>, def, $, args$> = params["length"] extends 1 ? {
    <const a, r = instantiateGeneric<def, params, [a], $, args$>>(a: type.validate<a, args$> & validateGenericArg<a, params[0], args$>): r extends infer _ ? _ : never;
} : params["length"] extends 2 ? {
    <const a, const b, r = instantiateGeneric<def, params, [a, b], $, args$>>(...args: [
        type.validate<a, args$> & validateGenericArg<a, params[0], args$>,
        type.validate<b, args$> & validateGenericArg<b, params[1], args$>
    ]): r extends infer _ ? _ : never;
} : params["length"] extends 3 ? {
    <const a, const b, const c, r = instantiateGeneric<def, params, [a, b, c], $, args$>>(...args: [
        type.validate<a, args$> & validateGenericArg<a, params[0], args$>,
        type.validate<b, args$> & validateGenericArg<b, params[1], args$>,
        type.validate<c, args$> & validateGenericArg<c, params[2], args$>
    ]): r extends infer _ ? _ : never;
} : params["length"] extends 4 ? {
    <const a, const b, const c, const d, r = instantiateGeneric<def, params, [a, b, c, d], $, args$>>(...args: [
        type.validate<a, args$> & validateGenericArg<a, params[0], args$>,
        type.validate<b, args$> & validateGenericArg<b, params[1], args$>,
        type.validate<c, args$> & validateGenericArg<c, params[2], args$>,
        type.validate<d, args$> & validateGenericArg<d, params[3], args$>
    ]): r extends infer _ ? _ : never;
} : params["length"] extends 5 ? {
    <const a, const b, const c, const d, const e, r = instantiateGeneric<def, params, [a, b, c, d, e], $, args$>>(...args: [
        type.validate<a, args$> & validateGenericArg<a, params[0], args$>,
        type.validate<b, args$> & validateGenericArg<b, params[1], args$>,
        type.validate<c, args$> & validateGenericArg<c, params[2], args$>,
        type.validate<d, args$> & validateGenericArg<d, params[3], args$>,
        type.validate<e, args$> & validateGenericArg<e, params[4], args$>
    ]): r extends infer _ ? _ : never;
} : params["length"] extends 6 ? {
    <const a, const b, const c, const d, const e, const f, r = instantiateGeneric<def, params, [a, b, c, d, e, f], $, args$>>(...args: [
        type.validate<a, args$> & validateGenericArg<a, params[0], args$>,
        type.validate<b, args$> & validateGenericArg<b, params[1], args$>,
        type.validate<c, args$> & validateGenericArg<c, params[2], args$>,
        type.validate<d, args$> & validateGenericArg<d, params[3], args$>,
        type.validate<e, args$> & validateGenericArg<e, params[4], args$>,
        type.validate<f, args$> & validateGenericArg<f, params[5], args$>
    ]): r extends infer _ ? _ : never;
} : (error: ErrorMessage<`You may not define more than 6 positional generic parameters`>) => never;
type instantiateGeneric<def, params extends array<GenericParamAst>, args, $, args$> = Type$1<[
    def
] extends [Hkt] ? Hkt.apply<def, {
    [i in keyof args]: type.infer<args[i], args$>;
}> : inferDefinition<def, $, bindGenericArgs<params, args$, args>>, args$>;
type bindGenericArgs<params extends array<GenericParamAst>, $, args> = {
    [i in keyof params & `${number}` as params[i][0]]: type.infer<args[i & keyof args], $>;
};
type baseGenericResolutions<params extends array<GenericParamAst>, $> = baseGenericConstraints<params> extends infer baseConstraints ? {
    [k in keyof baseConstraints]: Type$1<baseConstraints[k], $>;
} : never;
type baseGenericConstraints<params extends array<GenericParamAst>> = {
    [i in keyof params & `${number}` as params[i][0]]: params[i][1];
};
type GenericConstructor<params extends array<GenericParamAst> = array<GenericParamAst>, bodyDef = unknown, $ = {}, arg$ = {}> = new () => Generic<params, bodyDef, $, arg$>;
interface Generic<params extends array<GenericParamAst> = array<GenericParamAst>, bodyDef = unknown, $ = {}, arg$ = $> extends Callable<GenericInstantiator<params, bodyDef, $, arg$>> {
    [arkKind]: "generic";
    t: GenericAst<params, bodyDef, $, arg$>;
    bodyDef: bodyDef;
    params: {
        [i in keyof params]: [params[i][0], Type$1<params[i][1], $>];
    };
    names: genericParamNames<params>;
    constraints: {
        [i in keyof params]: Type$1<params[i][1], $>;
    };
    $: Scope<$>;
    arg$: Scope<arg$>;
    internal: GenericRoot;
    json: JsonStructure;
}
declare const Generic: GenericConstructor;
type GenericDeclaration<name extends string = string, params extends ParameterString = ParameterString> = `${name}${params}`;
type parseValidGenericParams<def extends ParameterString, $> = conform<parseGenericParams<extractParams<def>, $>, array<GenericParamAst>>;
declare const emptyGenericParameterMessage = "An empty string is not a valid generic parameter name";
type emptyGenericParameterMessage = typeof emptyGenericParameterMessage;
type parseGenericParams<def extends string, $> = parseNextNameChar<ArkTypeScanner.skipWhitespace<def>, "", [
], $>;
type ParamsTerminator = WhitespaceChar | ",";
type parseName<unscanned extends string, result extends array<GenericParamAst>, $> = parseNextNameChar<ArkTypeScanner.skipWhitespace<unscanned>, "", result, $>;
type parseNextNameChar<unscanned extends string, name extends string, result extends array<GenericParamAst>, $> = unscanned extends `${infer lookahead}${infer nextUnscanned}` ? lookahead extends ParamsTerminator ? name extends "" ? ErrorMessage<emptyGenericParameterMessage> : lookahead extends "," ? parseName<nextUnscanned, [...result, [name, unknown]], $> : lookahead extends WhitespaceChar ? _parseOptionalConstraint<nextUnscanned, name, result, $> : never : parseNextNameChar<nextUnscanned, `${name}${lookahead}`, result, $> : name extends "" ? result : [...result, [name, unknown]];
declare const extendsToken = "extends ";
type extendsToken = typeof extendsToken;
declare const _parseOptionalConstraint: (scanner: ArkTypeScanner, name: string, result: GenericParamDef[], ctx: BaseParseContext) => GenericParamDef[];
type _parseOptionalConstraint<unscanned extends string, name extends string, result extends array<GenericParamAst>, $> = ArkTypeScanner.skipWhitespace<unscanned> extends (`${extendsToken}${infer nextUnscanned}`) ? parseUntilFinalizer<state.initialize<nextUnscanned>, $, {}> extends (infer finalArgState extends StaticState) ? validateAst<finalArgState["root"], $, {}> extends (infer e extends ErrorMessage) ? e : parseName<finalArgState["unscanned"], [
    ...result,
    [name, inferAstRoot<finalArgState["root"], $, {}>]
], $> : never : parseName<ArkTypeScanner.skipWhitespace<unscanned> extends (`,${infer nextUnscanned}`) ? nextUnscanned : unscanned, [
    ...result,
    [name, unknown]
], $>;
type genericParamDefToAst<schema extends GenericParamDef, $> = schema extends string ? [schema, unknown] : schema extends readonly [infer name, infer def] ? [name, type.infer<def, $>] : never;
type genericParamDefsToAst<defs extends array<GenericParamDef>, $> = [
    ...{
        [i in keyof defs]: genericParamDefToAst<defs[i], $>;
    }
];
type GenericParser<$ = {}> = <const paramsDef extends array<GenericParamDef>>(...params: {
    [i in keyof paramsDef]: paramsDef[i] extends (readonly [infer name, infer def]) ? readonly [name, type.validate<def, $>] : paramsDef[i];
}) => GenericBodyParser<genericParamDefsToAst<paramsDef, $>, $>;
interface GenericBodyParser<params extends array<GenericParamAst>, $> {
    <const body>(body: type.validate<body, $, baseGenericConstraints<params>>): Generic<params, body, $, $>;
    <hkt extends Hkt.constructor>(instantiateDef: LazyGenericBody<baseGenericResolutions<params, $>>, hkt: hkt): Generic<params, InstanceType<hkt>, $, $>;
}

declare const Module: new <$ extends {}>(exports: exportScope<$>) => Module<$>;
interface Module<$ extends {} = {}> extends RootModule<exportScope<$>> {
}
type exportScope<$> = bindExportsToScope<$, $>;
declare const BoundModule: new <exports extends {}, $ extends {}>(exports: bindExportsToScope<exports, $>, $: $) => BoundModule<exports, $>;
interface BoundModule<exports extends {}, $> extends RootModule<bindExportsToScope<exports, $>> {
}
type bindExportsToScope<exports, $> = {
    [k in keyof exports]: instantiateExport<exports[k], $>;
} & unknown;
type Submodule<exports extends {}> = RootModule<exports & ("root" extends keyof exports ? {
    [inferred]: exports["root"];
} : {})>;
type instantiateExport<t, $> = [
    t
] extends [PreparsedNodeResolution] ? [
    t
] extends [anyOrNever] ? Type$1<t, $> : t extends GenericAst<infer params, infer body, infer body$> ? Generic<params, body, body$, $> : t extends Submodule<infer exports> ? BoundModule<exports, $> : never : Type$1<t, $>;

declare class liftFromHkt extends Hkt<[element: unknown]> {
    body: liftArray<this[0]> extends infer lifted ? (In: this[0] | lifted) => To<lifted> : never;
}
declare const liftFrom: _ark_schema.GenericRoot<readonly [["element", unknown]], liftFromHkt>;
declare const arkArray: arkArray.module;
declare namespace arkArray {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: unknown[];
        readonly: readonly unknown[];
        index: NonNegativeIntegerString;
        liftFrom: typeof liftFrom.t;
    };
}
type NonNegativeIntegerString = `${Digit}` | (`${Exclude<Digit, 0>}${string}` & `${bigint}`);

type FormDataValue = string | File;
type ParsedFormData = Record<string, FormDataValue | FormDataValue[]>;
declare const arkFormData: arkFormData.module;
declare namespace arkFormData {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    type $ = {
        root: FormData;
        value: FormDataValue;
        parse: (In: FormData) => To<ParsedFormData>;
        parsed: ParsedFormData;
    };
}

declare const TypedArray: TypedArray.module;
declare namespace TypedArray {
    type module = Module<TypedArray.$>;
    type submodule = Submodule<$>;
    type $ = {
        Int8: Int8Array;
        Uint8: Uint8Array;
        Uint8Clamped: Uint8ClampedArray;
        Int16: Int16Array;
        Uint16: Uint16Array;
        Int32: Int32Array;
        Uint32: Uint32Array;
        Float32: Float32Array;
        Float64: Float64Array;
        BigInt64: BigInt64Array;
        BigUint64: BigUint64Array;
    };
}

declare const omittedPrototypes: {
    Boolean: 1;
    Number: 1;
    String: 1;
};
declare const arkPrototypes: arkPrototypes.module;
declare namespace arkPrototypes {
    type module = Module<submodule>;
    type submodule = Submodule<$>;
    interface keywords extends ecmascript, platform {
    }
    interface $ extends Omit<keywords, keyof wrapped>, wrapped {
    }
    interface wrapped {
        Array: arkArray.submodule;
        TypedArray: TypedArray.submodule;
        FormData: arkFormData.submodule;
    }
    type ecmascript = Omit<EcmascriptObjects, keyof typeof omittedPrototypes>;
    type platform = PlatformObjects;
    interface instances extends ecmascript, platform {
    }
    type instanceOf<name extends keyof instances = keyof instances> = instances[name];
}

type DateLiteral<source extends string = string> = `d"${source}"` | `d'${source}'`;
type LimitLiteral = number | DateLiteral;
type distill<t, endpoint extends distill.Endpoint> = finalizeDistillation<t, _distill<t, endpoint, never>>;
declare namespace distill {
    type Endpoint = "in" | "out" | "out.introspectable";
    type In<t> = distill<t, "in">;
    type Out<t> = distill<t, "out">;
    namespace introspectable {
        type Out<t> = distill<t, "out.introspectable">;
    }
}
type finalizeDistillation<t, distilled> = equals<t, distilled> extends true ? t : distilled;
type _distill<t, endpoint extends distill.Endpoint, seen> = t extends undefined ? t : [t] extends [anyOrNever | seen] ? t : unknown extends t ? unknown : t extends Brand<infer base> ? endpoint extends "in" ? base : t : t extends TerminallyInferredObject | Primitive ? t : t extends Function ? t extends (...args: never) => anyOrNever ? t : t extends InferredMorph<infer i, infer o> ? distillIo<i, o, endpoint, seen> : t : t extends Default<infer constraint> ? _distill<constraint, endpoint, seen> : t extends array ? distillArray<t, endpoint, seen | t> : isSafelyMappable<t> extends true ? distillMappable<t, endpoint, seen | t> : t;
type distillMappable<o, endpoint extends distill.Endpoint, seen> = endpoint extends "in" ? show<{
    [k in keyof o as k extends inferredDefaultKeyOf<o> ? never : k]: _distill<o[k], endpoint, seen>;
} & {
    [k in inferredDefaultKeyOf<o>]?: _distill<o[k], endpoint, seen>;
}> : {
    [k in keyof o]: _distill<o[k], endpoint, seen>;
};
type distillIo<i, o extends Out, endpoint extends distill.Endpoint, seen> = endpoint extends "out" ? _distill<o["t"], endpoint, seen> : endpoint extends "in" ? _distill<i, endpoint, seen> : o extends To<infer validatedOut> ? _distill<validatedOut, endpoint, seen> : unknown;
type unwrapInput<t> = t extends InferredMorph<infer i> ? t extends anyOrNever ? t : i : t;
type inferredDefaultKeyOf<o> = keyof o extends infer k ? k extends keyof o ? unwrapInput<o[k]> extends Default<infer t> ? [
    t
] extends [anyOrNever] ? never : k : never : never : never;
type distillArray<t extends array, endpoint extends distill.Endpoint, seen> = t[number][] extends t ? alignReadonly<_distill<t[number], endpoint, seen>[], t> : distillNonArraykeys<t, alignReadonly<distillArrayFromPrefix<[...t], endpoint, seen, []>, t>, endpoint, seen>;
type alignReadonly<result extends unknown[], original extends array> = original extends unknown[] ? result : Readonly<result>;
type distillNonArraykeys<originalArray extends array, distilledArray, endpoint extends distill.Endpoint, seen> = keyof originalArray extends keyof distilledArray ? distilledArray : distilledArray & _distill<{
    [k in keyof originalArray as k extends keyof distilledArray ? never : k]: originalArray[k];
}, endpoint, seen>;
type distillArrayFromPrefix<t extends array, endpoint extends distill.Endpoint, seen, prefix extends array> = t extends readonly [infer head, ...infer tail] ? distillArrayFromPrefix<tail, endpoint, seen, [
    ...prefix,
    _distill<head, endpoint, seen>
]> : [...prefix, ...distillArrayFromPostfix<t, endpoint, seen, []>];
type distillArrayFromPostfix<t extends array, endpoint extends distill.Endpoint, seen, postfix extends array> = t extends readonly [...infer init, infer last] ? distillArrayFromPostfix<init, endpoint, seen, [
    _distill<last, endpoint, seen>,
    ...postfix
]> : [...{
    [i in keyof t]: _distill<t[i], endpoint, seen>;
}, ...postfix];
type BuiltinTerminalObjectKind = Exclude<keyof arkPrototypes.instances, "Array" | "Function">;
/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObject = arkPrototypes.instanceOf<BuiltinTerminalObjectKind> | ArkEnv.prototypes;
type inferPredicate<t, predicate> = predicate extends (data: any, ...args: any[]) => data is infer narrowed ? narrowed : t;
type inferPipes<t, pipes extends Morph[]> = pipes extends [infer head extends Morph, ...infer tail extends Morph[]] ? inferPipes<head extends type.cast<infer tPipe> ? inferPipe<t, tPipe> : inferMorphOut<head> extends infer out ? (In: distill.In<t>) => Out<out> : never, tail> : t;
type inferMorphOut<morph extends Morph> = Exclude<ReturnType<morph>, ArkError | ArkErrors>;
declare const isMorphOutKey: " isMorphOut";
interface Out<o = any> {
    [isMorphOutKey]: true;
    t: o;
    introspectable: boolean;
}
interface To<o = any> extends Out<o> {
    introspectable: true;
}
type InferredMorph<i = any, o extends Out = Out> = (In: i) => o;
declare const defaultsToKey: " defaultsTo";
type Default<t = unknown, v = unknown> = {
    [defaultsToKey]: [t, v];
};
type withDefault<t, v, undistributed = t> = t extends InferredMorph ? addDefaultToMorph<t, v> : Default<Exclude<undistributed, InferredMorph>, v>;
type addDefaultToMorph<t extends InferredMorph, v> = [
    normalizeMorphDistribution<t>
] extends [InferredMorph<infer i, infer o>] ? (In: Default<i, v>) => o : never;
type normalizeMorphDistribution<t, undistributedIn = t extends InferredMorph<infer i> ? i : never, undistributedOut extends Out = t extends InferredMorph<any, infer o> ? [
    o
] extends [To<infer unwrappedOut>] ? To<unwrappedOut> : o : never> = (Extract<t, InferredMorph> extends anyOrNever ? never : Extract<t, InferredMorph> extends InferredMorph<infer i, infer o> ? [
    undistributedOut
] extends [o] ? (In: undistributedIn) => undistributedOut : [undistributedIn] extends [i] ? (In: undistributedIn) => undistributedOut : t : never) | Exclude<t, InferredMorph> extends infer _ ? _ : never;
type defaultFor<t = unknown> = (Primitive extends t ? Primitive : t extends Primitive ? t : never) | (() => t);
type inferIntersection<l, r> = normalizeMorphDistribution<_inferIntersection<l, r, false>>;
type inferPipe<l, r> = normalizeMorphDistribution<_inferIntersection<l, r, true>>;
type _inferIntersection<l, r, piped extends boolean> = [
    l & r
] extends [infer t extends anyOrNever] ? t : l extends InferredMorph<infer lIn, infer lOut> ? r extends InferredMorph<any, infer rOut> ? piped extends true ? (In: lIn) => rOut : never : piped extends true ? (In: lIn) => To<r> : (In: _inferIntersection<lIn, r, false>) => lOut : r extends InferredMorph<infer rIn, infer rOut> ? (In: _inferIntersection<rIn, l, false>) => rOut : [l, r] extends [object, object] ? intersectObjects<l, r, piped> extends infer result ? result : never : l & r;
interface MorphableIntersection<piped extends boolean> extends Hkt<[unknown, unknown]> {
    body: _inferIntersection<this[0], this[1], piped>;
}
type intersectObjects<l, r, piped extends boolean> = l extends array ? r extends array ? intersectArrays<l, r, MorphableIntersection<piped>> : // for an intersection with exactly one array operand like { name: string } & string[],
l & r : r extends array ? l & r : show<{
    [k in keyof l]: k extends keyof r ? _inferIntersection<l[k], r[k], piped> : l[k];
} & {
    [k in keyof r]: k extends keyof l ? _inferIntersection<l[k], r[k], piped> : r[k];
}>;

export { Ark, ArkAmbient, type ArkConfig, BoundModule, Generic, type KeywordConfig, Module, Scope, type Submodule, Type$1 as Type, type TypeMeta, type TypeMetaInput, ark, configure, declare, define, distill, generic, keywords, match, scope, type };
