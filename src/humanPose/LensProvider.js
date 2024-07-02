import {RebaLens} from "./RebaLens.js";
import {OverallRebaLens} from "./OverallRebaLens.js";
import {MuriLens} from "./MuriLens.js";
import {ValueAddWasteTimeLens} from "./ValueAddWasteTimeLens.js";
import {AccelerationLens} from "./AccelerationLens.js";
import {PoseObjectIdLens} from "./PoseObjectIdLens.js";

export class LensProvider {
    constructor() {
        this.lensCreateFunctions = [];

        this.analyzers = [];
    }

    /**
     * @param {HumanPoseAnalyzer} analyzer
     */
    addHumanPoseAnalyzer(analyzer) {
        this.analyzers.push(analyzer);
        for (let lensCreate of this.lensCreateFunctions) {
            analyzer.addLens(lensCreate(analyzer));
        }
    }

    removeHumanPoseAnalyzer(analyzerToRemove) {
        this.analyzers = this.analyzers.filter(analyzer => analyzer !== analyzerToRemove);
    }

    addLensCreateFunction(lensCreateFunction) {
        this.lensCreateFunctions.push(lensCreateFunction);
        this.analyzers.forEach(analyzer => {
            let lens = lensCreateFunction(analyzer);
            analyzer.addLens(lens);
        });
    }

    removeLensCreateFunction(lensCreateFunctionToRemove) {
        this.lensCreateFunction = this.lensCreateFunctions.filter(fn => fn !== lensCreateFunctionToRemove);
        // this.analyzers.forEach(analyzer => {
        //     analyzer.removeLens(hmm);
        // });
    }
}

const defaultLensProvider = new LensProvider();
defaultLensProvider.addLensCreateFunction(() => {
    return new RebaLens();
});
defaultLensProvider.addLensCreateFunction(() => {
    return new OverallRebaLens();
});
defaultLensProvider.addLensCreateFunction(() => {
    return new MuriLens();
});
defaultLensProvider.addLensCreateFunction((analyzer) => {
    return new ValueAddWasteTimeLens(analyzer.motionStudy);
});
defaultLensProvider.addLensCreateFunction(() => {
    return new AccelerationLens();
});
defaultLensProvider.addLensCreateFunction(() => {
    return new PoseObjectIdLens();
});

export {defaultLensProvider};
