"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAutomationActivityDependencies = void 0;
const ParseSQLDataExtensions_1 = __importDefault(require("@basetime/bldr-sfmc-sdk/dist/cli/utils/_context/automationStudio/ParseSQLDataExtensions"));
const _utils_1 = require("../../../../_utils");
const setAutomationActivityDependencies = (asset, manifestJSON) => __awaiter(void 0, void 0, void 0, function* () {
    const assetType = asset.assetType;
    const activityType = assetType.name;
    let dependencies = [];
    let parsedSQLDataExtensionDependencies;
    let sqlDataExtensionDependencies = [];
    let dependencyObject = {};
    let assetDependencyKey = '';
    if (activityType === 'queryactivity') {
        assetDependencyKey = 'targetId';
    }
    else if (activityType === 'importactivity') {
        assetDependencyKey = 'destinationObjectId';
    }
    else if (activityType === 'filteractivity') {
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
                    manifestJSON.dataExtension.assets.find((dependencyAsset) => {
                        return dependencyAsset.objectId === asset[assetDependencyKey];
                    }).bldrId;
            switch (activityType) {
                case 'queryactivity':
                    delete asset.validatedQueryText;
                    asset.targetId = `{{${dependencyObject.bldrId}}}`;
                    yield parsedSQLDependencies(dependencies, asset, manifestJSON);
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
            ['resultDEKey', 'sourceObjectId'].forEach((key) => {
                dependencyObject = {};
                dependencyObject.context = 'dataExtension';
                dependencyObject.reference = key;
                dependencyObject.bldrId =
                    manifestJSON &&
                        manifestJSON.dataExtension &&
                        manifestJSON.dataExtension.assets &&
                        manifestJSON.dataExtension.assets.find((dependencyAsset) => {
                            const dependencyKey = key === 'sourceObjectId' ? 'objectId' : 'customerKey';
                            return dependencyAsset[dependencyKey] === asset[key];
                        }).bldrId;
                dependencies.push(dependencyObject);
                if (key === 'sourceObjectId') {
                    const filterBldrId = (0, _utils_1.guid)();
                    asset.filterDefinitionId = `{{${filterBldrId}}}`;
                    asset.filterDefinition.bldrId = `${filterBldrId}`;
                    asset.filterDefinition.derivedFromObjectId = `{{${dependencyObject.bldrId}}}`;
                    asset.filterDefinition.filterDefinitionXml = asset.filterDefinition.filterDefinitionXml.replace(asset.sourceObjectId, `{{${dependencyObject.bldrId}}}`);
                }
                else if (key === 'resultDEKey') {
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
});
exports.setAutomationActivityDependencies = setAutomationActivityDependencies;
const parsedSQLDependencies = (dependencies, asset, manifestJSON) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedSQLDataExtensionDependencies = yield (0, ParseSQLDataExtensions_1.default)(asset.queryText);
    if (parsedSQLDataExtensionDependencies && parsedSQLDataExtensionDependencies.length) {
        for (const p in parsedSQLDataExtensionDependencies) {
            const bldrId = manifestJSON &&
                manifestJSON.dataExtension &&
                manifestJSON.dataExtension.assets &&
                manifestJSON.dataExtension.assets.find((dependencyAsset) => {
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
});
