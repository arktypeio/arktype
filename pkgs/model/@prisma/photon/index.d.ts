import { DMMF, DMMFClass, Engine } from './runtime';
/**
 * Utility Types
 */
export declare type Enumerable<T> = T | Array<T>;
export declare type MergeTruthyValues<R extends object, S extends object> = {
    [key in keyof S | keyof R]: key extends false ? never : key extends keyof S ? S[key] extends false ? never : S[key] : key extends keyof R ? R[key] : never;
};
export declare type CleanupNever<T> = {
    [key in keyof T]: T[key] extends never ? never : key;
}[keyof T];
/**
 * Subset
 * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
 */
export declare type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
};
/**
 * A PhotonRequestError is an error that is thrown in conjunction to a concrete query that has been performed with Photon.js.
 */
export declare class PhotonRequestError extends Error {
    message: string;
    code?: string | undefined;
    meta?: any;
    constructor(message: string, code?: string | undefined, meta?: any);
}
declare class PhotonFetcher {
    private readonly photon;
    private readonly engine;
    private readonly debug;
    private readonly hooks?;
    constructor(photon: Photon, engine: Engine, debug?: boolean, hooks?: Hooks | undefined);
    request<T>(document: any, path?: string[], rootField?: string, typeName?: string, isList?: boolean, callsite?: string): Promise<T>;
    protected unpack(document: any, data: any, path: string[], rootField?: string, isList?: boolean): any;
}
/**
 * Client
**/
export declare type Datasources = {
    db?: string;
};
export declare type LogLevel = 'INFO' | 'WARN' | 'QUERY';
export declare type LogOption = LogLevel | {
    level: LogLevel;
    /**
     * @default 'stdout'
     */
    emit?: 'event' | 'stdout';
};
export interface PhotonOptions {
    datasources?: Datasources;
    /**
     * @default false
     */
    log?: boolean | LogOption[];
    debug?: any;
    /**
     * You probably don't want to use this. `__internal` is used by internal tooling.
     */
    __internal?: {
        debug?: boolean;
        hooks?: Hooks;
        engine?: {
            cwd?: string;
            binaryPath?: string;
        };
    };
}
export declare type Hooks = {
    beforeRequest?: (options: {
        query: string;
        path: string[];
        rootField?: string;
        typeName?: string;
        document: any;
    }) => any;
};
export declare class Photon {
    private fetcher;
    private readonly dmmf;
    private readonly engine;
    private connectionPromise?;
    constructor(options?: PhotonOptions);
    private connectEngine;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get tags(): TagDelegate;
    get selectors(): SelectorDelegate;
    get steps(): StepDelegate;
    get tests(): TestDelegate;
    get users(): UserDelegate;
}
export declare const OrderByArg: {
    asc: "asc";
    desc: "desc";
};
export declare type OrderByArg = (typeof OrderByArg)[keyof typeof OrderByArg];
/**
 * Model Tag
 */
export declare type Tag = {
    id: number;
    name: string;
};
export declare type TagScalars = 'id' | 'name';
export declare type TagSelect = {
    id?: boolean;
    user?: boolean | UserSelectArgsOptional;
    name?: boolean;
    test?: boolean | TestSelectArgsOptional;
};
export declare type TagInclude = {
    user?: boolean | UserIncludeArgsOptional;
    test?: boolean | TestIncludeArgsOptional;
};
declare type TagDefault = {
    id: true;
    name: true;
};
declare type TagGetSelectPayload<S extends boolean | TagSelect> = S extends true ? Tag : S extends TagSelect ? {
    [P in CleanupNever<MergeTruthyValues<{}, S>>]: P extends TagScalars ? Tag[P] : P extends 'user' ? UserGetSelectPayload<ExtractUserSelectArgs<S[P]>> : P extends 'test' ? TestGetSelectPayload<ExtractTestSelectArgs<S[P]>> | null : never;
} : never;
declare type TagGetIncludePayload<S extends boolean | TagInclude> = S extends true ? Tag : S extends TagInclude ? {
    [P in CleanupNever<MergeTruthyValues<TagDefault, S>>]: P extends TagScalars ? Tag[P] : P extends 'user' ? UserGetIncludePayload<ExtractUserIncludeArgs<S[P]>> : P extends 'test' ? TestGetIncludePayload<ExtractTestIncludeArgs<S[P]>> | null : never;
} : never;
export interface TagDelegate {
    <T extends FindManyTagArgs>(args?: Subset<T, FindManyTagArgs>): T extends FindManyTagArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyTagSelectArgs ? Promise<Array<TagGetSelectPayload<ExtractFindManyTagSelectArgs<T>>>> : T extends FindManyTagIncludeArgs ? Promise<Array<TagGetIncludePayload<ExtractFindManyTagIncludeArgs<T>>>> : Promise<Array<Tag>>;
    findOne<T extends FindOneTagArgs>(args: Subset<T, FindOneTagArgs>): T extends FindOneTagArgsRequired ? 'Please either choose `select` or `include`' : T extends FindOneTagSelectArgs ? Promise<TagGetSelectPayload<ExtractFindOneTagSelectArgs<T>> | null> : T extends FindOneTagIncludeArgs ? Promise<TagGetIncludePayload<ExtractFindOneTagIncludeArgs<T>> | null> : TagClient<Tag | null>;
    findMany<T extends FindManyTagArgs>(args?: Subset<T, FindManyTagArgs>): T extends FindManyTagArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyTagSelectArgs ? Promise<Array<TagGetSelectPayload<ExtractFindManyTagSelectArgs<T>>>> : T extends FindManyTagIncludeArgs ? Promise<Array<TagGetIncludePayload<ExtractFindManyTagIncludeArgs<T>>>> : Promise<Array<Tag>>;
    create<T extends TagCreateArgs>(args: Subset<T, TagCreateArgs>): T extends TagCreateArgsRequired ? 'Please either choose `select` or `include`' : T extends TagSelectCreateArgs ? Promise<TagGetSelectPayload<ExtractTagSelectCreateArgs<T>>> : T extends TagIncludeCreateArgs ? Promise<TagGetIncludePayload<ExtractTagIncludeCreateArgs<T>>> : TagClient<Tag>;
    delete<T extends TagDeleteArgs>(args: Subset<T, TagDeleteArgs>): T extends TagDeleteArgsRequired ? 'Please either choose `select` or `include`' : T extends TagSelectDeleteArgs ? Promise<TagGetSelectPayload<ExtractTagSelectDeleteArgs<T>>> : T extends TagIncludeDeleteArgs ? Promise<TagGetIncludePayload<ExtractTagIncludeDeleteArgs<T>>> : TagClient<Tag>;
    update<T extends TagUpdateArgs>(args: Subset<T, TagUpdateArgs>): T extends TagUpdateArgsRequired ? 'Please either choose `select` or `include`' : T extends TagSelectUpdateArgs ? Promise<TagGetSelectPayload<ExtractTagSelectUpdateArgs<T>>> : T extends TagIncludeUpdateArgs ? Promise<TagGetIncludePayload<ExtractTagIncludeUpdateArgs<T>>> : TagClient<Tag>;
    deleteMany<T extends TagDeleteManyArgs>(args: Subset<T, TagDeleteManyArgs>): Promise<BatchPayload>;
    updateMany<T extends TagUpdateManyArgs>(args: Subset<T, TagUpdateManyArgs>): Promise<BatchPayload>;
    upsert<T extends TagUpsertArgs>(args: Subset<T, TagUpsertArgs>): T extends TagUpsertArgsRequired ? 'Please either choose `select` or `include`' : T extends TagSelectUpsertArgs ? Promise<TagGetSelectPayload<ExtractTagSelectUpsertArgs<T>>> : T extends TagIncludeUpsertArgs ? Promise<TagGetIncludePayload<ExtractTagIncludeUpsertArgs<T>>> : TagClient<Tag>;
    count(): Promise<number>;
}
export declare class TagClient<T> implements Promise<T> {
    private readonly _dmmf;
    private readonly _fetcher;
    private readonly _queryType;
    private readonly _rootField;
    private readonly _clientMethod;
    private readonly _args;
    private readonly _path;
    private _isList;
    private _callsite;
    private _requestPromise?;
    constructor(_dmmf: DMMFClass, _fetcher: PhotonFetcher, _queryType: 'query' | 'mutation', _rootField: string, _clientMethod: string, _args: any, _path: string[], _isList?: boolean);
    readonly [Symbol.toStringTag]: 'PhotonPromise';
    user<T extends UserArgs = {}>(args?: Subset<T, UserArgs>): T extends FindOneUserArgsRequired ? 'Please either choose `select` or `include`' : T extends UserSelectArgs ? Promise<UserGetSelectPayload<ExtractUserSelectArgs<T>> | null> : T extends UserIncludeArgs ? Promise<UserGetIncludePayload<ExtractUserIncludeArgs<T>> | null> : UserClient<User | null>;
    test<T extends TestArgs = {}>(args?: Subset<T, TestArgs>): T extends FindOneTestArgsRequired ? 'Please either choose `select` or `include`' : T extends TestSelectArgs ? Promise<TestGetSelectPayload<ExtractTestSelectArgs<T>> | null> : T extends TestIncludeArgs ? Promise<TestGetIncludePayload<ExtractTestIncludeArgs<T>> | null> : TestClient<Test | null>;
    private get _document();
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | Promise<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | Promise<TResult>) | undefined | null): Promise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
}
/**
 * Tag findOne
 */
export declare type FindOneTagArgs = {
    select?: TagSelect | null;
    include?: TagInclude | null;
    where: TagWhereUniqueInput;
};
export declare type FindOneTagArgsRequired = {
    select: TagSelect;
    include: TagInclude;
    where: TagWhereUniqueInput;
};
export declare type FindOneTagSelectArgs = {
    select: TagSelect;
    where: TagWhereUniqueInput;
};
export declare type FindOneTagSelectArgsOptional = {
    select?: TagSelect | null;
    where: TagWhereUniqueInput;
};
export declare type FindOneTagIncludeArgs = {
    include: TagInclude;
    where: TagWhereUniqueInput;
};
export declare type FindOneTagIncludeArgsOptional = {
    include?: TagInclude | null;
    where: TagWhereUniqueInput;
};
export declare type ExtractFindOneTagSelectArgs<S extends undefined | boolean | FindOneTagSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindOneTagSelectArgs ? S['select'] : true;
export declare type ExtractFindOneTagIncludeArgs<S extends undefined | boolean | FindOneTagIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindOneTagIncludeArgs ? S['include'] : true;
/**
 * Tag findMany
 */
