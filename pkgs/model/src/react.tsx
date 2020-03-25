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

export type AssertTextData = {
    __typename?: "AssertTextData"
    expected: Scalars["String"]
    id: Scalars["Int"]
    selector: Scalars["String"]
    stepDatas: Array<StepData>
}

export type AssertTextDataStepDatasArgs = {
    after?: Maybe<StepDataWhereUniqueInput>
    before?: Maybe<StepDataWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type AssertTextDataCreateWithoutStepDatasInput = {
    expected: Scalars["String"]
    selector: Scalars["String"]
}

export type AssertVisibilityData = {
    __typename?: "AssertVisibilityData"
    expected: Scalars["Boolean"]
    id: Scalars["Int"]
    selector: Scalars["String"]
    stepDatas: Array<StepData>
}

export type AssertVisibilityDataStepDatasArgs = {
    after?: Maybe<StepDataWhereUniqueInput>
    before?: Maybe<StepDataWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type AssertVisibilityDataCreateWithoutStepDatasInput = {
    expected: Scalars["Boolean"]
    selector: Scalars["String"]
}

export type ClickData = {
    __typename?: "ClickData"
    double: Scalars["Boolean"]
    id: Scalars["Int"]
    selector: Scalars["String"]
    stepDatas: Array<StepData>
}

export type ClickDataStepDatasArgs = {
    after?: Maybe<StepDataWhereUniqueInput>
    before?: Maybe<StepDataWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type ClickDataCreateWithoutStepDatasInput = {
    double?: Maybe<Scalars["Boolean"]>
    selector: Scalars["String"]
}

export type GoData = {
    __typename?: "GoData"
    id: Scalars["Int"]
    stepDatas: Array<StepData>
    url: Scalars["String"]
}

export type GoDataStepDatasArgs = {
    after?: Maybe<StepDataWhereUniqueInput>
    before?: Maybe<StepDataWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type GoDataCreateWithoutStepDatasInput = {
    url: Scalars["String"]
}

export type HoverData = {
    __typename?: "HoverData"
    duration: Scalars["Int"]
    id: Scalars["Int"]
    selector: Scalars["String"]
    stepDatas: Array<StepData>
}

export type HoverDataStepDatasArgs = {
    after?: Maybe<StepDataWhereUniqueInput>
    before?: Maybe<StepDataWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type HoverDataCreateWithoutStepDatasInput = {
    duration: Scalars["Int"]
    selector: Scalars["String"]
}

export type KeyData = {
    __typename?: "KeyData"
    id: Scalars["Int"]
    key: Scalars["String"]
    stepDatas: Array<StepData>
}

export type KeyDataStepDatasArgs = {
    after?: Maybe<StepDataWhereUniqueInput>
    before?: Maybe<StepDataWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type KeyDataCreateWithoutStepDatasInput = {
    key: Scalars["String"]
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

export type SetData = {
    __typename?: "SetData"
    id: Scalars["Int"]
    selector: Scalars["String"]
    stepDatas: Array<StepData>
    value: Scalars["String"]
}

export type SetDataStepDatasArgs = {
    after?: Maybe<StepDataWhereUniqueInput>
    before?: Maybe<StepDataWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type SetDataCreateWithoutStepDatasInput = {
    selector: Scalars["String"]
    value: Scalars["String"]
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
    data: StepData
    id: Scalars["Int"]
    kind: StepKind
    tests: Array<Test>
    user?: Maybe<User>
}

export type StepTestsArgs = {
    after?: Maybe<TestWhereUniqueInput>
    before?: Maybe<TestWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type StepCreateWithoutTestsInput = {
    data: StepDataCreateWithoutStepsInput
    kind: StepKind
}

export type StepData = {
    __typename?: "StepData"
    assertText?: Maybe<AssertTextData>
    assertVisibility?: Maybe<AssertVisibilityData>
    click?: Maybe<ClickData>
    go?: Maybe<GoData>
    hover?: Maybe<HoverData>
    id: Scalars["Int"]
    key?: Maybe<KeyData>
    set?: Maybe<SetData>
    steps: Array<Step>
}

export type StepDataStepsArgs = {
    after?: Maybe<StepWhereUniqueInput>
    before?: Maybe<StepWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
}

export type StepDataCreateWithoutStepsInput = {
    assertText?: Maybe<AssertTextDataCreateWithoutStepDatasInput>
    assertVisibility?: Maybe<AssertVisibilityDataCreateWithoutStepDatasInput>
    click?: Maybe<ClickDataCreateWithoutStepDatasInput>
    go?: Maybe<GoDataCreateWithoutStepDatasInput>
    hover?: Maybe<HoverDataCreateWithoutStepDatasInput>
    key?: Maybe<KeyDataCreateWithoutStepDatasInput>
    set?: Maybe<SetDataCreateWithoutStepDatasInput>
}

export type StepDataWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
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
                { __typename?: "Step" } & Pick<Step, "id" | "kind"> & {
                        data: { __typename?: "StepData" } & Pick<
                            StepData,
                            "id"
                        > & {
                                assertText: Maybe<
                                    { __typename?: "AssertTextData" } & Pick<
                                        AssertTextData,
                                        "expected" | "id" | "selector"
                                    >
                                >
                                assertVisibility: Maybe<
                                    {
                                        __typename?: "AssertVisibilityData"
                                    } & Pick<
                                        AssertVisibilityData,
                                        "expected" | "id" | "selector"
                                    >
                                >
                                click: Maybe<
                                    { __typename?: "ClickData" } & Pick<
                                        ClickData,
                                        "double" | "id" | "selector"
                                    >
                                >
                                go: Maybe<
                                    { __typename?: "GoData" } & Pick<
                                        GoData,
                                        "id" | "url"
                                    >
                                >
                                hover: Maybe<
                                    { __typename?: "HoverData" } & Pick<
                                        HoverData,
                                        "duration" | "id" | "selector"
                                    >
                                >
                                key: Maybe<
                                    { __typename?: "KeyData" } & Pick<
                                        KeyData,
                                        "id" | "key"
                                    >
                                >
                                set: Maybe<
                                    { __typename?: "SetData" } & Pick<
                                        SetData,
                                        "id" | "selector" | "value"
                                    >
                                >
                            }
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
            tags: Array<
                { __typename?: "Tag" } & Pick<Tag, "id" | "name"> & {
                        test: Maybe<
                            { __typename?: "Test" } & Pick<
                                Test,
                                "id" | "name"
                            > & {
                                    steps: Array<
                                        { __typename?: "Step" } & Pick<
                                            Step,
                                            "id" | "kind"
                                        > & {
                                                data: {
                                                    __typename?: "StepData"
                                                } & Pick<StepData, "id">
                                            }
                                    >
                                }
                        >
                    }
            >
            tests: Array<
                { __typename?: "Test" } & Pick<Test, "id" | "name"> & {
                        steps: Array<
                            { __typename?: "Step" } & Pick<
                                Step,
                                "id" | "kind"
                            > & {
                                    data: { __typename?: "StepData" } & Pick<
                                        StepData,
                                        "id"
                                    > & {
                                            assertText: Maybe<
                                                {
                                                    __typename?: "AssertTextData"
                                                } & Pick<
                                                    AssertTextData,
                                                    | "expected"
                                                    | "id"
                                                    | "selector"
                                                >
                                            >
                                            assertVisibility: Maybe<
                                                {
                                                    __typename?: "AssertVisibilityData"
                                                } & Pick<
                                                    AssertVisibilityData,
                                                    | "expected"
                                                    | "id"
                                                    | "selector"
                                                >
                                            >
                                            click: Maybe<
                                                {
                                                    __typename?: "ClickData"
                                                } & Pick<
                                                    ClickData,
                                                    "double" | "id" | "selector"
                                                >
                                            >
                                            go: Maybe<
                                                {
                                                    __typename?: "GoData"
                                                } & Pick<GoData, "id" | "url">
                                            >
                                            hover: Maybe<
                                                {
                                                    __typename?: "HoverData"
                                                } & Pick<
                                                    HoverData,
                                                    | "duration"
                                                    | "id"
                                                    | "selector"
                                                >
                                            >
                                            key: Maybe<
                                                {
                                                    __typename?: "KeyData"
                                                } & Pick<KeyData, "id" | "key">
                                            >
                                            set: Maybe<
                                                {
                                                    __typename?: "SetData"
                                                } & Pick<
                                                    SetData,
                                                    "id" | "selector" | "value"
                                                >
                                            >
                                        }
                                }
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
                { __typename?: "Step" } & Pick<Step, "id" | "kind"> & {
                        data: { __typename?: "StepData" } & Pick<
                            StepData,
                            "id"
                        > & {
                                assertText: Maybe<
                                    { __typename?: "AssertTextData" } & Pick<
                                        AssertTextData,
                                        "expected" | "id" | "selector"
                                    >
                                >
                                assertVisibility: Maybe<
                                    {
                                        __typename?: "AssertVisibilityData"
                                    } & Pick<
                                        AssertVisibilityData,
                                        "expected" | "id" | "selector"
                                    >
                                >
                                click: Maybe<
                                    { __typename?: "ClickData" } & Pick<
                                        ClickData,
                                        "double" | "id" | "selector"
                                    >
                                >
                                go: Maybe<
                                    { __typename?: "GoData" } & Pick<
                                        GoData,
                                        "id" | "url"
                                    >
                                >
                                hover: Maybe<
                                    { __typename?: "HoverData" } & Pick<
                                        HoverData,
                                        "duration" | "id" | "selector"
                                    >
                                >
                                key: Maybe<
                                    { __typename?: "KeyData" } & Pick<
                                        KeyData,
                                        "id" | "key"
                                    >
                                >
                                set: Maybe<
                                    { __typename?: "SetData" } & Pick<
                                        SetData,
                                        "id" | "selector" | "value"
                                    >
                                >
                            }
                        user: Maybe<
                            { __typename?: "User" } & Pick<
                                User,
                                "email" | "first" | "id" | "last" | "password"
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
            tags: Array<
                { __typename?: "Tag" } & Pick<Tag, "id" | "name"> & {
                        user: { __typename?: "User" } & Pick<
                            User,
                            "email" | "first" | "id" | "last" | "password"
                        > & {
                                steps: Array<
                                    { __typename?: "Step" } & Pick<
                                        Step,
                                        "id" | "kind"
                                    > & {
                                            data: {
                                                __typename?: "StepData"
                                            } & Pick<StepData, "id">
                                        }
                                >
                            }
                    }
            >
            user: { __typename?: "User" } & Pick<
                User,
                "email" | "first" | "id" | "last" | "password"
            > & {
                    steps: Array<
                        { __typename?: "Step" } & Pick<Step, "id" | "kind"> & {
                                data: { __typename?: "StepData" } & Pick<
                                    StepData,
                                    "id"
                                > & {
                                        assertText: Maybe<
                                            {
                                                __typename?: "AssertTextData"
                                            } & Pick<
                                                AssertTextData,
                                                "expected" | "id" | "selector"
                                            >
                                        >
                                        assertVisibility: Maybe<
                                            {
                                                __typename?: "AssertVisibilityData"
                                            } & Pick<
                                                AssertVisibilityData,
                                                "expected" | "id" | "selector"
                                            >
                                        >
                                        click: Maybe<
                                            { __typename?: "ClickData" } & Pick<
                                                ClickData,
                                                "double" | "id" | "selector"
                                            >
                                        >
                                        go: Maybe<
                                            { __typename?: "GoData" } & Pick<
                                                GoData,
                                                "id" | "url"
                                            >
                                        >
                                        hover: Maybe<
                                            { __typename?: "HoverData" } & Pick<
                                                HoverData,
                                                "duration" | "id" | "selector"
                                            >
                                        >
                                        key: Maybe<
                                            { __typename?: "KeyData" } & Pick<
                                                KeyData,
                                                "id" | "key"
                                            >
                                        >
                                        set: Maybe<
                                            { __typename?: "SetData" } & Pick<
                                                SetData,
                                                "id" | "selector" | "value"
                                            >
                                        >
                                    }
                            }
                    >
                    tags: Array<
                        { __typename?: "Tag" } & Pick<Tag, "id" | "name">
                    >
                }
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
                data {
                    assertText {
                        expected
                        id
                        selector
                    }
                    assertVisibility {
                        expected
                        id
                        selector
                    }
                    click {
                        double
                        id
                        selector
                    }
                    go {
                        id
                        url
                    }
                    hover {
                        duration
                        id
                        selector
                    }
                    id
                    key {
                        id
                        key
                    }
                    set {
                        id
                        selector
                        value
                    }
                }
                id
                kind
                tests {
                    id
                    name
                    tags {
                        id
                        name
                    }
                }
            }
            tags {
                id
                name
                test {
                    id
                    name
                    steps {
                        data {
                            id
                        }
                        id
                        kind
                    }
                }
            }
            tests {
                id
                name
                steps {
                    data {
                        assertText {
                            expected
                            id
                            selector
                        }
                        assertVisibility {
                            expected
                            id
                            selector
                        }
                        click {
                            double
                            id
                            selector
                        }
                        go {
                            id
                            url
                        }
                        hover {
                            duration
                            id
                            selector
                        }
                        id
                        key {
                            id
                            key
                        }
                        set {
                            id
                            selector
                            value
                        }
                    }
                    id
                    kind
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
                data {
                    assertText {
                        expected
                        id
                        selector
                    }
                    assertVisibility {
                        expected
                        id
                        selector
                    }
                    click {
                        double
                        id
                        selector
                    }
                    go {
                        id
                        url
                    }
                    hover {
                        duration
                        id
                        selector
                    }
                    id
                    key {
                        id
                        key
                    }
                    set {
                        id
                        selector
                        value
                    }
                }
                id
                kind
                user {
                    email
                    first
                    id
                    last
                    password
                    tags {
                        id
                        name
                    }
                }
            }
            tags {
                id
                name
                user {
                    email
                    first
                    id
                    last
                    password
                    steps {
                        data {
                            id
                        }
                        id
                        kind
                    }
                }
            }
            user {
                email
                first
                id
                last
                password
                steps {
                    data {
                        assertText {
                            expected
                            id
                            selector
                        }
                        assertVisibility {
                            expected
                            id
                            selector
                        }
                        click {
                            double
                            id
                            selector
                        }
                        go {
                            id
                            url
                        }
                        hover {
                            duration
                            id
                            selector
                        }
                        id
                        key {
                            id
                            key
                        }
                        set {
                            id
                            selector
                            value
                        }
                    }
                    id
                    kind
                }
                tags {
                    id
                    name
                }
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
