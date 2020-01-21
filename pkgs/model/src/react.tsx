import gql from "graphql-tag"
import * as ApolloReactCommon from "@apollo/client"
import * as ApolloReactHooks from "@apollo/client"
export type Maybe<T> = T | null
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: string
    String: string
    Boolean: boolean
    Int: number
    Float: number
}

export type Mutation = {
    __typename?: "Mutation"
    createOneTest: Test
    signIn: Scalars["String"]
    signUp: Scalars["String"]
}

export type MutationCreateOneTestArgs = {
    data: TestCreateCreateOnlyInput
}

export type MutationSignInArgs = {
    data: SignInInput
}

export type MutationSignUpArgs = {
    data: SignUpInput
}

export type Query = {
    __typename?: "Query"
    me: User
    selector?: Maybe<Selector>
    selectors: Array<Selector>
    step?: Maybe<Step>
    steps: Array<Step>
    tag?: Maybe<Tag>
    tags: Array<Tag>
    test?: Maybe<Test>
    tests: Array<Test>
    user?: Maybe<User>
    users: Array<User>
}

export type QuerySelectorArgs = {
    where: SelectorWhereUniqueInput
}

export type QuerySelectorsArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type QueryStepArgs = {
    where: StepWhereUniqueInput
}

export type QueryStepsArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type QueryTagArgs = {
    where: TagWhereUniqueInput
}

export type QueryTagsArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type QueryTestArgs = {
    where: TestWhereUniqueInput
}

export type QueryTestsArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type QueryUserArgs = {
    where: UserWhereUniqueInput
}

export type QueryUsersArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type Selector = {
    __typename?: "Selector"
    css: Scalars["String"]
    id: Scalars["Int"]
}

export type SelectorCreateWithoutStepsCreateOnlyInput = {
    css: Scalars["String"]
}

export type SelectorWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type SignInInput = {
    email: Scalars["String"]
    password: Scalars["String"]
}

export type SignUpInput = {
    email: Scalars["String"]
    first: Scalars["String"]
    last: Scalars["String"]
    password: Scalars["String"]
}

export type Step = {
    __typename?: "Step"
    action: Scalars["String"]
    id: Scalars["Int"]
    selector: Selector
    value: Scalars["String"]
}

export type StepCreateWithoutUserCreateOnlyInput = {
    action: Scalars["String"]
    selector?: Maybe<SelectorCreateWithoutStepsCreateOnlyInput>
    tests?: Maybe<Array<TestCreateWithoutStepsCreateOnlyInput>>
    value: Scalars["String"]
}

export type StepWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type Tag = {
    __typename?: "Tag"
    id: Scalars["Int"]
    name: Scalars["String"]
}

export type TagCreateWithoutTestCreateOnlyInput = {
    name: Scalars["String"]
}

export type TagWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type Test = {
    __typename?: "Test"
    id: Scalars["Int"]
    name: Scalars["String"]
    steps: Array<Step>
    tags: Array<Tag>
}

export type TestStepsArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type TestTagsArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type TestCreateCreateOnlyInput = {
    name: Scalars["String"]
    steps?: Maybe<Array<StepCreateWithoutUserCreateOnlyInput>>
    tags?: Maybe<Array<TagCreateWithoutTestCreateOnlyInput>>
}

export type TestCreateWithoutStepsCreateOnlyInput = {
    name: Scalars["String"]
    tags?: Maybe<Array<TagCreateWithoutTestCreateOnlyInput>>
}

export type TestWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type User = {
    __typename?: "User"
    email: Scalars["String"]
    first: Scalars["String"]
    id: Scalars["Int"]
    last: Scalars["String"]
    password: Scalars["String"]
    selectors: Array<Selector>
    steps: Array<Step>
    tags: Array<Tag>
    tests: Array<Test>
}

export type UserSelectorsArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type UserStepsArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type UserTagsArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type UserTestsArgs = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type UserWhereUniqueInput = {
    email?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
}

export type MeQueryVariables = {}

