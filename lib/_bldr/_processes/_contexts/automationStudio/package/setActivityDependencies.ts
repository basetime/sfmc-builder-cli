import { MappingByActivityType } from '../../../../../_utils/bldrFileSystem/_context/automationStudio/automationActivities';
import parseSQLDataExtensions from '@basetime/bldr-sfmc-sdk/dist/cli/utils/_context/automationStudio/ParseSQLDataExtensions';
import { guid } from '../../../../_utils';

export const setAutomationActivityDependencies = async (asset: any, manifestJSON: any) => {
    const assetType = asset.assetType;
    const activityType = assetType.name;
    let dependencies: any[] = [];
    let parsedSQLDataExtensionDependencies;
    let sqlDataExtensionDependencies = [];
    let dependencyObject: {
        bldrId?: string;
        context?: string;
        reference?: string;
    } = {};

    let assetDependencyKey: string = '';
    if (activityType === 'queryactivity') {
        assetDependencyKey = 'targetId';
    } else if (activityType === 'importactivity') {
        assetDependencyKey = 'destinationObjectId';
    } else if (activityType === 'filteractivity') {
        assetDependencyKey = 'sourceObjectId';
    }

    switch (activityType) {
        case 'queryactivity':
        case 'importactivity':
            dependencyObject.context = 'dataExtension';
            dependencyObject.reference = assetDependencyKey;
            dependencyObject.bldrId =
                manifestJSON &&
                manifestJSON.dataExtension &&
                manifestJSON.dataExtension.assets &&
                manifestJSON.dataExtension.assets.find((dependencyAsset: { objectId: string; bldrId: string }) => {
                    return dependencyAsset.objectId === asset[assetDependencyKey];
                }).bldrId;

            switch (activityType) {
                case 'queryactivity':
                    delete asset.validatedQueryText;
                    asset.targetId = `{{${dependencyObject.bldrId}}}`;
                    await parsedSQLDependencies(dependencies, asset, manifestJSON);

                    break;
                case 'importactivity':
                    asset.destinationObjectId = `{{${dependencyObject.bldrId}}}`;
                    asset.fileTransferLocationId = `{{fileTransferLocationId}}`;
                    asset.fileTransferLocationName = 'ExactTarget Enhanced FTP';
                    break;
            }

            dependencyObject && dependencies.push(dependencyObject);
            break;
        case 'transferactivity':
            break;
        case 'filteractivity':
            ['resultDEKey', 'sourceObjectId'].forEach((key: string) => {
                dependencyObject = {};
                dependencyObject.context = 'dataExtension';
                dependencyObject.reference = key;
                dependencyObject.bldrId =
                    manifestJSON &&
                    manifestJSON.dataExtension &&
                    manifestJSON.dataExtension.assets &&
                    manifestJSON.dataExtension.assets.find(
                        (dependencyAsset: { objectId?: string; customerKey?: string; bldrId: string }) => {
                            const dependencyKey = key === 'sourceObjectId' ? 'objectId' : 'customerKey';
                            return dependencyAsset[dependencyKey] === asset[key];
                        }
                    ).bldrId;

                dependencies.push(dependencyObject);

                if (key === 'sourceObjectId') {
                    const filterBldrId = guid();
                    asset.filterDefinitionId = `{{${filterBldrId}}}`;
                    asset.filterDefinition.bldrId = `${filterBldrId}`;
                    asset.filterDefinition.derivedFromObjectId = `{{${dependencyObject.bldrId}}}`;

                    asset.filterDefinition.filterDefinitionXml = asset.filterDefinition.filterDefinitionXml.replace(
                        asset.sourceObjectId,
                        `{{${dependencyObject.bldrId}}}`
                    );
                } else if (key === 'resultDEKey') {
                    asset.destinationObjectId = `{{${dependencyObject.bldrId}}}`;
                }

                asset[key] = `{{${dependencyObject.bldrId}}}`;
            });

            delete asset.filterDefinition.id;
            delete asset.filterDefinition.key;
            delete asset.filterDefinition.categoryId;
            delete asset.filterDefinition.createdBy;
            delete asset.filterDefinition.createdDate;
            delete asset.filterDefinition.createdByName;
            delete asset.filterDefinition.modifiedBy;
            delete asset.filterDefinition.modifiedDate;
            delete asset.filterDefinition.lastUpdatedBy;
            delete asset.filterDefinition.lastUpdated;
            delete asset.filterDefinition.lastUpdatedByName;
            break;
        case 'dataextractactivity':
            break;
        case 'userinitiatedsend':
            break;
        default:
    }

    delete asset.key;
    delete asset.categoryId;
    delete asset[assetType.objectIdKey];

    asset.customerKey && delete asset.customerKey;
    asset.createdDate && delete asset.createdDate;
    asset.modifiedDate && delete asset.modifiedDate;
    asset.createdBy && delete asset.createdBy;
    asset.modifiedBy && delete asset.modifiedBy;
    asset.dependencies = dependencies;

    return asset;
};

const parsedSQLDependencies = async (dependencies: any[], asset: any, manifestJSON: any) => {
    const parsedSQLDataExtensionDependencies = await parseSQLDataExtensions(asset.queryText);
    if (parsedSQLDataExtensionDependencies && parsedSQLDataExtensionDependencies.length) {
        for (const p in parsedSQLDataExtensionDependencies) {
            const bldrId =
                manifestJSON &&
                manifestJSON.dataExtension &&
                manifestJSON.dataExtension.assets &&
                manifestJSON.dataExtension.assets.find((dependencyAsset: { customerKey: string; bldrId: string }) => {
                    return dependencyAsset.customerKey === parsedSQLDataExtensionDependencies[p];
                }).bldrId;

            dependencies.push({
                context: 'dataExtension',
                reference: 'customerKey',
                bldrId,
            });

            asset.queryText = asset.queryText.replace(parsedSQLDataExtensionDependencies[p], `{{${bldrId}}}`);
        }
    }

    return dependencies;
};
