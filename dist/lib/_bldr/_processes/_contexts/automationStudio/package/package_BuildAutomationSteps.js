"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAutomationSteps = void 0;
const automationActivities_1 = require("../../../../../_utils/bldrFileSystem/_context/automationStudio/automationActivities");
const buildAutomationSteps = (asset, contextAssets) => {
    const stepOutput = [];
    const formattedSteps = asset.steps &&
        asset.steps.length &&
        asset.steps.map((step, stepIndex) => {
            return {
                name: step.name,
                stepNumber: stepIndex,
                activities: step.activities,
            };
        });
    formattedSteps &&
        formattedSteps.length &&
        formattedSteps.forEach((step) => {
            const activities = step.activities;
            const formattedActivities = activities &&
                activities.length &&
                activities.map((activity) => {
                    const activityDetails = (0, automationActivities_1.MappingByActivityTypeId)(activity.objectTypeId);
                    if (activity.objectTypeId === 467) {
                        return {
                            name: activity.name,
                            activityObjectId: activity.activityObjectId,
                            objectTypeId: activity.objectTypeId,
                            displayOrder: activity.displayOrder,
                        };
                    }
                    else {
                        const activityDependency = contextAssets.find((asset) => {
                            return ((activityDetails &&
                                asset[activityDetails.objectIdKey] === activity['activityObjectId']) ||
                                null);
                        });
                        activity.activityObjectId =
                            activityDependency && activityDependency.bldrId && `{{${activityDependency.bldrId}}}`;
                        return {
                            name: activity.name,
                            activityObjectId: activity.activityObjectId,
                            objectTypeId: activity.objectTypeId,
                            displayOrder: activity.displayOrder,
                        };
                    }
                });
            stepOutput.push(Object.assign(Object.assign({}, step), { activities: formattedActivities }));
        });
    return stepOutput;
};
exports.buildAutomationSteps = buildAutomationSteps;
