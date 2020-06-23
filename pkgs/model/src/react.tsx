import gql from "graphql-tag"
import * as ApolloReactCommon from "@apollo/client"
import * as ApolloReactHooks from "@apollo/client"
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

export type AggregateUserQueryVariables = Exact<{ [key: string]: never }>

export type AggregateUserQuery = { __typename?: "Query" } & {
    aggregateUser: { __typename?: "AggregateUser" } & Pick<
        AggregateUser,
        "count"
    >
}

export type UserQueryVariables = Exact<{
    email?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
}>

export type UserQuery = { __typename?: "Query" } & {
    user?: Maybe<
        { __typename?: "User" } & Pick<
            User,
            "email" | "first" | "id" | "last" | "password"
        > & {
                steps?: Maybe<
                    Array<
                        { __typename?: "Step" } & Pick<
                            Step,
                            | "expected"
                            | "id"
                            | "key"
                            | "kind"
                            | "selector"
                            | "url"
                            | "userId"
                            | "value"
                        > & {
                                tests?: Maybe<
                                    Array<
                                        { __typename?: "Test" } & Pick<
                                            Test,
                                            "id" | "name" | "userId"
                                        > & {
                                                tags?: Maybe<
                                                    Array<
                                                        {
                                                            __typename?: "Tag"
                                                        } & Pick<
                                                            Tag,
                                                            | "id"
                                                            | "name"
                                                            | "testId"
                                                            | "userId"
                                                        >
                                                    >
                                                >
                                            }
                                    >
                                >
                            }
                    >
                >
                tags?: Maybe<
                    Array<
                        { __typename?: "Tag" } & Pick<
                            Tag,
                            "id" | "name" | "testId" | "userId"
                        > & {
                                Test?: Maybe<
                                    { __typename?: "Test" } & Pick<
                                        Test,
                                        "id" | "name" | "userId"
                                    > & {
                                            steps?: Maybe<
                                                Array<
                                                    {
                                                        __typename?: "Step"
                                                    } & Pick<
                                                        Step,
                                                        | "expected"
                                                        | "id"
                                                        | "key"
                                                        | "kind"
                                                        | "selector"
                                                        | "url"
                                                        | "userId"
                                                        | "value"
                                                    >
                                                >
                                            >
                                        }
                                >
                            }
                    >
                >
                tests?: Maybe<
                    Array<
                        { __typename?: "Test" } & Pick<
                            Test,
                            "id" | "name" | "userId"
                        > & {
                                steps?: Maybe<
                                    Array<
                                        { __typename?: "Step" } & Pick<
                                            Step,
                                            | "expected"
                                            | "id"
                                            | "key"
                                            | "kind"
                                            | "selector"
                                            | "url"
                                            | "userId"
                                            | "value"
                                        >
                                    >
                                >
                                tags?: Maybe<
                                    Array<
                                        { __typename?: "Tag" } & Pick<
                                            Tag,
                                            "id" | "name" | "testId" | "userId"
                                        >
                                    >
                                >
                            }
                    >
                >
            }
    >
}

export type UsersQueryVariables = Exact<{
    email?: Maybe<OrderByArg>
    id?: Maybe<OrderByArg>
    first?: Maybe<OrderByArg>
    last?: Maybe<OrderByArg>
    password?: Maybe<OrderByArg>
    skip?: Maybe<Scalars["Int"]>
    take?: Maybe<Scalars["Int"]>
    AND?: Maybe<Array<UserWhereInput>>
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
    userContains?: Maybe<Scalars["String"]>
    userEndswith?: Maybe<Scalars["String"]>
    userEquals?: Maybe<Scalars["String"]>
    userGt?: Maybe<Scalars["String"]>
    userGte?: Maybe<Scalars["String"]>
    userIn?: Maybe<Array<Scalars["String"]>>
    userLt?: Maybe<Scalars["String"]>
    userLte?: Maybe<Scalars["String"]>
    userNot?: Maybe<Scalars["String"]>
    userNotin?: Maybe<Array<Scalars["String"]>>
    userStartswith?: Maybe<Scalars["String"]>
    idUserEquals?: Maybe<Scalars["Int"]>
    idUserGt?: Maybe<Scalars["Int"]>
    idUserGte?: Maybe<Scalars["Int"]>
    idUserIn?: Maybe<Array<Scalars["Int"]>>
    idUserLt?: Maybe<Scalars["Int"]>
    idUserLte?: Maybe<Scalars["Int"]>
    idUserNot?: Maybe<Scalars["Int"]>
    idUserNotin?: Maybe<Array<Scalars["Int"]>>
    lastUserContains?: Maybe<Scalars["String"]>
    lastUserEndswith?: Maybe<Scalars["String"]>
    lastUserEquals?: Maybe<Scalars["String"]>
    lastUserGt?: Maybe<Scalars["String"]>
    lastUserGte?: Maybe<Scalars["String"]>
    lastUserIn?: Maybe<Array<Scalars["String"]>>
    lastUserLt?: Maybe<Scalars["String"]>
    lastUserLte?: Maybe<Scalars["String"]>
    lastUserNot?: Maybe<Scalars["String"]>
    lastUserNotin?: Maybe<Array<Scalars["String"]>>
    lastUserStartswith?: Maybe<Scalars["String"]>
    NOT?: Maybe<Array<UserWhereInput>>
    OR?: Maybe<Array<UserWhereInput>>
    passwordUserContains?: Maybe<Scalars["String"]>
    passwordUserEndswith?: Maybe<Scalars["String"]>
    passwordUserEquals?: Maybe<Scalars["String"]>
    passwordUserGt?: Maybe<Scalars["String"]>
    passwordUserGte?: Maybe<Scalars["String"]>
    passwordUserIn?: Maybe<Array<Scalars["String"]>>
    passwordUserLt?: Maybe<Scalars["String"]>
    passwordUserLte?: Maybe<Scalars["String"]>
    passwordUserNot?: Maybe<Scalars["String"]>
    passwordUserNotin?: Maybe<Array<Scalars["String"]>>
    passwordUserStartswith?: Maybe<Scalars["String"]>
    every?: Maybe<StepWhereInput>
    none?: Maybe<StepWhereInput>
    some?: Maybe<StepWhereInput>
    userEvery?: Maybe<TagWhereInput>
    userNone?: Maybe<TagWhereInput>
    userSome?: Maybe<TagWhereInput>
    testsUserEvery?: Maybe<TestWhereInput>
    testsUserNone?: Maybe<TestWhereInput>
    testsUserSome?: Maybe<TestWhereInput>
}>

export type UsersQuery = { __typename?: "Query" } & {
    users: Array<
        { __typename?: "User" } & Pick<
            User,
            "email" | "first" | "id" | "last" | "password"
        > & {
                steps?: Maybe<
                    Array<
                        { __typename?: "Step" } & Pick<
                            Step,
                            | "expected"
                            | "id"
                            | "key"
                            | "kind"
                            | "selector"
                            | "url"
                            | "userId"
                            | "value"
                        > & {
                                tests?: Maybe<
                                    Array<
                                        { __typename?: "Test" } & Pick<
                                            Test,
                                            "id" | "name" | "userId"
                                        > & {
                                                tags?: Maybe<
                                                    Array<
                                                        {
                                                            __typename?: "Tag"
                                                        } & Pick<
                                                            Tag,
                                                            | "id"
                                                            | "name"
                                                            | "testId"
                                                            | "userId"
                                                        >
                                                    >
                                                >
                                            }
                                    >
                                >
                            }
                    >
                >
                tags?: Maybe<
                    Array<
                        { __typename?: "Tag" } & Pick<
                            Tag,
                            "id" | "name" | "testId" | "userId"
                        > & {
                                Test?: Maybe<
                                    { __typename?: "Test" } & Pick<
                                        Test,
                                        "id" | "name" | "userId"
                                    > & {
                                            steps?: Maybe<
                                                Array<
                                                    {
                                                        __typename?: "Step"
                                                    } & Pick<
                                                        Step,
                                                        | "expected"
                                                        | "id"
                                                        | "key"
                                                        | "kind"
                                                        | "selector"
                                                        | "url"
                                                        | "userId"
                                                        | "value"
                                                    >
                                                >
                                            >
                                        }
                                >
                            }
                    >
                >
                tests?: Maybe<
                    Array<
                        { __typename?: "Test" } & Pick<
                            Test,
                            "id" | "name" | "userId"
                        > & {
                                steps?: Maybe<
                                    Array<
                                        { __typename?: "Step" } & Pick<
                                            Step,
                                            | "expected"
                                            | "id"
                                            | "key"
                                            | "kind"
                                            | "selector"
                                            | "url"
                                            | "userId"
                                            | "value"
                                        >
                                    >
                                >
                                tags?: Maybe<
                                    Array<
                                        { __typename?: "Tag" } & Pick<
                                            Tag,
                                            "id" | "name" | "testId" | "userId"
                                        >
                                    >
                                >
                            }
                    >
                >
            }
    >
}

export type CreateUserMutationVariables = Exact<{
    email: Scalars["String"]
    first: Scalars["String"]
    last: Scalars["String"]
    password: Scalars["String"]
    connect?: Maybe<Array<StepWhereUniqueInput>>
    create?: Maybe<Array<StepCreateWithoutUserInput>>
    userConnect?: Maybe<Array<TagWhereUniqueInput>>
    userCreate?: Maybe<Array<TagCreateWithoutUserInput>>
    testsUserConnect?: Maybe<Array<TestWhereUniqueInput>>
    testsUserCreate?: Maybe<Array<TestCreateWithoutUserInput>>
}>

