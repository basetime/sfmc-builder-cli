import { User_BLDR_Config } from '../../_bldr/_processes/_userProcesses/bldr_config';
import { readFile } from 'fs/promises';
import { assignObject } from '../../_bldr/_utils';
import { state_conf } from '../../_bldr_sdk/store';
import { createFile } from '../fileSystem';
import isEqual from 'lodash.isequal';
import fs from 'fs';
import path from 'path';
import { fileExists, getRootPath } from '../fileSystem';
import { displayLine } from '../display';
import { scrubBldrSfmcEnv } from '.';
import { normalizedManifestJSONPath } from '.';
const { updateFilesFromConfiguration } = new User_BLDR_Config();

enum ObjectIdKeys {
    ssjsActivityId,
}

//TODO try to make context enum type, was getting caught up on instanceDetails
const updateManifest = async (
    context: string,
    content: {
        assets?: object[];
        folders?: object[];
    }
) => {
    if (typeof content !== 'object') {
        throw new Error('Content needs to be an object');
    }

    if (!context) {
        throw new Error('Context is required');
    }

    // data extensions from the sdk are referenced as emailStudio
    // bldr labels them as dataExtensions
    if (context === 'emailStudio') {
        context = 'dataExtension';
    }

    const rootPath = (await getRootPath()) || path.normalize('./');
    const manifestPath = path.normalize(`${rootPath}.local.manifest.json`);
    if (!fileExists(manifestPath)) {
        const init = {};
        const state = assignObject(state_conf.get());

        if (state) {
            const { instance, parentMID, activeMID } = state;
            await createFile(
                manifestPath,
                JSON.stringify(
                    {
                        instanceDetails: {
                            instance,
                            parentMID,
                            activeMID,
                        },
                    },
                    null,
                    2
                )
            );
        }

        await updateManifest(context, content);
        return;
    }

    // Read ManifestJSON file from root dir
    let manifestFile: any = await readFile(manifestPath);
    let manifestJSON = JSON.parse(manifestFile);

    // Siloed write for instance details
    if (context === 'instanceDetails' && !Object.prototype.hasOwnProperty.call(manifestJSON, context)) {
        manifestJSON[context] = content;
        fs.writeFileSync(manifestPath, JSON.stringify(manifestJSON, null, 2));
        return;
    }

    // Iterate through content object
    // Asset Types => asset/folder
    for (const assetType in content) {
        if (
            Object.prototype.hasOwnProperty.call(manifestJSON, context) &&
            Object.prototype.hasOwnProperty.call(manifestJSON[context], assetType)
        ) {
            // @ts-ignore
            const manifestContextObject = manifestJSON[context];

            const AssetTypeItems: {
                customerKey?: string;
                id?: number;
                assetType?: {
                    objectIdKey: ObjectIdKeys;
                };
                category?: any;
                // @ts-ignore
            }[] = content[assetType];

            for (const i in AssetTypeItems) {
                const updateItem = AssetTypeItems[i];
                let itemId: number | string | undefined;
                let manifestContextItems: {
                    [key: string]: any;
                }[] = manifestContextObject[assetType];

                let manifestObj;

                if (assetType === 'assets') {
                    // Content Builder assets should have have item.id
                    // Automation Studio assets get an assetType object with the key for their ID
                    if (['contentBuilder', 'sharedContent'].includes(context)) {
                        itemId = updateItem.id;
                        manifestObj = manifestContextItems.find(({ id }) => id === itemId);
                    } else if (context === 'automationStudio') {
                        const objectIdKey = updateItem && updateItem.assetType && updateItem.assetType.objectIdKey;
                        itemId =
                            objectIdKey &&
                            Object.prototype.hasOwnProperty.call(updateItem, objectIdKey) &&
                            updateItem[objectIdKey];
                        //@ts-ignore
                        manifestObj = manifestContextItems.find((item) => item[objectIdKey] === itemId);
                    } else if (['dataExtension', 'sharedDataExtension'].includes(context)) {
                        itemId = updateItem.customerKey;
                        manifestObj = manifestContextItems.find(({ customerKey }) => customerKey === itemId);
                    }
                } else if (assetType === 'folders') {
                    itemId = updateItem.id;
                    manifestObj = manifestContextItems.find(({ id }) => id === itemId);
                }

                // If the item is not found based on the ID add it to the Context Items Array
                // If the item is found check that the items are equal
                if (typeof manifestObj === 'undefined') {
                    manifestContextItems = [...manifestContextItems, updateItem];
                } else {
                    if (!isEqual(updateItem, manifestObj)) {
                        let updateIndex;

                        if (assetType === 'assets') {
                            if (['contentBuilder', 'sharedContent'].includes(context)) {
                                updateIndex = manifestContextItems.findIndex(({ id }) => id === updateItem.id);
                            } else if (context === 'automationStudio') {
                                const objectIdKey =
                                    updateItem && updateItem.assetType && updateItem.assetType.objectIdKey;
                                let itemId =
                                    objectIdKey &&
                                    Object.prototype.hasOwnProperty.call(updateItem, objectIdKey) &&
                                    updateItem[objectIdKey];
                                updateIndex = manifestContextItems.findIndex(
                                    (item: { [key: string]: any }) => itemId && item[itemId] === updateItem[itemId]
                                );

                                updateItem.category = manifestObj.category;
                            } else if (['dataExtension', 'sharedDataExtension'].includes(context)) {
                                itemId = updateItem.customerKey || updateItem.id;
                                updateIndex = manifestContextItems.findIndex(
                                    ({ customerKey }) => customerKey === updateItem.customerKey
                                );
                            }
                        } else if (assetType === 'folders') {
                            itemId = updateItem.id;
                            updateIndex = manifestContextItems.findIndex(({ id }) => id === updateItem.id);
                        }

                        if (typeof updateIndex !== 'undefined') {
                            manifestContextItems[updateIndex] = updateItem;
                        }
                    }
                }

                manifestJSON[context][assetType] = manifestContextItems;
            }
        } else {
            if (!manifestJSON[context]) {
                manifestJSON[context] = {};
            }
            // @ts-ignore
            const assetObjects: object[] = content[assetType];
            // @ts-ignore
            manifestJSON[context][assetType] = [...assetObjects];
        }
    }

    let manifestStr = JSON.stringify(manifestJSON);
    manifestStr = await scrubBldrSfmcEnv(manifestStr);
    let updatedManifest = JSON.parse(manifestStr);

    await fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2));
};

export { updateManifest };
