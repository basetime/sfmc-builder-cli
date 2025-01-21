import { readBldrSfmcEnv, readPackageManifest, replaceBldrSfmcEnv } from '../../../_utils/bldrFileSystem';
import { fileExists, getRootPath } from '../../../_utils/fileSystem';
import { createEditableFilesBasedOnContext } from '../../../_utils/bldrFileSystem/_context/CreateFilesBasedOnContext';
import { updateManifest } from '../../../_utils/bldrFileSystem/manifestJSON';
import { readManifest } from '../../../_utils/bldrFileSystem';
import { addNewFolders } from '../../_utils/CreateSFMCFolders';
import { initiateBldrSDK } from '../../../_bldr_sdk';
import { Add } from '../add';
import { Push } from '../push';
import { BLDR_Client } from '@basetime/bldr-sfmc-sdk/lib/cli/types/bldr_client';
import { displayLine } from '../../../_utils/display';
import { ManifestFolder } from '../../../_types/ManifestAsset';
import { setContentBuilderDefinition } from '../_contexts/contentBuilder/definitions';
import { getFilePathDetails, uniqueArrayByKey } from '../../_utils';
import { State } from '../state';
import { Argv } from '../../../_types/Argv';
const { isVerbose, allowTracking } = new State();
import { packageDeployIgnore } from '../../_utils/packageDeployIgnore';
import fs from 'fs';
import { incrementMetric } from '../../../_utils/metrics';

const add = new Add();
const push = new Push();

const sfmcContext: {
    sfmc_context_mapping: { name: string; context: string }[];
} = require('@basetime/bldr-sfmc-sdk/dist/sfmc/utils/sfmcContextMapping');

const find = require('lodash.find');

/**
 * Notes June 2
 * Left off replacing matchedValue references with the new bldr IDs
 * Need to work on ContentBlockByName
 * Plan out deploy flow
 */
export class Deploy {
    constructor() {}
    /**
     *
     * @param argv
     * @returns
     */
    deployPackage = async (argv: Argv) => {
        try {
            allowTracking() && incrementMetric('req_command_deploy');
            const packageJSON = await readPackageManifest();
            const availableContexts: string[] = sfmcContext.sfmc_context_mapping.map((ctx) => ctx.context);
            const packageContexts = Object.keys(packageJSON).map((key) => {
                return availableContexts.includes(key) && typeof key === 'string' && key;
            });

            let sfmcOnly = false;
            if (argv['sfmc-only']) {
                sfmcOnly = true;
            }

            let localOnly = false;
            if (argv['local-only']) {
                localOnly = true;
            }

            if (await this.deployCheckConfig()) {
                return;
            }

            const sdk = !localOnly && (await initiateBldrSDK());
            for (const c in packageContexts) {
                const context = packageContexts[c];

                if (context && packageJSON[context]) {
                    await updateManifest(context, { assets: [], folders: [] });

                    const pkgAssets = packageJSON[context]['assets'];
                    let pkgFolderPaths = pkgAssets
                        .map(
                            (asset: {
                                assetType: {
                                    name: string;
                                };
                                category: {
                                    folderPath: string;
                                };
                            }) =>
                                asset.assetType &&
                                asset.assetType.name &&
                                !packageDeployIgnore.includes(asset.assetType.name) &&
                                asset.category.folderPath
                        )
                        .filter(Boolean);

                    pkgFolderPaths = [...new Set(pkgFolderPaths)];

                    !sfmcOnly && displayLine(`Creating ${context} Local Files`, 'progress');
                    !sfmcOnly && (await createEditableFilesBasedOnContext(context, pkgAssets));

                    displayLine(`Creating ${context} folders in sfmc`, 'progress');
                    for (const fp in pkgFolderPaths) {
                        const ctxDetails = sfmcContext.sfmc_context_mapping.find((ctx) => ctx.context === context) as {
                            name: string;
                            contentType: string;
                            context: string;
                        };

                        const folder = ctxDetails && {
                            path: pkgFolderPaths[fp],
                            context: ctxDetails,
                        };

                        !localOnly && (await addNewFolders(sdk, folder));
                    }
                }
            }

            const package_dataExtension =
                packageContexts.includes('dataExtension') && packageJSON['dataExtension']['assets'];
            const package_contentBuilder =
                packageContexts.includes('contentBuilder') && packageJSON['contentBuilder']['assets'];
            const package_automationStudio =
                packageContexts.includes('automationStudio') && packageJSON['automationStudio']['assets'];

            const package_dataExtensionValid =
                sdk &&
                package_dataExtension &&
                (await this.deploymentValid(sdk, 'dataExtension', package_dataExtension));

            console.log({ package_dataExtensionValid });

            !localOnly &&
                sdk &&
                package_dataExtension &&
                package_dataExtensionValid &&
                (await this.deployDataExtension(sdk, package_dataExtension));
            !localOnly &&
                sdk &&
                package_contentBuilder &&
                (await this.deployContentBuilderAssets(sdk, package_contentBuilder));

            sfmcOnly && fs.unlinkSync('./.local.manifest.json');
        } catch (err) {
            console.log(err);
        }
    };

