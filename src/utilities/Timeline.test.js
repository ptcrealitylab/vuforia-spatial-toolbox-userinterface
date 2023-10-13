import { expect, test, describe } from 'vitest';
import { Region, Timeline } from "./Timeline";

const region = new Region(0, 5, null);

describe('region', () => {
    test('region initializes startTime and endTime in correct order', () => {
        const testRegion = new Region(5, 0, null);
        expect(testRegion).toMatchObject({
            startTime: 0,
            endTime: 5
        });
    });

    test('equals returns true for equivalent region', () => {
        const testRegion = new Region(0, 5, null);
        expect(region.equals(testRegion)).toBe(true);
    });

    test('equals returns false for different region', () => {
        const testRegion1 = new Region(0, 7, null);
        const testRegion2 = new Region(2, 5, null);
        const testRegion3 = new Region(2, 7, null);
        const testRegion4 = new Region(0, 5, 'value');
        expect(region.equals(testRegion1)).toBe(false);
        expect(region.equals(testRegion2)).toBe(false);
        expect(region.equals(testRegion3)).toBe(false);
        expect(region.equals(testRegion4)).toBe(false);
    });
    
    test('rangeEquals returns true for same range', () => {
        const testRegion1 = new Region(0, 5, null);
        const testRegion2 = new Region(0, 5, 'value');
        expect(region.rangeEquals(testRegion1)).toBe(true);
        expect(region.rangeEquals(testRegion2)).toBe(true);
    });

    test('rangeEquals returns false for different range', () => {
        const testRegion1 = new Region(0, 6, null);
        const testRegion2 = new Region(1, 5, null);
        const testRegion3 = new Region(1, 6, null);
        expect(region.rangeEquals(testRegion1)).toBe(false);
        expect(region.rangeEquals(testRegion2)).toBe(false);
        expect(region.rangeEquals(testRegion3)).toBe(false);
    });
    
    test('isSubsetOf returns true for subsets', () => {
        const testRegion1 = new Region(0, 5, null);
        const testRegion2 = new Region(0, 3, null);
        const testRegion3 = new Region(2, 5, null);
        const testRegion4 = new Region(2, 3, null);
        expect(testRegion1.isSubsetOf(region)).toBe(true);
        expect(testRegion2.isSubsetOf(region)).toBe(true);
        expect(testRegion3.isSubsetOf(region)).toBe(true);
        expect(testRegion4.isSubsetOf(region)).toBe(true);
    });
    
    test('isSubsetOf returns false for non-subsets', () => {
        const testRegion1 = new Region(0, 7, null);
        const testRegion2 = new Region(-2, 5, null);
        const testRegion3 = new Region(-2, 7, null);
        const testRegion4 = new Region(-2, 0, null);
        const testRegion5 = new Region(5, 7, null);
        expect(testRegion1.isSubsetOf(region)).toBe(false);
        expect(testRegion2.isSubsetOf(region)).toBe(false);
        expect(testRegion3.isSubsetOf(region)).toBe(false);
        expect(testRegion4.isSubsetOf(region)).toBe(false);
        expect(testRegion5.isSubsetOf(region)).toBe(false);
    });
    
    test('isSupersetOf returns true for supersets', () => {
        const testRegion1 = new Region(0, 5, null);
        const testRegion2 = new Region(0, 7, null);
        const testRegion3 = new Region(-2, 5, null);
        const testRegion4 = new Region(-2, 7, null);
        expect(testRegion1.isSupersetOf(region)).toBe(true);
        expect(testRegion2.isSupersetOf(region)).toBe(true);
        expect(testRegion3.isSupersetOf(region)).toBe(true);
        expect(testRegion4.isSupersetOf(region)).toBe(true);
    });

    test('isSupersetOf returns false for non-supersets', () => {
        const testRegion1 = new Region(0, 3, null);
        const testRegion2 = new Region(2, 5, null);
        const testRegion3 = new Region(2, 3, null);
        const testRegion4 = new Region(-2, 0, null);
        const testRegion5 = new Region(5, 7, null);
        expect(testRegion1.isSupersetOf(region)).toBe(false);
        expect(testRegion2.isSupersetOf(region)).toBe(false);
        expect(testRegion3.isSupersetOf(region)).toBe(false);
        expect(testRegion4.isSupersetOf(region)).toBe(false);
        expect(testRegion5.isSupersetOf(region)).toBe(false);
    });
    
    test('hasOverlapWith returns true for overlapping regions', () => {
        const testRegion1 = new Region(0, 5, null);
        const testRegion2 = new Region(-2, 3, null);
        const testRegion3 = new Region(2, 7, null);
        const testRegion4 = new Region(-2, 7, null);
        const testRegion5 = new Region(2, 3, null);
        expect(testRegion1.hasOverlapWith(region)).toBe(true);
        expect(testRegion2.hasOverlapWith(region)).toBe(true);
        expect(testRegion3.hasOverlapWith(region)).toBe(true);
        expect(testRegion4.hasOverlapWith(region)).toBe(true);
        expect(testRegion5.hasOverlapWith(region)).toBe(true);
    });

    test('hasOverlapWith returns false for non-overlapping regions', () => {
        const testRegion1 = new Region(-2, 0, null);
        const testRegion2 = new Region(5, 7, null);
        expect(testRegion1.hasOverlapWith(region)).toBe(false);
        expect(testRegion2.hasOverlapWith(region)).toBe(false);
    });

    test('isAdjacentTo returns true for adjacent regions', () => {
        const testRegion1 = new Region(-2, 0, null);
        const testRegion2 = new Region(5, 7, null);
        expect(testRegion1.isAdjacentTo(region)).toBe(true);
        expect(testRegion2.isAdjacentTo(region)).toBe(true);
    });

    test('isAdjacentTo returns false for non-adjacent regions', () => {
        const testRegion1 = new Region(0, 5, null);
        const testRegion2 = new Region(7, 9, null);
        const testRegion3 = new Region(-5, -2, null);
        expect(testRegion1.isAdjacentTo(region)).toBe(false);
        expect(testRegion2.isAdjacentTo(region)).toBe(false);
        expect(testRegion3.isAdjacentTo(region)).toBe(false);
    });
    
    test('isEntirelyBefore returns true for regions before', () => {
        const testRegion1 = new Region(-5, 0, null);
        expect(testRegion1.isEntirelyBefore(region)).toBe(true);
    });

    test('isEntirelyBefore returns false for regions not before', () => {
        const testRegion1 = new Region(-5, 2, null);
        const testRegion2 = new Region(0, 5, null);
        const testRegion3 = new Region(5, 7, null);
        expect(testRegion1.isEntirelyBefore(region)).toBe(false);
        expect(testRegion2.isEntirelyBefore(region)).toBe(false);
        expect(testRegion3.isEntirelyBefore(region)).toBe(false);
    });

    test('isEntirelyAfter returns true for regions after', () => {
        const testRegion1 = new Region(5, 7, null);
        expect(testRegion1.isEntirelyAfter(region)).toBe(true);
    });

    test('isEntirelyAfter returns false for regions not after', () => {
        const testRegion1 = new Region(2, 7, null);
        const testRegion2 = new Region(0, 5, null);
        const testRegion3 = new Region(-5, 0, null);
        expect(testRegion1.isEntirelyAfter(region)).toBe(false);
        expect(testRegion2.isEntirelyAfter(region)).toBe(false);
        expect(testRegion3.isEntirelyAfter(region)).toBe(false);
    });

    test('includes returns true for times within range', () => {
        expect(region.includes(0)).toBe(true);
        expect(region.includes(2.5)).toBe(true);
    });

    test('includes returns false for times outside range', () => {
        expect(region.includes(5)).toBe(false);
        expect(region.includes(-2)).toBe(false);
        expect(region.includes(7)).toBe(false);
    });
    
    test('subtract returns same region for non-overlapping subtraction', () => {
        const testRegion = new Region(7, 10, null);
        const subtraction = region.subtract(testRegion);
        expect(subtraction).toMatchObject([region]);
    });
    
    test('subtract returns empty list for equivalent regions', () => {
        const testRegion1 = new Region(0, 5, null);
        expect(region.subtract(testRegion1).length).toBe(0);
    });
    
    test('subtract returns empty list for strict supersets', () => {
        const testRegion1 = new Region(0, 7, null);
        const testRegion2 = new Region(-2, 5, null);
        const testRegion3 = new Region(-2, 7, null);
        expect(region.subtract(testRegion1).length).toBe(0);
        expect(region.subtract(testRegion2).length).toBe(0);
        expect(region.subtract(testRegion3).length).toBe(0);
    });
    
    test('subtract properly subtracts for strict subsets', () => {
        const testRegion = new Region(2, 3, null);
        const subtraction = region.subtract(testRegion);
        expect(subtraction).toMatchObject([
            new Region(0, 2, null),
            new Region(3, 5, null)
        ])
    });
    
    test('subtract properly subtracts regions overlapping on one side', () => {
        const testRegion1 = new Region(-2, 2, null);
        const testRegion2 = new Region(3, 7, null);
        const subtraction1 = region.subtract(testRegion1);
        const subtraction2 = region.subtract(testRegion2);
        expect(subtraction1).toMatchObject([new Region(2, 5, null)]);
        expect(subtraction2).toMatchObject([new Region(0, 3, null)]);
    });
    
    test('merge functions properly', () => {
        const testRegion1 = new Region(-2, 2, null);
        const testRegion2 = new Region(3, 7, null);
        const testRegion3 = new Region(2, 3, null);
        const testRegion4 = new Region(0, 7, null);
        const testRegion5 = new Region(7, 9, null);
        expect(region.merge(testRegion1)).toMatchObject(new Region(-2, 5, null));
        expect(region.merge(testRegion2)).toMatchObject(new Region(0, 7, null));
        expect(region.merge(testRegion3)).toMatchObject(new Region(0, 5, null));
        expect(region.merge(testRegion4)).toMatchObject(new Region(0, 7, null));
        expect(region.merge(testRegion5)).toMatchObject(new Region(0, 9, null));
    });
    
    test('merge throws error for different values', () => {
        const testRegion1 = new Region(3, 7, "weird value");
        expect(() => region.merge(testRegion1)).toThrowError();
    });

    test('clone returns equivalent object', () => {
        const testRegion = region.clone();
        expect(testRegion).toMatchObject(region);
    });
});

