
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

    setSensor(frame, data) {
        if (!this.sensors[frame]) {
            let color = this.getSensorPaletteColor(this.sensorPaletteIndex);
            let lens = new SensorActiveLens(this.motionStudy, frame);
            this.sensors[frame] = {
                color,
                position: data.position,
                points: data.points,
                lens,
            };
            this.setSensorColor(frame, color);
            this.sensorPaletteIndex += 1;

            defaultLensProvider.addLens(lens);
        }
        console.log('setSensor', data);
        this.sensors[frame].position = data.position;
        this.sensors[frame].points = data.points;
    }

    getSensorFrames() {
        return Object.keys(this.sensors);
    }

    getSensorPaletteColor(i) {
        let hue = (i * 37 + 180) % 360;
        return `hsl(${hue}, 100%, 60%)`;
    }

    getSensorColor(frame) {
        if (!this.sensors[frame] || !this.sensors[frame].color) {
            return '#ff0000';
        }
        return this.sensors[frame].color;
    }

    setSensorColor(frame, color) {
        console.log('setSensorColor', frame, color);
        this.sensors[frame].color = color;
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
        const sensorPosition = this.sensors[frame].position;
        if (this.sensors[frame].points) {
            return this.isSensorActivePoints(frame, pose);
        }
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

    isSensorActivePoints(frame, pose) {
        if (!this.sensors[frame]) {
            return false;
        }
        const points = this.sensors[frame].points;

        for (const jointName in pose.joints) {
            const joint = pose.joints[jointName];
            let pos = {x: joint.position.x, y: joint.position.z};
            if (isPointInsideWalls(pos, points)) {
                return true;
            }
        }
        return false;

    }

    isPositionInSensor(frame, position) {
        if (!this.sensors[frame]) {
            return false;
        }
        const sensorPosition = this.sensors[frame].position;
        const sensorWidth = 0.8;
        const sensorDepth = 0.8;
        const mToUnit = 1000;
        const minX = sensorPosition.x - (sensorWidth * mToUnit) / 2;
        const maxX = sensorPosition.x + (sensorWidth * mToUnit) / 2;
        const minZ = sensorPosition.z - (sensorDepth * mToUnit) / 2;
        const maxZ = sensorPosition.z + (sensorDepth * mToUnit) / 2;
        if (position.x > minX &&
            position.x < maxX &&
            position.z > minZ &&
            position.z < maxZ) {
            return true;
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
    }
}
