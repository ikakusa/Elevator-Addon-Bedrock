/**
 * 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Number} z 
 */
export default class vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static from(xyz) {
        return new vec3(xyz.x, xyz.y, xyz.z);
    }

    /**
     * 
     * @param {vec3} min
     * @param {vec3} max 
     * @returns {boolean} 
     */
    isInRange(min, max) {
        return this.x >= Math.min(min.x, max.x) &&
            this.y >= Math.min(min.y, max.y) &&
            this.z >= Math.min(min.z, max.z) &&
            Math.max(max.x, min.x) >= this.x &&
            Math.max(max.y, min.y) >= this.y &&
            Math.max(max.z, min.z) >= this.z;
    }
}