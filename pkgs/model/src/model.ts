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

export type AggregateUser = {
    __typename?: "AggregateUser"
    count: Scalars["Int"]
}

export type AggregateUserCountArgs = {
    cursor?: Maybe<UserWhereUniqueInput>
    orderBy?: Maybe<UserOrderByInput>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<UserWhereInput>
}

export type BatchPayload = {
    __typename?: "BatchPayload"
    count: Scalars["Int"]
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
    createUser: User
    deleteManyUser: BatchPayload
    deleteUser?: Maybe<User>
    updateManyUser: BatchPayload
    updateUser?: Maybe<User>
    upsertUser: User
}

export type MutationCreateUserArgs = {
    data: UserCreateInput
}

export type MutationDeleteManyUserArgs = {
    where?: Maybe<UserWhereInput>
}

export type MutationDeleteUserArgs = {
    where: UserWhereUniqueInput
}

export type MutationUpdateManyUserArgs = {
    data: UserUpdateManyMutationInput
    where?: Maybe<UserWhereInput>
}

export type MutationUpdateUserArgs = {
    data: UserUpdateInput
    where: UserWhereUniqueInput
}

export type MutationUpsertUserArgs = {
    create: UserCreateInput
    update: UserUpdateInput
    where: UserWhereUniqueInput
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
    aggregateUser: AggregateUser
    user?: Maybe<User>
    users: Array<User>
}

export type QueryUserArgs = {
    where: UserWhereUniqueInput
}

