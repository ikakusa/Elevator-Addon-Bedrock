export class Floors {
    /**
     * 
     * @param {number[]} floorsArray 
     */
    constructor(floorsArray) {
        floorsArray.sort((a, b) => a - b);
        /**
         * @type {number[]}
         */
        this.floors = floorsArray;
    }

    /**
     * 
     * @param {number} index 
     * @returns {number}
     */
    at(index) {
        return this.floors[index];
    }

    /**
     * @returns {boolean}
     */
    isEmpty() {
        return this.floors.length === 0;
    }

    /**
     * @param {number} yLocation
     * @returns {boolean}
     */
    add(yLocation) {
        if (isNaN(yLocation) || this.floors.includes(yLocation)) return false;
        if (this.floors.length >= 50) return false;
        this.floors.push(yLocation);
        this.floors.sort((a, b) => a - b);
        return true;
    }

    /**
     * 
     * @param {number} index starts 0 
     */
    remove(index) {
        if (this.floors[index] === undefined) return;
        this.floors.splice(index, 1);
    }
}