export declare type FindManyTagArgs = {
    select?: TagSelect | null;
    include?: TagInclude | null;
    where?: TagWhereInput | null;
    orderBy?: TagOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyTagArgsRequired = {
    select: TagSelect;
    include: TagInclude;
    where?: TagWhereInput | null;
    orderBy?: TagOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyTagSelectArgs = {
    select: TagSelect;
    where?: TagWhereInput | null;
    orderBy?: TagOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyTagSelectArgsOptional = {
    select?: TagSelect | null;
    where?: TagWhereInput | null;
    orderBy?: TagOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyTagIncludeArgs = {
    include: TagInclude;
    where?: TagWhereInput | null;
    orderBy?: TagOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyTagIncludeArgsOptional = {
    include?: TagInclude | null;
    where?: TagWhereInput | null;
    orderBy?: TagOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type ExtractFindManyTagSelectArgs<S extends undefined | boolean | FindManyTagSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindManyTagSelectArgs ? S['select'] : true;
export declare type ExtractFindManyTagIncludeArgs<S extends undefined | boolean | FindManyTagIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindManyTagIncludeArgs ? S['include'] : true;
/**
 * Tag create
 */
export declare type TagCreateArgs = {
    select?: TagSelect | null;
    include?: TagInclude | null;
    data: TagCreateInput;
};
export declare type TagCreateArgsRequired = {
    select: TagSelect;
    include: TagInclude;
    data: TagCreateInput;
};
export declare type TagSelectCreateArgs = {
    select: TagSelect;
    data: TagCreateInput;
};
export declare type TagSelectCreateArgsOptional = {
    select?: TagSelect | null;
    data: TagCreateInput;
};
export declare type TagIncludeCreateArgs = {
    include: TagInclude;
    data: TagCreateInput;
};
export declare type TagIncludeCreateArgsOptional = {
    include?: TagInclude | null;
    data: TagCreateInput;
};
export declare type ExtractTagSelectCreateArgs<S extends undefined | boolean | TagSelectCreateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TagSelectCreateArgs ? S['select'] : true;
export declare type ExtractTagIncludeCreateArgs<S extends undefined | boolean | TagIncludeCreateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TagIncludeCreateArgs ? S['include'] : true;
/**
 * Tag update
 */
export declare type TagUpdateArgs = {
    select?: TagSelect | null;
    include?: TagInclude | null;
    data: TagUpdateInput;
    where: TagWhereUniqueInput;
};
export declare type TagUpdateArgsRequired = {
    select: TagSelect;
    include: TagInclude;
    data: TagUpdateInput;
    where: TagWhereUniqueInput;
};
export declare type TagSelectUpdateArgs = {
    select: TagSelect;
    data: TagUpdateInput;
    where: TagWhereUniqueInput;
};
export declare type TagSelectUpdateArgsOptional = {
    select?: TagSelect | null;
    data: TagUpdateInput;
    where: TagWhereUniqueInput;
};
export declare type TagIncludeUpdateArgs = {
    include: TagInclude;
    data: TagUpdateInput;
    where: TagWhereUniqueInput;
};
export declare type TagIncludeUpdateArgsOptional = {
    include?: TagInclude | null;
    data: TagUpdateInput;
    where: TagWhereUniqueInput;
};
export declare type ExtractTagSelectUpdateArgs<S extends undefined | boolean | TagSelectUpdateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TagSelectUpdateArgs ? S['select'] : true;
export declare type ExtractTagIncludeUpdateArgs<S extends undefined | boolean | TagIncludeUpdateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TagIncludeUpdateArgs ? S['include'] : true;
/**
 * Tag updateMany
 */
export declare type TagUpdateManyArgs = {
    data: TagUpdateManyMutationInput;
    where?: TagWhereInput | null;
};
/**
 * Tag upsert
 */
export declare type TagUpsertArgs = {
    select?: TagSelect | null;
    include?: TagInclude | null;
    where: TagWhereUniqueInput;
    create: TagCreateInput;
    update: TagUpdateInput;
};
export declare type TagUpsertArgsRequired = {
    select: TagSelect;
    include: TagInclude;
    where: TagWhereUniqueInput;
    create: TagCreateInput;
    update: TagUpdateInput;
};
export declare type TagSelectUpsertArgs = {
    select: TagSelect;
    where: TagWhereUniqueInput;
    create: TagCreateInput;
    update: TagUpdateInput;
};
export declare type TagSelectUpsertArgsOptional = {
    select?: TagSelect | null;
    where: TagWhereUniqueInput;
    create: TagCreateInput;
    update: TagUpdateInput;
};
export declare type TagIncludeUpsertArgs = {
    include: TagInclude;
    where: TagWhereUniqueInput;
    create: TagCreateInput;
    update: TagUpdateInput;
};
export declare type TagIncludeUpsertArgsOptional = {
    include?: TagInclude | null;
    where: TagWhereUniqueInput;
    create: TagCreateInput;
    update: TagUpdateInput;
};
export declare type ExtractTagSelectUpsertArgs<S extends undefined | boolean | TagSelectUpsertArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TagSelectUpsertArgs ? S['select'] : true;
export declare type ExtractTagIncludeUpsertArgs<S extends undefined | boolean | TagIncludeUpsertArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TagIncludeUpsertArgs ? S['include'] : true;
/**
 * Tag delete
 */
export declare type TagDeleteArgs = {
    select?: TagSelect | null;
    include?: TagInclude | null;
    where: TagWhereUniqueInput;
};
export declare type TagDeleteArgsRequired = {
    select: TagSelect;
    include: TagInclude;
    where: TagWhereUniqueInput;
};
export declare type TagSelectDeleteArgs = {
    select: TagSelect;
    where: TagWhereUniqueInput;
};
export declare type TagSelectDeleteArgsOptional = {
    select?: TagSelect | null;
    where: TagWhereUniqueInput;
};
export declare type TagIncludeDeleteArgs = {
    include: TagInclude;
    where: TagWhereUniqueInput;
};
export declare type TagIncludeDeleteArgsOptional = {
    include?: TagInclude | null;
    where: TagWhereUniqueInput;
};
export declare type ExtractTagSelectDeleteArgs<S extends undefined | boolean | TagSelectDeleteArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TagSelectDeleteArgs ? S['select'] : true;
export declare type ExtractTagIncludeDeleteArgs<S extends undefined | boolean | TagIncludeDeleteArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TagIncludeDeleteArgs ? S['include'] : true;
/**
 * Tag deleteMany
 */
export declare type TagDeleteManyArgs = {
    where?: TagWhereInput | null;
};
/**
 * Tag without action
 */
export declare type TagArgs = {
    select?: TagSelect | null;
    include?: TagInclude | null;
};
export declare type TagArgsRequired = {
    select: TagSelect;
    include: TagInclude;
};
export declare type TagSelectArgs = {
    select: TagSelect;
};
export declare type TagSelectArgsOptional = {
    select?: TagSelect | null;
};
export declare type TagIncludeArgs = {
    include: TagInclude;
};
export declare type TagIncludeArgsOptional = {
    include?: TagInclude | null;
};
export declare type ExtractTagSelectArgs<S extends undefined | boolean | TagSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TagSelectArgs ? S['select'] : true;
export declare type ExtractTagIncludeArgs<S extends undefined | boolean | TagIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TagIncludeArgs ? S['include'] : true;
/**
 * Model Selector
 */
export declare type Selector = {
    id: number;
    css: string;
};
export declare type SelectorScalars = 'id' | 'css';
export declare type SelectorSelect = {
    id?: boolean;
    css?: boolean;
    steps?: boolean | FindManyStepSelectArgsOptional;
    user?: boolean | UserSelectArgsOptional;
};
export declare type SelectorInclude = {
    steps?: boolean | FindManyStepIncludeArgsOptional;
    user?: boolean | UserIncludeArgsOptional;
};
declare type SelectorDefault = {
    id: true;
    css: true;
};
declare type SelectorGetSelectPayload<S extends boolean | SelectorSelect> = S extends true ? Selector : S extends SelectorSelect ? {
    [P in CleanupNever<MergeTruthyValues<{}, S>>]: P extends SelectorScalars ? Selector[P] : P extends 'steps' ? Array<StepGetSelectPayload<ExtractFindManyStepSelectArgs<S[P]>>> : P extends 'user' ? UserGetSelectPayload<ExtractUserSelectArgs<S[P]>> | null : never;
} : never;
declare type SelectorGetIncludePayload<S extends boolean | SelectorInclude> = S extends true ? Selector : S extends SelectorInclude ? {
    [P in CleanupNever<MergeTruthyValues<SelectorDefault, S>>]: P extends SelectorScalars ? Selector[P] : P extends 'steps' ? Array<StepGetIncludePayload<ExtractFindManyStepIncludeArgs<S[P]>>> : P extends 'user' ? UserGetIncludePayload<ExtractUserIncludeArgs<S[P]>> | null : never;
} : never;
export interface SelectorDelegate {
    <T extends FindManySelectorArgs>(args?: Subset<T, FindManySelectorArgs>): T extends FindManySelectorArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManySelectorSelectArgs ? Promise<Array<SelectorGetSelectPayload<ExtractFindManySelectorSelectArgs<T>>>> : T extends FindManySelectorIncludeArgs ? Promise<Array<SelectorGetIncludePayload<ExtractFindManySelectorIncludeArgs<T>>>> : Promise<Array<Selector>>;
    findOne<T extends FindOneSelectorArgs>(args: Subset<T, FindOneSelectorArgs>): T extends FindOneSelectorArgsRequired ? 'Please either choose `select` or `include`' : T extends FindOneSelectorSelectArgs ? Promise<SelectorGetSelectPayload<ExtractFindOneSelectorSelectArgs<T>> | null> : T extends FindOneSelectorIncludeArgs ? Promise<SelectorGetIncludePayload<ExtractFindOneSelectorIncludeArgs<T>> | null> : SelectorClient<Selector | null>;
    findMany<T extends FindManySelectorArgs>(args?: Subset<T, FindManySelectorArgs>): T extends FindManySelectorArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManySelectorSelectArgs ? Promise<Array<SelectorGetSelectPayload<ExtractFindManySelectorSelectArgs<T>>>> : T extends FindManySelectorIncludeArgs ? Promise<Array<SelectorGetIncludePayload<ExtractFindManySelectorIncludeArgs<T>>>> : Promise<Array<Selector>>;
    create<T extends SelectorCreateArgs>(args: Subset<T, SelectorCreateArgs>): T extends SelectorCreateArgsRequired ? 'Please either choose `select` or `include`' : T extends SelectorSelectCreateArgs ? Promise<SelectorGetSelectPayload<ExtractSelectorSelectCreateArgs<T>>> : T extends SelectorIncludeCreateArgs ? Promise<SelectorGetIncludePayload<ExtractSelectorIncludeCreateArgs<T>>> : SelectorClient<Selector>;
    delete<T extends SelectorDeleteArgs>(args: Subset<T, SelectorDeleteArgs>): T extends SelectorDeleteArgsRequired ? 'Please either choose `select` or `include`' : T extends SelectorSelectDeleteArgs ? Promise<SelectorGetSelectPayload<ExtractSelectorSelectDeleteArgs<T>>> : T extends SelectorIncludeDeleteArgs ? Promise<SelectorGetIncludePayload<ExtractSelectorIncludeDeleteArgs<T>>> : SelectorClient<Selector>;
    update<T extends SelectorUpdateArgs>(args: Subset<T, SelectorUpdateArgs>): T extends SelectorUpdateArgsRequired ? 'Please either choose `select` or `include`' : T extends SelectorSelectUpdateArgs ? Promise<SelectorGetSelectPayload<ExtractSelectorSelectUpdateArgs<T>>> : T extends SelectorIncludeUpdateArgs ? Promise<SelectorGetIncludePayload<ExtractSelectorIncludeUpdateArgs<T>>> : SelectorClient<Selector>;
    deleteMany<T extends SelectorDeleteManyArgs>(args: Subset<T, SelectorDeleteManyArgs>): Promise<BatchPayload>;
    updateMany<T extends SelectorUpdateManyArgs>(args: Subset<T, SelectorUpdateManyArgs>): Promise<BatchPayload>;
    upsert<T extends SelectorUpsertArgs>(args: Subset<T, SelectorUpsertArgs>): T extends SelectorUpsertArgsRequired ? 'Please either choose `select` or `include`' : T extends SelectorSelectUpsertArgs ? Promise<SelectorGetSelectPayload<ExtractSelectorSelectUpsertArgs<T>>> : T extends SelectorIncludeUpsertArgs ? Promise<SelectorGetIncludePayload<ExtractSelectorIncludeUpsertArgs<T>>> : SelectorClient<Selector>;
    count(): Promise<number>;
}
export declare class SelectorClient<T> implements Promise<T> {
    private readonly _dmmf;
    private readonly _fetcher;
    private readonly _queryType;
    private readonly _rootField;
    private readonly _clientMethod;
    private readonly _args;
    private readonly _path;
    private _isList;
    private _callsite;
    private _requestPromise?;
    constructor(_dmmf: DMMFClass, _fetcher: PhotonFetcher, _queryType: 'query' | 'mutation', _rootField: string, _clientMethod: string, _args: any, _path: string[], _isList?: boolean);
    readonly [Symbol.toStringTag]: 'PhotonPromise';
    steps<T extends FindManyStepArgs = {}>(args?: Subset<T, FindManyStepArgs>): T extends FindManyStepArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyStepSelectArgs ? Promise<Array<StepGetSelectPayload<ExtractFindManyStepSelectArgs<T>>>> : T extends FindManyStepIncludeArgs ? Promise<Array<StepGetIncludePayload<ExtractFindManyStepIncludeArgs<T>>>> : Promise<Array<Step>>;
    user<T extends UserArgs = {}>(args?: Subset<T, UserArgs>): T extends FindOneUserArgsRequired ? 'Please either choose `select` or `include`' : T extends UserSelectArgs ? Promise<UserGetSelectPayload<ExtractUserSelectArgs<T>> | null> : T extends UserIncludeArgs ? Promise<UserGetIncludePayload<ExtractUserIncludeArgs<T>> | null> : UserClient<User | null>;
    private get _document();
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | Promise<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | Promise<TResult>) | undefined | null): Promise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
}
/**
 * Selector findOne
 */
export declare type FindOneSelectorArgs = {
    select?: SelectorSelect | null;
    include?: SelectorInclude | null;
    where: SelectorWhereUniqueInput;
};
export declare type FindOneSelectorArgsRequired = {
    select: SelectorSelect;
    include: SelectorInclude;
    where: SelectorWhereUniqueInput;
};
export declare type FindOneSelectorSelectArgs = {
    select: SelectorSelect;
    where: SelectorWhereUniqueInput;
};
export declare type FindOneSelectorSelectArgsOptional = {
    select?: SelectorSelect | null;
    where: SelectorWhereUniqueInput;
};
export declare type FindOneSelectorIncludeArgs = {
    include: SelectorInclude;
    where: SelectorWhereUniqueInput;
};
export declare type FindOneSelectorIncludeArgsOptional = {
    include?: SelectorInclude | null;
    where: SelectorWhereUniqueInput;
};
export declare type ExtractFindOneSelectorSelectArgs<S extends undefined | boolean | FindOneSelectorSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindOneSelectorSelectArgs ? S['select'] : true;
export declare type ExtractFindOneSelectorIncludeArgs<S extends undefined | boolean | FindOneSelectorIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindOneSelectorIncludeArgs ? S['include'] : true;
/**
 * Selector findMany
 */
export declare type FindManySelectorArgs = {
    select?: SelectorSelect | null;
    include?: SelectorInclude | null;
    where?: SelectorWhereInput | null;
    orderBy?: SelectorOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManySelectorArgsRequired = {
    select: SelectorSelect;
    include: SelectorInclude;
    where?: SelectorWhereInput | null;
    orderBy?: SelectorOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManySelectorSelectArgs = {
    select: SelectorSelect;
    where?: SelectorWhereInput | null;
    orderBy?: SelectorOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManySelectorSelectArgsOptional = {
    select?: SelectorSelect | null;
    where?: SelectorWhereInput | null;
    orderBy?: SelectorOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManySelectorIncludeArgs = {
    include: SelectorInclude;
    where?: SelectorWhereInput | null;
    orderBy?: SelectorOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManySelectorIncludeArgsOptional = {
    include?: SelectorInclude | null;
    where?: SelectorWhereInput | null;
    orderBy?: SelectorOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type ExtractFindManySelectorSelectArgs<S extends undefined | boolean | FindManySelectorSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindManySelectorSelectArgs ? S['select'] : true;
export declare type ExtractFindManySelectorIncludeArgs<S extends undefined | boolean | FindManySelectorIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindManySelectorIncludeArgs ? S['include'] : true;
/**
 * Selector create
 */
export declare type SelectorCreateArgs = {
    select?: SelectorSelect | null;
    include?: SelectorInclude | null;
    data: SelectorCreateInput;
};
export declare type SelectorCreateArgsRequired = {
    select: SelectorSelect;
    include: SelectorInclude;
    data: SelectorCreateInput;
};
export declare type SelectorSelectCreateArgs = {
    select: SelectorSelect;
    data: SelectorCreateInput;
};
export declare type SelectorSelectCreateArgsOptional = {
    select?: SelectorSelect | null;
    data: SelectorCreateInput;
};
export declare type SelectorIncludeCreateArgs = {
    include: SelectorInclude;
    data: SelectorCreateInput;
};
export declare type SelectorIncludeCreateArgsOptional = {
    include?: SelectorInclude | null;
    data: SelectorCreateInput;
};
export declare type ExtractSelectorSelectCreateArgs<S extends undefined | boolean | SelectorSelectCreateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends SelectorSelectCreateArgs ? S['select'] : true;
export declare type ExtractSelectorIncludeCreateArgs<S extends undefined | boolean | SelectorIncludeCreateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends SelectorIncludeCreateArgs ? S['include'] : true;
/**
 * Selector update
 */
export declare type SelectorUpdateArgs = {
    select?: SelectorSelect | null;
    include?: SelectorInclude | null;
    data: SelectorUpdateInput;
    where: SelectorWhereUniqueInput;
};
export declare type SelectorUpdateArgsRequired = {
    select: SelectorSelect;
    include: SelectorInclude;
    data: SelectorUpdateInput;
    where: SelectorWhereUniqueInput;
};
export declare type SelectorSelectUpdateArgs = {
    select: SelectorSelect;
    data: SelectorUpdateInput;
    where: SelectorWhereUniqueInput;
};
export declare type SelectorSelectUpdateArgsOptional = {
    select?: SelectorSelect | null;
    data: SelectorUpdateInput;
    where: SelectorWhereUniqueInput;
};
export declare type SelectorIncludeUpdateArgs = {
    include: SelectorInclude;
    data: SelectorUpdateInput;
    where: SelectorWhereUniqueInput;
};
export declare type SelectorIncludeUpdateArgsOptional = {
    include?: SelectorInclude | null;
    data: SelectorUpdateInput;
    where: SelectorWhereUniqueInput;
};
export declare type ExtractSelectorSelectUpdateArgs<S extends undefined | boolean | SelectorSelectUpdateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends SelectorSelectUpdateArgs ? S['select'] : true;
export declare type ExtractSelectorIncludeUpdateArgs<S extends undefined | boolean | SelectorIncludeUpdateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends SelectorIncludeUpdateArgs ? S['include'] : true;
/**
 * Selector updateMany
 */
export declare type SelectorUpdateManyArgs = {
    data: SelectorUpdateManyMutationInput;
    where?: SelectorWhereInput | null;
};
/**
 * Selector upsert
 */
export declare type SelectorUpsertArgs = {
    select?: SelectorSelect | null;
    include?: SelectorInclude | null;
    where: SelectorWhereUniqueInput;
    create: SelectorCreateInput;
    update: SelectorUpdateInput;
};
export declare type SelectorUpsertArgsRequired = {
    select: SelectorSelect;
    include: SelectorInclude;
    where: SelectorWhereUniqueInput;
    create: SelectorCreateInput;
    update: SelectorUpdateInput;
};
export declare type SelectorSelectUpsertArgs = {
    select: SelectorSelect;
    where: SelectorWhereUniqueInput;
    create: SelectorCreateInput;
    update: SelectorUpdateInput;
};
export declare type SelectorSelectUpsertArgsOptional = {
    select?: SelectorSelect | null;
    where: SelectorWhereUniqueInput;
    create: SelectorCreateInput;
    update: SelectorUpdateInput;
};
export declare type SelectorIncludeUpsertArgs = {
    include: SelectorInclude;
    where: SelectorWhereUniqueInput;
    create: SelectorCreateInput;
    update: SelectorUpdateInput;
};
export declare type SelectorIncludeUpsertArgsOptional = {
    include?: SelectorInclude | null;
    where: SelectorWhereUniqueInput;
    create: SelectorCreateInput;
    update: SelectorUpdateInput;
};
export declare type ExtractSelectorSelectUpsertArgs<S extends undefined | boolean | SelectorSelectUpsertArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends SelectorSelectUpsertArgs ? S['select'] : true;
export declare type ExtractSelectorIncludeUpsertArgs<S extends undefined | boolean | SelectorIncludeUpsertArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends SelectorIncludeUpsertArgs ? S['include'] : true;
/**
 * Selector delete
 */
export declare type SelectorDeleteArgs = {
    select?: SelectorSelect | null;
    include?: SelectorInclude | null;
    where: SelectorWhereUniqueInput;
};
export declare type SelectorDeleteArgsRequired = {
    select: SelectorSelect;
    include: SelectorInclude;
    where: SelectorWhereUniqueInput;
};
export declare type SelectorSelectDeleteArgs = {
    select: SelectorSelect;
    where: SelectorWhereUniqueInput;
};
export declare type SelectorSelectDeleteArgsOptional = {
    select?: SelectorSelect | null;
    where: SelectorWhereUniqueInput;
};
export declare type SelectorIncludeDeleteArgs = {
    include: SelectorInclude;
    where: SelectorWhereUniqueInput;
};
export declare type SelectorIncludeDeleteArgsOptional = {
    include?: SelectorInclude | null;
    where: SelectorWhereUniqueInput;
};
export declare type ExtractSelectorSelectDeleteArgs<S extends undefined | boolean | SelectorSelectDeleteArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends SelectorSelectDeleteArgs ? S['select'] : true;
export declare type ExtractSelectorIncludeDeleteArgs<S extends undefined | boolean | SelectorIncludeDeleteArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends SelectorIncludeDeleteArgs ? S['include'] : true;
/**
 * Selector deleteMany
 */
export declare type SelectorDeleteManyArgs = {
    where?: SelectorWhereInput | null;
};
/**
 * Selector without action
 */
export declare type SelectorArgs = {
    select?: SelectorSelect | null;
    include?: SelectorInclude | null;
};
export declare type SelectorArgsRequired = {
    select: SelectorSelect;
    include: SelectorInclude;
};
export declare type SelectorSelectArgs = {
    select: SelectorSelect;
};
export declare type SelectorSelectArgsOptional = {
    select?: SelectorSelect | null;
};
export declare type SelectorIncludeArgs = {
    include: SelectorInclude;
};
export declare type SelectorIncludeArgsOptional = {
    include?: SelectorInclude | null;
};
export declare type ExtractSelectorSelectArgs<S extends undefined | boolean | SelectorSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends SelectorSelectArgs ? S['select'] : true;
export declare type ExtractSelectorIncludeArgs<S extends undefined | boolean | SelectorIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends SelectorIncludeArgs ? S['include'] : true;
/**
 * Model Step
 */
export declare type Step = {
    id: number;
    action: string;
    value: string;
};
export declare type StepScalars = 'id' | 'action' | 'value';
export declare type StepSelect = {
    id?: boolean;
    action?: boolean;
    selector?: boolean | SelectorSelectArgsOptional;
    value?: boolean;
    test?: boolean | TestSelectArgsOptional;
    user?: boolean | UserSelectArgsOptional;
};
export declare type StepInclude = {
    selector?: boolean | SelectorIncludeArgsOptional;
    test?: boolean | TestIncludeArgsOptional;
    user?: boolean | UserIncludeArgsOptional;
};
declare type StepDefault = {
    id: true;
    action: true;
    value: true;
};
declare type StepGetSelectPayload<S extends boolean | StepSelect> = S extends true ? Step : S extends StepSelect ? {
    [P in CleanupNever<MergeTruthyValues<{}, S>>]: P extends StepScalars ? Step[P] : P extends 'selector' ? SelectorGetSelectPayload<ExtractSelectorSelectArgs<S[P]>> : P extends 'test' ? TestGetSelectPayload<ExtractTestSelectArgs<S[P]>> | null : P extends 'user' ? UserGetSelectPayload<ExtractUserSelectArgs<S[P]>> | null : never;
} : never;
declare type StepGetIncludePayload<S extends boolean | StepInclude> = S extends true ? Step : S extends StepInclude ? {
    [P in CleanupNever<MergeTruthyValues<StepDefault, S>>]: P extends StepScalars ? Step[P] : P extends 'selector' ? SelectorGetIncludePayload<ExtractSelectorIncludeArgs<S[P]>> : P extends 'test' ? TestGetIncludePayload<ExtractTestIncludeArgs<S[P]>> | null : P extends 'user' ? UserGetIncludePayload<ExtractUserIncludeArgs<S[P]>> | null : never;
} : never;
export interface StepDelegate {
    <T extends FindManyStepArgs>(args?: Subset<T, FindManyStepArgs>): T extends FindManyStepArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyStepSelectArgs ? Promise<Array<StepGetSelectPayload<ExtractFindManyStepSelectArgs<T>>>> : T extends FindManyStepIncludeArgs ? Promise<Array<StepGetIncludePayload<ExtractFindManyStepIncludeArgs<T>>>> : Promise<Array<Step>>;
    findOne<T extends FindOneStepArgs>(args: Subset<T, FindOneStepArgs>): T extends FindOneStepArgsRequired ? 'Please either choose `select` or `include`' : T extends FindOneStepSelectArgs ? Promise<StepGetSelectPayload<ExtractFindOneStepSelectArgs<T>> | null> : T extends FindOneStepIncludeArgs ? Promise<StepGetIncludePayload<ExtractFindOneStepIncludeArgs<T>> | null> : StepClient<Step | null>;
    findMany<T extends FindManyStepArgs>(args?: Subset<T, FindManyStepArgs>): T extends FindManyStepArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyStepSelectArgs ? Promise<Array<StepGetSelectPayload<ExtractFindManyStepSelectArgs<T>>>> : T extends FindManyStepIncludeArgs ? Promise<Array<StepGetIncludePayload<ExtractFindManyStepIncludeArgs<T>>>> : Promise<Array<Step>>;
    create<T extends StepCreateArgs>(args: Subset<T, StepCreateArgs>): T extends StepCreateArgsRequired ? 'Please either choose `select` or `include`' : T extends StepSelectCreateArgs ? Promise<StepGetSelectPayload<ExtractStepSelectCreateArgs<T>>> : T extends StepIncludeCreateArgs ? Promise<StepGetIncludePayload<ExtractStepIncludeCreateArgs<T>>> : StepClient<Step>;
    delete<T extends StepDeleteArgs>(args: Subset<T, StepDeleteArgs>): T extends StepDeleteArgsRequired ? 'Please either choose `select` or `include`' : T extends StepSelectDeleteArgs ? Promise<StepGetSelectPayload<ExtractStepSelectDeleteArgs<T>>> : T extends StepIncludeDeleteArgs ? Promise<StepGetIncludePayload<ExtractStepIncludeDeleteArgs<T>>> : StepClient<Step>;
    update<T extends StepUpdateArgs>(args: Subset<T, StepUpdateArgs>): T extends StepUpdateArgsRequired ? 'Please either choose `select` or `include`' : T extends StepSelectUpdateArgs ? Promise<StepGetSelectPayload<ExtractStepSelectUpdateArgs<T>>> : T extends StepIncludeUpdateArgs ? Promise<StepGetIncludePayload<ExtractStepIncludeUpdateArgs<T>>> : StepClient<Step>;
    deleteMany<T extends StepDeleteManyArgs>(args: Subset<T, StepDeleteManyArgs>): Promise<BatchPayload>;
    updateMany<T extends StepUpdateManyArgs>(args: Subset<T, StepUpdateManyArgs>): Promise<BatchPayload>;
    upsert<T extends StepUpsertArgs>(args: Subset<T, StepUpsertArgs>): T extends StepUpsertArgsRequired ? 'Please either choose `select` or `include`' : T extends StepSelectUpsertArgs ? Promise<StepGetSelectPayload<ExtractStepSelectUpsertArgs<T>>> : T extends StepIncludeUpsertArgs ? Promise<StepGetIncludePayload<ExtractStepIncludeUpsertArgs<T>>> : StepClient<Step>;
    count(): Promise<number>;
}
export declare class StepClient<T> implements Promise<T> {
    private readonly _dmmf;
    private readonly _fetcher;
    private readonly _queryType;
    private readonly _rootField;
    private readonly _clientMethod;
    private readonly _args;
    private readonly _path;
    private _isList;
    private _callsite;
    private _requestPromise?;
    constructor(_dmmf: DMMFClass, _fetcher: PhotonFetcher, _queryType: 'query' | 'mutation', _rootField: string, _clientMethod: string, _args: any, _path: string[], _isList?: boolean);
    readonly [Symbol.toStringTag]: 'PhotonPromise';
    selector<T extends SelectorArgs = {}>(args?: Subset<T, SelectorArgs>): T extends FindOneSelectorArgsRequired ? 'Please either choose `select` or `include`' : T extends SelectorSelectArgs ? Promise<SelectorGetSelectPayload<ExtractSelectorSelectArgs<T>> | null> : T extends SelectorIncludeArgs ? Promise<SelectorGetIncludePayload<ExtractSelectorIncludeArgs<T>> | null> : SelectorClient<Selector | null>;
    test<T extends TestArgs = {}>(args?: Subset<T, TestArgs>): T extends FindOneTestArgsRequired ? 'Please either choose `select` or `include`' : T extends TestSelectArgs ? Promise<TestGetSelectPayload<ExtractTestSelectArgs<T>> | null> : T extends TestIncludeArgs ? Promise<TestGetIncludePayload<ExtractTestIncludeArgs<T>> | null> : TestClient<Test | null>;
    user<T extends UserArgs = {}>(args?: Subset<T, UserArgs>): T extends FindOneUserArgsRequired ? 'Please either choose `select` or `include`' : T extends UserSelectArgs ? Promise<UserGetSelectPayload<ExtractUserSelectArgs<T>> | null> : T extends UserIncludeArgs ? Promise<UserGetIncludePayload<ExtractUserIncludeArgs<T>> | null> : UserClient<User | null>;
    private get _document();
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | Promise<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | Promise<TResult>) | undefined | null): Promise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
}
/**
 * Step findOne
 */
export declare type FindOneStepArgs = {
    select?: StepSelect | null;
    include?: StepInclude | null;
    where: StepWhereUniqueInput;
};
export declare type FindOneStepArgsRequired = {
    select: StepSelect;
    include: StepInclude;
    where: StepWhereUniqueInput;
};
export declare type FindOneStepSelectArgs = {
    select: StepSelect;
    where: StepWhereUniqueInput;
};
export declare type FindOneStepSelectArgsOptional = {
    select?: StepSelect | null;
    where: StepWhereUniqueInput;
};
export declare type FindOneStepIncludeArgs = {
    include: StepInclude;
    where: StepWhereUniqueInput;
};
export declare type FindOneStepIncludeArgsOptional = {
    include?: StepInclude | null;
    where: StepWhereUniqueInput;
};
export declare type ExtractFindOneStepSelectArgs<S extends undefined | boolean | FindOneStepSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindOneStepSelectArgs ? S['select'] : true;
export declare type ExtractFindOneStepIncludeArgs<S extends undefined | boolean | FindOneStepIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindOneStepIncludeArgs ? S['include'] : true;
/**
 * Step findMany
 */
export declare type FindManyStepArgs = {
    select?: StepSelect | null;
    include?: StepInclude | null;
    where?: StepWhereInput | null;
    orderBy?: StepOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyStepArgsRequired = {
    select: StepSelect;
    include: StepInclude;
    where?: StepWhereInput | null;
    orderBy?: StepOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyStepSelectArgs = {
    select: StepSelect;
    where?: StepWhereInput | null;
    orderBy?: StepOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyStepSelectArgsOptional = {
    select?: StepSelect | null;
    where?: StepWhereInput | null;
    orderBy?: StepOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyStepIncludeArgs = {
    include: StepInclude;
    where?: StepWhereInput | null;
    orderBy?: StepOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyStepIncludeArgsOptional = {
    include?: StepInclude | null;
    where?: StepWhereInput | null;
    orderBy?: StepOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type ExtractFindManyStepSelectArgs<S extends undefined | boolean | FindManyStepSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindManyStepSelectArgs ? S['select'] : true;
export declare type ExtractFindManyStepIncludeArgs<S extends undefined | boolean | FindManyStepIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindManyStepIncludeArgs ? S['include'] : true;
/**
 * Step create
 */
export declare type StepCreateArgs = {
    select?: StepSelect | null;
    include?: StepInclude | null;
    data: StepCreateInput;
};
export declare type StepCreateArgsRequired = {
    select: StepSelect;
    include: StepInclude;
    data: StepCreateInput;
};
export declare type StepSelectCreateArgs = {
    select: StepSelect;
    data: StepCreateInput;
};
export declare type StepSelectCreateArgsOptional = {
    select?: StepSelect | null;
    data: StepCreateInput;
};
export declare type StepIncludeCreateArgs = {
    include: StepInclude;
    data: StepCreateInput;
};
export declare type StepIncludeCreateArgsOptional = {
    include?: StepInclude | null;
    data: StepCreateInput;
};
export declare type ExtractStepSelectCreateArgs<S extends undefined | boolean | StepSelectCreateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends StepSelectCreateArgs ? S['select'] : true;
export declare type ExtractStepIncludeCreateArgs<S extends undefined | boolean | StepIncludeCreateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends StepIncludeCreateArgs ? S['include'] : true;
/**
 * Step update
 */
export declare type StepUpdateArgs = {
    select?: StepSelect | null;
    include?: StepInclude | null;
    data: StepUpdateInput;
    where: StepWhereUniqueInput;
};
export declare type StepUpdateArgsRequired = {
    select: StepSelect;
    include: StepInclude;
    data: StepUpdateInput;
    where: StepWhereUniqueInput;
};
export declare type StepSelectUpdateArgs = {
    select: StepSelect;
    data: StepUpdateInput;
    where: StepWhereUniqueInput;
};
export declare type StepSelectUpdateArgsOptional = {
    select?: StepSelect | null;
    data: StepUpdateInput;
    where: StepWhereUniqueInput;
};
export declare type StepIncludeUpdateArgs = {
    include: StepInclude;
    data: StepUpdateInput;
    where: StepWhereUniqueInput;
};
export declare type StepIncludeUpdateArgsOptional = {
    include?: StepInclude | null;
    data: StepUpdateInput;
    where: StepWhereUniqueInput;
};
export declare type ExtractStepSelectUpdateArgs<S extends undefined | boolean | StepSelectUpdateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends StepSelectUpdateArgs ? S['select'] : true;
export declare type ExtractStepIncludeUpdateArgs<S extends undefined | boolean | StepIncludeUpdateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends StepIncludeUpdateArgs ? S['include'] : true;
/**
 * Step updateMany
 */
export declare type StepUpdateManyArgs = {
    data: StepUpdateManyMutationInput;
    where?: StepWhereInput | null;
};
/**
 * Step upsert
 */
export declare type StepUpsertArgs = {
    select?: StepSelect | null;
    include?: StepInclude | null;
    where: StepWhereUniqueInput;
    create: StepCreateInput;
    update: StepUpdateInput;
};
export declare type StepUpsertArgsRequired = {
    select: StepSelect;
    include: StepInclude;
    where: StepWhereUniqueInput;
    create: StepCreateInput;
    update: StepUpdateInput;
};
export declare type StepSelectUpsertArgs = {
    select: StepSelect;
    where: StepWhereUniqueInput;
    create: StepCreateInput;
    update: StepUpdateInput;
};
export declare type StepSelectUpsertArgsOptional = {
    select?: StepSelect | null;
    where: StepWhereUniqueInput;
    create: StepCreateInput;
    update: StepUpdateInput;
};
export declare type StepIncludeUpsertArgs = {
    include: StepInclude;
    where: StepWhereUniqueInput;
    create: StepCreateInput;
    update: StepUpdateInput;
};
export declare type StepIncludeUpsertArgsOptional = {
    include?: StepInclude | null;
    where: StepWhereUniqueInput;
    create: StepCreateInput;
    update: StepUpdateInput;
};
export declare type ExtractStepSelectUpsertArgs<S extends undefined | boolean | StepSelectUpsertArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends StepSelectUpsertArgs ? S['select'] : true;
export declare type ExtractStepIncludeUpsertArgs<S extends undefined | boolean | StepIncludeUpsertArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends StepIncludeUpsertArgs ? S['include'] : true;
/**
 * Step delete
 */
export declare type StepDeleteArgs = {
    select?: StepSelect | null;
    include?: StepInclude | null;
    where: StepWhereUniqueInput;
};
export declare type StepDeleteArgsRequired = {
    select: StepSelect;
    include: StepInclude;
    where: StepWhereUniqueInput;
};
export declare type StepSelectDeleteArgs = {
    select: StepSelect;
    where: StepWhereUniqueInput;
};
export declare type StepSelectDeleteArgsOptional = {
    select?: StepSelect | null;
    where: StepWhereUniqueInput;
};
export declare type StepIncludeDeleteArgs = {
    include: StepInclude;
    where: StepWhereUniqueInput;
};
export declare type StepIncludeDeleteArgsOptional = {
    include?: StepInclude | null;
    where: StepWhereUniqueInput;
};
export declare type ExtractStepSelectDeleteArgs<S extends undefined | boolean | StepSelectDeleteArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends StepSelectDeleteArgs ? S['select'] : true;
export declare type ExtractStepIncludeDeleteArgs<S extends undefined | boolean | StepIncludeDeleteArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends StepIncludeDeleteArgs ? S['include'] : true;
/**
 * Step deleteMany
 */
export declare type StepDeleteManyArgs = {
    where?: StepWhereInput | null;
};
/**
 * Step without action
 */
export declare type StepArgs = {
    select?: StepSelect | null;
    include?: StepInclude | null;
};
export declare type StepArgsRequired = {
    select: StepSelect;
    include: StepInclude;
};
export declare type StepSelectArgs = {
    select: StepSelect;
};
export declare type StepSelectArgsOptional = {
    select?: StepSelect | null;
};
export declare type StepIncludeArgs = {
    include: StepInclude;
};
export declare type StepIncludeArgsOptional = {
    include?: StepInclude | null;
};
export declare type ExtractStepSelectArgs<S extends undefined | boolean | StepSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends StepSelectArgs ? S['select'] : true;
export declare type ExtractStepIncludeArgs<S extends undefined | boolean | StepIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends StepIncludeArgs ? S['include'] : true;
/**
 * Model Test
 */
export declare type Test = {
    id: number;
    name: string;
};
export declare type TestScalars = 'id' | 'name';
export declare type TestSelect = {
    id?: boolean;
    user?: boolean | UserSelectArgsOptional;
    name?: boolean;
    steps?: boolean | FindManyStepSelectArgsOptional;
    tags?: boolean | FindManyTagSelectArgsOptional;
};
export declare type TestInclude = {
    user?: boolean | UserIncludeArgsOptional;
    steps?: boolean | FindManyStepIncludeArgsOptional;
    tags?: boolean | FindManyTagIncludeArgsOptional;
};
declare type TestDefault = {
    id: true;
    name: true;
};
declare type TestGetSelectPayload<S extends boolean | TestSelect> = S extends true ? Test : S extends TestSelect ? {
    [P in CleanupNever<MergeTruthyValues<{}, S>>]: P extends TestScalars ? Test[P] : P extends 'user' ? UserGetSelectPayload<ExtractUserSelectArgs<S[P]>> : P extends 'steps' ? Array<StepGetSelectPayload<ExtractFindManyStepSelectArgs<S[P]>>> : P extends 'tags' ? Array<TagGetSelectPayload<ExtractFindManyTagSelectArgs<S[P]>>> : never;
} : never;
declare type TestGetIncludePayload<S extends boolean | TestInclude> = S extends true ? Test : S extends TestInclude ? {
    [P in CleanupNever<MergeTruthyValues<TestDefault, S>>]: P extends TestScalars ? Test[P] : P extends 'user' ? UserGetIncludePayload<ExtractUserIncludeArgs<S[P]>> : P extends 'steps' ? Array<StepGetIncludePayload<ExtractFindManyStepIncludeArgs<S[P]>>> : P extends 'tags' ? Array<TagGetIncludePayload<ExtractFindManyTagIncludeArgs<S[P]>>> : never;
} : never;
export interface TestDelegate {
    <T extends FindManyTestArgs>(args?: Subset<T, FindManyTestArgs>): T extends FindManyTestArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyTestSelectArgs ? Promise<Array<TestGetSelectPayload<ExtractFindManyTestSelectArgs<T>>>> : T extends FindManyTestIncludeArgs ? Promise<Array<TestGetIncludePayload<ExtractFindManyTestIncludeArgs<T>>>> : Promise<Array<Test>>;
    findOne<T extends FindOneTestArgs>(args: Subset<T, FindOneTestArgs>): T extends FindOneTestArgsRequired ? 'Please either choose `select` or `include`' : T extends FindOneTestSelectArgs ? Promise<TestGetSelectPayload<ExtractFindOneTestSelectArgs<T>> | null> : T extends FindOneTestIncludeArgs ? Promise<TestGetIncludePayload<ExtractFindOneTestIncludeArgs<T>> | null> : TestClient<Test | null>;
    findMany<T extends FindManyTestArgs>(args?: Subset<T, FindManyTestArgs>): T extends FindManyTestArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyTestSelectArgs ? Promise<Array<TestGetSelectPayload<ExtractFindManyTestSelectArgs<T>>>> : T extends FindManyTestIncludeArgs ? Promise<Array<TestGetIncludePayload<ExtractFindManyTestIncludeArgs<T>>>> : Promise<Array<Test>>;
    create<T extends TestCreateArgs>(args: Subset<T, TestCreateArgs>): T extends TestCreateArgsRequired ? 'Please either choose `select` or `include`' : T extends TestSelectCreateArgs ? Promise<TestGetSelectPayload<ExtractTestSelectCreateArgs<T>>> : T extends TestIncludeCreateArgs ? Promise<TestGetIncludePayload<ExtractTestIncludeCreateArgs<T>>> : TestClient<Test>;
    delete<T extends TestDeleteArgs>(args: Subset<T, TestDeleteArgs>): T extends TestDeleteArgsRequired ? 'Please either choose `select` or `include`' : T extends TestSelectDeleteArgs ? Promise<TestGetSelectPayload<ExtractTestSelectDeleteArgs<T>>> : T extends TestIncludeDeleteArgs ? Promise<TestGetIncludePayload<ExtractTestIncludeDeleteArgs<T>>> : TestClient<Test>;
    update<T extends TestUpdateArgs>(args: Subset<T, TestUpdateArgs>): T extends TestUpdateArgsRequired ? 'Please either choose `select` or `include`' : T extends TestSelectUpdateArgs ? Promise<TestGetSelectPayload<ExtractTestSelectUpdateArgs<T>>> : T extends TestIncludeUpdateArgs ? Promise<TestGetIncludePayload<ExtractTestIncludeUpdateArgs<T>>> : TestClient<Test>;
    deleteMany<T extends TestDeleteManyArgs>(args: Subset<T, TestDeleteManyArgs>): Promise<BatchPayload>;
    updateMany<T extends TestUpdateManyArgs>(args: Subset<T, TestUpdateManyArgs>): Promise<BatchPayload>;
    upsert<T extends TestUpsertArgs>(args: Subset<T, TestUpsertArgs>): T extends TestUpsertArgsRequired ? 'Please either choose `select` or `include`' : T extends TestSelectUpsertArgs ? Promise<TestGetSelectPayload<ExtractTestSelectUpsertArgs<T>>> : T extends TestIncludeUpsertArgs ? Promise<TestGetIncludePayload<ExtractTestIncludeUpsertArgs<T>>> : TestClient<Test>;
    count(): Promise<number>;
}
export declare class TestClient<T> implements Promise<T> {
    private readonly _dmmf;
    private readonly _fetcher;
    private readonly _queryType;
    private readonly _rootField;
    private readonly _clientMethod;
    private readonly _args;
    private readonly _path;
    private _isList;
    private _callsite;
    private _requestPromise?;
    constructor(_dmmf: DMMFClass, _fetcher: PhotonFetcher, _queryType: 'query' | 'mutation', _rootField: string, _clientMethod: string, _args: any, _path: string[], _isList?: boolean);
    readonly [Symbol.toStringTag]: 'PhotonPromise';
    user<T extends UserArgs = {}>(args?: Subset<T, UserArgs>): T extends FindOneUserArgsRequired ? 'Please either choose `select` or `include`' : T extends UserSelectArgs ? Promise<UserGetSelectPayload<ExtractUserSelectArgs<T>> | null> : T extends UserIncludeArgs ? Promise<UserGetIncludePayload<ExtractUserIncludeArgs<T>> | null> : UserClient<User | null>;
    steps<T extends FindManyStepArgs = {}>(args?: Subset<T, FindManyStepArgs>): T extends FindManyStepArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyStepSelectArgs ? Promise<Array<StepGetSelectPayload<ExtractFindManyStepSelectArgs<T>>>> : T extends FindManyStepIncludeArgs ? Promise<Array<StepGetIncludePayload<ExtractFindManyStepIncludeArgs<T>>>> : Promise<Array<Step>>;
    tags<T extends FindManyTagArgs = {}>(args?: Subset<T, FindManyTagArgs>): T extends FindManyTagArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyTagSelectArgs ? Promise<Array<TagGetSelectPayload<ExtractFindManyTagSelectArgs<T>>>> : T extends FindManyTagIncludeArgs ? Promise<Array<TagGetIncludePayload<ExtractFindManyTagIncludeArgs<T>>>> : Promise<Array<Tag>>;
    private get _document();
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | Promise<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | Promise<TResult>) | undefined | null): Promise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
}
/**
 * Test findOne
 */
export declare type FindOneTestArgs = {
    select?: TestSelect | null;
    include?: TestInclude | null;
    where: TestWhereUniqueInput;
};
export declare type FindOneTestArgsRequired = {
    select: TestSelect;
    include: TestInclude;
    where: TestWhereUniqueInput;
};
export declare type FindOneTestSelectArgs = {
    select: TestSelect;
    where: TestWhereUniqueInput;
};
export declare type FindOneTestSelectArgsOptional = {
    select?: TestSelect | null;
    where: TestWhereUniqueInput;
};
export declare type FindOneTestIncludeArgs = {
    include: TestInclude;
    where: TestWhereUniqueInput;
};
export declare type FindOneTestIncludeArgsOptional = {
    include?: TestInclude | null;
    where: TestWhereUniqueInput;
};
export declare type ExtractFindOneTestSelectArgs<S extends undefined | boolean | FindOneTestSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindOneTestSelectArgs ? S['select'] : true;
export declare type ExtractFindOneTestIncludeArgs<S extends undefined | boolean | FindOneTestIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindOneTestIncludeArgs ? S['include'] : true;
/**
 * Test findMany
 */
export declare type FindManyTestArgs = {
    select?: TestSelect | null;
    include?: TestInclude | null;
    where?: TestWhereInput | null;
    orderBy?: TestOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyTestArgsRequired = {
    select: TestSelect;
    include: TestInclude;
    where?: TestWhereInput | null;
    orderBy?: TestOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyTestSelectArgs = {
    select: TestSelect;
    where?: TestWhereInput | null;
    orderBy?: TestOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyTestSelectArgsOptional = {
    select?: TestSelect | null;
    where?: TestWhereInput | null;
    orderBy?: TestOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyTestIncludeArgs = {
    include: TestInclude;
    where?: TestWhereInput | null;
    orderBy?: TestOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyTestIncludeArgsOptional = {
    include?: TestInclude | null;
    where?: TestWhereInput | null;
    orderBy?: TestOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type ExtractFindManyTestSelectArgs<S extends undefined | boolean | FindManyTestSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindManyTestSelectArgs ? S['select'] : true;
export declare type ExtractFindManyTestIncludeArgs<S extends undefined | boolean | FindManyTestIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindManyTestIncludeArgs ? S['include'] : true;
/**
 * Test create
 */
export declare type TestCreateArgs = {
    select?: TestSelect | null;
    include?: TestInclude | null;
    data: TestCreateInput;
};
export declare type TestCreateArgsRequired = {
    select: TestSelect;
    include: TestInclude;
    data: TestCreateInput;
};
export declare type TestSelectCreateArgs = {
    select: TestSelect;
    data: TestCreateInput;
};
export declare type TestSelectCreateArgsOptional = {
    select?: TestSelect | null;
    data: TestCreateInput;
};
export declare type TestIncludeCreateArgs = {
    include: TestInclude;
    data: TestCreateInput;
};
export declare type TestIncludeCreateArgsOptional = {
    include?: TestInclude | null;
    data: TestCreateInput;
};
export declare type ExtractTestSelectCreateArgs<S extends undefined | boolean | TestSelectCreateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TestSelectCreateArgs ? S['select'] : true;
export declare type ExtractTestIncludeCreateArgs<S extends undefined | boolean | TestIncludeCreateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TestIncludeCreateArgs ? S['include'] : true;
/**
 * Test update
 */
export declare type TestUpdateArgs = {
    select?: TestSelect | null;
    include?: TestInclude | null;
    data: TestUpdateInput;
    where: TestWhereUniqueInput;
};
export declare type TestUpdateArgsRequired = {
    select: TestSelect;
    include: TestInclude;
    data: TestUpdateInput;
    where: TestWhereUniqueInput;
};
export declare type TestSelectUpdateArgs = {
    select: TestSelect;
    data: TestUpdateInput;
    where: TestWhereUniqueInput;
};
export declare type TestSelectUpdateArgsOptional = {
    select?: TestSelect | null;
    data: TestUpdateInput;
    where: TestWhereUniqueInput;
};
export declare type TestIncludeUpdateArgs = {
    include: TestInclude;
    data: TestUpdateInput;
    where: TestWhereUniqueInput;
};
export declare type TestIncludeUpdateArgsOptional = {
    include?: TestInclude | null;
    data: TestUpdateInput;
    where: TestWhereUniqueInput;
};
export declare type ExtractTestSelectUpdateArgs<S extends undefined | boolean | TestSelectUpdateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TestSelectUpdateArgs ? S['select'] : true;
export declare type ExtractTestIncludeUpdateArgs<S extends undefined | boolean | TestIncludeUpdateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TestIncludeUpdateArgs ? S['include'] : true;
/**
 * Test updateMany
 */
export declare type TestUpdateManyArgs = {
    data: TestUpdateManyMutationInput;
    where?: TestWhereInput | null;
};
/**
 * Test upsert
 */
export declare type TestUpsertArgs = {
    select?: TestSelect | null;
    include?: TestInclude | null;
    where: TestWhereUniqueInput;
    create: TestCreateInput;
    update: TestUpdateInput;
};
export declare type TestUpsertArgsRequired = {
    select: TestSelect;
    include: TestInclude;
    where: TestWhereUniqueInput;
    create: TestCreateInput;
    update: TestUpdateInput;
};
export declare type TestSelectUpsertArgs = {
    select: TestSelect;
    where: TestWhereUniqueInput;
    create: TestCreateInput;
    update: TestUpdateInput;
};
export declare type TestSelectUpsertArgsOptional = {
    select?: TestSelect | null;
    where: TestWhereUniqueInput;
    create: TestCreateInput;
    update: TestUpdateInput;
};
export declare type TestIncludeUpsertArgs = {
    include: TestInclude;
    where: TestWhereUniqueInput;
    create: TestCreateInput;
    update: TestUpdateInput;
};
export declare type TestIncludeUpsertArgsOptional = {
    include?: TestInclude | null;
    where: TestWhereUniqueInput;
    create: TestCreateInput;
    update: TestUpdateInput;
};
export declare type ExtractTestSelectUpsertArgs<S extends undefined | boolean | TestSelectUpsertArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TestSelectUpsertArgs ? S['select'] : true;
export declare type ExtractTestIncludeUpsertArgs<S extends undefined | boolean | TestIncludeUpsertArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TestIncludeUpsertArgs ? S['include'] : true;
/**
 * Test delete
 */
export declare type TestDeleteArgs = {
    select?: TestSelect | null;
    include?: TestInclude | null;
    where: TestWhereUniqueInput;
};
export declare type TestDeleteArgsRequired = {
    select: TestSelect;
    include: TestInclude;
    where: TestWhereUniqueInput;
};
export declare type TestSelectDeleteArgs = {
    select: TestSelect;
    where: TestWhereUniqueInput;
};
export declare type TestSelectDeleteArgsOptional = {
    select?: TestSelect | null;
    where: TestWhereUniqueInput;
};
export declare type TestIncludeDeleteArgs = {
    include: TestInclude;
    where: TestWhereUniqueInput;
};
export declare type TestIncludeDeleteArgsOptional = {
    include?: TestInclude | null;
    where: TestWhereUniqueInput;
};
export declare type ExtractTestSelectDeleteArgs<S extends undefined | boolean | TestSelectDeleteArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TestSelectDeleteArgs ? S['select'] : true;
export declare type ExtractTestIncludeDeleteArgs<S extends undefined | boolean | TestIncludeDeleteArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TestIncludeDeleteArgs ? S['include'] : true;
/**
 * Test deleteMany
 */
export declare type TestDeleteManyArgs = {
    where?: TestWhereInput | null;
};
/**
 * Test without action
 */
export declare type TestArgs = {
    select?: TestSelect | null;
    include?: TestInclude | null;
};
export declare type TestArgsRequired = {
    select: TestSelect;
    include: TestInclude;
};
export declare type TestSelectArgs = {
    select: TestSelect;
};
export declare type TestSelectArgsOptional = {
    select?: TestSelect | null;
};
export declare type TestIncludeArgs = {
    include: TestInclude;
};
export declare type TestIncludeArgsOptional = {
    include?: TestInclude | null;
};
export declare type ExtractTestSelectArgs<S extends undefined | boolean | TestSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TestSelectArgs ? S['select'] : true;
export declare type ExtractTestIncludeArgs<S extends undefined | boolean | TestIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends TestIncludeArgs ? S['include'] : true;
/**
 * Model User
 */
export declare type User = {
    id: number;
    email: string;
    password: string;
    first: string;
    last: string;
};
export declare type UserScalars = 'id' | 'email' | 'password' | 'first' | 'last';
export declare type UserSelect = {
    id?: boolean;
    email?: boolean;
    password?: boolean;
    first?: boolean;
    last?: boolean;
    steps?: boolean | FindManyStepSelectArgsOptional;
    selectors?: boolean | FindManySelectorSelectArgsOptional;
    tags?: boolean | FindManyTagSelectArgsOptional;
    tests?: boolean | FindManyTestSelectArgsOptional;
};
export declare type UserInclude = {
    steps?: boolean | FindManyStepIncludeArgsOptional;
    selectors?: boolean | FindManySelectorIncludeArgsOptional;
    tags?: boolean | FindManyTagIncludeArgsOptional;
    tests?: boolean | FindManyTestIncludeArgsOptional;
};
declare type UserDefault = {
    id: true;
    email: true;
    password: true;
    first: true;
    last: true;
};
declare type UserGetSelectPayload<S extends boolean | UserSelect> = S extends true ? User : S extends UserSelect ? {
    [P in CleanupNever<MergeTruthyValues<{}, S>>]: P extends UserScalars ? User[P] : P extends 'steps' ? Array<StepGetSelectPayload<ExtractFindManyStepSelectArgs<S[P]>>> : P extends 'selectors' ? Array<SelectorGetSelectPayload<ExtractFindManySelectorSelectArgs<S[P]>>> : P extends 'tags' ? Array<TagGetSelectPayload<ExtractFindManyTagSelectArgs<S[P]>>> : P extends 'tests' ? Array<TestGetSelectPayload<ExtractFindManyTestSelectArgs<S[P]>>> : never;
} : never;
declare type UserGetIncludePayload<S extends boolean | UserInclude> = S extends true ? User : S extends UserInclude ? {
    [P in CleanupNever<MergeTruthyValues<UserDefault, S>>]: P extends UserScalars ? User[P] : P extends 'steps' ? Array<StepGetIncludePayload<ExtractFindManyStepIncludeArgs<S[P]>>> : P extends 'selectors' ? Array<SelectorGetIncludePayload<ExtractFindManySelectorIncludeArgs<S[P]>>> : P extends 'tags' ? Array<TagGetIncludePayload<ExtractFindManyTagIncludeArgs<S[P]>>> : P extends 'tests' ? Array<TestGetIncludePayload<ExtractFindManyTestIncludeArgs<S[P]>>> : never;
} : never;
export interface UserDelegate {
    <T extends FindManyUserArgs>(args?: Subset<T, FindManyUserArgs>): T extends FindManyUserArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyUserSelectArgs ? Promise<Array<UserGetSelectPayload<ExtractFindManyUserSelectArgs<T>>>> : T extends FindManyUserIncludeArgs ? Promise<Array<UserGetIncludePayload<ExtractFindManyUserIncludeArgs<T>>>> : Promise<Array<User>>;
    findOne<T extends FindOneUserArgs>(args: Subset<T, FindOneUserArgs>): T extends FindOneUserArgsRequired ? 'Please either choose `select` or `include`' : T extends FindOneUserSelectArgs ? Promise<UserGetSelectPayload<ExtractFindOneUserSelectArgs<T>> | null> : T extends FindOneUserIncludeArgs ? Promise<UserGetIncludePayload<ExtractFindOneUserIncludeArgs<T>> | null> : UserClient<User | null>;
    findMany<T extends FindManyUserArgs>(args?: Subset<T, FindManyUserArgs>): T extends FindManyUserArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyUserSelectArgs ? Promise<Array<UserGetSelectPayload<ExtractFindManyUserSelectArgs<T>>>> : T extends FindManyUserIncludeArgs ? Promise<Array<UserGetIncludePayload<ExtractFindManyUserIncludeArgs<T>>>> : Promise<Array<User>>;
    create<T extends UserCreateArgs>(args: Subset<T, UserCreateArgs>): T extends UserCreateArgsRequired ? 'Please either choose `select` or `include`' : T extends UserSelectCreateArgs ? Promise<UserGetSelectPayload<ExtractUserSelectCreateArgs<T>>> : T extends UserIncludeCreateArgs ? Promise<UserGetIncludePayload<ExtractUserIncludeCreateArgs<T>>> : UserClient<User>;
    delete<T extends UserDeleteArgs>(args: Subset<T, UserDeleteArgs>): T extends UserDeleteArgsRequired ? 'Please either choose `select` or `include`' : T extends UserSelectDeleteArgs ? Promise<UserGetSelectPayload<ExtractUserSelectDeleteArgs<T>>> : T extends UserIncludeDeleteArgs ? Promise<UserGetIncludePayload<ExtractUserIncludeDeleteArgs<T>>> : UserClient<User>;
    update<T extends UserUpdateArgs>(args: Subset<T, UserUpdateArgs>): T extends UserUpdateArgsRequired ? 'Please either choose `select` or `include`' : T extends UserSelectUpdateArgs ? Promise<UserGetSelectPayload<ExtractUserSelectUpdateArgs<T>>> : T extends UserIncludeUpdateArgs ? Promise<UserGetIncludePayload<ExtractUserIncludeUpdateArgs<T>>> : UserClient<User>;
    deleteMany<T extends UserDeleteManyArgs>(args: Subset<T, UserDeleteManyArgs>): Promise<BatchPayload>;
    updateMany<T extends UserUpdateManyArgs>(args: Subset<T, UserUpdateManyArgs>): Promise<BatchPayload>;
    upsert<T extends UserUpsertArgs>(args: Subset<T, UserUpsertArgs>): T extends UserUpsertArgsRequired ? 'Please either choose `select` or `include`' : T extends UserSelectUpsertArgs ? Promise<UserGetSelectPayload<ExtractUserSelectUpsertArgs<T>>> : T extends UserIncludeUpsertArgs ? Promise<UserGetIncludePayload<ExtractUserIncludeUpsertArgs<T>>> : UserClient<User>;
    count(): Promise<number>;
}
export declare class UserClient<T> implements Promise<T> {
    private readonly _dmmf;
    private readonly _fetcher;
    private readonly _queryType;
    private readonly _rootField;
    private readonly _clientMethod;
    private readonly _args;
    private readonly _path;
    private _isList;
    private _callsite;
    private _requestPromise?;
    constructor(_dmmf: DMMFClass, _fetcher: PhotonFetcher, _queryType: 'query' | 'mutation', _rootField: string, _clientMethod: string, _args: any, _path: string[], _isList?: boolean);
    readonly [Symbol.toStringTag]: 'PhotonPromise';
    steps<T extends FindManyStepArgs = {}>(args?: Subset<T, FindManyStepArgs>): T extends FindManyStepArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyStepSelectArgs ? Promise<Array<StepGetSelectPayload<ExtractFindManyStepSelectArgs<T>>>> : T extends FindManyStepIncludeArgs ? Promise<Array<StepGetIncludePayload<ExtractFindManyStepIncludeArgs<T>>>> : Promise<Array<Step>>;
    selectors<T extends FindManySelectorArgs = {}>(args?: Subset<T, FindManySelectorArgs>): T extends FindManySelectorArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManySelectorSelectArgs ? Promise<Array<SelectorGetSelectPayload<ExtractFindManySelectorSelectArgs<T>>>> : T extends FindManySelectorIncludeArgs ? Promise<Array<SelectorGetIncludePayload<ExtractFindManySelectorIncludeArgs<T>>>> : Promise<Array<Selector>>;
    tags<T extends FindManyTagArgs = {}>(args?: Subset<T, FindManyTagArgs>): T extends FindManyTagArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyTagSelectArgs ? Promise<Array<TagGetSelectPayload<ExtractFindManyTagSelectArgs<T>>>> : T extends FindManyTagIncludeArgs ? Promise<Array<TagGetIncludePayload<ExtractFindManyTagIncludeArgs<T>>>> : Promise<Array<Tag>>;
    tests<T extends FindManyTestArgs = {}>(args?: Subset<T, FindManyTestArgs>): T extends FindManyTestArgsRequired ? 'Please either choose `select` or `include`' : T extends FindManyTestSelectArgs ? Promise<Array<TestGetSelectPayload<ExtractFindManyTestSelectArgs<T>>>> : T extends FindManyTestIncludeArgs ? Promise<Array<TestGetIncludePayload<ExtractFindManyTestIncludeArgs<T>>>> : Promise<Array<Test>>;
    private get _document();
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | Promise<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | Promise<TResult>) | undefined | null): Promise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
}
/**
 * User findOne
 */
export declare type FindOneUserArgs = {
    select?: UserSelect | null;
    include?: UserInclude | null;
    where: UserWhereUniqueInput;
};
export declare type FindOneUserArgsRequired = {
    select: UserSelect;
    include: UserInclude;
    where: UserWhereUniqueInput;
};
export declare type FindOneUserSelectArgs = {
    select: UserSelect;
    where: UserWhereUniqueInput;
};
export declare type FindOneUserSelectArgsOptional = {
    select?: UserSelect | null;
    where: UserWhereUniqueInput;
};
export declare type FindOneUserIncludeArgs = {
    include: UserInclude;
    where: UserWhereUniqueInput;
};
export declare type FindOneUserIncludeArgsOptional = {
    include?: UserInclude | null;
    where: UserWhereUniqueInput;
};
export declare type ExtractFindOneUserSelectArgs<S extends undefined | boolean | FindOneUserSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindOneUserSelectArgs ? S['select'] : true;
export declare type ExtractFindOneUserIncludeArgs<S extends undefined | boolean | FindOneUserIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindOneUserIncludeArgs ? S['include'] : true;
/**
 * User findMany
 */
export declare type FindManyUserArgs = {
    select?: UserSelect | null;
    include?: UserInclude | null;
    where?: UserWhereInput | null;
    orderBy?: UserOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyUserArgsRequired = {
    select: UserSelect;
    include: UserInclude;
    where?: UserWhereInput | null;
    orderBy?: UserOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyUserSelectArgs = {
    select: UserSelect;
    where?: UserWhereInput | null;
    orderBy?: UserOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyUserSelectArgsOptional = {
    select?: UserSelect | null;
    where?: UserWhereInput | null;
    orderBy?: UserOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyUserIncludeArgs = {
    include: UserInclude;
    where?: UserWhereInput | null;
    orderBy?: UserOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type FindManyUserIncludeArgsOptional = {
    include?: UserInclude | null;
    where?: UserWhereInput | null;
    orderBy?: UserOrderByInput | null;
    skip?: number | null;
    after?: number | null;
    before?: number | null;
    first?: number | null;
    last?: number | null;
};
export declare type ExtractFindManyUserSelectArgs<S extends undefined | boolean | FindManyUserSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindManyUserSelectArgs ? S['select'] : true;
export declare type ExtractFindManyUserIncludeArgs<S extends undefined | boolean | FindManyUserIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends FindManyUserIncludeArgs ? S['include'] : true;
/**
 * User create
 */
export declare type UserCreateArgs = {
    select?: UserSelect | null;
    include?: UserInclude | null;
    data: UserCreateInput;
};
export declare type UserCreateArgsRequired = {
    select: UserSelect;
    include: UserInclude;
    data: UserCreateInput;
};
export declare type UserSelectCreateArgs = {
    select: UserSelect;
    data: UserCreateInput;
};
export declare type UserSelectCreateArgsOptional = {
    select?: UserSelect | null;
    data: UserCreateInput;
};
export declare type UserIncludeCreateArgs = {
    include: UserInclude;
    data: UserCreateInput;
};
export declare type UserIncludeCreateArgsOptional = {
    include?: UserInclude | null;
    data: UserCreateInput;
};
export declare type ExtractUserSelectCreateArgs<S extends undefined | boolean | UserSelectCreateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends UserSelectCreateArgs ? S['select'] : true;
export declare type ExtractUserIncludeCreateArgs<S extends undefined | boolean | UserIncludeCreateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends UserIncludeCreateArgs ? S['include'] : true;
/**
 * User update
 */
export declare type UserUpdateArgs = {
    select?: UserSelect | null;
    include?: UserInclude | null;
    data: UserUpdateInput;
    where: UserWhereUniqueInput;
};
export declare type UserUpdateArgsRequired = {
    select: UserSelect;
    include: UserInclude;
    data: UserUpdateInput;
    where: UserWhereUniqueInput;
};
export declare type UserSelectUpdateArgs = {
    select: UserSelect;
    data: UserUpdateInput;
    where: UserWhereUniqueInput;
};
export declare type UserSelectUpdateArgsOptional = {
    select?: UserSelect | null;
    data: UserUpdateInput;
    where: UserWhereUniqueInput;
};
export declare type UserIncludeUpdateArgs = {
    include: UserInclude;
    data: UserUpdateInput;
    where: UserWhereUniqueInput;
};
export declare type UserIncludeUpdateArgsOptional = {
    include?: UserInclude | null;
    data: UserUpdateInput;
    where: UserWhereUniqueInput;
};
export declare type ExtractUserSelectUpdateArgs<S extends undefined | boolean | UserSelectUpdateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends UserSelectUpdateArgs ? S['select'] : true;
export declare type ExtractUserIncludeUpdateArgs<S extends undefined | boolean | UserIncludeUpdateArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends UserIncludeUpdateArgs ? S['include'] : true;
/**
 * User updateMany
 */
export declare type UserUpdateManyArgs = {
    data: UserUpdateManyMutationInput;
    where?: UserWhereInput | null;
};
/**
 * User upsert
 */
export declare type UserUpsertArgs = {
    select?: UserSelect | null;
    include?: UserInclude | null;
    where: UserWhereUniqueInput;
    create: UserCreateInput;
    update: UserUpdateInput;
};
export declare type UserUpsertArgsRequired = {
    select: UserSelect;
    include: UserInclude;
    where: UserWhereUniqueInput;
    create: UserCreateInput;
    update: UserUpdateInput;
};
export declare type UserSelectUpsertArgs = {
    select: UserSelect;
    where: UserWhereUniqueInput;
    create: UserCreateInput;
    update: UserUpdateInput;
};
export declare type UserSelectUpsertArgsOptional = {
    select?: UserSelect | null;
    where: UserWhereUniqueInput;
    create: UserCreateInput;
    update: UserUpdateInput;
};
export declare type UserIncludeUpsertArgs = {
    include: UserInclude;
    where: UserWhereUniqueInput;
    create: UserCreateInput;
    update: UserUpdateInput;
};
export declare type UserIncludeUpsertArgsOptional = {
    include?: UserInclude | null;
    where: UserWhereUniqueInput;
    create: UserCreateInput;
    update: UserUpdateInput;
};
export declare type ExtractUserSelectUpsertArgs<S extends undefined | boolean | UserSelectUpsertArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends UserSelectUpsertArgs ? S['select'] : true;
export declare type ExtractUserIncludeUpsertArgs<S extends undefined | boolean | UserIncludeUpsertArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends UserIncludeUpsertArgs ? S['include'] : true;
/**
 * User delete
 */
export declare type UserDeleteArgs = {
    select?: UserSelect | null;
    include?: UserInclude | null;
    where: UserWhereUniqueInput;
};
export declare type UserDeleteArgsRequired = {
    select: UserSelect;
    include: UserInclude;
    where: UserWhereUniqueInput;
};
export declare type UserSelectDeleteArgs = {
    select: UserSelect;
    where: UserWhereUniqueInput;
};
export declare type UserSelectDeleteArgsOptional = {
    select?: UserSelect | null;
    where: UserWhereUniqueInput;
};
export declare type UserIncludeDeleteArgs = {
    include: UserInclude;
    where: UserWhereUniqueInput;
};
export declare type UserIncludeDeleteArgsOptional = {
    include?: UserInclude | null;
    where: UserWhereUniqueInput;
};
export declare type ExtractUserSelectDeleteArgs<S extends undefined | boolean | UserSelectDeleteArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends UserSelectDeleteArgs ? S['select'] : true;
export declare type ExtractUserIncludeDeleteArgs<S extends undefined | boolean | UserIncludeDeleteArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends UserIncludeDeleteArgs ? S['include'] : true;
/**
 * User deleteMany
 */
export declare type UserDeleteManyArgs = {
    where?: UserWhereInput | null;
};
/**
 * User without action
 */
export declare type UserArgs = {
    select?: UserSelect | null;
    include?: UserInclude | null;
};
export declare type UserArgsRequired = {
    select: UserSelect;
    include: UserInclude;
};
export declare type UserSelectArgs = {
    select: UserSelect;
};
export declare type UserSelectArgsOptional = {
    select?: UserSelect | null;
};
export declare type UserIncludeArgs = {
    include: UserInclude;
};
export declare type UserIncludeArgsOptional = {
    include?: UserInclude | null;
};
export declare type ExtractUserSelectArgs<S extends undefined | boolean | UserSelectArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends UserSelectArgs ? S['select'] : true;
export declare type ExtractUserIncludeArgs<S extends undefined | boolean | UserIncludeArgsOptional> = S extends undefined ? false : S extends boolean ? S : S extends UserIncludeArgs ? S['include'] : true;
/**
 * Deep Input Types
 */
export declare type SelectorWhereInput = {
    id?: number | IntFilter | null;
    css?: string | StringFilter | null;
    steps?: StepFilter | null;
    AND?: Enumerable<SelectorWhereInput> | null;
    OR?: Enumerable<SelectorWhereInput> | null;
    NOT?: Enumerable<SelectorWhereInput> | null;
    user?: UserWhereInput | null;
};
export declare type TestWhereInput = {
    id?: number | IntFilter | null;
    name?: string | StringFilter | null;
    steps?: StepFilter | null;
    tags?: TagFilter | null;
    AND?: Enumerable<TestWhereInput> | null;
    OR?: Enumerable<TestWhereInput> | null;
    NOT?: Enumerable<TestWhereInput> | null;
    user?: UserWhereInput | null;
};
export declare type StepWhereInput = {
    id?: number | IntFilter | null;
    action?: string | StringFilter | null;
    value?: string | StringFilter | null;
    AND?: Enumerable<StepWhereInput> | null;
    OR?: Enumerable<StepWhereInput> | null;
    NOT?: Enumerable<StepWhereInput> | null;
    selector?: SelectorWhereInput | null;
    test?: TestWhereInput | null;
    user?: UserWhereInput | null;
};
export declare type UserWhereInput = {
    id?: number | IntFilter | null;
    email?: string | StringFilter | null;
    password?: string | StringFilter | null;
    first?: string | StringFilter | null;
    last?: string | StringFilter | null;
    steps?: StepFilter | null;
    selectors?: SelectorFilter | null;
    tags?: TagFilter | null;
    tests?: TestFilter | null;
    AND?: Enumerable<UserWhereInput> | null;
    OR?: Enumerable<UserWhereInput> | null;
    NOT?: Enumerable<UserWhereInput> | null;
};
export declare type TagWhereInput = {
    id?: number | IntFilter | null;
    name?: string | StringFilter | null;
    AND?: Enumerable<TagWhereInput> | null;
    OR?: Enumerable<TagWhereInput> | null;
    NOT?: Enumerable<TagWhereInput> | null;
    user?: UserWhereInput | null;
    test?: TestWhereInput | null;
};
export declare type TagWhereUniqueInput = {
    id?: number | null;
};
export declare type SelectorWhereUniqueInput = {
    id?: number | null;
};
export declare type StepWhereUniqueInput = {
    id?: number | null;
};
export declare type TestWhereUniqueInput = {
    id?: number | null;
};
export declare type UserWhereUniqueInput = {
    id?: number | null;
    email?: string | null;
};
export declare type SelectorCreateWithoutStepsInput = {
    css: string;
    user?: UserCreateOneWithoutUserInput | null;
};
export declare type SelectorCreateOneWithoutSelectorInput = {
    create?: SelectorCreateWithoutStepsInput | null;
    connect?: SelectorWhereUniqueInput | null;
};
export declare type TagCreateWithoutTestInput = {
    name: string;
    user: UserCreateOneWithoutUserInput;
};
export declare type TagCreateManyWithoutTagsInput = {
    create?: Enumerable<TagCreateWithoutTestInput> | null;
    connect?: Enumerable<TagWhereUniqueInput> | null;
};
export declare type TestCreateWithoutStepsInput = {
    name: string;
    user: UserCreateOneWithoutUserInput;
    tags?: TagCreateManyWithoutTagsInput | null;
};
export declare type TestCreateOneWithoutTestInput = {
    create?: TestCreateWithoutStepsInput | null;
    connect?: TestWhereUniqueInput | null;
};
export declare type StepCreateWithoutUserInput = {
    action: string;
    value: string;
    selector: SelectorCreateOneWithoutSelectorInput;
    test?: TestCreateOneWithoutTestInput | null;
};
export declare type StepCreateManyWithoutStepsInput = {
    create?: Enumerable<StepCreateWithoutUserInput> | null;
    connect?: Enumerable<StepWhereUniqueInput> | null;
};
export declare type SelectorCreateWithoutUserInput = {
    css: string;
    steps?: StepCreateManyWithoutStepsInput | null;
};
export declare type SelectorCreateManyWithoutSelectorsInput = {
    create?: Enumerable<SelectorCreateWithoutUserInput> | null;
    connect?: Enumerable<SelectorWhereUniqueInput> | null;
};
export declare type TestCreateWithoutUserInput = {
    name: string;
    steps?: StepCreateManyWithoutStepsInput | null;
    tags?: TagCreateManyWithoutTagsInput | null;
};
export declare type TestCreateManyWithoutTestsInput = {
    create?: Enumerable<TestCreateWithoutUserInput> | null;
    connect?: Enumerable<TestWhereUniqueInput> | null;
};
export declare type UserCreateWithoutTagsInput = {
    email: string;
    password: string;
    first: string;
    last: string;
    steps?: StepCreateManyWithoutStepsInput | null;
    selectors?: SelectorCreateManyWithoutSelectorsInput | null;
    tests?: TestCreateManyWithoutTestsInput | null;
};
export declare type UserCreateOneWithoutUserInput = {
    create?: UserCreateWithoutTagsInput | null;
    connect?: UserWhereUniqueInput | null;
};
export declare type TagCreateInput = {
    name: string;
    user: UserCreateOneWithoutUserInput;
    test?: TestCreateOneWithoutTestInput | null;
};
export declare type UserCreateWithoutSelectorsInput = {
    email: string;
    password: string;
    first: string;
    last: string;
    steps?: StepCreateManyWithoutStepsInput | null;
    tags?: TagCreateManyWithoutTagsInput | null;
    tests?: TestCreateManyWithoutTestsInput | null;
};
export declare type TagCreateWithoutUserInput = {
    name: string;
    test?: TestCreateOneWithoutTestInput | null;
};
export declare type TestCreateWithoutTagsInput = {
    name: string;
    user: UserCreateOneWithoutUserInput;
    steps?: StepCreateManyWithoutStepsInput | null;
};
export declare type UserCreateWithoutTestsInput = {
    email: string;
    password: string;
    first: string;
    last: string;
    steps?: StepCreateManyWithoutStepsInput | null;
    selectors?: SelectorCreateManyWithoutSelectorsInput | null;
    tags?: TagCreateManyWithoutTagsInput | null;
};
export declare type StepCreateWithoutSelectorInput = {
    action: string;
    value: string;
    test?: TestCreateOneWithoutTestInput | null;
    user?: UserCreateOneWithoutUserInput | null;
};
export declare type TagUpdateWithoutTestDataInput = {
    id?: number | null;
    name?: string | null;
    user?: UserUpdateOneRequiredWithoutTagsInput | null;
};
export declare type TagUpdateWithWhereUniqueWithoutTestInput = {
    where: TagWhereUniqueInput;
    data: TagUpdateWithoutTestDataInput;
};
export declare type TagScalarWhereInput = {
    id?: number | IntFilter | null;
    name?: string | StringFilter | null;
    AND?: Enumerable<TagScalarWhereInput> | null;
    OR?: Enumerable<TagScalarWhereInput> | null;
    NOT?: Enumerable<TagScalarWhereInput> | null;
};
export declare type TagUpdateManyDataInput = {
    id?: number | null;
    name?: string | null;
};
export declare type TagUpdateManyWithWhereNestedInput = {
    where: TagScalarWhereInput;
    data: TagUpdateManyDataInput;
};
export declare type TagUpsertWithWhereUniqueWithoutTestInput = {
    where: TagWhereUniqueInput;
    update: TagUpdateWithoutTestDataInput;
    create: TagCreateWithoutTestInput;
};
export declare type TagUpdateManyWithoutTestInput = {
    create?: Enumerable<TagCreateWithoutTestInput> | null;
    connect?: Enumerable<TagWhereUniqueInput> | null;
    set?: Enumerable<TagWhereUniqueInput> | null;
    disconnect?: Enumerable<TagWhereUniqueInput> | null;
    delete?: Enumerable<TagWhereUniqueInput> | null;
    update?: Enumerable<TagUpdateWithWhereUniqueWithoutTestInput> | null;
    updateMany?: Enumerable<TagUpdateManyWithWhereNestedInput> | null;
    deleteMany?: Enumerable<TagScalarWhereInput> | null;
    upsert?: Enumerable<TagUpsertWithWhereUniqueWithoutTestInput> | null;
};
export declare type TestUpdateWithoutStepsDataInput = {
    id?: number | null;
    name?: string | null;
    user?: UserUpdateOneRequiredWithoutTestsInput | null;
    tags?: TagUpdateManyWithoutTestInput | null;
};
export declare type TestUpsertWithoutStepsInput = {
    update: TestUpdateWithoutStepsDataInput;
    create: TestCreateWithoutStepsInput;
};
export declare type TestUpdateOneWithoutStepsInput = {
    create?: TestCreateWithoutStepsInput | null;
    connect?: TestWhereUniqueInput | null;
    disconnect?: boolean | null;
    delete?: boolean | null;
    update?: TestUpdateWithoutStepsDataInput | null;
    upsert?: TestUpsertWithoutStepsInput | null;
};
export declare type UserCreateWithoutStepsInput = {
    email: string;
    password: string;
    first: string;
    last: string;
    selectors?: SelectorCreateManyWithoutSelectorsInput | null;
    tags?: TagCreateManyWithoutTagsInput | null;
    tests?: TestCreateManyWithoutTestsInput | null;
};
export declare type StepCreateWithoutTestInput = {
    action: string;
    value: string;
    selector: SelectorCreateOneWithoutSelectorInput;
    user?: UserCreateOneWithoutUserInput | null;
};
export declare type StepUpdateWithoutTestDataInput = {
    id?: number | null;
    action?: string | null;
    value?: string | null;
    selector?: SelectorUpdateOneRequiredWithoutStepsInput | null;
    user?: UserUpdateOneWithoutStepsInput | null;
};
export declare type StepUpdateWithWhereUniqueWithoutTestInput = {
    where: StepWhereUniqueInput;
    data: StepUpdateWithoutTestDataInput;
};
export declare type StepScalarWhereInput = {
    id?: number | IntFilter | null;
    action?: string | StringFilter | null;
    value?: string | StringFilter | null;
    AND?: Enumerable<StepScalarWhereInput> | null;
    OR?: Enumerable<StepScalarWhereInput> | null;
    NOT?: Enumerable<StepScalarWhereInput> | null;
};
export declare type StepUpdateManyDataInput = {
    id?: number | null;
    action?: string | null;
    value?: string | null;
};
export declare type StepUpdateManyWithWhereNestedInput = {
    where: StepScalarWhereInput;
    data: StepUpdateManyDataInput;
};
export declare type StepUpsertWithWhereUniqueWithoutTestInput = {
    where: StepWhereUniqueInput;
    update: StepUpdateWithoutTestDataInput;
    create: StepCreateWithoutTestInput;
};
export declare type StepUpdateManyWithoutTestInput = {
    create?: Enumerable<StepCreateWithoutTestInput> | null;
    connect?: Enumerable<StepWhereUniqueInput> | null;
    set?: Enumerable<StepWhereUniqueInput> | null;
    disconnect?: Enumerable<StepWhereUniqueInput> | null;
    delete?: Enumerable<StepWhereUniqueInput> | null;
    update?: Enumerable<StepUpdateWithWhereUniqueWithoutTestInput> | null;
    updateMany?: Enumerable<StepUpdateManyWithWhereNestedInput> | null;
    deleteMany?: Enumerable<StepScalarWhereInput> | null;
    upsert?: Enumerable<StepUpsertWithWhereUniqueWithoutTestInput> | null;
};
export declare type TestUpdateWithoutUserDataInput = {
    id?: number | null;
    name?: string | null;
    steps?: StepUpdateManyWithoutTestInput | null;
    tags?: TagUpdateManyWithoutTestInput | null;
};
export declare type TestUpdateWithWhereUniqueWithoutUserInput = {
    where: TestWhereUniqueInput;
    data: TestUpdateWithoutUserDataInput;
};
export declare type TestScalarWhereInput = {
    id?: number | IntFilter | null;
    name?: string | StringFilter | null;
    steps?: StepFilter | null;
    tags?: TagFilter | null;
    AND?: Enumerable<TestScalarWhereInput> | null;
    OR?: Enumerable<TestScalarWhereInput> | null;
    NOT?: Enumerable<TestScalarWhereInput> | null;
};
export declare type TestUpdateManyDataInput = {
    id?: number | null;
    name?: string | null;
};
export declare type TestUpdateManyWithWhereNestedInput = {
    where: TestScalarWhereInput;
    data: TestUpdateManyDataInput;
};
export declare type TestUpsertWithWhereUniqueWithoutUserInput = {
    where: TestWhereUniqueInput;
    update: TestUpdateWithoutUserDataInput;
    create: TestCreateWithoutUserInput;
};
export declare type TestUpdateManyWithoutUserInput = {
    create?: Enumerable<TestCreateWithoutUserInput> | null;
    connect?: Enumerable<TestWhereUniqueInput> | null;
    set?: Enumerable<TestWhereUniqueInput> | null;
    disconnect?: Enumerable<TestWhereUniqueInput> | null;
    delete?: Enumerable<TestWhereUniqueInput> | null;
    update?: Enumerable<TestUpdateWithWhereUniqueWithoutUserInput> | null;
    updateMany?: Enumerable<TestUpdateManyWithWhereNestedInput> | null;
    deleteMany?: Enumerable<TestScalarWhereInput> | null;
    upsert?: Enumerable<TestUpsertWithWhereUniqueWithoutUserInput> | null;
};
export declare type UserUpdateWithoutStepsDataInput = {
    id?: number | null;
    email?: string | null;
    password?: string | null;
    first?: string | null;
    last?: string | null;
    selectors?: SelectorUpdateManyWithoutUserInput | null;
    tags?: TagUpdateManyWithoutUserInput | null;
    tests?: TestUpdateManyWithoutUserInput | null;
};
export declare type UserUpsertWithoutStepsInput = {
    update: UserUpdateWithoutStepsDataInput;
    create: UserCreateWithoutStepsInput;
};
export declare type UserUpdateOneWithoutStepsInput = {
    create?: UserCreateWithoutStepsInput | null;
    connect?: UserWhereUniqueInput | null;
    disconnect?: boolean | null;
    delete?: boolean | null;
    update?: UserUpdateWithoutStepsDataInput | null;
    upsert?: UserUpsertWithoutStepsInput | null;
};
export declare type StepUpdateWithoutSelectorDataInput = {
    id?: number | null;
    action?: string | null;
    value?: string | null;
    test?: TestUpdateOneWithoutStepsInput | null;
    user?: UserUpdateOneWithoutStepsInput | null;
};
export declare type StepUpdateWithWhereUniqueWithoutSelectorInput = {
    where: StepWhereUniqueInput;
    data: StepUpdateWithoutSelectorDataInput;
};
export declare type StepUpsertWithWhereUniqueWithoutSelectorInput = {
    where: StepWhereUniqueInput;
    update: StepUpdateWithoutSelectorDataInput;
    create: StepCreateWithoutSelectorInput;
};
export declare type StepUpdateManyWithoutSelectorInput = {
    create?: Enumerable<StepCreateWithoutSelectorInput> | null;
    connect?: Enumerable<StepWhereUniqueInput> | null;
    set?: Enumerable<StepWhereUniqueInput> | null;
    disconnect?: Enumerable<StepWhereUniqueInput> | null;
    delete?: Enumerable<StepWhereUniqueInput> | null;
    update?: Enumerable<StepUpdateWithWhereUniqueWithoutSelectorInput> | null;
    updateMany?: Enumerable<StepUpdateManyWithWhereNestedInput> | null;
    deleteMany?: Enumerable<StepScalarWhereInput> | null;
    upsert?: Enumerable<StepUpsertWithWhereUniqueWithoutSelectorInput> | null;
};
export declare type SelectorUpdateWithoutUserDataInput = {
    id?: number | null;
    css?: string | null;
    steps?: StepUpdateManyWithoutSelectorInput | null;
};
export declare type SelectorUpdateWithWhereUniqueWithoutUserInput = {
    where: SelectorWhereUniqueInput;
    data: SelectorUpdateWithoutUserDataInput;
};
export declare type SelectorScalarWhereInput = {
    id?: number | IntFilter | null;
    css?: string | StringFilter | null;
    steps?: StepFilter | null;
    AND?: Enumerable<SelectorScalarWhereInput> | null;
    OR?: Enumerable<SelectorScalarWhereInput> | null;
    NOT?: Enumerable<SelectorScalarWhereInput> | null;
};
export declare type SelectorUpdateManyDataInput = {
    id?: number | null;
    css?: string | null;
};
export declare type SelectorUpdateManyWithWhereNestedInput = {
    where: SelectorScalarWhereInput;
    data: SelectorUpdateManyDataInput;
};
export declare type SelectorUpsertWithWhereUniqueWithoutUserInput = {
    where: SelectorWhereUniqueInput;
    update: SelectorUpdateWithoutUserDataInput;
    create: SelectorCreateWithoutUserInput;
};
export declare type SelectorUpdateManyWithoutUserInput = {
    create?: Enumerable<SelectorCreateWithoutUserInput> | null;
    connect?: Enumerable<SelectorWhereUniqueInput> | null;
    set?: Enumerable<SelectorWhereUniqueInput> | null;
    disconnect?: Enumerable<SelectorWhereUniqueInput> | null;
    delete?: Enumerable<SelectorWhereUniqueInput> | null;
    update?: Enumerable<SelectorUpdateWithWhereUniqueWithoutUserInput> | null;
    updateMany?: Enumerable<SelectorUpdateManyWithWhereNestedInput> | null;
    deleteMany?: Enumerable<SelectorScalarWhereInput> | null;
    upsert?: Enumerable<SelectorUpsertWithWhereUniqueWithoutUserInput> | null;
};
export declare type UserUpdateWithoutTestsDataInput = {
    id?: number | null;
    email?: string | null;
    password?: string | null;
    first?: string | null;
    last?: string | null;
    steps?: StepUpdateManyWithoutUserInput | null;
    selectors?: SelectorUpdateManyWithoutUserInput | null;
    tags?: TagUpdateManyWithoutUserInput | null;
};
export declare type UserUpsertWithoutTestsInput = {
    update: UserUpdateWithoutTestsDataInput;
    create: UserCreateWithoutTestsInput;
};
export declare type UserUpdateOneRequiredWithoutTestsInput = {
    create?: UserCreateWithoutTestsInput | null;
    connect?: UserWhereUniqueInput | null;
    update?: UserUpdateWithoutTestsDataInput | null;
    upsert?: UserUpsertWithoutTestsInput | null;
};
export declare type TestUpdateWithoutTagsDataInput = {
    id?: number | null;
    name?: string | null;
    user?: UserUpdateOneRequiredWithoutTestsInput | null;
    steps?: StepUpdateManyWithoutTestInput | null;
};
export declare type TestUpsertWithoutTagsInput = {
    update: TestUpdateWithoutTagsDataInput;
    create: TestCreateWithoutTagsInput;
};
export declare type TestUpdateOneWithoutTagsInput = {
    create?: TestCreateWithoutTagsInput | null;
    connect?: TestWhereUniqueInput | null;
    disconnect?: boolean | null;
    delete?: boolean | null;
    update?: TestUpdateWithoutTagsDataInput | null;
    upsert?: TestUpsertWithoutTagsInput | null;
};
export declare type TagUpdateWithoutUserDataInput = {
    id?: number | null;
    name?: string | null;
    test?: TestUpdateOneWithoutTagsInput | null;
};
export declare type TagUpdateWithWhereUniqueWithoutUserInput = {
    where: TagWhereUniqueInput;
    data: TagUpdateWithoutUserDataInput;
};
export declare type TagUpsertWithWhereUniqueWithoutUserInput = {
    where: TagWhereUniqueInput;
    update: TagUpdateWithoutUserDataInput;
    create: TagCreateWithoutUserInput;
};
export declare type TagUpdateManyWithoutUserInput = {
    create?: Enumerable<TagCreateWithoutUserInput> | null;
    connect?: Enumerable<TagWhereUniqueInput> | null;
    set?: Enumerable<TagWhereUniqueInput> | null;
    disconnect?: Enumerable<TagWhereUniqueInput> | null;
    delete?: Enumerable<TagWhereUniqueInput> | null;
    update?: Enumerable<TagUpdateWithWhereUniqueWithoutUserInput> | null;
    updateMany?: Enumerable<TagUpdateManyWithWhereNestedInput> | null;
    deleteMany?: Enumerable<TagScalarWhereInput> | null;
    upsert?: Enumerable<TagUpsertWithWhereUniqueWithoutUserInput> | null;
};
export declare type UserUpdateWithoutSelectorsDataInput = {
    id?: number | null;
    email?: string | null;
    password?: string | null;
    first?: string | null;
    last?: string | null;
    steps?: StepUpdateManyWithoutUserInput | null;
    tags?: TagUpdateManyWithoutUserInput | null;
    tests?: TestUpdateManyWithoutUserInput | null;
};
export declare type UserUpsertWithoutSelectorsInput = {
    update: UserUpdateWithoutSelectorsDataInput;
    create: UserCreateWithoutSelectorsInput;
};
export declare type UserUpdateOneWithoutSelectorsInput = {
    create?: UserCreateWithoutSelectorsInput | null;
    connect?: UserWhereUniqueInput | null;
    disconnect?: boolean | null;
    delete?: boolean | null;
    update?: UserUpdateWithoutSelectorsDataInput | null;
    upsert?: UserUpsertWithoutSelectorsInput | null;
};
export declare type SelectorUpdateWithoutStepsDataInput = {
    id?: number | null;
    css?: string | null;
    user?: UserUpdateOneWithoutSelectorsInput | null;
};
export declare type SelectorUpsertWithoutStepsInput = {
    update: SelectorUpdateWithoutStepsDataInput;
    create: SelectorCreateWithoutStepsInput;
};
export declare type SelectorUpdateOneRequiredWithoutStepsInput = {
    create?: SelectorCreateWithoutStepsInput | null;
    connect?: SelectorWhereUniqueInput | null;
    update?: SelectorUpdateWithoutStepsDataInput | null;
    upsert?: SelectorUpsertWithoutStepsInput | null;
};
export declare type StepUpdateWithoutUserDataInput = {
    id?: number | null;
    action?: string | null;
    value?: string | null;
    selector?: SelectorUpdateOneRequiredWithoutStepsInput | null;
    test?: TestUpdateOneWithoutStepsInput | null;
};
export declare type StepUpdateWithWhereUniqueWithoutUserInput = {
    where: StepWhereUniqueInput;
    data: StepUpdateWithoutUserDataInput;
};
export declare type StepUpsertWithWhereUniqueWithoutUserInput = {
    where: StepWhereUniqueInput;
    update: StepUpdateWithoutUserDataInput;
    create: StepCreateWithoutUserInput;
};
export declare type StepUpdateManyWithoutUserInput = {
    create?: Enumerable<StepCreateWithoutUserInput> | null;
    connect?: Enumerable<StepWhereUniqueInput> | null;
    set?: Enumerable<StepWhereUniqueInput> | null;
    disconnect?: Enumerable<StepWhereUniqueInput> | null;
    delete?: Enumerable<StepWhereUniqueInput> | null;
    update?: Enumerable<StepUpdateWithWhereUniqueWithoutUserInput> | null;
    updateMany?: Enumerable<StepUpdateManyWithWhereNestedInput> | null;
    deleteMany?: Enumerable<StepScalarWhereInput> | null;
    upsert?: Enumerable<StepUpsertWithWhereUniqueWithoutUserInput> | null;
};
export declare type UserUpdateWithoutTagsDataInput = {
    id?: number | null;
    email?: string | null;
    password?: string | null;
    first?: string | null;
    last?: string | null;
    steps?: StepUpdateManyWithoutUserInput | null;
    selectors?: SelectorUpdateManyWithoutUserInput | null;
    tests?: TestUpdateManyWithoutUserInput | null;
};
export declare type UserUpsertWithoutTagsInput = {
    update: UserUpdateWithoutTagsDataInput;
    create: UserCreateWithoutTagsInput;
};
export declare type UserUpdateOneRequiredWithoutTagsInput = {
    create?: UserCreateWithoutTagsInput | null;
    connect?: UserWhereUniqueInput | null;
    update?: UserUpdateWithoutTagsDataInput | null;
    upsert?: UserUpsertWithoutTagsInput | null;
};
export declare type TagUpdateInput = {
    id?: number | null;
    name?: string | null;
    user?: UserUpdateOneRequiredWithoutTagsInput | null;
    test?: TestUpdateOneWithoutTagsInput | null;
};
export declare type TagUpdateManyMutationInput = {
    id?: number | null;
    name?: string | null;
};
export declare type SelectorCreateInput = {
    css: string;
    steps?: StepCreateManyWithoutStepsInput | null;
    user?: UserCreateOneWithoutUserInput | null;
};
export declare type SelectorUpdateInput = {
    id?: number | null;
    css?: string | null;
    steps?: StepUpdateManyWithoutSelectorInput | null;
    user?: UserUpdateOneWithoutSelectorsInput | null;
};
export declare type SelectorUpdateManyMutationInput = {
    id?: number | null;
    css?: string | null;
};
export declare type StepCreateInput = {
    action: string;
    value: string;
    selector: SelectorCreateOneWithoutSelectorInput;
    test?: TestCreateOneWithoutTestInput | null;
    user?: UserCreateOneWithoutUserInput | null;
};
export declare type StepUpdateInput = {
    id?: number | null;
    action?: string | null;
    value?: string | null;
    selector?: SelectorUpdateOneRequiredWithoutStepsInput | null;
    test?: TestUpdateOneWithoutStepsInput | null;
    user?: UserUpdateOneWithoutStepsInput | null;
};
export declare type StepUpdateManyMutationInput = {
    id?: number | null;
    action?: string | null;
    value?: string | null;
};
export declare type TestCreateInput = {
    name: string;
    user: UserCreateOneWithoutUserInput;
    steps?: StepCreateManyWithoutStepsInput | null;
    tags?: TagCreateManyWithoutTagsInput | null;
};
export declare type TestUpdateInput = {
    id?: number | null;
    name?: string | null;
    user?: UserUpdateOneRequiredWithoutTestsInput | null;
    steps?: StepUpdateManyWithoutTestInput | null;
    tags?: TagUpdateManyWithoutTestInput | null;
};
export declare type TestUpdateManyMutationInput = {
    id?: number | null;
    name?: string | null;
};
export declare type UserCreateInput = {
    email: string;
    password: string;
    first: string;
    last: string;
    steps?: StepCreateManyWithoutStepsInput | null;
    selectors?: SelectorCreateManyWithoutSelectorsInput | null;
    tags?: TagCreateManyWithoutTagsInput | null;
    tests?: TestCreateManyWithoutTestsInput | null;
};
export declare type UserUpdateInput = {
    id?: number | null;
    email?: string | null;
    password?: string | null;
    first?: string | null;
    last?: string | null;
    steps?: StepUpdateManyWithoutUserInput | null;
    selectors?: SelectorUpdateManyWithoutUserInput | null;
    tags?: TagUpdateManyWithoutUserInput | null;
    tests?: TestUpdateManyWithoutUserInput | null;
};
export declare type UserUpdateManyMutationInput = {
    id?: number | null;
    email?: string | null;
    password?: string | null;
    first?: string | null;
    last?: string | null;
};
export declare type IntFilter = {
    equals?: number | null;
    not?: number | IntFilter | null;
    in?: Enumerable<number> | null;
    notIn?: Enumerable<number> | null;
    lt?: number | null;
    lte?: number | null;
    gt?: number | null;
    gte?: number | null;
};
export declare type StringFilter = {
    equals?: string | null;
    not?: string | StringFilter | null;
    in?: Enumerable<string> | null;
    notIn?: Enumerable<string> | null;
    lt?: string | null;
    lte?: string | null;
    gt?: string | null;
    gte?: string | null;
    contains?: string | null;
    startsWith?: string | null;
    endsWith?: string | null;
};
export declare type StepFilter = {
    every?: StepWhereInput | null;
    some?: StepWhereInput | null;
    none?: StepWhereInput | null;
};
export declare type TagFilter = {
    every?: TagWhereInput | null;
    some?: TagWhereInput | null;
    none?: TagWhereInput | null;
};
export declare type SelectorFilter = {
    every?: SelectorWhereInput | null;
    some?: SelectorWhereInput | null;
    none?: SelectorWhereInput | null;
};
export declare type TestFilter = {
    every?: TestWhereInput | null;
    some?: TestWhereInput | null;
    none?: TestWhereInput | null;
};
export declare type TagOrderByInput = {
    id?: OrderByArg | null;
    name?: OrderByArg | null;
};
export declare type StepOrderByInput = {
    id?: OrderByArg | null;
    action?: OrderByArg | null;
    value?: OrderByArg | null;
};
export declare type SelectorOrderByInput = {
    id?: OrderByArg | null;
    css?: OrderByArg | null;
};
export declare type TestOrderByInput = {
    id?: OrderByArg | null;
    name?: OrderByArg | null;
};
export declare type UserOrderByInput = {
    id?: OrderByArg | null;
    email?: OrderByArg | null;
    password?: OrderByArg | null;
    first?: OrderByArg | null;
    last?: OrderByArg | null;
};
/**
 * Batch Payload for updateMany & deleteMany
 */
export declare type BatchPayload = {
    count: number;
};
/**
 * DMMF
 */
export declare const dmmf: DMMF.Document;
export {};
