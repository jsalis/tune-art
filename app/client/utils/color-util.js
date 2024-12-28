function formatToHex(n) {
    const hex = Math.round(n).toString(16);
    return hex.length < 2 ? "0" + hex : hex;
}

export function rgbToHex(r, g, b) {
    return "#" + formatToHex(r) + formatToHex(g) + formatToHex(b);
}

export function hexToRgb(hex) {
    if (hex[0] === "#") {
        hex = hex.substr(1);
    }

    if (hex.length < 6) {
        return {
            r: parseInt(hex[0] + hex[0], 16),
            g: parseInt(hex[1] + hex[1], 16),
            b: parseInt(hex[2] + hex[2], 16),
        };
    }

    return {
        r: parseInt(hex.substr(0, 2), 16),
        g: parseInt(hex.substr(2, 2), 16),
        b: parseInt(hex.substr(4, 2), 16),
    };
}
