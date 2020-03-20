export type Maybe<T> = T | null
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: string
    String: string
    Boolean: boolean
    Int: number
    Float: number
}

export type ActionCreateManyWithoutDataInput = {
    connect?: Maybe<Array<ActionWhereUniqueInput>>
    create?: Maybe<Array<ActionCreateWithoutDataInput>>
}

export type ActionCreateOneWithoutStepsInput = {
    connect?: Maybe<ActionWhereUniqueInput>
    create?: Maybe<ActionCreateWithoutStepsInput>
}

export type ActionCreateWithoutDataInput = {
    kind: ActionKind
    steps?: Maybe<StepCreateManyWithoutActionInput>
}

export type ActionCreateWithoutStepsInput = {
    data: ActionDataCreateOneWithoutActionsInput
    kind: ActionKind
}

export type ActionDataCreateManyWithoutAssertTextInput = {
    connect?: Maybe<Array<ActionDataWhereUniqueInput>>
    create?: Maybe<Array<ActionDataCreateWithoutAssertTextInput>>
}

export type ActionDataCreateManyWithoutAssertVisibilityInput = {
    connect?: Maybe<Array<ActionDataWhereUniqueInput>>
    create?: Maybe<Array<ActionDataCreateWithoutAssertVisibilityInput>>
}

export type ActionDataCreateOneWithoutActionsInput = {
    connect?: Maybe<ActionDataWhereUniqueInput>
    create?: Maybe<ActionDataCreateWithoutActionsInput>
}

export type ActionDataCreateWithoutActionsInput = {
    assertText?: Maybe<AssertTextDataCreateOneWithoutActionDatasInput>
    assertVisibility?: Maybe<
        AssertVisibilityDataCreateOneWithoutActionDatasInput
    >
    click?: Maybe<ClickDataCreateOneWithoutActionDatasInput>
    go?: Maybe<GoDataCreateOneWithoutActionDatasInput>
    hover?: Maybe<HoverDataCreateOneWithoutActionDatasInput>
    key?: Maybe<KeyDataCreateOneWithoutActionDatasInput>
    screenshot?: Maybe<ScreenshotDataCreateOneWithoutActionDatasInput>
    set?: Maybe<SetDataCreateOneWithoutActionDatasInput>
}

export type ActionDataCreateWithoutAssertTextInput = {
    actions?: Maybe<ActionCreateManyWithoutDataInput>
    assertVisibility?: Maybe<
        AssertVisibilityDataCreateOneWithoutActionDatasInput
    >
    click?: Maybe<ClickDataCreateOneWithoutActionDatasInput>
    go?: Maybe<GoDataCreateOneWithoutActionDatasInput>
    hover?: Maybe<HoverDataCreateOneWithoutActionDatasInput>
    key?: Maybe<KeyDataCreateOneWithoutActionDatasInput>
    screenshot?: Maybe<ScreenshotDataCreateOneWithoutActionDatasInput>
    set?: Maybe<SetDataCreateOneWithoutActionDatasInput>
}

export type ActionDataCreateWithoutAssertVisibilityInput = {
    actions?: Maybe<ActionCreateManyWithoutDataInput>
    assertText?: Maybe<AssertTextDataCreateOneWithoutActionDatasInput>
    click?: Maybe<ClickDataCreateOneWithoutActionDatasInput>
    go?: Maybe<GoDataCreateOneWithoutActionDatasInput>
    hover?: Maybe<HoverDataCreateOneWithoutActionDatasInput>
    key?: Maybe<KeyDataCreateOneWithoutActionDatasInput>
    screenshot?: Maybe<ScreenshotDataCreateOneWithoutActionDatasInput>
    set?: Maybe<SetDataCreateOneWithoutActionDatasInput>
}

export type ActionDataWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export enum ActionKind {
    AssertText = "assertText",
    AssertVisibility = "assertVisibility",
    Click = "click",
    Go = "go",
    Hover = "hover",
    Key = "key",
    Screenshot = "screenshot",
    Set = "set"
}

export type ActionWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type AssertTextDataCreateManyWithoutSelectorInput = {
    connect?: Maybe<Array<AssertTextDataWhereUniqueInput>>
    create?: Maybe<Array<AssertTextDataCreateWithoutSelectorInput>>
}

export type AssertTextDataCreateOneWithoutActionDatasInput = {
    connect?: Maybe<AssertTextDataWhereUniqueInput>
    create?: Maybe<AssertTextDataCreateWithoutActionDatasInput>
}

export type AssertTextDataCreateWithoutActionDatasInput = {
    expected: Scalars["String"]
    selector: SelectorCreateOneWithoutAssertTextDatasInput
}

export type AssertTextDataCreateWithoutSelectorInput = {
    actionDatas?: Maybe<ActionDataCreateManyWithoutAssertTextInput>
    expected: Scalars["String"]
}

export type AssertTextDataWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type AssertVisibilityDataCreateManyWithoutSelectorInput = {
    connect?: Maybe<Array<AssertVisibilityDataWhereUniqueInput>>
    create?: Maybe<Array<AssertVisibilityDataCreateWithoutSelectorInput>>
}

export type AssertVisibilityDataCreateOneWithoutActionDatasInput = {
    connect?: Maybe<AssertVisibilityDataWhereUniqueInput>
    create?: Maybe<AssertVisibilityDataCreateWithoutActionDatasInput>
}

