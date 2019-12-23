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