export type CreateUserMutation = { __typename?: "Mutation" } & {
    createUser: { __typename?: "User" } & Pick<
        User,
        "email" | "first" | "id" | "last" | "password"
    > & {
            steps?: Maybe<
                Array<
                    { __typename?: "Step" } & Pick<
                        Step,
                        | "expected"
                        | "id"
                        | "key"
                        | "kind"
                        | "selector"
                        | "url"
                        | "userId"
                        | "value"
                    > & {
                            tests?: Maybe<
                                Array<
                                    { __typename?: "Test" } & Pick<
                                        Test,
                                        "id" | "name" | "userId"
                                    > & {
                                            tags?: Maybe<
                                                Array<
                                                    {
                                                        __typename?: "Tag"
                                                    } & Pick<
                                                        Tag,
                                                        | "id"
                                                        | "name"
                                                        | "testId"
                                                        | "userId"
                                                    >
                                                >
                                            >
                                        }
                                >
                            >
                        }
                >
            >
            tags?: Maybe<
                Array<
                    { __typename?: "Tag" } & Pick<
                        Tag,
                        "id" | "name" | "testId" | "userId"
                    > & {
                            Test?: Maybe<
                                { __typename?: "Test" } & Pick<
                                    Test,
                                    "id" | "name" | "userId"
                                > & {
                                        steps?: Maybe<
                                            Array<
                                                { __typename?: "Step" } & Pick<
                                                    Step,
                                                    | "expected"
                                                    | "id"
                                                    | "key"
                                                    | "kind"
                                                    | "selector"
                                                    | "url"
                                                    | "userId"
                                                    | "value"
                                                >
                                            >
                                        >
                                    }
                            >
                        }
                >
            >
            tests?: Maybe<
                Array<
                    { __typename?: "Test" } & Pick<
                        Test,
                        "id" | "name" | "userId"
                    > & {
                            steps?: Maybe<
                                Array<
                                    { __typename?: "Step" } & Pick<
                                        Step,
                                        | "expected"
                                        | "id"
                                        | "key"
                                        | "kind"
                                        | "selector"
                                        | "url"
                                        | "userId"
                                        | "value"
                                    >
                                >
                            >
                            tags?: Maybe<
                                Array<
                                    { __typename?: "Tag" } & Pick<
                                        Tag,
                                        "id" | "name" | "testId" | "userId"
                                    >
                                >
                            >
                        }
                >
            >
        }
}

export type DeleteManyUserMutationVariables = Exact<{
    AND?: Maybe<Array<UserWhereInput>>
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
    batchpayloadContains?: Maybe<Scalars["String"]>
    batchpayloadEndswith?: Maybe<Scalars["String"]>
    batchpayloadEquals?: Maybe<Scalars["String"]>
    batchpayloadGt?: Maybe<Scalars["String"]>
    batchpayloadGte?: Maybe<Scalars["String"]>
    batchpayloadIn?: Maybe<Array<Scalars["String"]>>
    batchpayloadLt?: Maybe<Scalars["String"]>
    batchpayloadLte?: Maybe<Scalars["String"]>
    batchpayloadNot?: Maybe<Scalars["String"]>
    batchpayloadNotin?: Maybe<Array<Scalars["String"]>>
    batchpayloadStartswith?: Maybe<Scalars["String"]>
    idBatchpayloadEquals?: Maybe<Scalars["Int"]>
    idBatchpayloadGt?: Maybe<Scalars["Int"]>
    idBatchpayloadGte?: Maybe<Scalars["Int"]>
    idBatchpayloadIn?: Maybe<Array<Scalars["Int"]>>
    idBatchpayloadLt?: Maybe<Scalars["Int"]>
    idBatchpayloadLte?: Maybe<Scalars["Int"]>
    idBatchpayloadNot?: Maybe<Scalars["Int"]>
    idBatchpayloadNotin?: Maybe<Array<Scalars["Int"]>>
    lastBatchpayloadContains?: Maybe<Scalars["String"]>
    lastBatchpayloadEndswith?: Maybe<Scalars["String"]>
    lastBatchpayloadEquals?: Maybe<Scalars["String"]>
    lastBatchpayloadGt?: Maybe<Scalars["String"]>
    lastBatchpayloadGte?: Maybe<Scalars["String"]>
    lastBatchpayloadIn?: Maybe<Array<Scalars["String"]>>
    lastBatchpayloadLt?: Maybe<Scalars["String"]>
    lastBatchpayloadLte?: Maybe<Scalars["String"]>
    lastBatchpayloadNot?: Maybe<Scalars["String"]>
    lastBatchpayloadNotin?: Maybe<Array<Scalars["String"]>>
    lastBatchpayloadStartswith?: Maybe<Scalars["String"]>
    NOT?: Maybe<Array<UserWhereInput>>
    OR?: Maybe<Array<UserWhereInput>>
    passwordBatchpayloadContains?: Maybe<Scalars["String"]>
    passwordBatchpayloadEndswith?: Maybe<Scalars["String"]>
    passwordBatchpayloadEquals?: Maybe<Scalars["String"]>
    passwordBatchpayloadGt?: Maybe<Scalars["String"]>
    passwordBatchpayloadGte?: Maybe<Scalars["String"]>
    passwordBatchpayloadIn?: Maybe<Array<Scalars["String"]>>
    passwordBatchpayloadLt?: Maybe<Scalars["String"]>
    passwordBatchpayloadLte?: Maybe<Scalars["String"]>
    passwordBatchpayloadNot?: Maybe<Scalars["String"]>
    passwordBatchpayloadNotin?: Maybe<Array<Scalars["String"]>>
    passwordBatchpayloadStartswith?: Maybe<Scalars["String"]>
    every?: Maybe<StepWhereInput>
    none?: Maybe<StepWhereInput>
    some?: Maybe<StepWhereInput>
    batchpayloadEvery?: Maybe<TagWhereInput>
    batchpayloadNone?: Maybe<TagWhereInput>
    batchpayloadSome?: Maybe<TagWhereInput>
    testsBatchpayloadEvery?: Maybe<TestWhereInput>
    testsBatchpayloadNone?: Maybe<TestWhereInput>
    testsBatchpayloadSome?: Maybe<TestWhereInput>
}>

export type DeleteManyUserMutation = { __typename?: "Mutation" } & {
    deleteManyUser: { __typename?: "BatchPayload" } & Pick<
        BatchPayload,
        "count"
    >
}

export type DeleteUserMutationVariables = Exact<{
    email?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
}>

export type DeleteUserMutation = { __typename?: "Mutation" } & {
    deleteUser?: Maybe<
        { __typename?: "User" } & Pick<
            User,
            "email" | "first" | "id" | "last" | "password"
        > & {
                steps?: Maybe<
                    Array<
                        { __typename?: "Step" } & Pick<
                            Step,
                            | "expected"
                            | "id"
                            | "key"
                            | "kind"
                            | "selector"
                            | "url"
                            | "userId"
                            | "value"
                        > & {
                                tests?: Maybe<
                                    Array<
                                        { __typename?: "Test" } & Pick<
                                            Test,
                                            "id" | "name" | "userId"
                                        > & {
                                                tags?: Maybe<
                                                    Array<
                                                        {
                                                            __typename?: "Tag"
                                                        } & Pick<
                                                            Tag,
                                                            | "id"
                                                            | "name"
                                                            | "testId"
                                                            | "userId"
                                                        >
                                                    >
                                                >
                                            }
                                    >
                                >
                            }
                    >
                >
                tags?: Maybe<
                    Array<
                        { __typename?: "Tag" } & Pick<
                            Tag,
                            "id" | "name" | "testId" | "userId"
                        > & {
                                Test?: Maybe<
                                    { __typename?: "Test" } & Pick<
                                        Test,
                                        "id" | "name" | "userId"
                                    > & {
                                            steps?: Maybe<
                                                Array<
                                                    {
                                                        __typename?: "Step"
                                                    } & Pick<
                                                        Step,
                                                        | "expected"
                                                        | "id"
                                                        | "key"
                                                        | "kind"
                                                        | "selector"
                                                        | "url"
                                                        | "userId"
                                                        | "value"
                                                    >
                                                >
                                            >
                                        }
                                >
                            }
                    >
                >
                tests?: Maybe<
                    Array<
                        { __typename?: "Test" } & Pick<
                            Test,
                            "id" | "name" | "userId"
                        > & {
                                steps?: Maybe<
                                    Array<
                                        { __typename?: "Step" } & Pick<
                                            Step,
                                            | "expected"
                                            | "id"
                                            | "key"
                                            | "kind"
                                            | "selector"
                                            | "url"
                                            | "userId"
                                            | "value"
                                        >
                                    >
                                >
                                tags?: Maybe<
                                    Array<
                                        { __typename?: "Tag" } & Pick<
                                            Tag,
                                            "id" | "name" | "testId" | "userId"
                                        >
                                    >
                                >
                            }
                    >
                >
            }
    >
}

