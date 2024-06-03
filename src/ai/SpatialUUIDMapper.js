/**
 * Manages the translation and navigation of identifiers within a 3D scene. This class
 * preprocesses JSON data to replace spatial entity names and IDs with resilient UUIDs,
 * facilitating consistent identification across system interactions. It also ensures
 * that the transformed data integrates seamlessly with linked navigational elements
 * in the 3D environment, allowing for direct user interaction through clickable links
 * that navigate to and highlight specific entities in the scene.
 */
export class SpatialUUIDMapper {
    constructor() {
        this.spatialReferenceMap = {};
    }

    updateSpatialReference(data) {
        console.log('updateSpatialReference', data);
        // TODO: addToMap
        
        if (typeof data.spatialReferences === 'undefined') return;
        if (typeof data.applicationId === 'undefined') return;

        // if (typeof this.spatialReferenceMap[data.applicationId] === 'undefined') {
        //     this.spatialReferenceMap[data.applicationId] = {};
        // }
        
        Object.entries(data.spatialReferences).forEach(([referenceUuid, value]) => {
            let name = value.name;
            let position = value.position;
            let fullUuid = `${data.applicationId}_${referenceUuid}`;
            let scrambledUuid = realityEditor.ai.crc.generateChecksum(fullUuid);
            realityEditor.ai.mapping.addToMap(fullUuid, name, scrambledUuid);
            
            // add more information so that we can correctly map the hyperlink to the correct tool/position
            this.spatialReferenceMap[fullUuid] = {
                applicationId: data.applicationId,
                referenceUuid: referenceUuid,
                scrambledUuid: scrambledUuid,
                position: position,
                name: name
            };
        });
    }

    postprocessFunctionArgs(fnArgs) {
        if (!fnArgs) return;

        let threeMap = realityEditor.ai.mapping.getMap();
        let myRegex = new RegExp("\\b[a-zA-Z0-9]{5,6}\\b", 'g'); // check any 5-6 character word more closely for exact match
        // this function will be applied to any parts of the answer matching the regex
        const replaceFunction = (potentialUuid) => {
            let replacementFullId = null;
            threeMap.scrambledIdToId.forEach((id, uuid) => {
                if (potentialUuid === uuid) {
                    // let span = this.createSpatialHyperlinkSpan(id);
                    // // Use a temporary container to convert the element to HTML string
                    // const container = document.createElement('div');
                    // container.appendChild(span);
                    // // Extract the HTML string from the container
                    // replacement = container.innerHTML;
                    // // replacement = `<span class='ai-highlight' data-id=${id}>${threeMap.idToName.get(id)}</span>`

                    replacementFullId = id;
                }
            });
            if (replacementFullId) {
                // check if there's a simplified referenceUuid that we can extract from the fullId,
                let spatialReference = this.spatialReferenceMap[replacementFullId];
                if (spatialReference) {
                    return spatialReference.referenceUuid;
                }

                // otherwise if it's the uuid of a tool, etc., then just use the fullId
                return replacementFullId;
            } 
            return potentialUuid;
        };

        return this.postprocess(fnArgs, myRegex, replaceFunction);
    }

    preprocessFunctionResult(result, applicationId) {
        // first process the result and see if any strings match the names of any spatialReferenceMap

        // Helper function to replace IDs with UUIDs in a string
        const replaceIDs = (text) => {
            if (typeof text !== 'string') return text;
            let result = text;
            
            Object.entries(this.spatialReferenceMap).forEach(([fullUuid, value]) => {
                if (value.applicationId !== applicationId) return; // skip other tool's references
                // let applicationId = value.applicationId;
                // let referenceName = value.name;
                // let position = value.position;
                let referenceUuid = value.referenceUuid;
                // let scrambledUuid = value.scrambledUuid;

                const regexUuid = new RegExp('\\b' + referenceUuid + '\\b', 'g'); // Using word boundaries to match whole words only
                result = result.replace(regexUuid, fullUuid);

                // const regexName = new RegExp('\\b' + referenceName + '\\b', 'g'); // Using word boundaries to match whole words only
                // result = result.replace(regexName, fullUuid);
            });
            
            // let threeMap = realityEditor.ai.mapping.getMap();
            // threeMap.idToScrambledId.forEach((uuid, id) => {
            //     const regex = new RegExp('\\b' + id + '\\b', 'g'); // Using word boundaries to match whole words only
            //     result = result.replace(regex, uuid);
            // });
            return result;
        }

        // Recursively traverse the object and replace keys and values
        const traverse = (object) => {
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
        if (typeof result === 'string') {
            return replaceIDs(result);
        }

        // Otherwise, handle it as a JSON object
        return traverse(result);
    }

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

            // replace names with IDs, with the only danger being if the same name appears in multiple tools
            threeMap.idToName.forEach((name, id) => {
                const regex = new RegExp('\\b' + name + '\\b', 'g'); // Using word boundaries to match whole words only
                result = result.replace(regex, id);
            });
            
            // replace IDs with scrambled UUIDs
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
