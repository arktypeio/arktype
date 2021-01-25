export type Maybe<T> = T | null
export type Exact<T extends { [key: string]: unknown }> = {
    [K in keyof T]: T[K]
}
export type MakeOptional<T, K extends keyof T> = Omit<T, K> &
    { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> &
    { [SubKey in K]: Maybe<T[SubKey]> }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: string
    String: string
    Boolean: boolean
    Int: number
    Float: number
}

export type EnumStepKindFilter = {
    equals?: Maybe<StepKind>
    in?: Maybe<Array<StepKind>>
    not?: Maybe<NestedEnumStepKindFilter>
    notIn?: Maybe<Array<StepKind>>
}

export type IntFilter = {
    equals?: Maybe<Scalars["Int"]>
    gt?: Maybe<Scalars["Int"]>
    gte?: Maybe<Scalars["Int"]>
    in?: Maybe<Array<Scalars["Int"]>>
    lt?: Maybe<Scalars["Int"]>
    lte?: Maybe<Scalars["Int"]>
    not?: Maybe<NestedIntFilter>
    notIn?: Maybe<Array<Scalars["Int"]>>
}

export type IntNullableFilter = {
    equals?: Maybe<Scalars["Int"]>
    gt?: Maybe<Scalars["Int"]>
    gte?: Maybe<Scalars["Int"]>
    in?: Maybe<Array<Scalars["Int"]>>
    lt?: Maybe<Scalars["Int"]>
    lte?: Maybe<Scalars["Int"]>
    not?: Maybe<NestedIntNullableFilter>
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

export type NestedEnumStepKindFilter = {
    equals?: Maybe<StepKind>
    in?: Maybe<Array<StepKind>>
    not?: Maybe<NestedEnumStepKindFilter>
    notIn?: Maybe<Array<StepKind>>
}

export type NestedIntFilter = {
    equals?: Maybe<Scalars["Int"]>
    gt?: Maybe<Scalars["Int"]>
    gte?: Maybe<Scalars["Int"]>
    in?: Maybe<Array<Scalars["Int"]>>
    lt?: Maybe<Scalars["Int"]>
    lte?: Maybe<Scalars["Int"]>
    not?: Maybe<NestedIntFilter>
    notIn?: Maybe<Array<Scalars["Int"]>>
}

export type NestedIntNullableFilter = {
    equals?: Maybe<Scalars["Int"]>
    gt?: Maybe<Scalars["Int"]>
    gte?: Maybe<Scalars["Int"]>
    in?: Maybe<Array<Scalars["Int"]>>
    lt?: Maybe<Scalars["Int"]>
    lte?: Maybe<Scalars["Int"]>
    not?: Maybe<NestedIntNullableFilter>
    notIn?: Maybe<Array<Scalars["Int"]>>
}

export type NestedStringFilter = {
    contains?: Maybe<Scalars["String"]>
    endsWith?: Maybe<Scalars["String"]>
    equals?: Maybe<Scalars["String"]>
    gt?: Maybe<Scalars["String"]>
    gte?: Maybe<Scalars["String"]>
    in?: Maybe<Array<Scalars["String"]>>
    lt?: Maybe<Scalars["String"]>
    lte?: Maybe<Scalars["String"]>
    not?: Maybe<NestedStringFilter>
    notIn?: Maybe<Array<Scalars["String"]>>
    startsWith?: Maybe<Scalars["String"]>
}

export type NestedStringNullableFilter = {
    contains?: Maybe<Scalars["String"]>
    endsWith?: Maybe<Scalars["String"]>
    equals?: Maybe<Scalars["String"]>
    gt?: Maybe<Scalars["String"]>
    gte?: Maybe<Scalars["String"]>
    in?: Maybe<Array<Scalars["String"]>>
    lt?: Maybe<Scalars["String"]>
    lte?: Maybe<Scalars["String"]>
    not?: Maybe<NestedStringNullableFilter>
    notIn?: Maybe<Array<Scalars["String"]>>
    startsWith?: Maybe<Scalars["String"]>
}

export type Query = {
    __typename?: "Query"
    tests: Array<Test>
}

export type QueryTestsArgs = {
    cursor?: Maybe<TestWhereUniqueInput>
    distinct?: Maybe<Array<TestDistinctFieldEnum>>
    orderBy?: Maybe<Array<TestOrderByInput>>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<TestWhereInput>
}

export enum SortOrder {
    Asc = "asc",
    Desc = "desc"
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
    distinct?: Maybe<Array<TestDistinctFieldEnum>>
    orderBy?: Maybe<Array<TestOrderByInput>>
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

export enum StepDistinctFieldEnum {
    Expected = "expected",
    Id = "id",
    Key = "key",
    Kind = "kind",
    Selector = "selector",
    Url = "url",
    UserId = "userId",
    Value = "value"
}

export enum StepKind {
    AssertText = "assertText",
    AssertVisibility = "assertVisibility",
    Click = "click",
    Go = "go",
    Hover = "hover",
    Key = "key",
    Screenshot = "screenshot",
    Set = "set"
}

export type StepListRelationFilter = {
    every?: Maybe<StepWhereInput>
    none?: Maybe<StepWhereInput>
    some?: Maybe<StepWhereInput>
}

export type StepOrderByInput = {
    expected?: Maybe<SortOrder>
    id?: Maybe<SortOrder>
    key?: Maybe<SortOrder>
    kind?: Maybe<SortOrder>
    selector?: Maybe<SortOrder>
    url?: Maybe<SortOrder>
    userId?: Maybe<SortOrder>
    value?: Maybe<SortOrder>
}

export type StepWhereInput = {
    AND?: Maybe<Array<StepWhereInput>>
    expected?: Maybe<StringNullableFilter>
    id?: Maybe<IntFilter>
    key?: Maybe<StringNullableFilter>
    kind?: Maybe<EnumStepKindFilter>
    NOT?: Maybe<Array<StepWhereInput>>
    OR?: Maybe<Array<StepWhereInput>>
    selector?: Maybe<StringNullableFilter>
    tests?: Maybe<TestListRelationFilter>
    url?: Maybe<StringNullableFilter>
    User?: Maybe<UserWhereInput>
    userId?: Maybe<IntNullableFilter>
    value?: Maybe<StringNullableFilter>
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
    not?: Maybe<NestedStringFilter>
    notIn?: Maybe<Array<Scalars["String"]>>
    startsWith?: Maybe<Scalars["String"]>
}

export type StringNullableFilter = {
    contains?: Maybe<Scalars["String"]>
    endsWith?: Maybe<Scalars["String"]>
    equals?: Maybe<Scalars["String"]>
    gt?: Maybe<Scalars["String"]>
    gte?: Maybe<Scalars["String"]>
    in?: Maybe<Array<Scalars["String"]>>
    lt?: Maybe<Scalars["String"]>
    lte?: Maybe<Scalars["String"]>
    not?: Maybe<NestedStringNullableFilter>
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

export enum TagDistinctFieldEnum {
    Id = "id",
    Name = "name",
    TestId = "testId",
    UserId = "userId"
}

export type TagListRelationFilter = {
    every?: Maybe<TagWhereInput>
    none?: Maybe<TagWhereInput>
    some?: Maybe<TagWhereInput>
}

export type TagOrderByInput = {
    id?: Maybe<SortOrder>
    name?: Maybe<SortOrder>
    testId?: Maybe<SortOrder>
    userId?: Maybe<SortOrder>
}

export type TagWhereInput = {
    AND?: Maybe<Array<TagWhereInput>>
    id?: Maybe<IntFilter>
    name?: Maybe<StringFilter>
    NOT?: Maybe<Array<TagWhereInput>>
    OR?: Maybe<Array<TagWhereInput>>
    Test?: Maybe<TestWhereInput>
    testId?: Maybe<IntNullableFilter>
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
    distinct?: Maybe<Array<StepDistinctFieldEnum>>
    orderBy?: Maybe<Array<StepOrderByInput>>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<StepWhereInput>
}

export type TestTagsArgs = {
    cursor?: Maybe<TagWhereUniqueInput>
    distinct?: Maybe<Array<TagDistinctFieldEnum>>
    orderBy?: Maybe<Array<TagOrderByInput>>
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

export enum TestDistinctFieldEnum {
    Id = "id",
    Name = "name",
    UserId = "userId"
}

export type TestListRelationFilter = {
    every?: Maybe<TestWhereInput>
    none?: Maybe<TestWhereInput>
    some?: Maybe<TestWhereInput>
}

export type TestOrderByInput = {
    id?: Maybe<SortOrder>
    name?: Maybe<SortOrder>
    userId?: Maybe<SortOrder>
}

export type TestWhereInput = {
    AND?: Maybe<Array<TestWhereInput>>
    id?: Maybe<IntFilter>
    name?: Maybe<StringFilter>
    NOT?: Maybe<Array<TestWhereInput>>
    OR?: Maybe<Array<TestWhereInput>>
    steps?: Maybe<StepListRelationFilter>
    tags?: Maybe<TagListRelationFilter>
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
    distinct?: Maybe<Array<StepDistinctFieldEnum>>
    orderBy?: Maybe<Array<StepOrderByInput>>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<StepWhereInput>
}

export type UserTagsArgs = {
    cursor?: Maybe<TagWhereUniqueInput>
    distinct?: Maybe<Array<TagDistinctFieldEnum>>
    orderBy?: Maybe<Array<TagOrderByInput>>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<TagWhereInput>
}

export type UserTestsArgs = {
    cursor?: Maybe<TestWhereUniqueInput>
    distinct?: Maybe<Array<TestDistinctFieldEnum>>
    orderBy?: Maybe<Array<TestOrderByInput>>
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
    steps?: Maybe<StepListRelationFilter>
    tags?: Maybe<TagListRelationFilter>
    tests?: Maybe<TestListRelationFilter>
}

export type UserWhereUniqueInput = {
    email?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
}
