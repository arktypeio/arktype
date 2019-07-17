import { ValueFrom, DeepPartial } from "redo-utils";
export declare type FilterFunction = Parameters<ValueFrom<Array<any>, "filter">>[0];
export declare type FilterOptions<IsDeep extends boolean = false> = {
    objectFilter?: FilterFunction;
    arrayFilter?: FilterFunction;
    deep?: IsDeep;
};
export declare const filter: <ObjectType, ReturnType_1 extends IsDeep extends true ? DeepPartial<ObjectType> : Partial<ObjectType>, IsDeep extends boolean = false>(o: ObjectType, options: FilterOptions<IsDeep>) => ReturnType_1;