    deployCheckConfig = async () => {
        let preventDeployment = false;

        const dirPath = await getRootPath();
        if (fileExists(`${dirPath}/.sfmc.env.json`)) {
            const config = await readBldrSfmcEnv();
            for (const c in config) {
                const key = c;
                const value = config[c];

                if (value === '') {
                    console.log(`Please configure ${key} in .sfmc.env.json`);
                    preventDeployment = true;
                }
            }
        }

        return preventDeployment;
    };
    /**
     *
     * @param sdk
     * @param contentBuilderAssets
     */
    deployContentBuilderAssets = async (sdk: BLDR_Client, contentBuilderAssets: any[]) => {
        try {
            //Find 0 Dependency assets
            const noDependencyAssets = contentBuilderAssets
                .map((asset) => {
                    if ((asset.dependencies && asset.dependencies.length === 0) || !asset.dependencies) {
                        return asset;
                    }
                })
                .filter(Boolean);

            const dependencyAssets = contentBuilderAssets
                .map((asset) => {
                    if (asset.dependencies && asset.dependencies.length > 0) {
                        return asset;
                    }
                })
                .filter(Boolean);

            for (const nd in noDependencyAssets) {
                const asset = noDependencyAssets[nd];
                await this.deployContentBuilderAssetNoDependencies(sdk, asset);
            }

            for (const d in dependencyAssets) {
                const depAsset = dependencyAssets[d];
                await this.deployContentBuilderAssetWithDependencies(sdk, depAsset);
            }
        } catch (err) {
            console.log('ERR', err);
        }
    };
    /**
     *
     * @param sdk
     * @param contentBuilderAsset
     */
    deployContentBuilderAssetNoDependencies = async (sdk: BLDR_Client, contentBuilderAsset: any) => {
        const manifestJSON = await readManifest();
        const manifestJSONFolders = manifestJSON['contentBuilder']['folders'];
        const contentFolderPath = contentBuilderAsset.category.folderPath;
        const category = manifestJSONFolders.find((folder: ManifestFolder) => folder.folderPath === contentFolderPath);

        //Update asset content with configurations before posting
        let content = contentBuilderAsset.content;
        let buildContent = await replaceBldrSfmcEnv(content);

        contentBuilderAsset.category = category;
        contentBuilderAsset.bldr = {
            bldrId: contentBuilderAsset.bldrId,
        };

        contentBuilderAsset = await setContentBuilderDefinition(contentBuilderAsset, buildContent);

        if (category) {
            contentBuilderAsset.category = {
                id: category.id,
            };
        }

        const createAsset =
            (!packageDeployIgnore.includes(contentBuilderAsset.assetType.name) &&
                (await sdk.sfmc.asset.postAsset(contentBuilderAsset))) ||
            displayLine(
                `${contentBuilderAsset.assetType.name} asset type requires the user to create the asset manually. Create the asset, then run the [ bldr clone ] command to get the asset.`
            );

        if (packageDeployIgnore.includes(contentBuilderAsset.assetType.name)) {
        } else if (createAsset.status === 'ERROR') {
            console.log(createAsset);
        } else {
            displayLine(`created [sfmc]: ${contentBuilderAsset.name}`, 'success');
            contentBuilderAsset.id = createAsset.id;
            contentBuilderAsset.assetType = createAsset.assetType;
            contentBuilderAsset.category = createAsset.category;
            contentBuilderAsset.customerKey = createAsset.customerKey;
            contentBuilderAsset.category.folderPath = contentFolderPath;

            // Update ManifestJSON file with responses
            await updateManifest('contentBuilder', { assets: [contentBuilderAsset] });
        }
    };
    /**
     *
     * @param sdk
     * @param contentBuilderAssets
     */
    deployContentBuilderAssetWithDependencies = async (sdk: BLDR_Client, contentBuilderAsset: any) => {
        //Get assets dependencies
        const assetDependencies = contentBuilderAsset.dependencies;
        const contentFolderPath = contentBuilderAsset.category.folderPath;
        const updatedAsset = await this.updateContentBuilderReferences(contentBuilderAsset, assetDependencies);

        const createAsset =
            (!packageDeployIgnore.includes(contentBuilderAsset.assetType.name) &&
                (await sdk.sfmc.asset.postAsset(updatedAsset))) ||
            displayLine(
                `${contentBuilderAsset.assetType.name} asset type requires the user to create the asset manually. Create the asset, then run the [ bldr clone ] command to get the asset.`
            );

        if (packageDeployIgnore.includes(contentBuilderAsset.assetType.name)) {
            await updateManifest('contentBuilder', { assets: [updatedAsset] });
            await createEditableFilesBasedOnContext('contentBuilder', [updatedAsset]);
        } else if (createAsset.status === 'ERROR') {
            console.log(createAsset.statusText);
        } else {
            displayLine(`created [sfmc]: ${contentBuilderAsset.name}`, 'success');
            updatedAsset.id = createAsset.id;
            updatedAsset.assetType = createAsset.assetType;
            updatedAsset.category = createAsset.category;
            updatedAsset.customerKey = createAsset.customerKey;
            updatedAsset.category.folderPath = contentFolderPath;

            // Update ManifestJSON file with responses
            await updateManifest('contentBuilder', { assets: [updatedAsset] });

            await createEditableFilesBasedOnContext('contentBuilder', [updatedAsset]);
        }
    };
    /**
     *
     * @param contentBuilderAsset
     * @param assetDependencies
     * @returns
     */
    updateContentBuilderReferences = async (
        contentBuilderAsset: any,
        assetDependencies: {
            bldrId: string;
            context: string;
            reference: string;
        }[]
    ) => {
        let createdId;

        let content = contentBuilderAsset.content;
        content = await replaceBldrSfmcEnv(content);

        const manifestJSON: {
            [key: string]: any;
        } = await readManifest();

        const manifestJSONFolders = manifestJSON['contentBuilder']['folders'];
        const contentFolderPath = contentBuilderAsset.category.folderPath;
        const category = manifestJSONFolders.find((folder: ManifestFolder) => folder.folderPath === contentFolderPath);

        contentBuilderAsset.category = category;
        contentBuilderAsset.bldr = {
            bldrId: contentBuilderAsset.bldrId,
        };

        for (const a in assetDependencies) {
            const assetDependency = assetDependencies[a];
            const assetContext = assetDependency.context;
            const manifestContextAssets = manifestJSON[assetContext]['assets'];

            const findObj = await find(manifestContextAssets, (o: { bldrId: string }) => {
                return o.bldrId === assetDependency.bldrId;
            });

            if (findObj) {
                switch (assetDependency.reference) {
                    case 'Lookup':
                    case 'LookupRows':
                    case 'ClaimRow':
                    case 'DataExtensionRowCount':
                    case 'DeleteData':
                    case 'DeleteDE':
                    case 'InsertDE':
                    case 'UpdateData':
                    case 'UpdateDE':
                    case 'UpsertData':
                    case 'UpsertDE':
                    case 'LookupOrderedRows':
                    case 'LookupOrderedRowsCS':
                    case 'LookupRowsCS':
                        createdId = findObj.name;
                        break;
                    case 'ContentBlockById':
                    case 'ContentBlockByID':
                        createdId = findObj.id;
                        break;
                    case 'ContentBlockByName':
                        if (
                            content.match(
                                new RegExp(
                                    `(?<=Platform.Function.ContentBlockByName\\(')${assetDependency.bldrId}`,
                                    'g'
                                )
                            ) ||
                            content.match(
                                new RegExp(
                                    `(?<=Platform.Function.ContentBlockByName\\(")${assetDependency.bldrId}`,
                                    'g'
                                )
                            )
                        ) {
                            createdId = `${findObj.category.folderPath}/${findObj.name}`.replaceAll('/', '\\\\');
                        } else {
                            createdId = `${findObj.category.folderPath}/${findObj.name}`.replaceAll('/', '\\');
                        }
                        break;
                }

                content = content.replaceAll(assetDependency.bldrId, createdId);
            }
        }

        return setContentBuilderDefinition(contentBuilderAsset, content);
    };
    /**
     *
     * @param sdk
     * @param dataExtensions
     * @returns
     */
    deployDataExtension = async (sdk: BLDR_Client, dataExtensions: any[]) => {
        try {
            const output: any[] = [];

            for (const d in dataExtensions) {
                let dataExtension = dataExtensions[d];
                const dataExtensionFields = dataExtension.fields;

                const manifestJSON = await readManifest();
                const manifestJSONFolder = manifestJSON['dataExtension']['folders'].find(
                    (folder: ManifestFolder) => folder.folderPath === dataExtension.category.folderPath && folder
                );

                if (manifestJSONFolder) {
                    dataExtension.categoryId = manifestJSONFolder.id;
                } else {
                    delete dataExtension.category;
                }

                const createDataExtension = await sdk.sfmc.emailStudio.postAsset(dataExtension);

                if (createDataExtension.OverallStatus === 'OK') {
                    dataExtension.fields = dataExtensionFields;
                    await updateManifest('dataExtension', {
                        assets: [dataExtension],
                    });
                    displayLine(`Created [sfmc]: ${dataExtension.name}`, 'success');
                    output.push(dataExtension);
                } else {
                    displayLine(`Error Creating: ${dataExtension.name}`);
                    console.log(JSON.stringify(createDataExtension, null, 2));
                }
            }

            return output;
        } catch (err: any) {
            const statusMessage =
                err && err.JSON && err.JSON.Results && err.JSON.Results.length && err.JSON.Results[0].StatusMessage;
            displayLine(statusMessage, 'error');
            statusMessage &&
                statusMessage.includes('Updating an existing Data Extension definition') &&
                displayLine('Please ensure all Data Extension names/customer keys are unique', 'error');
        }
    };