export type QueryUsersArgs = {
    cursor?: Maybe<UserWhereUniqueInput>
    orderBy?: Maybe<UserOrderByInput>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    where?: Maybe<UserWhereInput>
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

export type StepScalarWhereInput = {
    AND?: Maybe<Array<StepScalarWhereInput>>
    expected?: Maybe<NullableStringFilter>
    id?: Maybe<IntFilter>
    key?: Maybe<NullableStringFilter>
    kind?: Maybe<StepKindFilter>
    NOT?: Maybe<Array<StepScalarWhereInput>>
    OR?: Maybe<Array<StepScalarWhereInput>>
    selector?: Maybe<NullableStringFilter>
    tests?: Maybe<TestFilter>
    url?: Maybe<NullableStringFilter>
    userId?: Maybe<NullableIntFilter>
    value?: Maybe<NullableStringFilter>
}

export type StepUpdateManyDataInput = {
    expected?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
    key?: Maybe<Scalars["String"]>
    kind?: Maybe<StepKind>
    selector?: Maybe<Scalars["String"]>
    url?: Maybe<Scalars["String"]>
    value?: Maybe<Scalars["String"]>
}

export type StepUpdateManyWithoutTestsInput = {
    connect?: Maybe<Array<StepWhereUniqueInput>>
    create?: Maybe<Array<StepCreateWithoutTestsInput>>
    delete?: Maybe<Array<StepWhereUniqueInput>>
    deleteMany?: Maybe<Array<StepScalarWhereInput>>
    disconnect?: Maybe<Array<StepWhereUniqueInput>>
    set?: Maybe<Array<StepWhereUniqueInput>>
    update?: Maybe<Array<StepUpdateWithWhereUniqueWithoutTestsInput>>
    updateMany?: Maybe<Array<StepUpdateManyWithWhereNestedInput>>
    upsert?: Maybe<Array<StepUpsertWithWhereUniqueWithoutTestsInput>>
}

export type StepUpdateManyWithoutUserInput = {
    connect?: Maybe<Array<StepWhereUniqueInput>>
    create?: Maybe<Array<StepCreateWithoutUserInput>>
    delete?: Maybe<Array<StepWhereUniqueInput>>
    deleteMany?: Maybe<Array<StepScalarWhereInput>>
    disconnect?: Maybe<Array<StepWhereUniqueInput>>
    set?: Maybe<Array<StepWhereUniqueInput>>
    update?: Maybe<Array<StepUpdateWithWhereUniqueWithoutUserInput>>
    updateMany?: Maybe<Array<StepUpdateManyWithWhereNestedInput>>
    upsert?: Maybe<Array<StepUpsertWithWhereUniqueWithoutUserInput>>
}

export type StepUpdateManyWithWhereNestedInput = {
    data: StepUpdateManyDataInput
    where: StepScalarWhereInput
}

export type StepUpdateWithoutTestsDataInput = {
    expected?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
    key?: Maybe<Scalars["String"]>
    kind?: Maybe<StepKind>
    selector?: Maybe<Scalars["String"]>
    url?: Maybe<Scalars["String"]>
    User?: Maybe<UserUpdateOneWithoutStepsInput>
    value?: Maybe<Scalars["String"]>
}

export type StepUpdateWithoutUserDataInput = {
    expected?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
    key?: Maybe<Scalars["String"]>
    kind?: Maybe<StepKind>
    selector?: Maybe<Scalars["String"]>
    tests?: Maybe<TestUpdateManyWithoutStepsInput>
    url?: Maybe<Scalars["String"]>
    value?: Maybe<Scalars["String"]>
}

export type StepUpdateWithWhereUniqueWithoutTestsInput = {
    data: StepUpdateWithoutTestsDataInput
    where: StepWhereUniqueInput
}

export type StepUpdateWithWhereUniqueWithoutUserInput = {
    data: StepUpdateWithoutUserDataInput
    where: StepWhereUniqueInput
}

export type StepUpsertWithWhereUniqueWithoutTestsInput = {
    create: StepCreateWithoutTestsInput
    update: StepUpdateWithoutTestsDataInput
    where: StepWhereUniqueInput
}

export type StepUpsertWithWhereUniqueWithoutUserInput = {
    create: StepCreateWithoutUserInput
    update: StepUpdateWithoutUserDataInput
    where: StepWhereUniqueInput
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

export type TagScalarWhereInput = {
    AND?: Maybe<Array<TagScalarWhereInput>>
    id?: Maybe<IntFilter>
    name?: Maybe<StringFilter>
    NOT?: Maybe<Array<TagScalarWhereInput>>
    OR?: Maybe<Array<TagScalarWhereInput>>
    testId?: Maybe<NullableIntFilter>
    userId?: Maybe<IntFilter>
}

export type TagUpdateManyDataInput = {
    id?: Maybe<Scalars["Int"]>
    name?: Maybe<Scalars["String"]>
}

export type TagUpdateManyWithoutTestInput = {
    connect?: Maybe<Array<TagWhereUniqueInput>>
    create?: Maybe<Array<TagCreateWithoutTestInput>>
    delete?: Maybe<Array<TagWhereUniqueInput>>
    deleteMany?: Maybe<Array<TagScalarWhereInput>>
    disconnect?: Maybe<Array<TagWhereUniqueInput>>
    set?: Maybe<Array<TagWhereUniqueInput>>
    update?: Maybe<Array<TagUpdateWithWhereUniqueWithoutTestInput>>
    updateMany?: Maybe<Array<TagUpdateManyWithWhereNestedInput>>
    upsert?: Maybe<Array<TagUpsertWithWhereUniqueWithoutTestInput>>
}

export type TagUpdateManyWithoutUserInput = {
    connect?: Maybe<Array<TagWhereUniqueInput>>
    create?: Maybe<Array<TagCreateWithoutUserInput>>
    delete?: Maybe<Array<TagWhereUniqueInput>>
    deleteMany?: Maybe<Array<TagScalarWhereInput>>
    disconnect?: Maybe<Array<TagWhereUniqueInput>>
    set?: Maybe<Array<TagWhereUniqueInput>>
    update?: Maybe<Array<TagUpdateWithWhereUniqueWithoutUserInput>>
    updateMany?: Maybe<Array<TagUpdateManyWithWhereNestedInput>>
    upsert?: Maybe<Array<TagUpsertWithWhereUniqueWithoutUserInput>>
}

export type TagUpdateManyWithWhereNestedInput = {
    data: TagUpdateManyDataInput
    where: TagScalarWhereInput
}

export type TagUpdateWithoutTestDataInput = {
    id?: Maybe<Scalars["Int"]>
    name?: Maybe<Scalars["String"]>
    user?: Maybe<UserUpdateOneRequiredWithoutTagsInput>
}

export type TagUpdateWithoutUserDataInput = {
    id?: Maybe<Scalars["Int"]>
    name?: Maybe<Scalars["String"]>
    Test?: Maybe<TestUpdateOneWithoutTagsInput>
}

export type TagUpdateWithWhereUniqueWithoutTestInput = {
    data: TagUpdateWithoutTestDataInput
    where: TagWhereUniqueInput
}

export type TagUpdateWithWhereUniqueWithoutUserInput = {
    data: TagUpdateWithoutUserDataInput
    where: TagWhereUniqueInput
}

export type TagUpsertWithWhereUniqueWithoutTestInput = {
    create: TagCreateWithoutTestInput
    update: TagUpdateWithoutTestDataInput
    where: TagWhereUniqueInput
}

export type TagUpsertWithWhereUniqueWithoutUserInput = {
    create: TagCreateWithoutUserInput
    update: TagUpdateWithoutUserDataInput
    where: TagWhereUniqueInput
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

export type TestScalarWhereInput = {
    AND?: Maybe<Array<TestScalarWhereInput>>
    id?: Maybe<IntFilter>
    name?: Maybe<StringFilter>
    NOT?: Maybe<Array<TestScalarWhereInput>>
    OR?: Maybe<Array<TestScalarWhereInput>>
    steps?: Maybe<StepFilter>
    tags?: Maybe<TagFilter>
    userId?: Maybe<IntFilter>
}

export type TestUpdateManyDataInput = {
    id?: Maybe<Scalars["Int"]>
    name?: Maybe<Scalars["String"]>
}

export type TestUpdateManyWithoutStepsInput = {
    connect?: Maybe<Array<TestWhereUniqueInput>>
    create?: Maybe<Array<TestCreateWithoutStepsInput>>
    delete?: Maybe<Array<TestWhereUniqueInput>>
    deleteMany?: Maybe<Array<TestScalarWhereInput>>
    disconnect?: Maybe<Array<TestWhereUniqueInput>>
    set?: Maybe<Array<TestWhereUniqueInput>>
    update?: Maybe<Array<TestUpdateWithWhereUniqueWithoutStepsInput>>
    updateMany?: Maybe<Array<TestUpdateManyWithWhereNestedInput>>
    upsert?: Maybe<Array<TestUpsertWithWhereUniqueWithoutStepsInput>>
}

export type TestUpdateManyWithoutUserInput = {
    connect?: Maybe<Array<TestWhereUniqueInput>>
    create?: Maybe<Array<TestCreateWithoutUserInput>>
    delete?: Maybe<Array<TestWhereUniqueInput>>
    deleteMany?: Maybe<Array<TestScalarWhereInput>>
    disconnect?: Maybe<Array<TestWhereUniqueInput>>
    set?: Maybe<Array<TestWhereUniqueInput>>
    update?: Maybe<Array<TestUpdateWithWhereUniqueWithoutUserInput>>
    updateMany?: Maybe<Array<TestUpdateManyWithWhereNestedInput>>
    upsert?: Maybe<Array<TestUpsertWithWhereUniqueWithoutUserInput>>
}

export type TestUpdateManyWithWhereNestedInput = {
    data: TestUpdateManyDataInput
    where: TestScalarWhereInput
}

export type TestUpdateOneWithoutTagsInput = {
    connect?: Maybe<TestWhereUniqueInput>
    create?: Maybe<TestCreateWithoutTagsInput>
    delete?: Maybe<Scalars["Boolean"]>
    disconnect?: Maybe<Scalars["Boolean"]>
    update?: Maybe<TestUpdateWithoutTagsDataInput>
    upsert?: Maybe<TestUpsertWithoutTagsInput>
}

export type TestUpdateWithoutStepsDataInput = {
    id?: Maybe<Scalars["Int"]>
    name?: Maybe<Scalars["String"]>
    tags?: Maybe<TagUpdateManyWithoutTestInput>
    user?: Maybe<UserUpdateOneRequiredWithoutTestsInput>
}

export type TestUpdateWithoutTagsDataInput = {
    id?: Maybe<Scalars["Int"]>
    name?: Maybe<Scalars["String"]>
    steps?: Maybe<StepUpdateManyWithoutTestsInput>
    user?: Maybe<UserUpdateOneRequiredWithoutTestsInput>
}

export type TestUpdateWithoutUserDataInput = {
    id?: Maybe<Scalars["Int"]>
    name?: Maybe<Scalars["String"]>
    steps?: Maybe<StepUpdateManyWithoutTestsInput>
    tags?: Maybe<TagUpdateManyWithoutTestInput>
}

export type TestUpdateWithWhereUniqueWithoutStepsInput = {
    data: TestUpdateWithoutStepsDataInput
    where: TestWhereUniqueInput
}

export type TestUpdateWithWhereUniqueWithoutUserInput = {
    data: TestUpdateWithoutUserDataInput
    where: TestWhereUniqueInput
}

export type TestUpsertWithoutTagsInput = {
    create: TestCreateWithoutTagsInput
    update: TestUpdateWithoutTagsDataInput
}

export type TestUpsertWithWhereUniqueWithoutStepsInput = {
    create: TestCreateWithoutStepsInput
    update: TestUpdateWithoutStepsDataInput
    where: TestWhereUniqueInput
}

export type TestUpsertWithWhereUniqueWithoutUserInput = {
    create: TestCreateWithoutUserInput
    update: TestUpdateWithoutUserDataInput
    where: TestWhereUniqueInput
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

export type UserCreateInput = {
    email: Scalars["String"]
    first: Scalars["String"]
    last: Scalars["String"]
    password: Scalars["String"]
    steps?: Maybe<StepCreateManyWithoutUserInput>
    tags?: Maybe<TagCreateManyWithoutUserInput>
    tests?: Maybe<TestCreateManyWithoutUserInput>
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

export type UserOrderByInput = {
    email?: Maybe<OrderByArg>
    first?: Maybe<OrderByArg>
    id?: Maybe<OrderByArg>
    last?: Maybe<OrderByArg>
    password?: Maybe<OrderByArg>
}

export type UserUpdateInput = {
    email?: Maybe<Scalars["String"]>
    first?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["String"]>
    password?: Maybe<Scalars["String"]>
    steps?: Maybe<StepUpdateManyWithoutUserInput>
    tags?: Maybe<TagUpdateManyWithoutUserInput>
    tests?: Maybe<TestUpdateManyWithoutUserInput>
}

export type UserUpdateManyMutationInput = {
    email?: Maybe<Scalars["String"]>
    first?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["String"]>
    password?: Maybe<Scalars["String"]>
}

export type UserUpdateOneRequiredWithoutTagsInput = {
    connect?: Maybe<UserWhereUniqueInput>
    create?: Maybe<UserCreateWithoutTagsInput>
    update?: Maybe<UserUpdateWithoutTagsDataInput>
    upsert?: Maybe<UserUpsertWithoutTagsInput>
}

export type UserUpdateOneRequiredWithoutTestsInput = {
    connect?: Maybe<UserWhereUniqueInput>
    create?: Maybe<UserCreateWithoutTestsInput>
    update?: Maybe<UserUpdateWithoutTestsDataInput>
    upsert?: Maybe<UserUpsertWithoutTestsInput>
}

export type UserUpdateOneWithoutStepsInput = {
    connect?: Maybe<UserWhereUniqueInput>
    create?: Maybe<UserCreateWithoutStepsInput>
    delete?: Maybe<Scalars["Boolean"]>
    disconnect?: Maybe<Scalars["Boolean"]>
    update?: Maybe<UserUpdateWithoutStepsDataInput>
    upsert?: Maybe<UserUpsertWithoutStepsInput>
}

export type UserUpdateWithoutStepsDataInput = {
    email?: Maybe<Scalars["String"]>
    first?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["String"]>
    password?: Maybe<Scalars["String"]>
    tags?: Maybe<TagUpdateManyWithoutUserInput>
    tests?: Maybe<TestUpdateManyWithoutUserInput>
}

export type UserUpdateWithoutTagsDataInput = {
    email?: Maybe<Scalars["String"]>
    first?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["String"]>
    password?: Maybe<Scalars["String"]>
    steps?: Maybe<StepUpdateManyWithoutUserInput>
    tests?: Maybe<TestUpdateManyWithoutUserInput>
}

export type UserUpdateWithoutTestsDataInput = {
    email?: Maybe<Scalars["String"]>
    first?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["String"]>
    password?: Maybe<Scalars["String"]>
    steps?: Maybe<StepUpdateManyWithoutUserInput>
    tags?: Maybe<TagUpdateManyWithoutUserInput>
}

export type UserUpsertWithoutStepsInput = {
    create: UserCreateWithoutStepsInput
    update: UserUpdateWithoutStepsDataInput
}

export type UserUpsertWithoutTagsInput = {
    create: UserCreateWithoutTagsInput
    update: UserUpdateWithoutTagsDataInput
}

export type UserUpsertWithoutTestsInput = {
    create: UserCreateWithoutTestsInput
    update: UserUpdateWithoutTestsDataInput
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
