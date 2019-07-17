"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getMetadataStorage_1 = require("type-graphql/dist/metadata/getMetadataStorage");
const redo_utils_1 = require("redo-utils");
exports.getMetadata = redo_utils_1.memoize(() => {
    const metadata = getMetadataStorage_1.getMetadataStorage();
    metadata.build();
    return metadata;
});
const isArrayField = (o, field) => {
    const arrayExpected = !!field.typeOptions.array;
    if (arrayExpected != Array.isArray(o)) {
        throw new Error(`Expected a${arrayExpected ? "n " : " non-"}array based on field metadata:\n${JSON.stringify(field, undefined, 4)}\n but found ${JSON.stringify(o)}.`);
    }
    return arrayExpected;
};
exports.metamorph = (objectToMorph, classWithMetadata, { objectMorph, iterateArrays = true, shallow = false }) => {
    const recurse = (obj, possibleMetadataSource) => {
        const typeMetadata = exports.getMetadata().objectTypes.find(({ target }) => target === possibleMetadataSource);
        obj = objectMorph ? objectMorph(obj, typeMetadata) : obj;
        if (!shallow && typeMetadata && typeMetadata.fields) {
            typeMetadata.fields.forEach(fieldMetadata => {
                const { name } = fieldMetadata;
                const value = obj[name];
                if (value && fieldMetadata.typeOptions.array && iterateArrays) {
                    if (isArrayField(value, fieldMetadata)) {
                        value.forEach((item, index) => {
                            obj[name][index] = recurse(item, fieldMetadata.getType());
                        });
                    }
                }
                else {
                    obj[name] = recurse(value, fieldMetadata.getType());
                }
            });
        }
        return redo_utils_1.objectify(obj);
    };
    const o = JSON.parse(JSON.stringify(objectToMorph));
    return recurse(o, classWithMetadata);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YW1vcnBoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2ZpbHRlcnMvbWV0YW1vcnBoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0ZBQWtGO0FBR2xGLDJDQUFzRDtBQUV6QyxRQUFBLFdBQVcsR0FBOEIsb0JBQU8sQ0FBQyxHQUFHLEVBQUU7SUFDL0QsTUFBTSxRQUFRLEdBQUcsdUNBQWtCLEVBQUUsQ0FBQTtJQUNyQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDaEIsT0FBTyxRQUFRLENBQUE7QUFDbkIsQ0FBQyxDQUFDLENBQUE7QUFFRixNQUFNLFlBQVksR0FBRyxDQUFDLENBQU0sRUFBRSxLQUFvQixFQUFjLEVBQUU7SUFDOUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFBO0lBQy9DLElBQUksYUFBYSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FDWCxhQUNJLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUMzQixtQ0FBbUMsSUFBSSxDQUFDLFNBQVMsQ0FDN0MsS0FBSyxFQUNMLFNBQVMsRUFDVCxDQUFDLENBQ0osZ0JBQWdCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FDeEMsQ0FBQTtLQUNKO0lBQ0QsT0FBTyxhQUFhLENBQUE7QUFDeEIsQ0FBQyxDQUFBO0FBUVksUUFBQSxTQUFTLEdBQUcsQ0FDckIsYUFBZ0IsRUFDaEIsaUJBQTJCLEVBQzNCLEVBQUUsV0FBVyxFQUFFLGFBQWEsR0FBRyxJQUFJLEVBQUUsT0FBTyxHQUFHLEtBQUssRUFBb0IsRUFDMUUsRUFBRTtJQUNBLE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBUSxFQUFFLHNCQUEyQixFQUFFLEVBQUU7UUFDdEQsTUFBTSxZQUFZLEdBQUcsbUJBQVcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQy9DLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxLQUFLLHNCQUFzQixDQUNwRCxDQUFBO1FBQ0QsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO1FBQ3hELElBQUksQ0FBQyxPQUFPLElBQUksWUFBWSxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUU7WUFDakQsWUFBWSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ3hDLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxhQUFhLENBQUE7Z0JBQzlCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDdkIsSUFBSSxLQUFLLElBQUksYUFBYSxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksYUFBYSxFQUFFO29CQUMzRCxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLEVBQUU7d0JBQ3BDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUU7NEJBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQ3RCLElBQUksRUFDSixhQUFhLENBQUMsT0FBTyxFQUFFLENBQzFCLENBQUE7d0JBQ0wsQ0FBQyxDQUFDLENBQUE7cUJBQ0w7aUJBQ0o7cUJBQU07b0JBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7aUJBQ3REO1lBQ0wsQ0FBQyxDQUFDLENBQUE7U0FDTDtRQUNELE9BQU8sc0JBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN6QixDQUFDLENBQUE7SUFDRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtJQUNuRCxPQUFPLE9BQU8sQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtBQUN4QyxDQUFDLENBQUEifQ==