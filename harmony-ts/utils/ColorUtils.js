function hsvToRgb(h, s, v) {
    s = s / 100;
    v = v / 100;
    var c = v * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = v - c;
    var r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) {
        r = c;
        g = x;
        b = 0;
    }
    else if (h >= 60 && h < 120) {
        r = x;
        g = c;
        b = 0;
    }
    else if (h >= 120 && h < 180) {
        r = 0;
        g = c;
        b = x;
    }
    else if (h >= 180 && h < 240) {
        r = 0;
        g = x;
        b = c;
    }
    else if (h >= 240 && h < 300) {
        r = x;
        g = 0;
        b = c;
    }
    else {
        r = c;
        g = 0;
        b = x;
    }
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}
function rgbToHsv(r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;
    var d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0;
    }
    else {
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h = h * 60;
    }
    return {
        h: Math.round(h),
        s: Math.round(s * 100),
        v: Math.round(v * 100)
    };
}
var ColorObj = (function () {
    function ColorObj(input) {
        this._r = 0;
        this._g = 0;
        this._b = 0;
        if (typeof input === "string") {
            this._parseHex(input);
        }
        else if (typeof input === "object") {
            if ("h" in input && "s" in input && "v" in input) {
                var rgb = hsvToRgb(input.h, input.s, input.v);
                this._r = rgb.r;
                this._g = rgb.g;
                this._b = rgb.b;
            }
            else if ("r" in input && "g" in input && "b" in input) {
                this._r = input.r;
                this._g = input.g;
                this._b = input.b;
            }
            else {
                throw new Error("Invalid color input object. Must contain either {h,s,v} or {r,g,b}");
            }
        }
        else {
            throw new Error("Invalid color input. Must be a hex string or an object with RGB or HSV values");
        }
    }
    ColorObj.prototype._parseHex = function (hexString) {
        var hex = hexString.replace(/^#/, "");
        if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
            throw new Error("Invalid hex color format. Expected format: #RRGGBB or RRGGBB");
        }
        this._r = parseInt(hex.substring(0, 2), 16);
        this._g = parseInt(hex.substring(2, 4), 16);
        this._b = parseInt(hex.substring(4, 6), 16);
    };
    ColorObj.prototype.getRed = function () {
        return this._r;
    };
    ColorObj.prototype.getGreen = function () {
        return this._g;
    };
    ColorObj.prototype.getBlue = function () {
        return this._b;
    };
    ColorObj.prototype.toRgb = function () {
        return {
            r: this._r,
            g: this._g,
            b: this._b
        };
    };
    ColorObj.prototype.toHsv = function () {
        return rgbToHsv(this._r, this._g, this._b);
    };
    ColorObj.prototype.toHex = function (withHash) {
        if (withHash === void 0) { withHash = true; }
        var r = ("0" + this._r.toString(16)).slice(-2);
        var g = ("0" + this._g.toString(16)).slice(-2);
        var b = ("0" + this._b.toString(16)).slice(-2);
        var hex = (r + g + b).toUpperCase();
        return withHash ? "#" + hex : hex;
    };
    ColorObj.fromRgb = function (r, g, b) {
        return new ColorObj({ r: r, g: g, b: b });
    };
    ColorObj.fromHsv = function (h, s, v) {
        return new ColorObj({ h: h, s: s, v: v });
    };
    ColorObj.fromHex = function (hex) {
        return new ColorObj(hex);
    };
    return ColorObj;
}());
var ColorUtils = {
    hsvToRgb: hsvToRgb,
    rgbToHsv: rgbToHsv,
    ColorObj: ColorObj
};