export type UpdateManyUserMutationVariables = Exact<{
    email?: Maybe<Scalars["String"]>
    first?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["String"]>
    password?: Maybe<Scalars["String"]>
    AND?: Maybe<Array<UserWhereInput>>
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
    batchpayloadContains?: Maybe<Scalars["String"]>
    batchpayloadEndswith?: Maybe<Scalars["String"]>
    batchpayloadEquals?: Maybe<Scalars["String"]>
    batchpayloadGt?: Maybe<Scalars["String"]>
    batchpayloadGte?: Maybe<Scalars["String"]>
    batchpayloadIn?: Maybe<Array<Scalars["String"]>>
    batchpayloadLt?: Maybe<Scalars["String"]>
    batchpayloadLte?: Maybe<Scalars["String"]>
    batchpayloadNot?: Maybe<Scalars["String"]>
    batchpayloadNotin?: Maybe<Array<Scalars["String"]>>
    batchpayloadStartswith?: Maybe<Scalars["String"]>
    idBatchpayloadEquals?: Maybe<Scalars["Int"]>
    idBatchpayloadGt?: Maybe<Scalars["Int"]>
    idBatchpayloadGte?: Maybe<Scalars["Int"]>
    idBatchpayloadIn?: Maybe<Array<Scalars["Int"]>>
    idBatchpayloadLt?: Maybe<Scalars["Int"]>
    idBatchpayloadLte?: Maybe<Scalars["Int"]>
    idBatchpayloadNot?: Maybe<Scalars["Int"]>
    idBatchpayloadNotin?: Maybe<Array<Scalars["Int"]>>
    lastBatchpayloadContains?: Maybe<Scalars["String"]>
    lastBatchpayloadEndswith?: Maybe<Scalars["String"]>
    lastBatchpayloadEquals?: Maybe<Scalars["String"]>
    lastBatchpayloadGt?: Maybe<Scalars["String"]>
    lastBatchpayloadGte?: Maybe<Scalars["String"]>
    lastBatchpayloadIn?: Maybe<Array<Scalars["String"]>>
    lastBatchpayloadLt?: Maybe<Scalars["String"]>
    lastBatchpayloadLte?: Maybe<Scalars["String"]>
    lastBatchpayloadNot?: Maybe<Scalars["String"]>
    lastBatchpayloadNotin?: Maybe<Array<Scalars["String"]>>
    lastBatchpayloadStartswith?: Maybe<Scalars["String"]>
    NOT?: Maybe<Array<UserWhereInput>>
    OR?: Maybe<Array<UserWhereInput>>
    passwordBatchpayloadContains?: Maybe<Scalars["String"]>
    passwordBatchpayloadEndswith?: Maybe<Scalars["String"]>
    passwordBatchpayloadEquals?: Maybe<Scalars["String"]>
    passwordBatchpayloadGt?: Maybe<Scalars["String"]>
    passwordBatchpayloadGte?: Maybe<Scalars["String"]>
    passwordBatchpayloadIn?: Maybe<Array<Scalars["String"]>>
    passwordBatchpayloadLt?: Maybe<Scalars["String"]>
    passwordBatchpayloadLte?: Maybe<Scalars["String"]>
    passwordBatchpayloadNot?: Maybe<Scalars["String"]>
    passwordBatchpayloadNotin?: Maybe<Array<Scalars["String"]>>
    passwordBatchpayloadStartswith?: Maybe<Scalars["String"]>
    every?: Maybe<StepWhereInput>
    none?: Maybe<StepWhereInput>
    some?: Maybe<StepWhereInput>
    batchpayloadEvery?: Maybe<TagWhereInput>
    batchpayloadNone?: Maybe<TagWhereInput>
    batchpayloadSome?: Maybe<TagWhereInput>
    testsBatchpayloadEvery?: Maybe<TestWhereInput>
    testsBatchpayloadNone?: Maybe<TestWhereInput>
    testsBatchpayloadSome?: Maybe<TestWhereInput>
}>

export type UpdateManyUserMutation = { __typename?: "Mutation" } & {
    updateManyUser: { __typename?: "BatchPayload" } & Pick<
        BatchPayload,
        "count"
    >
}

export type UpdateUserMutationVariables = Exact<{
    email?: Maybe<Scalars["String"]>
    first?: Maybe<Scalars["String"]>
    id?: Maybe<Scalars["Int"]>
    last?: Maybe<Scalars["String"]>
    password?: Maybe<Scalars["String"]>
    connect?: Maybe<Array<StepWhereUniqueInput>>
    create?: Maybe<Array<StepCreateWithoutUserInput>>
    delete?: Maybe<Array<StepWhereUniqueInput>>
    deleteMany?: Maybe<Array<StepScalarWhereInput>>
    disconnect?: Maybe<Array<StepWhereUniqueInput>>
    set?: Maybe<Array<StepWhereUniqueInput>>
    update?: Maybe<Array<StepUpdateWithWhereUniqueWithoutUserInput>>
    updateMany?: Maybe<Array<StepUpdateManyWithWhereNestedInput>>
    upsert?: Maybe<Array<StepUpsertWithWhereUniqueWithoutUserInput>>
    userConnect?: Maybe<Array<TagWhereUniqueInput>>
    userCreate?: Maybe<Array<TagCreateWithoutUserInput>>
    userDelete?: Maybe<Array<TagWhereUniqueInput>>
    userDeletemany?: Maybe<Array<TagScalarWhereInput>>
    userDisconnect?: Maybe<Array<TagWhereUniqueInput>>
    userSet?: Maybe<Array<TagWhereUniqueInput>>
    userUpdate?: Maybe<Array<TagUpdateWithWhereUniqueWithoutUserInput>>
    userUpdatemany?: Maybe<Array<TagUpdateManyWithWhereNestedInput>>
    userUpsert?: Maybe<Array<TagUpsertWithWhereUniqueWithoutUserInput>>
    testsUserConnect?: Maybe<Array<TestWhereUniqueInput>>
    testsUserCreate?: Maybe<Array<TestCreateWithoutUserInput>>
    testsUserDelete?: Maybe<Array<TestWhereUniqueInput>>
    testsUserDeletemany?: Maybe<Array<TestScalarWhereInput>>
    testsUserDisconnect?: Maybe<Array<TestWhereUniqueInput>>
    testsUserSet?: Maybe<Array<TestWhereUniqueInput>>
    testsUserUpdate?: Maybe<Array<TestUpdateWithWhereUniqueWithoutUserInput>>
    testsUserUpdatemany?: Maybe<Array<TestUpdateManyWithWhereNestedInput>>
    testsUserUpsert?: Maybe<Array<TestUpsertWithWhereUniqueWithoutUserInput>>
}>

export type UpdateUserMutation = { __typename?: "Mutation" } & {
    updateUser?: Maybe<
        { __typename?: "User" } & Pick<
            User,
            "email" | "first" | "id" | "last" | "password"
        > & {
                steps?: Maybe<
                    Array<
                        { __typename?: "Step" } & Pick<
                            Step,
                            | "expected"
                            | "id"
                            | "key"
                            | "kind"
                            | "selector"
                            | "url"
                            | "userId"
                            | "value"
                        > & {
                                tests?: Maybe<
                                    Array<
                                        { __typename?: "Test" } & Pick<
                                            Test,
                                            "id" | "name" | "userId"
                                        > & {
                                                tags?: Maybe<
                                                    Array<
                                                        {
                                                            __typename?: "Tag"
                                                        } & Pick<
                                                            Tag,
                                                            | "id"
                                                            | "name"
                                                            | "testId"
                                                            | "userId"
                                                        >
                                                    >
                                                >
                                            }
                                    >
                                >
                            }
                    >
                >
                tags?: Maybe<
                    Array<
                        { __typename?: "Tag" } & Pick<
                            Tag,
                            "id" | "name" | "testId" | "userId"
                        > & {
                                Test?: Maybe<
                                    { __typename?: "Test" } & Pick<
                                        Test,
                                        "id" | "name" | "userId"
                                    > & {
                                            steps?: Maybe<
                                                Array<
                                                    {
                                                        __typename?: "Step"
                                                    } & Pick<
                                                        Step,
                                                        | "expected"
                                                        | "id"
                                                        | "key"
                                                        | "kind"
                                                        | "selector"
                                                        | "url"
                                                        | "userId"
                                                        | "value"
                                                    >
                                                >
                                            >
                                        }
                                >
                            }
                    >
                >
                tests?: Maybe<
                    Array<
                        { __typename?: "Test" } & Pick<
                            Test,
                            "id" | "name" | "userId"
                        > & {
                                steps?: Maybe<
                                    Array<
                                        { __typename?: "Step" } & Pick<
                                            Step,
                                            | "expected"
                                            | "id"
                                            | "key"
                                            | "kind"
                                            | "selector"
                                            | "url"
                                            | "userId"
                                            | "value"
                                        >
                                    >
                                >
                                tags?: Maybe<
                                    Array<
                                        { __typename?: "Tag" } & Pick<
                                            Tag,
                                            "id" | "name" | "testId" | "userId"
                                        >
                                    >
                                >
                            }
                    >
                >
            }
    >
}

export type UpsertUserMutationVariables = Exact<{
    email?: Maybe<Scalars["String"]>
    first?: Maybe<Scalars["String"]>
    last?: Maybe<Scalars["String"]>
    password?: Maybe<Scalars["String"]>
    connect?: Maybe<Array<StepWhereUniqueInput>>
    create?: Maybe<Array<StepCreateWithoutUserInput>>
    userConnect?: Maybe<Array<TagWhereUniqueInput>>
    userCreate?: Maybe<Array<TagCreateWithoutUserInput>>
    testsUserConnect?: Maybe<Array<TestWhereUniqueInput>>
    testsUserCreate?: Maybe<Array<TestCreateWithoutUserInput>>
    id?: Maybe<Scalars["Int"]>
    delete?: Maybe<Array<StepWhereUniqueInput>>
    deleteMany?: Maybe<Array<StepScalarWhereInput>>
    disconnect?: Maybe<Array<StepWhereUniqueInput>>
    set?: Maybe<Array<StepWhereUniqueInput>>
    update?: Maybe<Array<StepUpdateWithWhereUniqueWithoutUserInput>>
    updateMany?: Maybe<Array<StepUpdateManyWithWhereNestedInput>>
    upsert?: Maybe<Array<StepUpsertWithWhereUniqueWithoutUserInput>>
    userDelete?: Maybe<Array<TagWhereUniqueInput>>
    userDeletemany?: Maybe<Array<TagScalarWhereInput>>
    userDisconnect?: Maybe<Array<TagWhereUniqueInput>>
    userSet?: Maybe<Array<TagWhereUniqueInput>>
    userUpdate?: Maybe<Array<TagUpdateWithWhereUniqueWithoutUserInput>>
    userUpdatemany?: Maybe<Array<TagUpdateManyWithWhereNestedInput>>
    userUpsert?: Maybe<Array<TagUpsertWithWhereUniqueWithoutUserInput>>
    testsUserDelete?: Maybe<Array<TestWhereUniqueInput>>
    testsUserDeletemany?: Maybe<Array<TestScalarWhereInput>>
    testsUserDisconnect?: Maybe<Array<TestWhereUniqueInput>>
    testsUserSet?: Maybe<Array<TestWhereUniqueInput>>
    testsUserUpdate?: Maybe<Array<TestUpdateWithWhereUniqueWithoutUserInput>>
    testsUserUpdatemany?: Maybe<Array<TestUpdateManyWithWhereNestedInput>>
    testsUserUpsert?: Maybe<Array<TestUpsertWithWhereUniqueWithoutUserInput>>
}>

