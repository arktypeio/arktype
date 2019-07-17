"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const filters_1 = require("./filters");
const metamorph_1 = require("./filters/metamorph");
exports.shapeql = (root) => (query) => exports.toGql(shapeQuery(root)(query));
exports.toGql = (query) => graphql_tag_1.default(JSON.stringify(query, null, 4)
    .replace(/"/g, "")
    .replace(/:/g, "")
    .replace(/null/g, ""));
exports.rootQuery = (rootClass) => metamorph_1.metamorph(new rootClass(), rootClass, {
    objectMorph: (obj, metadata) => {
        if (metadata) {
            try {
                return new metadata.target();
            }
            catch (_a) {
                return null;
            }
        }
        return null;
    },
    iterateArrays: false
});
exports.withTypeNames = (sourceObject, classWithMetadata) => {
    return metamorph_1.metamorph(sourceObject, classWithMetadata, {
        objectMorph: (obj, metadata) => metadata
            ? Object.assign({}, obj, { __typename: metadata.name }) : obj
    });
};
const shapeQuery = (rootClass) => (query) => filters_1.shapeFilter(exports.rootQuery(rootClass), query);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcGVxbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zaGFwZXFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsOERBQTZCO0FBRTdCLHVDQUFtRDtBQUNuRCxtREFBK0M7QUEwQ2xDLFFBQUEsT0FBTyxHQUFHLENBQWtDLElBQWMsRUFBRSxFQUFFLENBQUMsQ0FDeEUsS0FBUSxFQUNWLEVBQUUsQ0FBQyxhQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7QUFFdEIsUUFBQSxLQUFLLEdBQUcsQ0FBYyxLQUFxQixFQUFFLEVBQUUsQ0FDeEQscUJBQUcsQ0FDQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0tBQ3pCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO0tBQ2pCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO0tBQ2pCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQzVCLENBQUE7QUFNUSxRQUFBLFNBQVMsR0FBRyxDQUFjLFNBQW1CLEVBQUUsRUFBRSxDQUMxRCxxQkFBUyxDQUFDLElBQUksU0FBUyxFQUFFLEVBQUUsU0FBUyxFQUFFO0lBQ2xDLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRTtRQUMzQixJQUFJLFFBQVEsRUFBRTtZQUNWLElBQUk7Z0JBQ0EsT0FBTyxJQUFLLFFBQVEsQ0FBQyxNQUFjLEVBQUUsQ0FBQTthQUN4QztZQUFDLFdBQU07Z0JBQ0osT0FBTyxJQUFJLENBQUE7YUFDZDtTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDZixDQUFDO0lBQ0QsYUFBYSxFQUFFLEtBQUs7Q0FDdkIsQ0FBaUIsQ0FBQTtBQUVULFFBQUEsYUFBYSxHQUFHLENBQ3pCLFlBQWUsRUFDZixpQkFBMkIsRUFDN0IsRUFBRTtJQUNBLE9BQU8scUJBQVMsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLEVBQUU7UUFDOUMsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQzNCLFFBQVE7WUFDSixDQUFDLG1CQUNRLEdBQUcsSUFDTixVQUFVLEVBQUUsUUFBUSxDQUFDLElBQUksSUFFL0IsQ0FBQyxDQUFDLEdBQUc7S0FDaEIsQ0FBTSxDQUFBO0FBQ1gsQ0FBQyxDQUFBO0FBRUQsTUFBTSxVQUFVLEdBQUcsQ0FBa0MsU0FBbUIsRUFBRSxFQUFFLENBQUMsQ0FDekUsS0FBUSxFQUNWLEVBQUUsQ0FBRSxxQkFBVyxDQUFDLGlCQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUEyQixDQUFBIn0=