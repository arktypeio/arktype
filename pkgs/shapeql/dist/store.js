"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const filters_1 = require("./filters");
const shapeql_1 = require("./shapeql");
const queryAll = ({ rootClass, client }) => () => query({ rootClass, client })(shapeql_1.rootQuery(rootClass));
const query = ({ rootClass, client }) => (q) => filters_1.excludeKeys(client.readQuery({ query: shapeql_1.shapeql(rootClass)(q) }), ["__typename"], true);
const write = ({ rootClass, client }) => (values) => {
    client.writeData({
        data: shapeql_1.withTypeNames(values, rootClass)
    });
};
const initialize = (config) => (values) => __awaiter(this, void 0, void 0, function* () {
    yield config.client.clearStore();
    yield write(config)(values);
});
const mutate = (config) => (updateMapper) => __awaiter(this, void 0, void 0, function* () {
    console.log("Mutating store with value:");
    console.log(updateMapper);
    const currentCache = queryAll(config)();
    const mutatedCache = filters_1.updateMap(currentCache, updateMapper);
    const changes = filters_1.diff(currentCache, mutatedCache);
    if (!util_1.isDeepStrictEqual(changes, {})) {
        write(config)(mutatedCache);
        if (config.handler) {
            yield exports.handle(config.handler)(changes);
        }
    }
    else {
        console.log("Mutation wouldn't change the existing value, skipping.");
    }
});
exports.handle = (handler) => (changes) => __awaiter(this, void 0, void 0, function* () {
    for (const k in changes) {
        if (k in handler) {
            const handle = handler[k];
            const change = changes[k];
            handle(change);
        }
    }
});
exports.createStore = (config) => ({
    query: query(config),
    mutate: mutate(config),
    initialize: initialize(config),
    queryAll: queryAll(config),
    write: write(config)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvc3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLCtCQUF3QztBQUd4Qyx1Q0FBcUU7QUFDckUsdUNBUWtCO0FBRWxCLE1BQU0sUUFBUSxHQUFHLENBQWMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFrQixFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FDMUUsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsbUJBQVMsQ0FBQyxTQUFTLENBQWEsQ0FBTSxDQUFBO0FBRXZFLE1BQU0sS0FBSyxHQUFHLENBQWtDLEVBQzVDLFNBQVMsRUFDVCxNQUFNLEVBQ08sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFJLEVBQUUsRUFBRSxDQUMzQixxQkFBVyxDQUNQLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsaUJBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQ2xELENBQUMsWUFBWSxDQUFDLEVBQ2QsSUFBSSxDQUNjLENBQUE7QUFFMUIsTUFBTSxLQUFLLEdBQUcsQ0FBYyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQWtCLEVBQUUsRUFBRSxDQUFDLENBQ2xFLE1BQXlCLEVBQzNCLEVBQUU7SUFDQSxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ2IsSUFBSSxFQUFFLHVCQUFhLENBQUMsTUFBTSxFQUFFLFNBQWdCLENBQUM7S0FDaEQsQ0FBQyxDQUFBO0FBQ04sQ0FBQyxDQUFBO0FBRUQsTUFBTSxVQUFVLEdBQUcsQ0FBYyxNQUFzQixFQUFFLEVBQUUsQ0FBQyxDQUN4RCxNQUF5QixFQUMzQixFQUFFO0lBQ0EsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ2hDLE1BQU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQy9CLENBQUMsQ0FBQSxDQUFBO0FBRUQsTUFBTSxNQUFNLEdBQUcsQ0FBYyxNQUFzQixFQUFFLEVBQUUsQ0FBQyxDQUdwRCxZQUFlLEVBQ2pCLEVBQUU7SUFDQSxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLENBQUE7SUFDekMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUN6QixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQTtJQUN2QyxNQUFNLFlBQVksR0FBRyxtQkFBUyxDQUFDLFlBQVksRUFBRSxZQUFtQixDQUFDLENBQUE7SUFDakUsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUNoRCxJQUFJLENBQUMsd0JBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQ2pDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMzQixJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDaEIsTUFBTSxjQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1NBQ3hDO0tBQ0o7U0FBTTtRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsd0RBQXdELENBQUMsQ0FBQTtLQUN4RTtBQUNMLENBQUMsQ0FBQSxDQUFBO0FBS1ksUUFBQSxNQUFNLEdBQUcsQ0FDbEIsT0FBbUIsRUFDckIsRUFBRSxDQUFDLENBQU8sT0FBVSxFQUFFLEVBQUU7SUFDdEIsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUU7UUFDckIsSUFBSSxDQUFDLElBQUksT0FBTyxFQUFFO1lBQ2QsTUFBTSxNQUFNLEdBQUksT0FBZSxDQUFDLENBQUMsQ0FBZ0IsQ0FBQTtZQUNqRCxNQUFNLE1BQU0sR0FBSSxPQUFlLENBQUMsQ0FBQyxDQUFxQixDQUFBO1lBQ3RELE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtTQUNqQjtLQUNKO0FBQ0wsQ0FBQyxDQUFBLENBQUE7QUFRWSxRQUFBLFdBQVcsR0FBRyxDQUFjLE1BQXNCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDakUsS0FBSyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDcEIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDdEIsVUFBVSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUM7SUFDOUIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7SUFDMUIsS0FBSyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUM7Q0FDdkIsQ0FBQyxDQUFBIn0=