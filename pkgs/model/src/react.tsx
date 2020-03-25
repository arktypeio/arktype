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
    createTest: Test
    signIn: Scalars["String"]
    signUp: Scalars["String"]
}

export type MutationCreateTestArgs = {
    data: TestCreateInput
}

export type MutationSignInArgs = {
    data: SignInInput
}

export type MutationSignUpArgs = {
    data: SignUpInput
}

export type NameUserCompoundUniqueInput = {
    name: Scalars["String"]
}

export type Query = {
    __typename?: "Query"
    me: User
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
    expected?: Maybe<Scalars["String"]>
    id: Scalars["Int"]
    key?: Maybe<Scalars["String"]>
    kind: StepKind
    selector?: Maybe<Scalars["String"]>
    tests: Array<Test>
    url?: Maybe<Scalars["String"]>
    user?: Maybe<User>
    value?: Maybe<Scalars["String"]>
}

export type StepTestsArgs = {
    after?: Maybe<TestWhereUniqueInput>
    before?: Maybe<TestWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type StepCreateWithoutTestsInput = {
    expected?: Maybe<Scalars["String"]>
    key?: Maybe<Scalars["String"]>
    kind: StepKind
    selector?: Maybe<Scalars["String"]>
    url?: Maybe<Scalars["String"]>
    value?: Maybe<Scalars["String"]>
}

export enum StepKind {
    AssertText = "assertText",
    AssertVisibility = "assertVisibility",
    Click = "click",
    Go = "go",
    Hover = "hover",
    Key = "key",
    Screenshot = "screenshot",
    Set = "set",
}

export type StepWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type Tag = {
    __typename?: "Tag"
    id: Scalars["Int"]
    name: Scalars["String"]
    test?: Maybe<Test>
    user: User
}

export type TagCreateWithoutTestInput = {
    name: Scalars["String"]
}

export type TagWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
    name_user?: Maybe<NameUserCompoundUniqueInput>
}

export type Test = {
    __typename?: "Test"
    id: Scalars["Int"]
    name: Scalars["String"]
    steps: Array<Step>
    tags: Array<Tag>
    user: User
}

export type TestStepsArgs = {
    after?: Maybe<StepWhereUniqueInput>
    before?: Maybe<StepWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type TestTagsArgs = {
    after?: Maybe<TagWhereUniqueInput>
    before?: Maybe<TagWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type TestCreateInput = {
    name: Scalars["String"]
    steps?: Maybe<Array<StepCreateWithoutTestsInput>>
    tags?: Maybe<Array<TagCreateWithoutTestInput>>
}

export type TestWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
    name_user?: Maybe<NameUserCompoundUniqueInput>
}

export type User = {
    __typename?: "User"
    email: Scalars["String"]
    first: Scalars["String"]
    id: Scalars["Int"]
    last: Scalars["String"]
    password: Scalars["String"]
    steps: Array<Step>
    tags: Array<Tag>
    tests: Array<Test>
}

export type UserStepsArgs = {
    after?: Maybe<StepWhereUniqueInput>
    before?: Maybe<StepWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type UserTagsArgs = {
    after?: Maybe<TagWhereUniqueInput>
    before?: Maybe<TagWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type UserTestsArgs = {
    after?: Maybe<TestWhereUniqueInput>
    before?: Maybe<TestWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type MeQueryVariables = {}

export type MeQuery = { __typename?: "Query" } & {
    me: { __typename?: "User" } & Pick<
        User,
        "email" | "first" | "id" | "last" | "password"
    > & {
            steps: Array<
                { __typename?: "Step" } & Pick<
                    Step,
                    | "expected"
                    | "id"
                    | "key"
                    | "kind"
                    | "selector"
                    | "url"
                    | "value"
                > & {
                        tests: Array<
                            { __typename?: "Test" } & Pick<
                                Test,
                                "id" | "name"
                            > & {
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
            tags: Array<{ __typename?: "Tag" } & Pick<Tag, "id" | "name">>
            tests: Array<
                { __typename?: "Test" } & Pick<Test, "id" | "name"> & {
                        steps: Array<
                            { __typename?: "Step" } & Pick<
                                Step,
                                | "expected"
                                | "id"
                                | "key"
                                | "kind"
                                | "selector"
                                | "url"
                                | "value"
                            >
                        >
                        tags: Array<
                            { __typename?: "Tag" } & Pick<Tag, "id" | "name">
                        >
                    }
            >
        }
}

export type CreateTestMutationVariables = {
    name: Scalars["String"]
    steps?: Maybe<Array<StepCreateWithoutTestsInput>>
    tags?: Maybe<Array<TagCreateWithoutTestInput>>
}

export type CreateTestMutation = { __typename?: "Mutation" } & {
    createTest: { __typename?: "Test" } & Pick<Test, "id" | "name"> & {
            steps: Array<
                { __typename?: "Step" } & Pick<
                    Step,
                    | "expected"
                    | "id"
                    | "key"
                    | "kind"
                    | "selector"
                    | "url"
                    | "value"
                >
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
            steps {
                expected
                id
                key
                kind
                selector
                tests {
                    id
                    name
                    tags {
                        id
                        name
                    }
                }
                url
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
                    expected
                    id
                    key
                    kind
                    selector
                    url
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
export const CreateTestDocument = gql`
    mutation createTest(
        $name: String!
        $steps: [StepCreateWithoutTestsInput!]
        $tags: [TagCreateWithoutTestInput!]
    ) {
        createTest(data: { name: $name, steps: $steps, tags: $tags }) {
            id
            name
            steps {
                expected
                id
                key
                kind
                selector
                url
                value
            }
            tags {
                id
                name
            }
        }
    }
`
export type CreateTestMutationFn = ApolloReactCommon.MutationFunction<
    CreateTestMutation,
    CreateTestMutationVariables
>

/**
 * __useCreateTestMutation__
 *
 * To run a mutation, you first call `useCreateTestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTestMutation, { data, loading, error }] = useCreateTestMutation({
 *   variables: {
 *      name: // value for 'name'
 *      steps: // value for 'steps'
 *      tags: // value for 'tags'
 *   },
 * });
 */
export function useCreateTestMutation(
    baseOptions?: ApolloReactHooks.MutationHookOptions<
        CreateTestMutation,
        CreateTestMutationVariables
    >
) {
    return ApolloReactHooks.useMutation<
        CreateTestMutation,
        CreateTestMutationVariables
    >(CreateTestDocument, baseOptions)
}
export type CreateTestMutationHookResult = ReturnType<
    typeof useCreateTestMutation
>
export type CreateTestMutationResult = ApolloReactCommon.MutationResult<
    CreateTestMutation
>
export type CreateTestMutationOptions = ApolloReactCommon.BaseMutationOptions<
    CreateTestMutation,
    CreateTestMutationVariables
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
