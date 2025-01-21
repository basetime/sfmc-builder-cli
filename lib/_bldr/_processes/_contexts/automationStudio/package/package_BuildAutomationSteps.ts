import {
    MappingByActivityType,
    MappingByActivityTypeId,
} from '../../../../../_utils/bldrFileSystem/_context/automationStudio/automationActivities';

export const buildAutomationSteps = (
    asset: {
        steps: {
            id: string;
            name: string;
            step: number;
            activities: [
                {
                    id: string;
                    name: string;
                    activityObjectId: string;
                    objectTypeId: number;
                    displayOrder: number;
                    [key: string]: any;
                }
            ];
        }[];
    },
    contextAssets: { [key: string]: any }[]
) => {
    const stepOutput: {
        name: string;
        stepNumber: number;
        activities: {
            name: string;
            activityObjectId: string;
            objectTypeId: number;
            displayOrder: number;
        }[];
    }[] = [];

    const formattedSteps =
        asset.steps &&
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

            const formattedActivities =
                activities &&
                activities.length &&
                activities.map((activity) => {
                    const activityDetails = MappingByActivityTypeId(activity.objectTypeId);

                    if (activity.objectTypeId === 467) {
                        return {
                            name: activity.name,
                            activityObjectId: activity.activityObjectId,
                            objectTypeId: activity.objectTypeId,
                            displayOrder: activity.displayOrder,
                        };
                    } else {
                        const activityDependency = contextAssets.find((asset) => {
                            return (
                                (activityDetails &&
                                    asset[activityDetails.objectIdKey] === activity['activityObjectId']) ||
                                null
                            );
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

            stepOutput.push({
                ...step,
                activities: formattedActivities,
            });
        });

    return stepOutput;
};