export type MeQuery = { __typename?: "Query" } & {
    me: { __typename?: "User" } & Pick<
        User,
        "email" | "first" | "id" | "last" | "password"
    > & {
            selectors: Array<
                { __typename?: "Selector" } & Pick<Selector, "css" | "id">
            >
            steps: Array<
                { __typename?: "Step" } & Pick<
                    Step,
                    "action" | "id" | "value"
                > & {
                        selector: { __typename?: "Selector" } & Pick<
                            Selector,
                            "css" | "id"
                        >
                    }
            >
            tags: Array<{ __typename?: "Tag" } & Pick<Tag, "id" | "name">>
            tests: Array<
                { __typename?: "Test" } & Pick<Test, "id" | "name"> & {
                        steps: Array<
                            { __typename?: "Step" } & Pick<
                                Step,
                                "action" | "id" | "value"
                            > & {
                                    selector: {
                                        __typename?: "Selector"
                                    } & Pick<Selector, "css" | "id">
                                }
                        >
                        tags: Array<
                            { __typename?: "Tag" } & Pick<Tag, "id" | "name">
                        >
                    }
            >
        }
}

export type SelectorQueryVariables = {
    id?: Maybe<Scalars["Int"]>
}

export type SelectorQuery = { __typename?: "Query" } & {
    selector: Maybe<{ __typename?: "Selector" } & Pick<Selector, "css" | "id">>
}

export type SelectorsQueryVariables = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type SelectorsQuery = { __typename?: "Query" } & {
    selectors: Array<{ __typename?: "Selector" } & Pick<Selector, "css" | "id">>
}

export type StepQueryVariables = {
    id?: Maybe<Scalars["Int"]>
}

export type StepQuery = { __typename?: "Query" } & {
    step: Maybe<
        { __typename?: "Step" } & Pick<Step, "action" | "id" | "value"> & {
                selector: { __typename?: "Selector" } & Pick<
                    Selector,
                    "css" | "id"
                >
            }
    >
}

export type StepsQueryVariables = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type StepsQuery = { __typename?: "Query" } & {
    steps: Array<
        { __typename?: "Step" } & Pick<Step, "action" | "id" | "value"> & {
                selector: { __typename?: "Selector" } & Pick<
                    Selector,
                    "css" | "id"
                >
            }
    >
}

export type TagQueryVariables = {
    id?: Maybe<Scalars["Int"]>
}

export type TagQuery = { __typename?: "Query" } & {
    tag: Maybe<{ __typename?: "Tag" } & Pick<Tag, "id" | "name">>
}

export type TagsQueryVariables = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type TagsQuery = { __typename?: "Query" } & {
    tags: Array<{ __typename?: "Tag" } & Pick<Tag, "id" | "name">>
}

export type TestQueryVariables = {
    id?: Maybe<Scalars["Int"]>
}

export type TestQuery = { __typename?: "Query" } & {
    test: Maybe<
        { __typename?: "Test" } & Pick<Test, "id" | "name"> & {
                steps: Array<
                    { __typename?: "Step" } & Pick<
                        Step,
                        "action" | "id" | "value"
                    > & {
                            selector: { __typename?: "Selector" } & Pick<
                                Selector,
                                "css" | "id"
                            >
                        }
                >
                tags: Array<{ __typename?: "Tag" } & Pick<Tag, "id" | "name">>
            }
    >
}

export type TestsQueryVariables = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type TestsQuery = { __typename?: "Query" } & {
    tests: Array<
        { __typename?: "Test" } & Pick<Test, "id" | "name"> & {
                steps: Array<
                    { __typename?: "Step" } & Pick<
                        Step,
                        "action" | "id" | "value"
                    > & {
                            selector: { __typename?: "Selector" } & Pick<
                                Selector,
                                "css" | "id"
                            >
                        }
                >
                tags: Array<{ __typename?: "Tag" } & Pick<Tag, "id" | "name">>
            }
    >
}

export type UserQueryVariables = {
    email?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
}

