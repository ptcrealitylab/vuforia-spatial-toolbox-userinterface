
export class MotionStudySensors {
    constructor() {
        this.sensors = {};
        this.sensorColors = {};
        this.playbackActivation = {};
        this.sensorPaletteIndex = 0;
        this.onVehicleDeleted = this.onVehicleDeleted.bind(this);
    }

    attachListeners() {
        realityEditor.device.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using server
    }

    setSensor(frame, position) {
        if (!this.sensors[frame]) {
            this.setSensorColor(frame, this.getSensorPaletteColor(this.sensorPaletteIndex));
            this.sensorPaletteIndex += 1;
        }
        this.sensors[frame] = position;
    }

    getSensorFrames() {
        return Object.keys(this.sensors);
    }

    getSensorPaletteColor(i) {
        let hue = (i * 37 + 180) % 360;
        return `hsl(${hue}, 100%, 60%)`;
    }

    getSensorColor(frame) {
        return this.sensorColors[frame] || '#ff0000';
    }

    setSensorColor(frame, color) {
        this.sensorColors[frame] = color;
        realityEditor.network.postMessageIntoFrame(frame, {
            analyticsSetSensorColor: {
                color,
            }
        });
    }

    setSensorPlaybackActive(frame, active) {
        realityEditor.network.postMessageIntoFrame(frame, {
            analyticsSetSensorPlaybackActive: {
                active,
            }
        });
    }

    isSensorActive(frame, pose) {
        if (!this.sensors[frame]) {
            return false;
        }
        const sensorPosition = this.sensors[frame];
        const sensorWidth = 0.8;
        const sensorDepth = 0.8;
        const mToUnit = 1000;
        const minX = sensorPosition.x - (sensorWidth * mToUnit) / 2;
        const maxX = sensorPosition.x + (sensorWidth * mToUnit) / 2;
        const minZ = sensorPosition.z - (sensorDepth * mToUnit) / 2;
        const maxZ = sensorPosition.z + (sensorDepth * mToUnit) / 2;
        for (const jointName in pose.joints) {
            const joint = pose.joints[jointName];
            if (joint.position.x > minX &&
                joint.position.x < maxX &&
                joint.position.z > minZ &&
                joint.position.z < maxZ) {
                return true;
            }
        }
        return false;
    }

    playbackSetActivationFromClones(clones) {
        let lastPlaybackActivation = {};
        for (let sensorFrame of this.getSensorFrames()) {
            lastPlaybackActivation[sensorFrame] = this.playbackActivation[sensorFrame];
            this.playbackActivation[sensorFrame] = false;
        }
        for (let clone of clones) {
            if (!clone.visible) {
                continue;
            }
            for (let sensorFrame of this.getSensorFrames()) {
                if (this.playbackActivation[sensorFrame]) {
                    continue;
                }
                let active = this.isSensorActive(sensorFrame, clone.pose);
                this.playbackActivation[sensorFrame] = active;
            }
        }
        for (let sensorFrame of this.getSensorFrames()) {
            if (lastPlaybackActivation[sensorFrame] === this.playbackActivation[sensorFrame]) {
                // Skip sending message if it doesn't change activation
                continue;
            }
            this.setSensorPlaybackActive(sensorFrame, this.playbackActivation[sensorFrame]);
        }
    }

    playbackClearActivation() {
        for (let sensorFrame of Object.keys(this.playbackActivation)) {
            if (!this.playbackActivation[sensorFrame]) {
                continue;
            }
            this.setSensorPlaybackActive(sensorFrame, false);
            this.playbackActivation[sensorFrame] = false;
        }
    }

    onVehicleDeleted(event) {
        if (!event.objectKey || !event.frameKey || event.nodeKey) {
            return;
        }
        if (!this.sensors.hasOwnProperty(event.frameKey)) {
            return;
        }
        delete this.sensors[event.frameKey];
        delete this.sensorColors[event.frameKey];
    }
}
