export function multiplyScalar(v, s) {
    return [v[0] * s, v[1] * s];
}

export function sub(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
}

export function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
}

export function distanceSquaredToLine(a, b, p) {
    const n = sub(b, a);
    const pa = sub(a, p);
    const c = multiplyScalar(n, dot(pa, n) / dot(n, n));
    const d = sub(pa, c);
    return dot(d, d);
}

export function getPointsBetween(p, c) {
    const [px, py] = p;
    const [cx, cy] = c;

    if (px === cx && py === cy) {
        return [c];
    }

    const points = [];
    const dx = cx - px;
    const dy = cy - py;

    for (let xx = 0; xx <= Math.abs(dx); xx++) {
        for (let yy = 0; yy <= Math.abs(dy); yy++) {
            const v = [px + xx * Math.sign(dx), py + yy * Math.sign(dy)];
            const dist = distanceSquaredToLine(p, c, v);

            if (dist < 0.5) {
                points.push(v);
            }
        }
    }

    return points;
}