export type UserQuery = { __typename?: "Query" } & {
    user: Maybe<
        { __typename?: "User" } & Pick<
            User,
            "email" | "first" | "id" | "last" | "password"
        > & {
                selectors: Array<
                    { __typename?: "Selector" } & Pick<Selector, "css" | "id">
                >
                steps: Array<
                    { __typename?: "Step" } & Pick<
                        Step,
                        "action" | "id" | "value"
                    > & {
                            selector: { __typename?: "Selector" } & Pick<
                                Selector,
                                "css" | "id"
                            >
                        }
                >
                tags: Array<{ __typename?: "Tag" } & Pick<Tag, "id" | "name">>
                tests: Array<
                    { __typename?: "Test" } & Pick<Test, "id" | "name"> & {
                            steps: Array<
                                { __typename?: "Step" } & Pick<
                                    Step,
                                    "action" | "id" | "value"
                                > & {
                                        selector: {
                                            __typename?: "Selector"
                                        } & Pick<Selector, "css" | "id">
                                    }
                            >
                            tags: Array<
                                { __typename?: "Tag" } & Pick<
                                    Tag,
                                    "id" | "name"
                                >
                            >
                        }
                >
            }
    >
}

export type UsersQueryVariables = {
    after?: Maybe<Scalars["Int"]>
    before?: Maybe<Scalars["Int"]>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type UsersQuery = { __typename?: "Query" } & {
    users: Array<
        { __typename?: "User" } & Pick<
            User,
            "email" | "first" | "id" | "last" | "password"
        > & {
                selectors: Array<
                    { __typename?: "Selector" } & Pick<Selector, "css" | "id">
                >
                steps: Array<
                    { __typename?: "Step" } & Pick<
                        Step,
                        "action" | "id" | "value"
                    > & {
                            selector: { __typename?: "Selector" } & Pick<
                                Selector,
                                "css" | "id"
                            >
                        }
                >
                tags: Array<{ __typename?: "Tag" } & Pick<Tag, "id" | "name">>
                tests: Array<
                    { __typename?: "Test" } & Pick<Test, "id" | "name"> & {
                            steps: Array<
                                { __typename?: "Step" } & Pick<
                                    Step,
                                    "action" | "id" | "value"
                                > & {
                                        selector: {
                                            __typename?: "Selector"
                                        } & Pick<Selector, "css" | "id">
                                    }
                            >
                            tags: Array<
                                { __typename?: "Tag" } & Pick<
                                    Tag,
                                    "id" | "name"
                                >
                            >
                        }
                >
            }
    >
}

export type CreateOneTestMutationVariables = {
    name: Scalars["String"]
    steps?: Maybe<Array<StepCreateWithoutUserCreateOnlyInput>>
    tags?: Maybe<Array<TagCreateWithoutTestCreateOnlyInput>>
}

export type CreateOneTestMutation = { __typename?: "Mutation" } & {
    createOneTest: { __typename?: "Test" } & Pick<Test, "id" | "name"> & {
            steps: Array<
                { __typename?: "Step" } & Pick<
                    Step,
                    "action" | "id" | "value"
                > & {
                        selector: { __typename?: "Selector" } & Pick<
                            Selector,
                            "css" | "id"
                        >
                    }
            >
            tags: Array<{ __typename?: "Tag" } & Pick<Tag, "id" | "name">>
        }
}

export type SignInMutationVariables = {
    email: Scalars["String"]
    password: Scalars["String"]
}

export type SignInMutation = { __typename?: "Mutation" } & Pick<
    Mutation,
    "signIn"
>

export type SignUpMutationVariables = {
    email: Scalars["String"]
    first: Scalars["String"]
    last: Scalars["String"]
    password: Scalars["String"]
}

export type SignUpMutation = { __typename?: "Mutation" } & Pick<
    Mutation,
    "signUp"
>

export const MeDocument = gql`
    query me {
        me {
            email
            first
            id
            last
            password
            selectors {
                css
                id
            }
            steps {
                action
                id
                selector {
                    css
                    id
                }
                value
            }
            tags {
                id
                name
            }
            tests {
                id
                name
                steps {
                    action
                    id
                    selector {
                        css
                        id
                    }
                    value
                }
                tags {
                    id
                    name
                }
            }
        }
    }
`

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<MeQuery, MeQueryVariables>
) {
    return ApolloReactHooks.useQuery<MeQuery, MeQueryVariables>(
        MeDocument,
        baseOptions
    )
}
export function useMeLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        MeQuery,
        MeQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<MeQuery, MeQueryVariables>(
        MeDocument,
        baseOptions
    )
}
export type MeQueryHookResult = ReturnType<typeof useMeQuery>
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>
export type MeQueryResult = ApolloReactCommon.QueryResult<
    MeQuery,
    MeQueryVariables
