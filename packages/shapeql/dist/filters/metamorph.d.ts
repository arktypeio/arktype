import { getMetadataStorage } from "type-graphql/dist/metadata/getMetadataStorage";
import { ObjectClassMetadata } from "type-graphql/dist/metadata/definitions/object-class-metdata";
import { Class } from "redo-utils";
export declare const getMetadata: typeof getMetadataStorage;
export declare type MetamorphOptions = {
    objectMorph: (original: any, metadata?: ObjectClassMetadata) => any;
    iterateArrays?: boolean;
    shallow?: boolean;
};
export declare const metamorph: <T extends object>(objectToMorph: T, classWithMetadata: Class<T>, { objectMorph, iterateArrays, shallow }: MetamorphOptions) => Object;
