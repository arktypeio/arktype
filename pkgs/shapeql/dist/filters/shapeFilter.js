"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redo_utils_1 = require("redo-utils");
// TODO: Update to deal with arrays
exports.shapeFilter = (o, shape) => {
    if (!redo_utils_1.isRecursible(o) || !redo_utils_1.isRecursible(shape)) {
        throw Error(`Can't shapeFilter non-objects. Parameters '${o}' and '${shape}' were of types ${typeof o} and ${typeof shape}.`);
    }
    const recurse = (o, shape) => (redo_utils_1.isRecursible(shape)
        ? redo_utils_1.fromEntries(Object.entries(o)
            .filter(([key]) => key in shape)
            .map(([key, value]) => redo_utils_1.isRecursible(value)
            ? [key, recurse(value, shape[key])]
            : [key, value]))
        : o);
    return recurse(o, shape);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcGVGaWx0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZmlsdGVycy9zaGFwZUZpbHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDJDQUFzRDtBQVl0RCxtQ0FBbUM7QUFDdEIsUUFBQSxXQUFXLEdBQUcsQ0FBTyxDQUFJLEVBQUUsS0FBUSxFQUFxQixFQUFFO0lBQ25FLElBQUksQ0FBQyx5QkFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMseUJBQVksQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUMxQyxNQUFNLEtBQUssQ0FDUCw4Q0FBOEMsQ0FBQyxVQUFVLEtBQUssbUJBQW1CLE9BQU8sQ0FBQyxRQUFRLE9BQU8sS0FBSyxHQUFHLENBQ25ILENBQUE7S0FDSjtJQUNELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBSSxFQUFFLEtBQVEsRUFBcUIsRUFBRSxDQUNsRCxDQUFDLHlCQUFZLENBQUMsS0FBSyxDQUFDO1FBQ2hCLENBQUMsQ0FBQyx3QkFBVyxDQUNQLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ1osTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQzthQUMvQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQ2xCLHlCQUFZLENBQUMsS0FBSyxDQUFDO1lBQ2YsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUcsS0FBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDNUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUNyQixDQUNSO1FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBc0IsQ0FBQTtJQUNqQyxPQUFPLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDNUIsQ0FBQyxDQUFBIn0=