>
export const SelectorDocument = gql`
    query selector($id: Int) {
        selector(where: { id: $id }) {
            css
            id
        }
    }
`

/**
 * __useSelectorQuery__
 *
 * To run a query within a React component, call `useSelectorQuery` and pass it any options that fit your needs.
 * When your component renders, `useSelectorQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSelectorQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSelectorQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<
        SelectorQuery,
        SelectorQueryVariables
    >
) {
    return ApolloReactHooks.useQuery<SelectorQuery, SelectorQueryVariables>(
        SelectorDocument,
        baseOptions
    )
}
export function useSelectorLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        SelectorQuery,
        SelectorQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<SelectorQuery, SelectorQueryVariables>(
        SelectorDocument,
        baseOptions
    )
}
export type SelectorQueryHookResult = ReturnType<typeof useSelectorQuery>
export type SelectorLazyQueryHookResult = ReturnType<
    typeof useSelectorLazyQuery
>
export type SelectorQueryResult = ApolloReactCommon.QueryResult<
    SelectorQuery,
    SelectorQueryVariables
>
export const SelectorsDocument = gql`
    query selectors(
        $after: Int
        $before: Int
        $first: Int
        $last: Int
        $skip: Int
    ) {
        selectors(
            after: $after
            before: $before
            first: $first
            last: $last
            skip: $skip
        ) {
            css
            id
        }
    }
`

/**
 * __useSelectorsQuery__
 *
 * To run a query within a React component, call `useSelectorsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSelectorsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSelectorsQuery({
 *   variables: {
 *      after: // value for 'after'
 *      before: // value for 'before'
 *      first: // value for 'first'
 *      last: // value for 'last'
 *      skip: // value for 'skip'
 *   },
 * });
 */
export function useSelectorsQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<
        SelectorsQuery,
        SelectorsQueryVariables
    >
) {
    return ApolloReactHooks.useQuery<SelectorsQuery, SelectorsQueryVariables>(
        SelectorsDocument,
        baseOptions
    )
}
export function useSelectorsLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        SelectorsQuery,
        SelectorsQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<
        SelectorsQuery,
        SelectorsQueryVariables
    >(SelectorsDocument, baseOptions)
}
export type SelectorsQueryHookResult = ReturnType<typeof useSelectorsQuery>
export type SelectorsLazyQueryHookResult = ReturnType<
    typeof useSelectorsLazyQuery
>
export type SelectorsQueryResult = ApolloReactCommon.QueryResult<
    SelectorsQuery,
    SelectorsQueryVariables
>
export const StepDocument = gql`
    query step($id: Int) {
        step(where: { id: $id }) {
            action
            id
            selector {
                css
                id
            }
            value
        }
    }
`

/**
 * __useStepQuery__
 *
 * To run a query within a React component, call `useStepQuery` and pass it any options that fit your needs.
 * When your component renders, `useStepQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStepQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useStepQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<
        StepQuery,
        StepQueryVariables
    >
) {
    return ApolloReactHooks.useQuery<StepQuery, StepQueryVariables>(
        StepDocument,
        baseOptions
    )
}
export function useStepLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        StepQuery,
        StepQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<StepQuery, StepQueryVariables>(
        StepDocument,
        baseOptions
    )
}
export type StepQueryHookResult = ReturnType<typeof useStepQuery>
export type StepLazyQueryHookResult = ReturnType<typeof useStepLazyQuery>
export type StepQueryResult = ApolloReactCommon.QueryResult<
    StepQuery,
    StepQueryVariables
>
export const StepsDocument = gql`
    query steps(
        $after: Int
        $before: Int
        $first: Int
        $last: Int
        $skip: Int
    ) {
        steps(
            after: $after
            before: $before
            first: $first
            last: $last
            skip: $skip
        ) {
            action
            id
            selector {
                css
                id
            }
            value
        }
    }
`

/**
 * __useStepsQuery__
 *
 * To run a query within a React component, call `useStepsQuery` and pass it any options that fit your needs.
 * When your component renders, `useStepsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStepsQuery({
 *   variables: {
 *      after: // value for 'after'
 *      before: // value for 'before'
 *      first: // value for 'first'
 *      last: // value for 'last'
 *      skip: // value for 'skip'
 *   },
 * });
 */
