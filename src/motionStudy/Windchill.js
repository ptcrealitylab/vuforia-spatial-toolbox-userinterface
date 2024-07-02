import {windchillBaseUrl, windchillUsername, windchillPassword} from './config.js';
import {MPMAPI} from './MPMAPI.js';

const WRITE_DELAY = 10000;

/**
 * High-level operations implemented on top of MPMAPI
 */
export class Windchill {
    /**
     * @param {string} baseUrl - Base url of windchill instance
     * @param {string} username
     * @param {string} password
     */
    constructor(baseUrl = windchillBaseUrl, username = windchillUsername, password = windchillPassword) {
        this.api = new MPMAPI(baseUrl, username, password);
        this.writing = false;
        this.writeTimeout = null;
        this.operationByLabel = {};
    }

    /**
     * @return {Array<ProcessPlan>}
     */
    async getProcessPlans(nameFilter) {
        const data = await this.api.getProcessPlans(`Name eq '${nameFilter}'`);
        const plans = data.value;
        return plans.map(plan => {
            return {
                id: plan.ID,
                name: plan.Name,
                checkOutState: plan.CheckoutState,
            };
        });
    }

    async getOperations(processPlanId) {
        const data = await this.api.getOperations(processPlanId);
        let components = data.Components;
        const steps = [];
        for (const component of components) {
            let id = component.OperationHolder.ID;
            let laborTimeSeconds = component.OperationHolder.LaborTime.Value || 0;
            let processingTimeSeconds = component.OperationHolder.ProcessingTime.Value || 0;
            let description = component.OperationHolder.Description;
            let name = component.OperationHolder.Name;

            steps.push({
                id,
                laborTimeSeconds,
                processingTimeSeconds,
                name,
                description,
            });
        }
        steps.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
        return steps;
    }

    getOperationLabel(operation) {
        let label = operation.name.split('_').at(-1);
        if (operation.description) {
            label += ' ' + operation.description;
        }
        this.operationByLabel[label] = operation;
        return label;
    }

    getOperationByLabel(label) {
        return this.operationByLabel[label];
    }

    async writeProcessPlanData(plan, regionCards) {
        if (this.writeTimeout) {
            clearTimeout(this.writeTimeout);
        }
        this.writeTimeout = setTimeout(async () => {
            if (this.writing) {
                return;
            }
            try {
                this.writing = true;
                // Get a checked out operation inside of a checked out process
                // plan. Makes sure to pass checked-out ids if they ever change
                let coPlan = await this.api.checkOutProcessPlan(plan.id);
                let coPlanOps = await this.getOperations(coPlan.id);
                for (let coPlanOp of coPlanOps) {
                    const regionCard = regionCards.find(card => {
                        return (card.step && (card.step.id === coPlanOp.id));
                    });
                    if (!regionCard) {
                        continue;
                    }

                    let coPlanCoOp = await this.api.checkOutOperation(coPlanOp.id);
                    // Forces regionCard to calculate summary statistics
                    regionCard.getMotionSummaryText();
                    regionCard.updateLensStatistics();
                    const vaSummary = regionCard.getValueAddWasteTimeSummary();
                    let valueAdd = null;
                    let waste = null;
                    if (vaSummary) {
                        // Round to tenths of a second
                        valueAdd = Math.round(vaSummary.valueTimeMs / 100) / 10;
                        waste = Math.round(vaSummary.wasteTimeMs / 100) / 10;
                    }

                    // Build a deep link on top of the existing window
                    // location. Expected to include toolId pointing to the
                    // motionStudy and a fragment identifier for the card
                    let url = new URL(window.location);
                    let params = new URLSearchParams(url.search);
                    params.set('toolId', regionCard.motionStudy.frame);
                    url.search = params.toString();
                    url.hash = regionCard.step.id;

                    function toUnitValue(value, unit) {
                        return {
                            Value: value,
                            Unit: unit,
                            Precision: 2,
                        };
                    }

                    await this.api.patchVariables(coPlanCoOp.id, {
                        URL: url.toString(),
                        DistanceTravelled: toUnitValue(regionCard.distanceMm / 1000, 'm'),
                        Duration: toUnitValue(regionCard.durationMs / 1000, 's'),
                        ValueAddTime: toUnitValue(valueAdd, 's'),
                        WasteTime: toUnitValue(waste, 's'),
                        MURIAverage1: regionCard.graphSummaryValues?.MURI?.average,
                        MURIMax1: regionCard.graphSummaryValues?.MURI?.maximum,
                        MURIMin: regionCard.graphSummaryValues?.MURI?.minimum,
                        AccelerationAverage: regionCard.graphSummaryValues?.Accel?.average,
                        Accelerationmax: regionCard.graphSummaryValues?.Accel?.maximum,
                        Accelerationmin: regionCard.graphSummaryValues?.Accel?.minimum,
                        REBA: regionCard.graphSummaryValues?.REBA?.average,
                        REBAMIN: regionCard.graphSummaryValues?.REBA?.minimum,
                        REBAMax: regionCard.graphSummaryValues?.REBA?.maximum,
                    });
                    await this.api.checkInOperation(coPlanCoOp.id);
                }
                await this.api.checkInProcessPlan(coPlan.id);
            } catch (e) {
                console.error('Unrecoverable error persisting to MPMLink', e);
            } finally {
                this.writing = false;
            }
        }, WRITE_DELAY);
    }
}
