export type Maybe<T> = T | null
export type Exact<T extends { [key: string]: any }> = { [K in keyof T]: T[K] }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: string
    String: string
    Boolean: boolean
    Int: number
    Float: number
}

export type IntFilter = {
    equals?: Maybe<Scalars["Int"]>
    gt?: Maybe<Scalars["Int"]>
    gte?: Maybe<Scalars["Int"]>
    in?: Maybe<Array<Scalars["Int"]>>
    lt?: Maybe<Scalars["Int"]>
    lte?: Maybe<Scalars["Int"]>
    not?: Maybe<Scalars["Int"]>
    notIn?: Maybe<Array<Scalars["Int"]>>
}

export type Mutation = {
    __typename?: "Mutation"
    createTest: Test
}

export type MutationCreateTestArgs = {
    data: TestCreateInput
}

export type NameUserIdCompoundUniqueInput = {
    name: Scalars["String"]
    userId: Scalars["Int"]
}

export type NullableIntFilter = {
    equals?: Maybe<Scalars["Int"]>
    gt?: Maybe<Scalars["Int"]>
    gte?: Maybe<Scalars["Int"]>
    in?: Maybe<Array<Scalars["Int"]>>
    lt?: Maybe<Scalars["Int"]>
    lte?: Maybe<Scalars["Int"]>
    not?: Maybe<Scalars["Int"]>
    notIn?: Maybe<Array<Scalars["Int"]>>
}

export type NullableStringFilter = {
    contains?: Maybe<Scalars["String"]>
    endsWith?: Maybe<Scalars["String"]>
    equals?: Maybe<Scalars["String"]>
    gt?: Maybe<Scalars["String"]>
    gte?: Maybe<Scalars["String"]>
    in?: Maybe<Array<Scalars["String"]>>
    lt?: Maybe<Scalars["String"]>
    lte?: Maybe<Scalars["String"]>
    not?: Maybe<Scalars["String"]>
    notIn?: Maybe<Array<Scalars["String"]>>
    startsWith?: Maybe<Scalars["String"]>
}

export enum OrderByArg {
    Asc = "asc",
    Desc = "desc",
}

export type Query = {
    __typename?: "Query"
    tests: Array<Test>
}

export type QueryTestsArgs = {
    cursor?: Maybe<TestWhereUniqueInput>
    orderBy?: Maybe<TestOrderByInput>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<TestWhereInput>
}

export type Step = {
    __typename?: "Step"
    expected?: Maybe<Scalars["String"]>
    id: Scalars["Int"]
    key?: Maybe<Scalars["String"]>
    kind: StepKind
    selector?: Maybe<Scalars["String"]>
    tests?: Maybe<Array<Test>>
    url?: Maybe<Scalars["String"]>
    User?: Maybe<User>
    userId?: Maybe<Scalars["Int"]>
    value?: Maybe<Scalars["String"]>
}

export type StepTestsArgs = {
    cursor?: Maybe<TestWhereUniqueInput>
    orderBy?: Maybe<TestOrderByInput>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<TestWhereInput>
}

export type StepCreateManyWithoutTestsInput = {
    connect?: Maybe<Array<StepWhereUniqueInput>>
    create?: Maybe<Array<StepCreateWithoutTestsInput>>
}

export type StepCreateManyWithoutUserInput = {
    connect?: Maybe<Array<StepWhereUniqueInput>>
    create?: Maybe<Array<StepCreateWithoutUserInput>>
}

export type StepCreateWithoutTestsInput = {
    expected?: Maybe<Scalars["String"]>
    key?: Maybe<Scalars["String"]>
    kind: StepKind
    selector?: Maybe<Scalars["String"]>
    url?: Maybe<Scalars["String"]>
    User?: Maybe<UserCreateOneWithoutStepsInput>
    value?: Maybe<Scalars["String"]>
}

export type StepCreateWithoutUserInput = {
    expected?: Maybe<Scalars["String"]>
    key?: Maybe<Scalars["String"]>
    kind: StepKind
    selector?: Maybe<Scalars["String"]>
    tests?: Maybe<TestCreateManyWithoutStepsInput>
    url?: Maybe<Scalars["String"]>
    value?: Maybe<Scalars["String"]>
}