export type UpsertUserMutation = { __typename?: "Mutation" } & {
    upsertUser: { __typename?: "User" } & Pick<
        User,
        "email" | "first" | "id" | "last" | "password"
    > & {
            steps?: Maybe<
                Array<
                    { __typename?: "Step" } & Pick<
                        Step,
                        | "expected"
                        | "id"
                        | "key"
                        | "kind"
                        | "selector"
                        | "url"
                        | "userId"
                        | "value"
                    > & {
                            tests?: Maybe<
                                Array<
                                    { __typename?: "Test" } & Pick<
                                        Test,
                                        "id" | "name" | "userId"
                                    > & {
                                            tags?: Maybe<
                                                Array<
                                                    {
                                                        __typename?: "Tag"
                                                    } & Pick<
                                                        Tag,
                                                        | "id"
                                                        | "name"
                                                        | "testId"
                                                        | "userId"
                                                    >
                                                >
                                            >
                                        }
                                >
                            >
                        }
                >
            >
            tags?: Maybe<
                Array<
                    { __typename?: "Tag" } & Pick<
                        Tag,
                        "id" | "name" | "testId" | "userId"
                    > & {
                            Test?: Maybe<
                                { __typename?: "Test" } & Pick<
                                    Test,
                                    "id" | "name" | "userId"
                                > & {
                                        steps?: Maybe<
                                            Array<
                                                { __typename?: "Step" } & Pick<
                                                    Step,
                                                    | "expected"
                                                    | "id"
                                                    | "key"
                                                    | "kind"
                                                    | "selector"
                                                    | "url"
                                                    | "userId"
                                                    | "value"
                                                >
                                            >
                                        >
                                    }
                            >
                        }
                >
            >
            tests?: Maybe<
                Array<
                    { __typename?: "Test" } & Pick<
                        Test,
                        "id" | "name" | "userId"
                    > & {
                            steps?: Maybe<
                                Array<
                                    { __typename?: "Step" } & Pick<
                                        Step,
                                        | "expected"
                                        | "id"
                                        | "key"
                                        | "kind"
                                        | "selector"
                                        | "url"
                                        | "userId"
                                        | "value"
                                    >
                                >
                            >
                            tags?: Maybe<
                                Array<
                                    { __typename?: "Tag" } & Pick<
                                        Tag,
                                        "id" | "name" | "testId" | "userId"
                                    >
                                >
                            >
                        }
                >
            >
        }
}

export const AggregateUserDocument = gql`
    query aggregateUser {
        aggregateUser {
            count
        }
    }
`

/**
 * __useAggregateUserQuery__
 *
 * To run a query within a React component, call `useAggregateUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useAggregateUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAggregateUserQuery({
 *   variables: {
 *   },
 * });
 */
export function useAggregateUserQuery(
    baseOptions?: ApolloReactHooks.QueryHookOptions<
        AggregateUserQuery,
        AggregateUserQueryVariables
    >
) {
    return ApolloReactHooks.useQuery<
        AggregateUserQuery,
        AggregateUserQueryVariables
    >(AggregateUserDocument, baseOptions)
}
export function useAggregateUserLazyQuery(
    baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
        AggregateUserQuery,
        AggregateUserQueryVariables
    >
) {
    return ApolloReactHooks.useLazyQuery<
        AggregateUserQuery,
        AggregateUserQueryVariables
    >(AggregateUserDocument, baseOptions)
}
export type AggregateUserQueryHookResult = ReturnType<
    typeof useAggregateUserQuery
>
export type AggregateUserLazyQueryHookResult = ReturnType<
    typeof useAggregateUserLazyQuery
>
export type AggregateUserQueryResult = ApolloReactCommon.QueryResult<
    AggregateUserQuery,
    AggregateUserQueryVariables
>
export const UserDocument = gql`
    query user($email: String, $id: Int) {
        user(where: { email: $email, id: $id }) {
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
                        testId
                        userId
                    }
                    userId
                }
                url
                userId
                value
            }
            tags {
                id
                name
                Test {
                    id
                    name
                    steps {
                        expected
                        id
                        key
                        kind
                        selector
                        url
                        userId
                        value
                    }
                    userId
                }
                testId
                userId
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
                    userId
                    value
                }
                tags {
                    id
                    name
                    testId
                    userId
                }
                userId
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
        $email: OrderByArg
        $id: OrderByArg
        $first: OrderByArg
        $last: OrderByArg
        $password: OrderByArg
        $skip: Int
        $take: Int
        $AND: [UserWhereInput!]
        $contains: String
        $endsWith: String
        $equals: String
        $gt: String
        $gte: String
        $in: [String!]
        $lt: String
        $lte: String
        $not: String
        $notIn: [String!]
        $startsWith: String
        $userContains: String
        $userEndswith: String
        $userEquals: String
        $userGt: String
        $userGte: String
        $userIn: [String!]
        $userLt: String
        $userLte: String
        $userNot: String
        $userNotin: [String!]
        $userStartswith: String
        $idUserEquals: Int
        $idUserGt: Int
        $idUserGte: Int
        $idUserIn: [Int!]
        $idUserLt: Int
        $idUserLte: Int
        $idUserNot: Int
        $idUserNotin: [Int!]
        $lastUserContains: String
        $lastUserEndswith: String
        $lastUserEquals: String
        $lastUserGt: String
        $lastUserGte: String
        $lastUserIn: [String!]
        $lastUserLt: String
        $lastUserLte: String
        $lastUserNot: String
        $lastUserNotin: [String!]
        $lastUserStartswith: String
        $NOT: [UserWhereInput!]
        $OR: [UserWhereInput!]
        $passwordUserContains: String
        $passwordUserEndswith: String
        $passwordUserEquals: String
        $passwordUserGt: String
        $passwordUserGte: String
        $passwordUserIn: [String!]
        $passwordUserLt: String
        $passwordUserLte: String
        $passwordUserNot: String
        $passwordUserNotin: [String!]
        $passwordUserStartswith: String
        $every: StepWhereInput
        $none: StepWhereInput
        $some: StepWhereInput
        $userEvery: TagWhereInput
        $userNone: TagWhereInput
        $userSome: TagWhereInput
        $testsUserEvery: TestWhereInput
        $testsUserNone: TestWhereInput
        $testsUserSome: TestWhereInput
    ) {
        users(
            cursor: { email: $email, id: $id }
            orderBy: {
                email: $email
                first: $first
                id: $id
                last: $last
                password: $password
            }
            skip: $skip
            take: $take
            where: {
                AND: $AND
                email: {
                    contains: $contains
                    endsWith: $endsWith
                    equals: $equals
                    gt: $gt
                    gte: $gte
                    in: $in
                    lt: $lt
                    lte: $lte
                    not: $not
                    notIn: $notIn
                    startsWith: $startsWith
                }
                first: {
                    contains: $userContains
                    endsWith: $userEndswith
                    equals: $userEquals
                    gt: $userGt
                    gte: $userGte
                    in: $userIn
                    lt: $userLt
                    lte: $userLte
                    not: $userNot
                    notIn: $userNotin
                    startsWith: $userStartswith
                }
                id: {
                    equals: $idUserEquals
                    gt: $idUserGt
                    gte: $idUserGte
                    in: $idUserIn
                    lt: $idUserLt
                    lte: $idUserLte
                    not: $idUserNot
                    notIn: $idUserNotin
                }
                last: {
                    contains: $lastUserContains
                    endsWith: $lastUserEndswith
                    equals: $lastUserEquals
                    gt: $lastUserGt
                    gte: $lastUserGte
                    in: $lastUserIn
                    lt: $lastUserLt
                    lte: $lastUserLte
                    not: $lastUserNot
                    notIn: $lastUserNotin
                    startsWith: $lastUserStartswith
                }
                NOT: $NOT
                OR: $OR
                password: {
                    contains: $passwordUserContains
                    endsWith: $passwordUserEndswith
                    equals: $passwordUserEquals
                    gt: $passwordUserGt
                    gte: $passwordUserGte
                    in: $passwordUserIn
                    lt: $passwordUserLt
                    lte: $passwordUserLte
                    not: $passwordUserNot
                    notIn: $passwordUserNotin
                    startsWith: $passwordUserStartswith
                }
                steps: { every: $every, none: $none, some: $some }
                tags: { every: $userEvery, none: $userNone, some: $userSome }
                tests: {
                    every: $testsUserEvery
                    none: $testsUserNone
                    some: $testsUserSome
                }
            }
        ) {
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
                        testId
                        userId
                    }
                    userId
                }
                url
                userId
                value
            }
            tags {
                id
                name
                Test {
                    id
                    name
                    steps {
                        expected
                        id
                        key
                        kind
                        selector
                        url
                        userId
                        value
                    }
                    userId
                }
                testId
                userId
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
                    userId
                    value
                }
                tags {
                    id
                    name
                    testId
                    userId
                }
                userId
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
 *      email: // value for 'email'
 *      id: // value for 'id'
 *      first: // value for 'first'
 *      last: // value for 'last'
 *      password: // value for 'password'
 *      skip: // value for 'skip'
 *      take: // value for 'take'
 *      AND: // value for 'AND'
 *      contains: // value for 'contains'
 *      endsWith: // value for 'endsWith'
 *      equals: // value for 'equals'
 *      gt: // value for 'gt'
 *      gte: // value for 'gte'
 *      in: // value for 'in'
 *      lt: // value for 'lt'
 *      lte: // value for 'lte'
 *      not: // value for 'not'
 *      notIn: // value for 'notIn'
 *      startsWith: // value for 'startsWith'
 *      userContains: // value for 'userContains'
 *      userEndswith: // value for 'userEndswith'
 *      userEquals: // value for 'userEquals'
 *      userGt: // value for 'userGt'
 *      userGte: // value for 'userGte'
 *      userIn: // value for 'userIn'
 *      userLt: // value for 'userLt'
 *      userLte: // value for 'userLte'
 *      userNot: // value for 'userNot'
 *      userNotin: // value for 'userNotin'
 *      userStartswith: // value for 'userStartswith'
 *      idUserEquals: // value for 'idUserEquals'
 *      idUserGt: // value for 'idUserGt'
 *      idUserGte: // value for 'idUserGte'
 *      idUserIn: // value for 'idUserIn'
 *      idUserLt: // value for 'idUserLt'
 *      idUserLte: // value for 'idUserLte'
 *      idUserNot: // value for 'idUserNot'
 *      idUserNotin: // value for 'idUserNotin'
 *      lastUserContains: // value for 'lastUserContains'
 *      lastUserEndswith: // value for 'lastUserEndswith'
 *      lastUserEquals: // value for 'lastUserEquals'
 *      lastUserGt: // value for 'lastUserGt'
 *      lastUserGte: // value for 'lastUserGte'
 *      lastUserIn: // value for 'lastUserIn'
 *      lastUserLt: // value for 'lastUserLt'
 *      lastUserLte: // value for 'lastUserLte'
 *      lastUserNot: // value for 'lastUserNot'
 *      lastUserNotin: // value for 'lastUserNotin'
 *      lastUserStartswith: // value for 'lastUserStartswith'
 *      NOT: // value for 'NOT'
 *      OR: // value for 'OR'
 *      passwordUserContains: // value for 'passwordUserContains'
 *      passwordUserEndswith: // value for 'passwordUserEndswith'
 *      passwordUserEquals: // value for 'passwordUserEquals'
 *      passwordUserGt: // value for 'passwordUserGt'
 *      passwordUserGte: // value for 'passwordUserGte'
 *      passwordUserIn: // value for 'passwordUserIn'
 *      passwordUserLt: // value for 'passwordUserLt'
 *      passwordUserLte: // value for 'passwordUserLte'
 *      passwordUserNot: // value for 'passwordUserNot'
 *      passwordUserNotin: // value for 'passwordUserNotin'
 *      passwordUserStartswith: // value for 'passwordUserStartswith'
 *      every: // value for 'every'
 *      none: // value for 'none'
 *      some: // value for 'some'
 *      userEvery: // value for 'userEvery'
 *      userNone: // value for 'userNone'
 *      userSome: // value for 'userSome'
 *      testsUserEvery: // value for 'testsUserEvery'
 *      testsUserNone: // value for 'testsUserNone'
 *      testsUserSome: // value for 'testsUserSome'
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
export const CreateUserDocument = gql`
    mutation createUser(
        $email: String!
        $first: String!
        $last: String!
        $password: String!
        $connect: [StepWhereUniqueInput!]
        $create: [StepCreateWithoutUserInput!]
        $userConnect: [TagWhereUniqueInput!]
        $userCreate: [TagCreateWithoutUserInput!]
        $testsUserConnect: [TestWhereUniqueInput!]
        $testsUserCreate: [TestCreateWithoutUserInput!]
    ) {
        createUser(
            data: {
                email: $email
                first: $first
                last: $last
                password: $password
                steps: { connect: $connect, create: $create }
                tags: { connect: $userConnect, create: $userCreate }
                tests: { connect: $testsUserConnect, create: $testsUserCreate }
            }
        ) {
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
                        testId
                        userId
                    }
                    userId
                }
                url
                userId
                value
            }
            tags {
                id
                name
                Test {
                    id
                    name
                    steps {
                        expected
                        id
                        key
                        kind
                        selector
                        url
                        userId
                        value
                    }
                    userId
                }
                testId
                userId
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
                    userId
                    value
                }
                tags {
                    id
                    name
                    testId
                    userId
                }
                userId
            }
        }
    }
