
class Rotate {
    degrees: any;
    point: any;

    constructor(degrees: any, point: any) {
        this.degrees = degrees;
        this.point = point;
    }
}

class Scale {
    size: any;
    point: any;

    constructor(size: any, point: any) {
        this.size = size;
        this.point = point;
    }
}

class SetScale {
    size: any;
    point: any;

    constructor(size: any, point: any) {
        this.size = size;
        this.point = point;
    }
}

class Translate {
    vector: any;

    constructor(vector: any) {
        this.vector = vector;
    }
}

class Position {
    vector: any;

    constructor(vector: any) {
        this.vector = vector;
    }
}

var Transformations = {
    Rotate: Rotate,
    Scale: Scale,
    SetScale: SetScale,
    Translate: Translate,
    Position: Position
};
