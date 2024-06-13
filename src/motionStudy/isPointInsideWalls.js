// isLeft(): tests if a point is Left|On|Right of an infinite line.
//    Input:  three points P0, P1, and P2
//    Return: >0 for P2 left of the line through P0 and P1
//            =0 for P2  on the line
//            <0 for P2  right of the line
//    See: Algorithm 1 "Area of Triangles and Polygons"
function isLeft(p0, p1, p2) {
    return ( (p1.x - p0.x) * (p2.y - p0.y)
            - (p2.x -  p0.x) * (p1.y - p0.y) );
}

/**
 * From https://web.archive.org/web/20130126163405/http://geomalgorithms.com/a03-_inclusion.html
 */
function _isPointInsideWallsBad(point, wallPoints) {
    let wn = 0;
    for (let i = 0; i < wallPoints.length; i++) {   // edge from V[i] to  V[i+1]
        let wallP0 = wallPoints[i];
        let wallP1 = wallPoints[(i + 1) % wallPoints.length];
        if (wallP0.y <= point.y) {          // start y <= point.y
            if (wallP1.y > point.y)      // an upward crossing
                 if (isLeft(wallP0, wallP1, point) > 0)  // P left of  edge
                     ++wn;            // have  a valid up intersect
        } else {                        // start y > point.y (no test needed)
            if (wallP1.y <= point.y)     // a downward crossing
                 if (isLeft(wallP0, wallP1, point) < 0)  // P right of  edge
                     --wn;            // have  a valid down intersect
        }
    }
    return wn !== 0;
}

export function isPointInsideWalls(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    // and in turn https://observablehq.com/@tmcw/understanding-point-in-polygon

    const {x, y} = point;

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i].x, yi = vs[i].y;
        var xj = vs[j].x, yj = vs[j].y;

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}
