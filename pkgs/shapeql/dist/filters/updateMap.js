"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redo_utils_1 = require("redo-utils");
exports.updateMap = (current, updater) => {
    return redo_utils_1.fromEntries(Object.entries(current).map(([k, v]) => {
        if (k in updater) {
            const key = k;
            if (typeof updater[key] === "function") {
                const update = updater[key];
                return [k, update(v)];
            }
            else {
                return redo_utils_1.isRecursible(v)
                    ? Array.isArray(v)
                        ? [
                            k,
                            v.map(item => exports.updateMap(item, updater[key]))
                        ]
                        : [k, exports.updateMap(v, updater[key])]
                    : [k, updater[key]];
            }
        }
        else {
            return [k, v];
        }
    }));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlTWFwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2ZpbHRlcnMvdXBkYXRlTWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkNBQThFO0FBYWpFLFFBQUEsU0FBUyxHQUFHLENBQ3JCLE9BQVUsRUFDVixPQUFzQixFQUNyQixFQUFFO0lBQ0gsT0FBTyx3QkFBVyxDQUNkLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUNuQyxJQUFJLENBQUMsSUFBSSxPQUFPLEVBQUU7WUFDZCxNQUFNLEdBQUcsR0FBRyxDQUFZLENBQUE7WUFDeEIsSUFBSSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxVQUFVLEVBQUU7Z0JBQ3BDLE1BQU0sTUFBTSxHQUFJLE9BQU8sQ0FBQyxHQUFHLENBRTFCLENBQUE7Z0JBQ0QsT0FBTyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTthQUN4QjtpQkFBTTtnQkFDSCxPQUFPLHlCQUFZLENBQUMsQ0FBQyxDQUFDO29CQUNsQixDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQ2QsQ0FBQyxDQUFDOzRCQUNJLENBQUM7NEJBQ0QsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUNULGlCQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQVEsQ0FBQyxDQUN2Qzt5QkFDSjt3QkFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsaUJBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBUSxDQUFDLENBQUM7b0JBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTthQUMxQjtTQUNKO2FBQU07WUFDSCxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1NBQ2hCO0lBQ0wsQ0FBQyxDQUFDLENBQ0EsQ0FBQTtBQUNWLENBQUMsQ0FBQSJ9