    deploymentValid = async (sdk: BLDR_Client, context: string, assets: any[]) => {
        let contextValidity: any[] = [];

        displayLine(`Checking ${context} validation`, 'info');

        for (const a in assets) {
            const asset = assets[a];
            switch (context) {
                case 'dataExtension':
                    const check = await sdk.sfmc.emailStudio.searchDataExtensionByName({
                        searchKey: 'Name',
                        searchTerm: asset.name,
                    });
                    if (check && check.Results && check.Results.length) {
                        contextValidity.push({
                            status: 'error',
                            msg: `${asset.name} already exists.`,
                        });
                    } else {
                        contextValidity.push({
                            status: 'success',
                            msg: `${asset.name} is does not currently exist.`,
                        });
                    }

                    break;
            }
        }

        const valid = contextValidity.find((asset: { status: 'error' | 'success' }) => asset.status === 'error')
            ? false
            : true;
        contextValidity &&
            contextValidity.length &&
            contextValidity.forEach((asset: { status: 'error' | 'success'; msg: string }) =>
                displayLine(asset.msg, asset.status)
            );
        contextValidity &&
            contextValidity.length &&
            !valid &&
            displayLine('Address any conflicts and run [ bldr deploy ] again.', 'progress');
        contextValidity && contextValidity.length && valid && displayLine('No conflicts to address.', 'success');
        return valid;
    };
}