`
export type CreateUserMutationFn = ApolloReactCommon.MutationFunction<
    CreateUserMutation,
    CreateUserMutationVariables
>

/**
 * __useCreateUserMutation__
 *
 * To run a mutation, you first call `useCreateUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUserMutation, { data, loading, error }] = useCreateUserMutation({
 *   variables: {
 *      email: // value for 'email'
 *      first: // value for 'first'
 *      last: // value for 'last'
 *      password: // value for 'password'
 *      connect: // value for 'connect'
 *      create: // value for 'create'
 *      userConnect: // value for 'userConnect'
 *      userCreate: // value for 'userCreate'
 *      testsUserConnect: // value for 'testsUserConnect'
 *      testsUserCreate: // value for 'testsUserCreate'
 *   },
 * });
 */
export function useCreateUserMutation(
    baseOptions?: ApolloReactHooks.MutationHookOptions<
        CreateUserMutation,
        CreateUserMutationVariables
    >
) {
    return ApolloReactHooks.useMutation<
        CreateUserMutation,
        CreateUserMutationVariables
    >(CreateUserDocument, baseOptions)
}
export type CreateUserMutationHookResult = ReturnType<
    typeof useCreateUserMutation
>
export type CreateUserMutationResult = ApolloReactCommon.MutationResult<
    CreateUserMutation
>
export type CreateUserMutationOptions = ApolloReactCommon.BaseMutationOptions<
    CreateUserMutation,
    CreateUserMutationVariables
>
export const DeleteManyUserDocument = gql`
    mutation deleteManyUser(
        $AND: [UserWhereInput!]
        $contains: String
        $endsWith: String
        $equals: String
        $gt: String
        $gte: String
        $in: [String!]
        $lt: String
        $lte: String
        $not: String
        $notIn: [String!]
        $startsWith: String
        $batchpayloadContains: String
        $batchpayloadEndswith: String
        $batchpayloadEquals: String
        $batchpayloadGt: String
        $batchpayloadGte: String
        $batchpayloadIn: [String!]
        $batchpayloadLt: String
        $batchpayloadLte: String
        $batchpayloadNot: String
        $batchpayloadNotin: [String!]
        $batchpayloadStartswith: String
        $idBatchpayloadEquals: Int
        $idBatchpayloadGt: Int
        $idBatchpayloadGte: Int
        $idBatchpayloadIn: [Int!]
        $idBatchpayloadLt: Int
        $idBatchpayloadLte: Int
        $idBatchpayloadNot: Int
        $idBatchpayloadNotin: [Int!]
        $lastBatchpayloadContains: String
        $lastBatchpayloadEndswith: String
        $lastBatchpayloadEquals: String
        $lastBatchpayloadGt: String
        $lastBatchpayloadGte: String
        $lastBatchpayloadIn: [String!]
        $lastBatchpayloadLt: String
        $lastBatchpayloadLte: String
        $lastBatchpayloadNot: String
        $lastBatchpayloadNotin: [String!]
        $lastBatchpayloadStartswith: String
        $NOT: [UserWhereInput!]
        $OR: [UserWhereInput!]
        $passwordBatchpayloadContains: String
        $passwordBatchpayloadEndswith: String
        $passwordBatchpayloadEquals: String
        $passwordBatchpayloadGt: String
        $passwordBatchpayloadGte: String
        $passwordBatchpayloadIn: [String!]
        $passwordBatchpayloadLt: String
        $passwordBatchpayloadLte: String
        $passwordBatchpayloadNot: String
        $passwordBatchpayloadNotin: [String!]
        $passwordBatchpayloadStartswith: String
        $every: StepWhereInput
        $none: StepWhereInput
        $some: StepWhereInput
        $batchpayloadEvery: TagWhereInput
        $batchpayloadNone: TagWhereInput
        $batchpayloadSome: TagWhereInput
        $testsBatchpayloadEvery: TestWhereInput
        $testsBatchpayloadNone: TestWhereInput
        $testsBatchpayloadSome: TestWhereInput
    ) {
        deleteManyUser(
            where: {
                AND: $AND
                email: {
                    contains: $contains
                    endsWith: $endsWith
                    equals: $equals
                    gt: $gt
                    gte: $gte
                    in: $in
                    lt: $lt
                    lte: $lte
                    not: $not
                    notIn: $notIn
                    startsWith: $startsWith
                }
                first: {
                    contains: $batchpayloadContains
                    endsWith: $batchpayloadEndswith
                    equals: $batchpayloadEquals
                    gt: $batchpayloadGt
                    gte: $batchpayloadGte
                    in: $batchpayloadIn
                    lt: $batchpayloadLt
                    lte: $batchpayloadLte
                    not: $batchpayloadNot
                    notIn: $batchpayloadNotin
                    startsWith: $batchpayloadStartswith
                }
                id: {
                    equals: $idBatchpayloadEquals
                    gt: $idBatchpayloadGt
                    gte: $idBatchpayloadGte
                    in: $idBatchpayloadIn
                    lt: $idBatchpayloadLt
                    lte: $idBatchpayloadLte
                    not: $idBatchpayloadNot
                    notIn: $idBatchpayloadNotin
                }
                last: {
                    contains: $lastBatchpayloadContains
                    endsWith: $lastBatchpayloadEndswith
                    equals: $lastBatchpayloadEquals
                    gt: $lastBatchpayloadGt
                    gte: $lastBatchpayloadGte
                    in: $lastBatchpayloadIn
                    lt: $lastBatchpayloadLt
                    lte: $lastBatchpayloadLte
                    not: $lastBatchpayloadNot
                    notIn: $lastBatchpayloadNotin
                    startsWith: $lastBatchpayloadStartswith
                }
                NOT: $NOT
                OR: $OR
                password: {
                    contains: $passwordBatchpayloadContains
                    endsWith: $passwordBatchpayloadEndswith
                    equals: $passwordBatchpayloadEquals
                    gt: $passwordBatchpayloadGt
                    gte: $passwordBatchpayloadGte
                    in: $passwordBatchpayloadIn
                    lt: $passwordBatchpayloadLt
                    lte: $passwordBatchpayloadLte
                    not: $passwordBatchpayloadNot
                    notIn: $passwordBatchpayloadNotin
                    startsWith: $passwordBatchpayloadStartswith
                }
                steps: { every: $every, none: $none, some: $some }
                tags: {
                    every: $batchpayloadEvery
                    none: $batchpayloadNone
                    some: $batchpayloadSome
                }
                tests: {
                    every: $testsBatchpayloadEvery
                    none: $testsBatchpayloadNone
                    some: $testsBatchpayloadSome
                }
            }
        ) {
            count
        }
    }
`
export type DeleteManyUserMutationFn = ApolloReactCommon.MutationFunction<
    DeleteManyUserMutation,
    DeleteManyUserMutationVariables
>