export type StepFilter = {
    every?: Maybe<StepWhereInput>
    none?: Maybe<StepWhereInput>
    some?: Maybe<StepWhereInput>
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

export type StepKindFilter = {
    equals?: Maybe<StepKind>
    in?: Maybe<Array<StepKind>>
    not?: Maybe<StepKind>
    notIn?: Maybe<Array<StepKind>>
}

export type StepOrderByInput = {
    expected?: Maybe<OrderByArg>
    id?: Maybe<OrderByArg>
    key?: Maybe<OrderByArg>
    kind?: Maybe<OrderByArg>
    selector?: Maybe<OrderByArg>
    url?: Maybe<OrderByArg>
    userId?: Maybe<OrderByArg>
    value?: Maybe<OrderByArg>
}

export type StepWhereInput = {
    AND?: Maybe<Array<StepWhereInput>>
    expected?: Maybe<NullableStringFilter>
    id?: Maybe<IntFilter>
    key?: Maybe<NullableStringFilter>
    kind?: Maybe<StepKindFilter>
    NOT?: Maybe<Array<StepWhereInput>>
    OR?: Maybe<Array<StepWhereInput>>
    selector?: Maybe<NullableStringFilter>
    tests?: Maybe<TestFilter>
    url?: Maybe<NullableStringFilter>
    User?: Maybe<UserWhereInput>
    userId?: Maybe<NullableIntFilter>
    value?: Maybe<NullableStringFilter>
}

export type StepWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
}

export type StringFilter = {
    contains?: Maybe<Scalars["String"]>
    endsWith?: Maybe<Scalars["String"]>
    equals?: Maybe<Scalars["String"]>
    gt?: Maybe<Scalars["String"]>
    gte?: Maybe<Scalars["String"]>
    in?: Maybe<Array<Scalars["String"]>>
    lt?: Maybe<Scalars["String"]>
    lte?: Maybe<Scalars["String"]>
    not?: Maybe<Scalars["String"]>
    notIn?: Maybe<Array<Scalars["String"]>>
    startsWith?: Maybe<Scalars["String"]>
}

export type Tag = {
    __typename?: "Tag"
    id: Scalars["Int"]
    name: Scalars["String"]
    Test?: Maybe<Test>
    testId?: Maybe<Scalars["Int"]>
    user: User
    userId: Scalars["Int"]
}

export type TagCreateManyWithoutTestInput = {
    connect?: Maybe<Array<TagWhereUniqueInput>>
    create?: Maybe<Array<TagCreateWithoutTestInput>>
}

export type TagCreateManyWithoutUserInput = {
    connect?: Maybe<Array<TagWhereUniqueInput>>
    create?: Maybe<Array<TagCreateWithoutUserInput>>
}

export type TagCreateWithoutTestInput = {
    name: Scalars["String"]
    user: UserCreateOneWithoutTagsInput
}

export type TagCreateWithoutUserInput = {
    name: Scalars["String"]
    Test?: Maybe<TestCreateOneWithoutTagsInput>
}

export type TagFilter = {
    every?: Maybe<TagWhereInput>
    none?: Maybe<TagWhereInput>
    some?: Maybe<TagWhereInput>
}

export type TagOrderByInput = {
    id?: Maybe<OrderByArg>
    name?: Maybe<OrderByArg>
    testId?: Maybe<OrderByArg>
    userId?: Maybe<OrderByArg>
}

export type TagWhereInput = {
    AND?: Maybe<Array<TagWhereInput>>
    id?: Maybe<IntFilter>
    name?: Maybe<StringFilter>
    NOT?: Maybe<Array<TagWhereInput>>
    OR?: Maybe<Array<TagWhereInput>>
    Test?: Maybe<TestWhereInput>
    testId?: Maybe<NullableIntFilter>
    user?: Maybe<UserWhereInput>
    userId?: Maybe<IntFilter>
}

export type TagWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
    name_userId?: Maybe<NameUserIdCompoundUniqueInput>
}

export type Test = {
    __typename?: "Test"
    id: Scalars["Int"]
    name: Scalars["String"]
    steps?: Maybe<Array<Step>>
    tags?: Maybe<Array<Tag>>
    user: User
    userId: Scalars["Int"]
}

export type TestStepsArgs = {
    cursor?: Maybe<StepWhereUniqueInput>
    orderBy?: Maybe<StepOrderByInput>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<StepWhereInput>
}

export type TestTagsArgs = {
    cursor?: Maybe<TagWhereUniqueInput>
    orderBy?: Maybe<TagOrderByInput>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<TagWhereInput>
}

export type TestCreateInput = {
    name: Scalars["String"]
    steps?: Maybe<StepCreateManyWithoutTestsInput>
    tags?: Maybe<TagCreateManyWithoutTestInput>
    user: UserCreateOneWithoutTestsInput
}

export type TestCreateManyWithoutStepsInput = {
    connect?: Maybe<Array<TestWhereUniqueInput>>
    create?: Maybe<Array<TestCreateWithoutStepsInput>>
}

export type TestCreateManyWithoutUserInput = {
    connect?: Maybe<Array<TestWhereUniqueInput>>
    create?: Maybe<Array<TestCreateWithoutUserInput>>
}