export function useStepsQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<
        StepsQuery,
        StepsQueryVariables
    >
) {
    return ApolloReactHooks.useQuery<StepsQuery, StepsQueryVariables>(
        StepsDocument,
        baseOptions
    )
}
export function useStepsLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        StepsQuery,
        StepsQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<StepsQuery, StepsQueryVariables>(
        StepsDocument,
        baseOptions
    )
}
export type StepsQueryHookResult = ReturnType<typeof useStepsQuery>
export type StepsLazyQueryHookResult = ReturnType<typeof useStepsLazyQuery>
export type StepsQueryResult = ApolloReactCommon.QueryResult<
    StepsQuery,
    StepsQueryVariables
>
export const TagDocument = gql`
    query tag($id: Int) {
        tag(where: { id: $id }) {
            id
            name
        }
    }
`

/**
 * __useTagQuery__
 *
 * To run a query within a React component, call `useTagQuery` and pass it any options that fit your needs.
 * When your component renders, `useTagQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTagQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useTagQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<TagQuery, TagQueryVariables>
) {
    return ApolloReactHooks.useQuery<TagQuery, TagQueryVariables>(
        TagDocument,
        baseOptions
    )
}
export function useTagLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        TagQuery,
        TagQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<TagQuery, TagQueryVariables>(
        TagDocument,
        baseOptions
    )
}
export type TagQueryHookResult = ReturnType<typeof useTagQuery>
export type TagLazyQueryHookResult = ReturnType<typeof useTagLazyQuery>
export type TagQueryResult = ApolloReactCommon.QueryResult<
    TagQuery,
    TagQueryVariables
>
export const TagsDocument = gql`
    query tags($after: Int, $before: Int, $first: Int, $last: Int, $skip: Int) {
        tags(
            after: $after
            before: $before
            first: $first
            last: $last
            skip: $skip
        ) {
            id
            name
        }
    }
`

/**
 * __useTagsQuery__
 *
 * To run a query within a React component, call `useTagsQuery` and pass it any options that fit your needs.
 * When your component renders, `useTagsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTagsQuery({
 *   variables: {
 *      after: // value for 'after'
 *      before: // value for 'before'
 *      first: // value for 'first'
 *      last: // value for 'last'
 *      skip: // value for 'skip'
 *   },
 * });
 */
export function useTagsQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<
        TagsQuery,
        TagsQueryVariables
    >
) {
    return ApolloReactHooks.useQuery<TagsQuery, TagsQueryVariables>(
        TagsDocument,
        baseOptions
    )
}
export function useTagsLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        TagsQuery,
        TagsQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<TagsQuery, TagsQueryVariables>(
        TagsDocument,
        baseOptions
    )
}
export type TagsQueryHookResult = ReturnType<typeof useTagsQuery>
export type TagsLazyQueryHookResult = ReturnType<typeof useTagsLazyQuery>
export type TagsQueryResult = ApolloReactCommon.QueryResult<
    TagsQuery,
    TagsQueryVariables
>
export const TestDocument = gql`
    query test($id: Int) {
        test(where: { id: $id }) {
            id
            name
            steps {
                action
                id
                selector {
                    css
                    id
                }
                value
            }
            tags {
                id
                name
            }
        }
    }
`

/**
 * __useTestQuery__
 *
 * To run a query within a React component, call `useTestQuery` and pass it any options that fit your needs.
 * When your component renders, `useTestQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTestQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useTestQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<
        TestQuery,
        TestQueryVariables
    >
) {
    return ApolloReactHooks.useQuery<TestQuery, TestQueryVariables>(
        TestDocument,
        baseOptions
    )
}
export function useTestLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        TestQuery,
        TestQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<TestQuery, TestQueryVariables>(
        TestDocument,
        baseOptions
    )
}
export type TestQueryHookResult = ReturnType<typeof useTestQuery>
export type TestLazyQueryHookResult = ReturnType<typeof useTestLazyQuery>
export type TestQueryResult = ApolloReactCommon.QueryResult<
    TestQuery,
    TestQueryVariables
>
export const TestsDocument = gql`
    query tests(
        $after: Int
        $before: Int
        $first: Int
        $last: Int
        $skip: Int
    ) {
        tests(
            after: $after
            before: $before
            first: $first
            last: $last
            skip: $skip
        ) {
            id
            name
            steps {
                action
                id
                selector {
                    css
                    id
                }
                value
            }
            tags {
                id
                name
            }
        }
    }
`

/**
 * __useTestsQuery__
 *
 * To run a query within a React component, call `useTestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useTestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTestsQuery({
 *   variables: {
 *      after: // value for 'after'
 *      before: // value for 'before'
 *      first: // value for 'first'
 *      last: // value for 'last'
 *      skip: // value for 'skip'
 *   },
 * });
 */
