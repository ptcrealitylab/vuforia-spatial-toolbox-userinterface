/**
 * Manages the translation and navigation of identifiers within a 3D scene. This class
 * preprocesses JSON data to replace spatial entity names and IDs with resilient UUIDs,
 * facilitating consistent identification across system interactions. It also ensures
 * that the transformed data integrates seamlessly with linked navigational elements
 * in the 3D environment, allowing for direct user interaction through clickable links
 * that navigate to and highlight specific entities in the scene.
 */
export class SpatialUUIDMapper {
    constructor() {}

    /**
     * Preprocesses a string or JSON object by replacing all spatial entity names and IDs
     * with resilient UUIDs. This function recursively traverses through the object,
     * ensuring that all string values are checked and replaced if they match any known
     * identifier. The replaced identifiers are converted to UUIDs that are used
     * throughout the system for consistent referencing.
     *
     * @param {string|Object} input
     */
    preprocess(input) {
        // Helper function to replace IDs with UUIDs in a string
        function replaceIDs(text) {
            if (typeof text !== 'string') return text;
            let result = text;
            let threeMap = realityEditor.ai.mapping.getMap();
            threeMap.idToScrambledId.forEach((uuid, id) => {
                const regex = new RegExp('\\b' + id + '\\b', 'g'); // Using word boundaries to match whole words only
                result = result.replace(regex, uuid);
            });
            return result;
        }

        // Recursively traverse the object and replace keys and values
        function traverse(object) {
            if (typeof object !== 'object' || object === null) {
                return replaceIDs(object); // Directly return replaced string if it's not an object/array
            }

            if (Array.isArray(object)) {
                return object.map(item => traverse(item)); // Process each item in the array
            }

            const newObject = {}; // Create a new object to avoid mutating the original
            for (const key in object) {
                const newKey = replaceIDs(key); // Replace key if it matches any ID
                const value = object[key];
                newObject[newKey] = traverse(value); // Recursive call for nested objects or arrays
            }
            return newObject;
        }

        // Check if the input is a string and handle it directly
        if (typeof input === 'string') {
            return replaceIDs(input);
        }

        // Otherwise, handle it as a JSON object
        return traverse(input);
    }

    /**
     *
     * @param {string|JSON} input
     * @param uuidRegex
     * @param replaceFunction
     * @return {*|{}}
     */
    postprocess(input, uuidRegex, replaceFunction) {
        // Helper function to replace UUIDs in a string using the provided replaceFunction
        function replaceUUIDs(text) {
            if (typeof text !== 'string') return text;
            return text.replace(uuidRegex, match => replaceFunction(match));
        }

        // Recursively traverse the object and replace UUIDs
        function traverse(object) {
            if (typeof object !== 'object' || object === null) {
                return replaceUUIDs(object); // Directly return replaced string if it's not an object/array
            }

            if (Array.isArray(object)) {
                return object.map(item => traverse(item)); // Process each item in the array
            }

            const newObject = {}; // Create a new object to avoid mutating the original
            for (const key in object) {
                const value = object[key];
                newObject[key] = traverse(value); // Recursive call for nested objects or arrays
            }
            return newObject;
        }

        // Check if the input is a string and handle it directly
        if (typeof input === 'string') {
            return replaceUUIDs(input);
        }

        // Otherwise, handle it as a JSON object
        return traverse(input);
    }
}