describe('timeline', () => {
    test('insert adds elements properly', () => {
        const timeline = new Timeline();
        timeline.insert(0, 5, "initial");
        expect(timeline.regions).toMatchObject([new Region(0, 5, "initial")]);
        timeline.insert(2, 7, "initial");
        expect(timeline.regions).toMatchObject([new Region(0, 7, "initial")]);
        timeline.insert(3, 4, "value");
        expect(timeline.regions).toMatchObject([
            new Region(0, 3, "initial"),
            new Region(3, 4, "value"),
            new Region(4, 7, "initial")
        ]);
        timeline.insert(-5, -2, "value");
        expect(timeline.regions).toMatchObject([
            new Region(-5, -2, "value"),
            new Region(0, 3, "initial"),
            new Region(3, 4, "value"),
            new Region(4, 7, "initial")
        ]);
        timeline.insert(-2, 3, "value");
        expect(timeline.regions).toMatchObject([
            new Region(-5, 4, "value"),
            new Region(4, 7, "initial")
        ]);
        timeline.insert(-10, 10, "other");
        expect(timeline.regions).toMatchObject([
            new Region(-10, 10, "other")
        ]);
    });
    
    test('clear modifies elements properly', () => {
        const timeline = new Timeline();
        timeline.insert(-10, 10, "initial");
        timeline.clear(-2, 2);
        expect(timeline.regions).toMatchObject([
            new Region(-10, -2, "initial"),
            new Region(2, 10, "initial")
        ]);
        timeline.clear(-5, -2);
        timeline.clear(2, 5);
        expect(timeline.regions).toMatchObject([
            new Region(-10, -5, "initial"),
            new Region(5, 10, "initial")
        ]);
        timeline.clear(-10, -5);
        expect(timeline.regions).toMatchObject([
            new Region(5, 10, "initial")
        ]);
        timeline.clear(5, 10);
        expect(timeline.regions).toMatchObject([]);
    });
    
    test('isRegionPresent returns true when it should', () => {
        const timeline = new Timeline();
        timeline.insert(-10, 10, "initial");
        expect(timeline.isRegionPresent(-10, 10, "initial")).toBe(true);
        expect(timeline.isRegionPresent(-10, 5, "initial")).toBe(true);
        expect(timeline.isRegionPresent(-5, 10, "initial")).toBe(true);
        expect(timeline.isRegionPresent(-5, 5, "initial")).toBe(true);
    });

    test('isRegionPresent returns false when it should', () => {
        const timeline = new Timeline();
        timeline.insert(-10, 10, "initial");
        expect(timeline.isRegionPresent(-10, 15, "initial")).toBe(false);
        expect(timeline.isRegionPresent(-15, 10, "initial")).toBe(false);
        expect(timeline.isRegionPresent(-15, 15, "initial")).toBe(false);
        expect(timeline.isRegionPresent(-20, -15, "initial")).toBe(false);
        expect(timeline.isRegionPresent(15, 20, "initial")).toBe(false);
        expect(timeline.isRegionPresent(-10, 10, "other")).toBe(false);
        expect(timeline.isRegionPresent(-10, 5, "other")).toBe(false);
        expect(timeline.isRegionPresent(-5, 10, "other")).toBe(false);
        expect(timeline.isRegionPresent(-5, 5, "other")).toBe(false);
    });
    
    test('getValue returns the correct value', () => {
        const timeline = new Timeline();
        timeline.insert(-10, 10, "initial");
        expect(timeline.getValue(0)).toBe("initial");
        expect(timeline.getValue(50)).toBeNull();
    });

    test('getValueForRegion returns the correct value', () => {
        const timeline = new Timeline();
        timeline.insert(-10, 10, "initial");
        expect(timeline.getValueForRegion(-10, 10)).toBe("initial");
        expect(timeline.getValueForRegion(-5, 5)).toBe("initial");
        expect(timeline.getValueForRegion(-10, 5)).toBe("initial");
        expect(timeline.getValueForRegion(-5, 10)).toBe("initial");
    });

    test('getValueForRegion returns null when no matching region exists', () => {
        const timeline = new Timeline();
        timeline.insert(-10, 10, "initial");
        expect(timeline.getValueForRegion(-12, 10)).toBeNull();
        expect(timeline.getValueForRegion(-10, 12)).toBeNull();
        expect(timeline.getValueForRegion(-12, 12)).toBeNull();
        expect(timeline.getValueForRegion(-15, -10)).toBeNull();
        expect(timeline.getValueForRegion(-15, -5)).toBeNull();
        expect(timeline.getValueForRegion(10, 15)).toBeNull();
        expect(timeline.getValueForRegion(5, 15)).toBeNull();
        expect(timeline.getValueForRegion(-20, -10)).toBeNull();
        expect(timeline.getValueForRegion(10, 20)).toBeNull();
    });
    
    test('copy copies timelines properly', () => {
        const timeline = new Timeline();
        expect(new Timeline().copy(timeline)).toMatchObject(timeline);
        timeline.insert(-10, 10, "initial");
        expect(new Timeline().copy(timeline)).toMatchObject(timeline);
        timeline.clear(-5, 5);
        expect(new Timeline().copy(timeline)).toMatchObject(timeline);
    });
});