export function useTestsQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<
        TestsQuery,
        TestsQueryVariables
    >
) {
    return ApolloReactHooks.useQuery<TestsQuery, TestsQueryVariables>(
        TestsDocument,
        baseOptions
    )
}
export function useTestsLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        TestsQuery,
        TestsQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<TestsQuery, TestsQueryVariables>(
        TestsDocument,
        baseOptions
    )
}
export type TestsQueryHookResult = ReturnType<typeof useTestsQuery>
export type TestsLazyQueryHookResult = ReturnType<typeof useTestsLazyQuery>
export type TestsQueryResult = ApolloReactCommon.QueryResult<
    TestsQuery,
    TestsQueryVariables
>
export const UserDocument = gql`
    query user($email: String, $id: Int) {
        user(where: { email: $email, id: $id }) {
            email
            first
            id
            last
            password
            selectors {
                css
                id
            }
            steps {
                action
                id
                selector {
                    css
                    id
                }
                value
            }
            tags {
                id
                name
            }
            tests {
                id
                name
                steps {
                    action
                    id
                    selector {
                        css
                        id
                    }
                    value
                }
                tags {
                    id
                    name
                }
            }
        }
    }
`

/**
 * __useUserQuery__
 *
 * To run a query within a React component, call `useUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserQuery({
 *   variables: {
 *      email: // value for 'email'
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUserQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<
        UserQuery,
        UserQueryVariables
    >
) {
    return ApolloReactHooks.useQuery<UserQuery, UserQueryVariables>(
        UserDocument,
        baseOptions
    )
}
export function useUserLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        UserQuery,
        UserQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<UserQuery, UserQueryVariables>(
        UserDocument,
        baseOptions
    )
}
export type UserQueryHookResult = ReturnType<typeof useUserQuery>
export type UserLazyQueryHookResult = ReturnType<typeof useUserLazyQuery>
export type UserQueryResult = ApolloReactCommon.QueryResult<
    UserQuery,
    UserQueryVariables
>
export const UsersDocument = gql`
    query users(
        $after: Int
        $before: Int
        $first: Int
        $last: Int
        $skip: Int
    ) {
        users(
            after: $after
            before: $before
            first: $first
            last: $last
            skip: $skip
        ) {
            email
            first
            id
            last
            password
            selectors {
                css
                id
            }
            steps {
                action
                id
                selector {
                    css
                    id
                }
                value
            }
            tags {
                id
                name
            }
            tests {
                id
                name
                steps {
                    action
                    id
                    selector {
                        css
                        id
                    }
                    value
                }
                tags {
                    id
                    name
                }
            }
        }
    }
`

/**
 * __useUsersQuery__
 *
 * To run a query within a React component, call `useUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsersQuery({
 *   variables: {
 *      after: // value for 'after'
 *      before: // value for 'before'
 *      first: // value for 'first'
 *      last: // value for 'last'
 *      skip: // value for 'skip'
 *   },
 * });
 */
export function useUsersQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<
        UsersQuery,
        UsersQueryVariables
    >
) {
    return ApolloReactHooks.useQuery<UsersQuery, UsersQueryVariables>(
        UsersDocument,
        baseOptions
    )
}
export function useUsersLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        UsersQuery,
        UsersQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<UsersQuery, UsersQueryVariables>(
        UsersDocument,
        baseOptions
    )
}
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>
export type UsersQueryResult = ApolloReactCommon.QueryResult<
    UsersQuery,
    UsersQueryVariables
