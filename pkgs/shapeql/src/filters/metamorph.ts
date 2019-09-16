import { getMetadataStorage } from "type-graphql/dist/metadata/getMetadataStorage"
import { ObjectClassMetadata } from "type-graphql/dist/metadata/definitions/object-class-metdata"
import { FieldMetadata } from "type-graphql/dist/metadata/definitions"
import { Class, memoize, objectify } from "@re-do/utils"

export const getMetadata: typeof getMetadataStorage = memoize(() => {
    const metadata = getMetadataStorage()
    metadata.build()
    return metadata
})

const isArrayField = (o: any, field: FieldMetadata): o is any[] => {
    const arrayExpected = !!field.typeOptions.array
    if (arrayExpected != Array.isArray(o)) {
        throw new Error(
            `Expected a${
                arrayExpected ? "n " : " non-"
            }array based on field metadata:\n${JSON.stringify(
                field,
                undefined,
                4
            )}\n but found ${JSON.stringify(o, undefined, 4)}.`
        )
    }
    return arrayExpected
}

export type MetamorphOptions = {
    objectMorph: (original: any, metadata?: ObjectClassMetadata) => any
    iterateArrays?: boolean
    shallow?: boolean
}

export const metamorph = <T>(
    objectToMorph: T,
    classWithMetadata: Class<T>,
    { objectMorph, iterateArrays = true, shallow = false }: MetamorphOptions
) => {
    const recurse = (obj: any, possibleMetadataSource: any) => {
        const typeMetadata = getMetadata().objectTypes.find(
            ({ target }) => target === possibleMetadataSource
        )
        obj = objectMorph ? objectMorph(obj, typeMetadata) : obj
        if (!shallow && typeMetadata && typeMetadata.fields) {
            typeMetadata.fields.forEach(fieldMetadata => {
                const { name } = fieldMetadata
                const value = obj[name]
                if (value && fieldMetadata.typeOptions.array && iterateArrays) {
                    if (isArrayField(value, fieldMetadata)) {
                        value.forEach((item, index) => {
                            obj[name][index] = recurse(
                                item,
                                fieldMetadata.getType()
                            )
                        })
                    }
                } else {
                    obj[name] = recurse(value, fieldMetadata.getType())
                }
            })
        }
        return objectify(obj)
    }
    const o = JSON.parse(JSON.stringify(objectToMorph))
    return recurse(o, classWithMetadata)
}
