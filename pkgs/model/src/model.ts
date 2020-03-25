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