>
export const CreateOneTestDocument = gql`
    mutation createOneTest(
        $name: String!
        $steps: [StepCreateWithoutUserCreateOnlyInput!]
        $tags: [TagCreateWithoutTestCreateOnlyInput!]
    ) {
        createOneTest(data: { name: $name, steps: $steps, tags: $tags }) {
            id
            name
            steps {
                action
                id
                selector {
                    css
                    id
                }
                value
            }
            tags {
                id
                name
            }
        }
    }
`
export type CreateOneTestMutationFn = ApolloReactCommon.MutationFunction<
    CreateOneTestMutation,
    CreateOneTestMutationVariables
>

/**
 * __useCreateOneTestMutation__
 *
 * To run a mutation, you first call `useCreateOneTestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateOneTestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createOneTestMutation, { data, loading, error }] = useCreateOneTestMutation({
 *   variables: {
 *      name: // value for 'name'
 *      steps: // value for 'steps'
 *      tags: // value for 'tags'
 *   },
 * });
 */
export function useCreateOneTestMutation(
    baseOptions?: ApolloReactHooks.MutationHookOptions<
        CreateOneTestMutation,
        CreateOneTestMutationVariables
    >
) {
    return ApolloReactHooks.useMutation<
        CreateOneTestMutation,
        CreateOneTestMutationVariables
    >(CreateOneTestDocument, baseOptions)
}
export type CreateOneTestMutationHookResult = ReturnType<
    typeof useCreateOneTestMutation
>
export type CreateOneTestMutationResult = ApolloReactCommon.MutationResult<
    CreateOneTestMutation
>
export type CreateOneTestMutationOptions = ApolloReactCommon.BaseMutationOptions<
    CreateOneTestMutation,
    CreateOneTestMutationVariables
>
export const SignInDocument = gql`
    mutation signIn($email: String!, $password: String!) {
        signIn(data: { email: $email, password: $password })
    }
`
export type SignInMutationFn = ApolloReactCommon.MutationFunction<
    SignInMutation,
    SignInMutationVariables
>

/**
 * __useSignInMutation__
 *
 * To run a mutation, you first call `useSignInMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignInMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signInMutation, { data, loading, error }] = useSignInMutation({
 *   variables: {
 *      email: // value for 'email'
 *      password: // value for 'password'
 *   },
 * });
 */
export function useSignInMutation(
    baseOptions?: ApolloReactHooks.MutationHookOptions<
        SignInMutation,
        SignInMutationVariables
    >
) {
    return ApolloReactHooks.useMutation<
        SignInMutation,
        SignInMutationVariables
    >(SignInDocument, baseOptions)
}
export type SignInMutationHookResult = ReturnType<typeof useSignInMutation>
export type SignInMutationResult = ApolloReactCommon.MutationResult<
    SignInMutation
>
export type SignInMutationOptions = ApolloReactCommon.BaseMutationOptions<
    SignInMutation,
    SignInMutationVariables
>
export const SignUpDocument = gql`
    mutation signUp(
        $email: String!
        $first: String!
        $last: String!
        $password: String!
    ) {
        signUp(
            data: {
                email: $email
                first: $first
                last: $last
                password: $password
            }
        )
    }
`
export type SignUpMutationFn = ApolloReactCommon.MutationFunction<
    SignUpMutation,
    SignUpMutationVariables
>

/**
 * __useSignUpMutation__
 *
 * To run a mutation, you first call `useSignUpMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignUpMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signUpMutation, { data, loading, error }] = useSignUpMutation({
 *   variables: {
 *      email: // value for 'email'
 *      first: // value for 'first'
 *      last: // value for 'last'
 *      password: // value for 'password'
 *   },
 * });
 */
export function useSignUpMutation(
    baseOptions?: ApolloReactHooks.MutationHookOptions<
        SignUpMutation,
        SignUpMutationVariables
    >
) {
    return ApolloReactHooks.useMutation<
        SignUpMutation,
        SignUpMutationVariables
    >(SignUpDocument, baseOptions)
}
export type SignUpMutationHookResult = ReturnType<typeof useSignUpMutation>
export type SignUpMutationResult = ApolloReactCommon.MutationResult<
    SignUpMutation
>
export type SignUpMutationOptions = ApolloReactCommon.BaseMutationOptions<
    SignUpMutation,
    SignUpMutationVariables
>