/**
 * __useDeleteManyUserMutation__
 *
 * To run a mutation, you first call `useDeleteManyUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteManyUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteManyUserMutation, { data, loading, error }] = useDeleteManyUserMutation({
 *   variables: {
 *      AND: // value for 'AND'
 *      contains: // value for 'contains'
 *      endsWith: // value for 'endsWith'
 *      equals: // value for 'equals'
 *      gt: // value for 'gt'
 *      gte: // value for 'gte'
 *      in: // value for 'in'
 *      lt: // value for 'lt'
 *      lte: // value for 'lte'
 *      not: // value for 'not'
 *      notIn: // value for 'notIn'
 *      startsWith: // value for 'startsWith'
 *      batchpayloadContains: // value for 'batchpayloadContains'
 *      batchpayloadEndswith: // value for 'batchpayloadEndswith'
 *      batchpayloadEquals: // value for 'batchpayloadEquals'
 *      batchpayloadGt: // value for 'batchpayloadGt'
 *      batchpayloadGte: // value for 'batchpayloadGte'
 *      batchpayloadIn: // value for 'batchpayloadIn'
 *      batchpayloadLt: // value for 'batchpayloadLt'
 *      batchpayloadLte: // value for 'batchpayloadLte'
 *      batchpayloadNot: // value for 'batchpayloadNot'
 *      batchpayloadNotin: // value for 'batchpayloadNotin'
 *      batchpayloadStartswith: // value for 'batchpayloadStartswith'
 *      idBatchpayloadEquals: // value for 'idBatchpayloadEquals'
 *      idBatchpayloadGt: // value for 'idBatchpayloadGt'
 *      idBatchpayloadGte: // value for 'idBatchpayloadGte'
 *      idBatchpayloadIn: // value for 'idBatchpayloadIn'
 *      idBatchpayloadLt: // value for 'idBatchpayloadLt'
 *      idBatchpayloadLte: // value for 'idBatchpayloadLte'
 *      idBatchpayloadNot: // value for 'idBatchpayloadNot'
 *      idBatchpayloadNotin: // value for 'idBatchpayloadNotin'
 *      lastBatchpayloadContains: // value for 'lastBatchpayloadContains'
 *      lastBatchpayloadEndswith: // value for 'lastBatchpayloadEndswith'
 *      lastBatchpayloadEquals: // value for 'lastBatchpayloadEquals'
 *      lastBatchpayloadGt: // value for 'lastBatchpayloadGt'
 *      lastBatchpayloadGte: // value for 'lastBatchpayloadGte'
 *      lastBatchpayloadIn: // value for 'lastBatchpayloadIn'
 *      lastBatchpayloadLt: // value for 'lastBatchpayloadLt'
 *      lastBatchpayloadLte: // value for 'lastBatchpayloadLte'
 *      lastBatchpayloadNot: // value for 'lastBatchpayloadNot'
 *      lastBatchpayloadNotin: // value for 'lastBatchpayloadNotin'
 *      lastBatchpayloadStartswith: // value for 'lastBatchpayloadStartswith'
 *      NOT: // value for 'NOT'
 *      OR: // value for 'OR'
 *      passwordBatchpayloadContains: // value for 'passwordBatchpayloadContains'
 *      passwordBatchpayloadEndswith: // value for 'passwordBatchpayloadEndswith'
 *      passwordBatchpayloadEquals: // value for 'passwordBatchpayloadEquals'
 *      passwordBatchpayloadGt: // value for 'passwordBatchpayloadGt'
 *      passwordBatchpayloadGte: // value for 'passwordBatchpayloadGte'
 *      passwordBatchpayloadIn: // value for 'passwordBatchpayloadIn'
 *      passwordBatchpayloadLt: // value for 'passwordBatchpayloadLt'
 *      passwordBatchpayloadLte: // value for 'passwordBatchpayloadLte'
 *      passwordBatchpayloadNot: // value for 'passwordBatchpayloadNot'
 *      passwordBatchpayloadNotin: // value for 'passwordBatchpayloadNotin'
 *      passwordBatchpayloadStartswith: // value for 'passwordBatchpayloadStartswith'
 *      every: // value for 'every'
 *      none: // value for 'none'
 *      some: // value for 'some'
 *      batchpayloadEvery: // value for 'batchpayloadEvery'
 *      batchpayloadNone: // value for 'batchpayloadNone'
 *      batchpayloadSome: // value for 'batchpayloadSome'
 *      testsBatchpayloadEvery: // value for 'testsBatchpayloadEvery'
 *      testsBatchpayloadNone: // value for 'testsBatchpayloadNone'
 *      testsBatchpayloadSome: // value for 'testsBatchpayloadSome'
 *   },
 * });
 */
export function useDeleteManyUserMutation(
    baseOptions?: ApolloReactHooks.MutationHookOptions<
        DeleteManyUserMutation,
        DeleteManyUserMutationVariables
    >
) {
    return ApolloReactHooks.useMutation<
        DeleteManyUserMutation,
        DeleteManyUserMutationVariables
    >(DeleteManyUserDocument, baseOptions)
}
export type DeleteManyUserMutationHookResult = ReturnType<
    typeof useDeleteManyUserMutation
>
export type DeleteManyUserMutationResult = ApolloReactCommon.MutationResult<
    DeleteManyUserMutation
>
export type DeleteManyUserMutationOptions = ApolloReactCommon.BaseMutationOptions<
    DeleteManyUserMutation,
    DeleteManyUserMutationVariables
>
export const DeleteUserDocument = gql`
    mutation deleteUser($email: String, $id: Int) {
        deleteUser(where: { email: $email, id: $id }) {
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
                        testId
                        userId
                    }
                    userId
                }
                url
                userId
                value
            }
            tags {
                id
                name
                Test {
                    id
                    name
                    steps {
                        expected
                        id
                        key
                        kind
                        selector
                        url
                        userId
                        value
                    }
                    userId
                }
                testId
                userId
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
                    userId
                    value
                }
                tags {
                    id
                    name
                    testId
                    userId
                }
                userId
            }
        }
    }
`
export type DeleteUserMutationFn = ApolloReactCommon.MutationFunction<
    DeleteUserMutation,
    DeleteUserMutationVariables
>

