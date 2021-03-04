import { Key } from "ts-toolbelt/out/Any/Key"
import { Head } from "ts-toolbelt/out/List/Head"
import { List } from "ts-toolbelt/out/List/List"
import { Pop } from "ts-toolbelt/out/List/Pop"
import { Tail } from "ts-toolbelt/out/List/Tail"
import { Path } from "ts-toolbelt/out/Object/Path"
import { UnionOf } from "ts-toolbelt/out/Object/UnionOf"
import { Select } from "ts-toolbelt/out/Union/Select"
import { Join } from "ts-toolbelt/out/String/Join"
import { Split } from "ts-toolbelt/out/String/Split"

type Index = number | string

type KeyToIndex<K extends Key, SP extends List<Index>> = number extends K
    ? Head<SP>
    : K & Index

type MetaPath<
    O,
    Delimiter extends string,
    SP extends List<Index> = [],
    P extends List<Index> = []
> = {
    [K in keyof O]:
        | MetaPath<O[K] & {}, Delimiter, Tail<SP>, [...P, KeyToIndex<K, SP>]>
        | Join<[...P, KeyToIndex<K, SP>], Delimiter>
}

type NextPath<OP> = Select<UnionOf<Exclude<OP, string> & {}>, string>

type ExecPath<A, SP extends List<Index>, Delimiter extends string> = NextPath<
    Path<MetaPath<A, Delimiter, SP>, SP>
>

type HintPath<
    A,
    P extends string,
    SP extends List<Index>,
    Exec extends string,
    Delimiter extends string
> = [Exec] extends [never] // if has not found paths
    ? ExecPath<A, Pop<SP>, Delimiter> // display previous paths
    : Exec | P // display current + next

type _AutoPath<
    A,
    P extends string,
    Delimiter extends string,
    SP extends List<Index> = Split<P, Delimiter>
> = HintPath<A, P, SP, ExecPath<A, SP, Delimiter>, Delimiter>

export type AutoPath<
    O extends any,
    P extends string,
    Delimiter extends string = "."
> = _AutoPath<O & {}, P, Delimiter>
