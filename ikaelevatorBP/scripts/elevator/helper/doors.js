export class Doors {
    /**
     * 
     * @param {Object.<number, string>} doorsObject 
     */
    constructor(doorsObject) {
        /**
         * @type {Object.<number, string>}
         */
        this.doors = doorsObject;
    }

    /**
     * @returns {boolean}
     */
    isEmpty() {
        return Object.keys(this.doors).length === 0;
    }

    /**
     * @param {number} floor starts 0
     * @returns {boolean} has overwrite
     */
    update(floor, doorEntityId) {
        let overwrite = false;
        if (this.doors[floor]) overwrite = true;
        this.doors[floor] = doorEntityId;
        return overwrite;
    }

    /**
     * 
     * @param {number} floor starts 0 
     */
    remove(floor) {
        if (this.doors[floor] === undefined) return;
        delete this.doors[floor];
    }
}