/**
 * __useDeleteUserMutation__
 *
 * To run a mutation, you first call `useDeleteUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteUserMutation, { data, loading, error }] = useDeleteUserMutation({
 *   variables: {
 *      email: // value for 'email'
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteUserMutation(
    baseOptions?: ApolloReactHooks.MutationHookOptions<
        DeleteUserMutation,
        DeleteUserMutationVariables
    >
) {
    return ApolloReactHooks.useMutation<
        DeleteUserMutation,
        DeleteUserMutationVariables
    >(DeleteUserDocument, baseOptions)
}
export type DeleteUserMutationHookResult = ReturnType<
    typeof useDeleteUserMutation
>
export type DeleteUserMutationResult = ApolloReactCommon.MutationResult<
    DeleteUserMutation
>
export type DeleteUserMutationOptions = ApolloReactCommon.BaseMutationOptions<
    DeleteUserMutation,
    DeleteUserMutationVariables
>
export const UpdateManyUserDocument = gql`
    mutation updateManyUser(
        $email: String
        $first: String
        $id: Int
        $last: String
        $password: String
        $AND: [UserWhereInput!]
        $contains: String
        $endsWith: String
        $equals: String
        $gt: String
        $gte: String
        $in: [String!]
        $lt: String
        $lte: String
        $not: String
        $notIn: [String!]
        $startsWith: String
        $batchpayloadContains: String
        $batchpayloadEndswith: String
        $batchpayloadEquals: String
        $batchpayloadGt: String
        $batchpayloadGte: String
        $batchpayloadIn: [String!]
        $batchpayloadLt: String
        $batchpayloadLte: String
        $batchpayloadNot: String
        $batchpayloadNotin: [String!]
        $batchpayloadStartswith: String
        $idBatchpayloadEquals: Int
        $idBatchpayloadGt: Int
        $idBatchpayloadGte: Int
        $idBatchpayloadIn: [Int!]
        $idBatchpayloadLt: Int
        $idBatchpayloadLte: Int
        $idBatchpayloadNot: Int
        $idBatchpayloadNotin: [Int!]
        $lastBatchpayloadContains: String
        $lastBatchpayloadEndswith: String
        $lastBatchpayloadEquals: String
        $lastBatchpayloadGt: String
        $lastBatchpayloadGte: String
        $lastBatchpayloadIn: [String!]
        $lastBatchpayloadLt: String
        $lastBatchpayloadLte: String
        $lastBatchpayloadNot: String
        $lastBatchpayloadNotin: [String!]
        $lastBatchpayloadStartswith: String
        $NOT: [UserWhereInput!]
        $OR: [UserWhereInput!]
        $passwordBatchpayloadContains: String
        $passwordBatchpayloadEndswith: String
        $passwordBatchpayloadEquals: String
        $passwordBatchpayloadGt: String
        $passwordBatchpayloadGte: String
        $passwordBatchpayloadIn: [String!]
        $passwordBatchpayloadLt: String
        $passwordBatchpayloadLte: String
        $passwordBatchpayloadNot: String
        $passwordBatchpayloadNotin: [String!]
        $passwordBatchpayloadStartswith: String
        $every: StepWhereInput
        $none: StepWhereInput
        $some: StepWhereInput
        $batchpayloadEvery: TagWhereInput
        $batchpayloadNone: TagWhereInput
        $batchpayloadSome: TagWhereInput
        $testsBatchpayloadEvery: TestWhereInput
        $testsBatchpayloadNone: TestWhereInput
        $testsBatchpayloadSome: TestWhereInput
    ) {
        updateManyUser(
            data: {
                email: $email
                first: $first
                id: $id
                last: $last
                password: $password
            }
            where: {
                AND: $AND
                email: {
                    contains: $contains
                    endsWith: $endsWith
                    equals: $equals
                    gt: $gt
                    gte: $gte
                    in: $in
                    lt: $lt
                    lte: $lte
                    not: $not
                    notIn: $notIn
                    startsWith: $startsWith
                }
                first: {
                    contains: $batchpayloadContains
                    endsWith: $batchpayloadEndswith
                    equals: $batchpayloadEquals
                    gt: $batchpayloadGt
                    gte: $batchpayloadGte
                    in: $batchpayloadIn
                    lt: $batchpayloadLt
                    lte: $batchpayloadLte
                    not: $batchpayloadNot
                    notIn: $batchpayloadNotin
                    startsWith: $batchpayloadStartswith
                }
                id: {
                    equals: $idBatchpayloadEquals
                    gt: $idBatchpayloadGt
                    gte: $idBatchpayloadGte
                    in: $idBatchpayloadIn
                    lt: $idBatchpayloadLt
                    lte: $idBatchpayloadLte
                    not: $idBatchpayloadNot
                    notIn: $idBatchpayloadNotin
                }
                last: {
                    contains: $lastBatchpayloadContains
                    endsWith: $lastBatchpayloadEndswith
                    equals: $lastBatchpayloadEquals
                    gt: $lastBatchpayloadGt
                    gte: $lastBatchpayloadGte
                    in: $lastBatchpayloadIn
                    lt: $lastBatchpayloadLt
                    lte: $lastBatchpayloadLte
                    not: $lastBatchpayloadNot
                    notIn: $lastBatchpayloadNotin
                    startsWith: $lastBatchpayloadStartswith
                }
                NOT: $NOT
                OR: $OR
                password: {
                    contains: $passwordBatchpayloadContains
                    endsWith: $passwordBatchpayloadEndswith
                    equals: $passwordBatchpayloadEquals
                    gt: $passwordBatchpayloadGt
                    gte: $passwordBatchpayloadGte
                    in: $passwordBatchpayloadIn
                    lt: $passwordBatchpayloadLt
                    lte: $passwordBatchpayloadLte
                    not: $passwordBatchpayloadNot
                    notIn: $passwordBatchpayloadNotin
                    startsWith: $passwordBatchpayloadStartswith
                }
                steps: { every: $every, none: $none, some: $some }
                tags: {
                    every: $batchpayloadEvery
                    none: $batchpayloadNone
                    some: $batchpayloadSome
                }
                tests: {
                    every: $testsBatchpayloadEvery
                    none: $testsBatchpayloadNone
                    some: $testsBatchpayloadSome
                }
            }
        ) {
            count
        }
    }
`
export type UpdateManyUserMutationFn = ApolloReactCommon.MutationFunction<
    UpdateManyUserMutation,
    UpdateManyUserMutationVariables
>

/**
 * __useUpdateManyUserMutation__
 *
 * To run a mutation, you first call `useUpdateManyUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateManyUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateManyUserMutation, { data, loading, error }] = useUpdateManyUserMutation({
 *   variables: {
 *      email: // value for 'email'
 *      first: // value for 'first'
 *      id: // value for 'id'
 *      last: // value for 'last'
 *      password: // value for 'password'
 *      AND: // value for 'AND'
 *      contains: // value for 'contains'
 *      endsWith: // value for 'endsWith'
 *      equals: // value for 'equals'
 *      gt: // value for 'gt'
 *      gte: // value for 'gte'
 *      in: // value for 'in'
 *      lt: // value for 'lt'
 *      lte: // value for 'lte'
 *      not: // value for 'not'
 *      notIn: // value for 'notIn'
 *      startsWith: // value for 'startsWith'
 *      batchpayloadContains: // value for 'batchpayloadContains'
 *      batchpayloadEndswith: // value for 'batchpayloadEndswith'
 *      batchpayloadEquals: // value for 'batchpayloadEquals'
 *      batchpayloadGt: // value for 'batchpayloadGt'
 *      batchpayloadGte: // value for 'batchpayloadGte'
 *      batchpayloadIn: // value for 'batchpayloadIn'
 *      batchpayloadLt: // value for 'batchpayloadLt'
 *      batchpayloadLte: // value for 'batchpayloadLte'
 *      batchpayloadNot: // value for 'batchpayloadNot'
 *      batchpayloadNotin: // value for 'batchpayloadNotin'
 *      batchpayloadStartswith: // value for 'batchpayloadStartswith'
 *      idBatchpayloadEquals: // value for 'idBatchpayloadEquals'
 *      idBatchpayloadGt: // value for 'idBatchpayloadGt'
 *      idBatchpayloadGte: // value for 'idBatchpayloadGte'
 *      idBatchpayloadIn: // value for 'idBatchpayloadIn'
 *      idBatchpayloadLt: // value for 'idBatchpayloadLt'
 *      idBatchpayloadLte: // value for 'idBatchpayloadLte'
 *      idBatchpayloadNot: // value for 'idBatchpayloadNot'
 *      idBatchpayloadNotin: // value for 'idBatchpayloadNotin'
 *      lastBatchpayloadContains: // value for 'lastBatchpayloadContains'
 *      lastBatchpayloadEndswith: // value for 'lastBatchpayloadEndswith'
 *      lastBatchpayloadEquals: // value for 'lastBatchpayloadEquals'
 *      lastBatchpayloadGt: // value for 'lastBatchpayloadGt'
 *      lastBatchpayloadGte: // value for 'lastBatchpayloadGte'
 *      lastBatchpayloadIn: // value for 'lastBatchpayloadIn'
 *      lastBatchpayloadLt: // value for 'lastBatchpayloadLt'
 *      lastBatchpayloadLte: // value for 'lastBatchpayloadLte'
 *      lastBatchpayloadNot: // value for 'lastBatchpayloadNot'
 *      lastBatchpayloadNotin: // value for 'lastBatchpayloadNotin'
 *      lastBatchpayloadStartswith: // value for 'lastBatchpayloadStartswith'
 *      NOT: // value for 'NOT'
 *      OR: // value for 'OR'
 *      passwordBatchpayloadContains: // value for 'passwordBatchpayloadContains'
 *      passwordBatchpayloadEndswith: // value for 'passwordBatchpayloadEndswith'
 *      passwordBatchpayloadEquals: // value for 'passwordBatchpayloadEquals'
 *      passwordBatchpayloadGt: // value for 'passwordBatchpayloadGt'
 *      passwordBatchpayloadGte: // value for 'passwordBatchpayloadGte'
 *      passwordBatchpayloadIn: // value for 'passwordBatchpayloadIn'
 *      passwordBatchpayloadLt: // value for 'passwordBatchpayloadLt'
 *      passwordBatchpayloadLte: // value for 'passwordBatchpayloadLte'
 *      passwordBatchpayloadNot: // value for 'passwordBatchpayloadNot'
 *      passwordBatchpayloadNotin: // value for 'passwordBatchpayloadNotin'
 *      passwordBatchpayloadStartswith: // value for 'passwordBatchpayloadStartswith'
 *      every: // value for 'every'
 *      none: // value for 'none'
 *      some: // value for 'some'
 *      batchpayloadEvery: // value for 'batchpayloadEvery'
 *      batchpayloadNone: // value for 'batchpayloadNone'
 *      batchpayloadSome: // value for 'batchpayloadSome'
 *      testsBatchpayloadEvery: // value for 'testsBatchpayloadEvery'
 *      testsBatchpayloadNone: // value for 'testsBatchpayloadNone'
 *      testsBatchpayloadSome: // value for 'testsBatchpayloadSome'
 *   },
 * });
 */
export function useUpdateManyUserMutation(
    baseOptions?: ApolloReactHooks.MutationHookOptions<
        UpdateManyUserMutation,
        UpdateManyUserMutationVariables
    >
) {
    return ApolloReactHooks.useMutation<
        UpdateManyUserMutation,
        UpdateManyUserMutationVariables
    >(UpdateManyUserDocument, baseOptions)
}
export type UpdateManyUserMutationHookResult = ReturnType<
    typeof useUpdateManyUserMutation
>
export type UpdateManyUserMutationResult = ApolloReactCommon.MutationResult<
    UpdateManyUserMutation
>
export type UpdateManyUserMutationOptions = ApolloReactCommon.BaseMutationOptions<
    UpdateManyUserMutation,
    UpdateManyUserMutationVariables
>
export const UpdateUserDocument = gql`
    mutation updateUser(
        $email: String
        $first: String
        $id: Int
        $last: String
        $password: String
        $connect: [StepWhereUniqueInput!]
        $create: [StepCreateWithoutUserInput!]
        $delete: [StepWhereUniqueInput!]
        $deleteMany: [StepScalarWhereInput!]
        $disconnect: [StepWhereUniqueInput!]
        $set: [StepWhereUniqueInput!]
        $update: [StepUpdateWithWhereUniqueWithoutUserInput!]
        $updateMany: [StepUpdateManyWithWhereNestedInput!]
        $upsert: [StepUpsertWithWhereUniqueWithoutUserInput!]
        $userConnect: [TagWhereUniqueInput!]
        $userCreate: [TagCreateWithoutUserInput!]
        $userDelete: [TagWhereUniqueInput!]
        $userDeletemany: [TagScalarWhereInput!]
        $userDisconnect: [TagWhereUniqueInput!]
        $userSet: [TagWhereUniqueInput!]
        $userUpdate: [TagUpdateWithWhereUniqueWithoutUserInput!]
        $userUpdatemany: [TagUpdateManyWithWhereNestedInput!]
        $userUpsert: [TagUpsertWithWhereUniqueWithoutUserInput!]
        $testsUserConnect: [TestWhereUniqueInput!]
        $testsUserCreate: [TestCreateWithoutUserInput!]
        $testsUserDelete: [TestWhereUniqueInput!]
        $testsUserDeletemany: [TestScalarWhereInput!]
        $testsUserDisconnect: [TestWhereUniqueInput!]
        $testsUserSet: [TestWhereUniqueInput!]
        $testsUserUpdate: [TestUpdateWithWhereUniqueWithoutUserInput!]
        $testsUserUpdatemany: [TestUpdateManyWithWhereNestedInput!]
        $testsUserUpsert: [TestUpsertWithWhereUniqueWithoutUserInput!]
    ) {
        updateUser(
            data: {
                email: $email
                first: $first
                id: $id
                last: $last
                password: $password
                steps: {
                    connect: $connect
                    create: $create
                    delete: $delete
                    deleteMany: $deleteMany
                    disconnect: $disconnect
                    set: $set
                    update: $update
                    updateMany: $updateMany
                    upsert: $upsert
                }
                tags: {
                    connect: $userConnect
                    create: $userCreate
                    delete: $userDelete
                    deleteMany: $userDeletemany
                    disconnect: $userDisconnect
                    set: $userSet
                    update: $userUpdate
                    updateMany: $userUpdatemany
                    upsert: $userUpsert
                }
                tests: {
                    connect: $testsUserConnect
                    create: $testsUserCreate
                    delete: $testsUserDelete
                    deleteMany: $testsUserDeletemany
                    disconnect: $testsUserDisconnect
                    set: $testsUserSet
                    update: $testsUserUpdate
                    updateMany: $testsUserUpdatemany
                    upsert: $testsUserUpsert
                }
            }
            where: { email: $email, id: $id }
        ) {
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
                        testId
                        userId
                    }
                    userId
                }
                url
                userId
                value
            }
            tags {
                id
                name
                Test {
                    id
                    name
                    steps {
                        expected
                        id
                        key
                        kind
                        selector
                        url
                        userId
                        value
                    }
                    userId
                }
                testId
                userId
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
                    userId
                    value
                }
                tags {
                    id
                    name
                    testId
                    userId
                }
                userId
            }
        }
    }
`
export type UpdateUserMutationFn = ApolloReactCommon.MutationFunction<
    UpdateUserMutation,
    UpdateUserMutationVariables
