import { getRootPath, fileExists } from '../../../_utils/fileSystem';
import {
    readManifest,
    readBldrSfmcEnv,
    readPackageManifest,
    readBldrSfmcEnvTemplate,
    replaceBldrSfmcEnv,
    scrubBldrSfmcEnv,
} from '../../../_utils/bldrFileSystem/';

import { package_new } from '../../../_utils/options/package_new';
// const packageReference = require('../packageReference');
// const coreConfigurationOptions = require('../options');
import { setContentBuilderPackageAssets } from '../../_processes/_contexts/contentBuilder/package';
import yargsInteractive from 'yargs-interactive';
import { createFile } from '../../../_utils/fileSystem';
import { create } from 'lodash';
import { initiateBldrSDK } from '../../../_bldr_sdk';
import { createEditableFilesBasedOnContext } from '../../../_utils/bldrFileSystem/_context/CreateFilesBasedOnContext';
import { displayLine } from '../../../_utils/display';
import { assignObject, uniqueArrayByKey } from '../../_utils';

import { State } from '../state';
import { incrementMetric } from '../../../_utils/metrics';
import { buildAutomationSteps } from '../_contexts/automationStudio/package/package_BuildAutomationSteps';
import { setAutomationActivityDependencies } from '../_contexts/automationStudio/package/setActivityDependencies';
const { allowTracking } = new State();

/**
 */
export class Package {
    constructor() {}

    packageConfig = async () => {
        try {
            const dirPath = await getRootPath();
            if (!fileExists(`${dirPath}.local.manifest.json`)) {
                throw new Error('Please run [ bldr init ] or clone SFMC assets before running [ bldr package ]');
            }

            let manifestJSON = await readManifest();
            const existingPkg = await readPackageManifest();
            await yargsInteractive()
                .usage('$0 <command> [args]')
                .interactive(await package_new(existingPkg))
                .then(
                    async (initResults: {
                        name?: string;
                        packageVersion?: string;
                        repository?: string;
                        description?: string;
                        tags?: string;
                    }) => {
                        try {
                            const sdk = await initiateBldrSDK();
                            let packageOut: {
                                name?: string;
                                version?: string;
                                repository?: string;
                                description?: string;
                                tags?: string[];
                                sfmcEnv?: any;
                                contentBuilder?: any;
                                dataExtension?: any;
                                automationStudio?: any;
                            } = {};

                            packageOut.name = initResults.name;
                            packageOut.version = initResults.packageVersion;
                            packageOut.repository = initResults.repository;
                            packageOut.description = initResults.description;

                            const tagsSplit = (initResults.tags && initResults.tags.split(',')) || [];
                            const tagsArray = tagsSplit?.map((tag) => tag.trim()) || [];
                            packageOut.tags = tagsArray;

                            const sfmcEnv = (await readBldrSfmcEnvTemplate()) || null;

                            if (sfmcEnv) {
                                packageOut['sfmcEnv'] = sfmcEnv;
                            }

                            const availableContexts = Object.keys(manifestJSON);
                            availableContexts.shift();

                            for (const c in availableContexts) {
                                const context = availableContexts[c];
                                manifestJSON = await readManifest();
                                let contextAssets = manifestJSON[context]['assets'];
                                contextAssets = await replaceBldrSfmcEnv(JSON.stringify(contextAssets));
                                contextAssets = JSON.parse(contextAssets);

                                let automationStudioPKGAssets: { [key: string]: any[] };
                                switch (context) {
                                    case 'contentBuilder':
                                        displayLine(
                                            `Gathering Dependencies for ${contextAssets.length} Assets`,
                                            'info'
                                        );
                                        await sdk.cli.contentBuilder.setContentBuilderPackageAssets(
                                            packageOut,
                                            contextAssets
                                        );

                                        const gatherDependencies =
                                            await sdk.cli.contentBuilder.setContentBuilderDependenciesFromPackage(
                                                packageOut
                                            );
                                        const newDependencies =
                                            (gatherDependencies &&
                                                gatherDependencies.newDependencies &&
                                                Object.keys(gatherDependencies.newDependencies)) ||
                                            [];

                                        const newContextKeys = (newDependencies && Object.keys(newDependencies)) || [];

                                        newContextKeys &&
                                            newContextKeys.length &&
                                            displayLine(`Creating files for ${newContextKeys.join(', ')}`, 'info');

                                        for (const k in newContextKeys) {
                                            displayLine(`Working on ${newContextKeys[k]}`, 'progress');
                                            let newAssets = newDependencies[newContextKeys[k]]['assets'];
                                            await createEditableFilesBasedOnContext(newContextKeys[k], newAssets);
                                        }

                                        break;

                                    case 'dataExtension':
                                        const dataExtensionPkgAssets =
                                            existingPkg && existingPkg[context] && existingPkg[context]['assets']
                                                ? await uniqueArrayByKey(
                                                      [...existingPkg.dataExtension.assets, ...contextAssets],
                                                      'name'
                                                  )
                                                : contextAssets;

                                        dataExtensionPkgAssets &&
                                            dataExtensionPkgAssets.forEach(
                                                (de: {
                                                    customerKey?: string;
                                                    categoryId?: number;
                                                    category?: {
                                                        id?: number;
                                                    };
                                                    assetType?: {
                                                        name: string;
                                                    };
                                                }) => {
                                                    de.assetType = {
                                                        name: 'dataextension',
                                                    };

                                                    delete de.categoryId;
                                                    delete de.category?.id;
                                                    delete de.customerKey;
                                                }
                                            );

                                        packageOut.dataExtension = {
                                            assets: dataExtensionPkgAssets,
                                        };
                                        break;
                                    case 'automationStudio':
                                        console.log('AS START');

                                        contextAssets &&
                                            contextAssets.forEach(async (asset: any) => {
                                                if (
                                                    !packageOut['automationStudio'] ||
                                                    !packageOut['automationStudio']['assets']
                                                ) {
                                                    packageOut['automationStudio'] = {
                                                        assets: [],
                                                    };
                                                }

                                                let assetObject;
                                                if (asset.assetType.name === 'automation') {
                                                    assetObject = {
                                                        name: asset.name,
                                                        description: asset.description,
                                                        key: asset.name,
                                                        categoryId: null,
                                                        typeId: 1,
                                                        type: 'scheduled',
                                                        statusId: 2,
                                                        status: 'Ready',
                                                        steps: buildAutomationSteps(asset, contextAssets),
                                                    };

                                                } else {
                                                    assetObject = await setAutomationActivityDependencies(asset, manifestJSON)
                                                }

                                                console.log({assetObject})
                                                packageOut['automationStudio']['assets'].push(assetObject);
                                            });

                                        // console.log('automationAssets', automationAssets);
                                        // console.log('activityAssets', activityAssets);

                                        break;
                                }
                            }

                            packageOut?.contentBuilder?.assets.forEach((asset: { id?: number; exists?: Boolean }) => {
                                delete asset.id;
                                delete asset.exists;
                            });

                            packageOut?.dataExtension?.assets.forEach(
                                (asset: {
                                    category: {
                                        categoryId?: number;
                                    };
                                }) => {
                                    delete asset.category.categoryId;
                                }
                            );

                            let packageOutRendered = await scrubBldrSfmcEnv(JSON.stringify(packageOut));
                            packageOutRendered = JSON.parse(packageOutRendered);

                            await createFile('./package.manifest.json', JSON.stringify(packageOutRendered, null, 2));
                            allowTracking() && incrementMetric('req_command_package');
                        } catch (err) {
                            console.log(err);
                        }
                    }
                );
        } catch (err) {
            console.log(err);
        }
    };
}