export type TestCreateOneWithoutTagsInput = {
    connect?: Maybe<TestWhereUniqueInput>
    create?: Maybe<TestCreateWithoutTagsInput>
}

export type TestCreateWithoutStepsInput = {
    name: Scalars["String"]
    tags?: Maybe<TagCreateManyWithoutTestInput>
    user: UserCreateOneWithoutTestsInput
}

export type TestCreateWithoutTagsInput = {
    name: Scalars["String"]
    steps?: Maybe<StepCreateManyWithoutTestsInput>
    user: UserCreateOneWithoutTestsInput
}

export type TestCreateWithoutUserInput = {
    name: Scalars["String"]
    steps?: Maybe<StepCreateManyWithoutTestsInput>
    tags?: Maybe<TagCreateManyWithoutTestInput>
}

export type TestFilter = {
    every?: Maybe<TestWhereInput>
    none?: Maybe<TestWhereInput>
    some?: Maybe<TestWhereInput>
}

export type TestOrderByInput = {
    id?: Maybe<OrderByArg>
    name?: Maybe<OrderByArg>
    userId?: Maybe<OrderByArg>
}

export type TestWhereInput = {
    AND?: Maybe<Array<TestWhereInput>>
    id?: Maybe<IntFilter>
    name?: Maybe<StringFilter>
    NOT?: Maybe<Array<TestWhereInput>>
    OR?: Maybe<Array<TestWhereInput>>
    steps?: Maybe<StepFilter>
    tags?: Maybe<TagFilter>
    user?: Maybe<UserWhereInput>
    userId?: Maybe<IntFilter>
}

export type TestWhereUniqueInput = {
    id?: Maybe<Scalars["Int"]>
    name_userId?: Maybe<NameUserIdCompoundUniqueInput>
}

export type User = {
    __typename?: "User"
    email: Scalars["String"]
    first: Scalars["String"]
    id: Scalars["Int"]
    last: Scalars["String"]
    password: Scalars["String"]
    steps?: Maybe<Array<Step>>
    tags?: Maybe<Array<Tag>>
    tests?: Maybe<Array<Test>>
}

export type UserStepsArgs = {
    cursor?: Maybe<StepWhereUniqueInput>
    orderBy?: Maybe<StepOrderByInput>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<StepWhereInput>
}

export type UserTagsArgs = {
    cursor?: Maybe<TagWhereUniqueInput>
    orderBy?: Maybe<TagOrderByInput>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<TagWhereInput>
}

export type UserTestsArgs = {
    cursor?: Maybe<TestWhereUniqueInput>
    orderBy?: Maybe<TestOrderByInput>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<TestWhereInput>
}

export type UserCreateOneWithoutStepsInput = {
    connect?: Maybe<UserWhereUniqueInput>
    create?: Maybe<UserCreateWithoutStepsInput>
}

export type UserCreateOneWithoutTagsInput = {
    connect?: Maybe<UserWhereUniqueInput>
    create?: Maybe<UserCreateWithoutTagsInput>
}

export type UserCreateOneWithoutTestsInput = {
    connect?: Maybe<UserWhereUniqueInput>
    create?: Maybe<UserCreateWithoutTestsInput>
}

export type UserCreateWithoutStepsInput = {
    email: Scalars["String"]
    first: Scalars["String"]
    last: Scalars["String"]
    password: Scalars["String"]
    tags?: Maybe<TagCreateManyWithoutUserInput>
    tests?: Maybe<TestCreateManyWithoutUserInput>
}

export type UserCreateWithoutTagsInput = {
    email: Scalars["String"]
    first: Scalars["String"]
    last: Scalars["String"]
    password: Scalars["String"]
    steps?: Maybe<StepCreateManyWithoutUserInput>
    tests?: Maybe<TestCreateManyWithoutUserInput>
}

export type UserCreateWithoutTestsInput = {
    email: Scalars["String"]
    first: Scalars["String"]
    last: Scalars["String"]
    password: Scalars["String"]
    steps?: Maybe<StepCreateManyWithoutUserInput>
    tags?: Maybe<TagCreateManyWithoutUserInput>
}

export type UserWhereInput = {
    AND?: Maybe<Array<UserWhereInput>>
    email?: Maybe<StringFilter>
    first?: Maybe<StringFilter>
    id?: Maybe<IntFilter>
    last?: Maybe<StringFilter>
    NOT?: Maybe<Array<UserWhereInput>>
    OR?: Maybe<Array<UserWhereInput>>
    password?: Maybe<StringFilter>
    steps?: Maybe<StepFilter>
    tags?: Maybe<TagFilter>
    tests?: Maybe<TestFilter>
}

export type UserWhereUniqueInput = {
    email?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
}