>

/**
 * __useUpdateUserMutation__
 *
 * To run a mutation, you first call `useUpdateUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserMutation, { data, loading, error }] = useUpdateUserMutation({
 *   variables: {
 *      email: // value for 'email'
 *      first: // value for 'first'
 *      id: // value for 'id'
 *      last: // value for 'last'
 *      password: // value for 'password'
 *      connect: // value for 'connect'
 *      create: // value for 'create'
 *      delete: // value for 'delete'
 *      deleteMany: // value for 'deleteMany'
 *      disconnect: // value for 'disconnect'
 *      set: // value for 'set'
 *      update: // value for 'update'
 *      updateMany: // value for 'updateMany'
 *      upsert: // value for 'upsert'
 *      userConnect: // value for 'userConnect'
 *      userCreate: // value for 'userCreate'
 *      userDelete: // value for 'userDelete'
 *      userDeletemany: // value for 'userDeletemany'
 *      userDisconnect: // value for 'userDisconnect'
 *      userSet: // value for 'userSet'
 *      userUpdate: // value for 'userUpdate'
 *      userUpdatemany: // value for 'userUpdatemany'
 *      userUpsert: // value for 'userUpsert'
 *      testsUserConnect: // value for 'testsUserConnect'
 *      testsUserCreate: // value for 'testsUserCreate'
 *      testsUserDelete: // value for 'testsUserDelete'
 *      testsUserDeletemany: // value for 'testsUserDeletemany'
 *      testsUserDisconnect: // value for 'testsUserDisconnect'
 *      testsUserSet: // value for 'testsUserSet'
 *      testsUserUpdate: // value for 'testsUserUpdate'
 *      testsUserUpdatemany: // value for 'testsUserUpdatemany'
 *      testsUserUpsert: // value for 'testsUserUpsert'
 *   },
 * });
 */
export function useUpdateUserMutation(
    baseOptions?: ApolloReactHooks.MutationHookOptions<
        UpdateUserMutation,
        UpdateUserMutationVariables
    >
) {
    return ApolloReactHooks.useMutation<
        UpdateUserMutation,
        UpdateUserMutationVariables
    >(UpdateUserDocument, baseOptions)
}
export type UpdateUserMutationHookResult = ReturnType<
    typeof useUpdateUserMutation
>
export type UpdateUserMutationResult = ApolloReactCommon.MutationResult<
    UpdateUserMutation
>
export type UpdateUserMutationOptions = ApolloReactCommon.BaseMutationOptions<
    UpdateUserMutation,
    UpdateUserMutationVariables
>
export const UpsertUserDocument = gql`
    mutation upsertUser(
        $email: String
        $first: String
        $last: String
        $password: String
        $connect: [StepWhereUniqueInput!]
        $create: [StepCreateWithoutUserInput!]
        $userConnect: [TagWhereUniqueInput!]
        $userCreate: [TagCreateWithoutUserInput!]
        $testsUserConnect: [TestWhereUniqueInput!]
        $testsUserCreate: [TestCreateWithoutUserInput!]
        $id: Int
        $delete: [StepWhereUniqueInput!]
        $deleteMany: [StepScalarWhereInput!]
        $disconnect: [StepWhereUniqueInput!]
        $set: [StepWhereUniqueInput!]
        $update: [StepUpdateWithWhereUniqueWithoutUserInput!]
        $updateMany: [StepUpdateManyWithWhereNestedInput!]
        $upsert: [StepUpsertWithWhereUniqueWithoutUserInput!]
        $userDelete: [TagWhereUniqueInput!]
        $userDeletemany: [TagScalarWhereInput!]
        $userDisconnect: [TagWhereUniqueInput!]
        $userSet: [TagWhereUniqueInput!]
        $userUpdate: [TagUpdateWithWhereUniqueWithoutUserInput!]
        $userUpdatemany: [TagUpdateManyWithWhereNestedInput!]
        $userUpsert: [TagUpsertWithWhereUniqueWithoutUserInput!]
        $testsUserDelete: [TestWhereUniqueInput!]
        $testsUserDeletemany: [TestScalarWhereInput!]
        $testsUserDisconnect: [TestWhereUniqueInput!]
        $testsUserSet: [TestWhereUniqueInput!]
        $testsUserUpdate: [TestUpdateWithWhereUniqueWithoutUserInput!]
        $testsUserUpdatemany: [TestUpdateManyWithWhereNestedInput!]
        $testsUserUpsert: [TestUpsertWithWhereUniqueWithoutUserInput!]
    ) {
        upsertUser(
            create: {
                email: $email
                first: $first
                last: $last
                password: $password
                steps: { connect: $connect, create: $create }
                tags: { connect: $userConnect, create: $userCreate }
                tests: { connect: $testsUserConnect, create: $testsUserCreate }
            }
            update: {
                email: $email
                first: $first
                id: $id
                last: $last
                password: $password
                steps: {
                    connect: $connect
                    create: $create
                    delete: $delete
                    deleteMany: $deleteMany
                    disconnect: $disconnect
                    set: $set
                    update: $update
                    updateMany: $updateMany
                    upsert: $upsert
                }
                tags: {
                    connect: $userConnect
                    create: $userCreate
                    delete: $userDelete
                    deleteMany: $userDeletemany
                    disconnect: $userDisconnect
                    set: $userSet
                    update: $userUpdate
                    updateMany: $userUpdatemany
                    upsert: $userUpsert
                }
                tests: {
                    connect: $testsUserConnect
                    create: $testsUserCreate
                    delete: $testsUserDelete
                    deleteMany: $testsUserDeletemany
                    disconnect: $testsUserDisconnect
                    set: $testsUserSet
                    update: $testsUserUpdate
                    updateMany: $testsUserUpdatemany
                    upsert: $testsUserUpsert
                }
            }
            where: { email: $email, id: $id }
        ) {
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
                        testId
                        userId
                    }
                    userId
                }
                url
                userId
                value
            }
            tags {
                id
                name
                Test {
                    id
                    name
                    steps {
                        expected
                        id
                        key
                        kind
                        selector
                        url
                        userId
                        value
                    }
                    userId
                }
                testId
                userId
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
                    userId
                    value
                }
                tags {
                    id
                    name
                    testId
                    userId
                }
                userId
            }
        }
    }
`
export type UpsertUserMutationFn = ApolloReactCommon.MutationFunction<
    UpsertUserMutation,
    UpsertUserMutationVariables
>

/**
 * __useUpsertUserMutation__
 *
 * To run a mutation, you first call `useUpsertUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpsertUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [upsertUserMutation, { data, loading, error }] = useUpsertUserMutation({
 *   variables: {
 *      email: // value for 'email'
 *      first: // value for 'first'
 *      last: // value for 'last'
 *      password: // value for 'password'
 *      connect: // value for 'connect'
 *      create: // value for 'create'
 *      userConnect: // value for 'userConnect'
 *      userCreate: // value for 'userCreate'
 *      testsUserConnect: // value for 'testsUserConnect'
 *      testsUserCreate: // value for 'testsUserCreate'
 *      id: // value for 'id'
 *      delete: // value for 'delete'
 *      deleteMany: // value for 'deleteMany'
 *      disconnect: // value for 'disconnect'
 *      set: // value for 'set'
 *      update: // value for 'update'
 *      updateMany: // value for 'updateMany'
 *      upsert: // value for 'upsert'
 *      userDelete: // value for 'userDelete'
 *      userDeletemany: // value for 'userDeletemany'
 *      userDisconnect: // value for 'userDisconnect'
 *      userSet: // value for 'userSet'
 *      userUpdate: // value for 'userUpdate'
 *      userUpdatemany: // value for 'userUpdatemany'
 *      userUpsert: // value for 'userUpsert'
 *      testsUserDelete: // value for 'testsUserDelete'
 *      testsUserDeletemany: // value for 'testsUserDeletemany'
 *      testsUserDisconnect: // value for 'testsUserDisconnect'
 *      testsUserSet: // value for 'testsUserSet'
 *      testsUserUpdate: // value for 'testsUserUpdate'
 *      testsUserUpdatemany: // value for 'testsUserUpdatemany'
 *      testsUserUpsert: // value for 'testsUserUpsert'
 *   },
 * });
 */
export function useUpsertUserMutation(
    baseOptions?: ApolloReactHooks.MutationHookOptions<
        UpsertUserMutation,
        UpsertUserMutationVariables
    >
) {
    return ApolloReactHooks.useMutation<
        UpsertUserMutation,
        UpsertUserMutationVariables
    >(UpsertUserDocument, baseOptions)
}
export type UpsertUserMutationHookResult = ReturnType<
    typeof useUpsertUserMutation
>
export type UpsertUserMutationResult = ApolloReactCommon.MutationResult<
    UpsertUserMutation
>
export type UpsertUserMutationOptions = ApolloReactCommon.BaseMutationOptions<
    UpsertUserMutation,
    UpsertUserMutationVariables
>