export type AssertVisibilityDataCreateWithoutActionDatasInput = {
    expected: Scalars["Boolean"]
    selector: SelectorCreateOneWithoutAssertVisibilityDatasInput
}

export type AssertVisibilityDataCreateWithoutSelectorInput = {
    actionDatas?: Maybe<ActionDataCreateManyWithoutAssertVisibilityInput>
    expected: Scalars["Boolean"]
}

export type AssertVisibilityDataWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type ClickDataCreateOneWithoutActionDatasInput = {
    connect?: Maybe<ClickDataWhereUniqueInput>
    create?: Maybe<ClickDataCreateWithoutActionDatasInput>
}

export type ClickDataCreateWithoutActionDatasInput = {
    double?: Maybe<Scalars["Boolean"]>
    selector: Scalars["String"]
}

export type ClickDataWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type GoDataCreateOneWithoutActionDatasInput = {
    connect?: Maybe<GoDataWhereUniqueInput>
    create?: Maybe<GoDataCreateWithoutActionDatasInput>
}

export type GoDataCreateWithoutActionDatasInput = {
    url: Scalars["String"]
}

export type GoDataWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type HoverDataCreateOneWithoutActionDatasInput = {
    connect?: Maybe<HoverDataWhereUniqueInput>
    create?: Maybe<HoverDataCreateWithoutActionDatasInput>
}

export type HoverDataCreateWithoutActionDatasInput = {
    duration: Scalars["Int"]
    selector: Scalars["String"]
}

export type HoverDataWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type KeyDataCreateOneWithoutActionDatasInput = {
    connect?: Maybe<KeyDataWhereUniqueInput>
    create?: Maybe<KeyDataCreateWithoutActionDatasInput>
}

export type KeyDataCreateWithoutActionDatasInput = {
    key: Scalars["String"]
}

export type KeyDataWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
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

export type ScreenshotDataCreateOneWithoutActionDatasInput = {
    connect?: Maybe<ScreenshotDataWhereUniqueInput>
    create?: Maybe<ScreenshotDataCreateWithoutActionDatasInput>
}

export type ScreenshotDataCreateWithoutActionDatasInput = {}

export type ScreenshotDataWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type Selector = {
    __typename?: "Selector"
    css: Scalars["String"]
    id: Scalars["Int"]
}

export type SelectorCreateOneWithoutAssertTextDatasInput = {
    connect?: Maybe<SelectorWhereUniqueInput>
    create?: Maybe<SelectorCreateWithoutAssertTextDatasInput>
}

export type SelectorCreateOneWithoutAssertVisibilityDatasInput = {
    connect?: Maybe<SelectorWhereUniqueInput>
    create?: Maybe<SelectorCreateWithoutAssertVisibilityDatasInput>
}

export type SelectorCreateWithoutAssertTextDatasInput = {
    assertVisibilityDatas?: Maybe<
        AssertVisibilityDataCreateManyWithoutSelectorInput
    >
    css: Scalars["String"]
}

export type SelectorCreateWithoutAssertVisibilityDatasInput = {
    assertTextDatas?: Maybe<AssertTextDataCreateManyWithoutSelectorInput>
    css: Scalars["String"]
}

export type SelectorWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type SetDataCreateOneWithoutActionDatasInput = {
    connect?: Maybe<SetDataWhereUniqueInput>
    create?: Maybe<SetDataCreateWithoutActionDatasInput>
}

export type SetDataCreateWithoutActionDatasInput = {
    selector: Scalars["String"]
    value: Scalars["String"]
}

export type SetDataWhereUniqueInput = {
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
    id: Scalars["Int"]
}

export type StepCreateManyWithoutActionInput = {
    connect?: Maybe<Array<StepWhereUniqueInput>>
    create?: Maybe<Array<StepCreateWithoutActionInput>>
}

export type StepCreateManyWithoutTestsInput = {
    connect?: Maybe<Array<StepWhereUniqueInput>>
    create?: Maybe<Array<StepCreateWithoutTestsInput>>
}

export type StepCreateWithoutActionInput = {
    tests?: Maybe<TestCreateManyWithoutStepsInput>
}

export type StepCreateWithoutTestsInput = {
    action: ActionCreateOneWithoutStepsInput
}

export type StepWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type Tag = {
    __typename?: "Tag"
    id: Scalars["Int"]
    name: Scalars["String"]
}

export type TagCreateManyWithoutTestInput = {
    connect?: Maybe<Array<TagWhereUniqueInput>>
    create?: Maybe<Array<TagCreateWithoutTestInput>>
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
    steps?: Maybe<StepCreateManyWithoutTestsInput>
    tags?: Maybe<TagCreateManyWithoutTestInput>
}

export type TestCreateManyWithoutStepsInput = {
    connect?: Maybe<Array<TestWhereUniqueInput>>
    create?: Maybe<Array<TestCreateWithoutStepsInput>>
}

export type TestCreateWithoutStepsInput = {
    name: Scalars["String"]
    tags?: Maybe<TagCreateManyWithoutTestInput>
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
    selectors: Array<Selector>
    steps: Array<Step>
    tags: Array<Tag>
    tests: Array<Test>
}

export type UserSelectorsArgs = {
    after?: Maybe<SelectorWhereUniqueInput>
    before?: Maybe<SelectorWhereUniqueInput>
    first?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["Int"]>
    skip?: Maybe<Scalars["Int"]>
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
