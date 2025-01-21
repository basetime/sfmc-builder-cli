import { BLDR_Client } from '@basetime/bldr-sfmc-sdk/lib/cli/types/bldr_client';
import { getFilePathDetails, isWindows, uniqueArrayByKey } from '.';
import { initiateBldrSDK } from '../../_bldr_sdk';
import { readManifest } from '../../_utils/bldrFileSystem';
import { updateManifest } from '../../_utils/bldrFileSystem/manifestJSON';
import { displayLine } from '../../_utils/display';
import { State } from '../_processes/state';
const { debug } = new State();
/**
 * Method to create new folders in SFMC when the do not exist
 *
 * @param {object} categoryDetails various folder/asset values from the full file path
 * @param {string} dirPath project root folder
 */
const addNewFolders = async (
    sdk: any,
    folder: {
        path: string;
        context: {
            name: string;
            context: string;
            contentType: string;
        };
    }
) => {
    try {
        let createdFolderCount = 0;
        // Split path into array to check each individually
        const stashItemFolderArray = folder.path.split('/');
        // Grab root folder from path
        const rootContextFolder = stashItemFolderArray.shift();

        // Get .local.manifest.json file
        let manifestJSON = await readManifest();
        const manifestAssetCategories = manifestJSON[folder.context.context]['assets'].map(
            (manifestAsset: { category: { folderPath: string } }) => manifestAsset && manifestAsset.category
        );
        let manifestFolderCategories = manifestJSON[folder.context.context]['folders'].map(
            (manifestFolder: { folderPath: string }) => manifestFolder
        );
        let manifestFolders = await uniqueArrayByKey(
            [...manifestAssetCategories, ...manifestFolderCategories],
            'folderPath'
        );

        const createdFoldersOutput: any[] = [];

        let checkPath = rootContextFolder;
        let parentId;
        let createFolder;
        // Iterate through all folder names to see where folders need to be created
        for (const stashItemFolder in stashItemFolderArray) {
            const folderName = stashItemFolderArray[stashItemFolder];
            let updatedFolder = 0;

            // Compile path to check against
            checkPath = `${checkPath}${'/'}${folderName}`;
            manifestJSON = await readManifest();
            manifestFolderCategories = manifestJSON[folder.context.context]['folders'].map(
                (manifestFolder: { folderPath: string }) => manifestFolder
            );

            manifestFolders = await uniqueArrayByKey(
                [...manifestAssetCategories, ...manifestFolderCategories],
                'folderPath'
            );

            // Check if folder path exists in .local.manifest.json
            const folderIndex = manifestFolders.findIndex(
                (manifestFolder: { folderPath: string }) => checkPath && manifestFolder.folderPath === checkPath
            );

            // If folder does not exist
            if (folderIndex === -1) {
                if (typeof parentId === 'undefined') {
                    const parentFolderResponse = await sdk.sfmc.folder.search({
                        contentType: folder.context.contentType,
                        searchKey: 'Name',
                        searchTerm: folder.context.name,
                    });

                    debug('Search for Parent Folder', 'info', parentFolderResponse);

                    if (parentFolderResponse.OverallStatus !== 'OK') {
                        throw new Error(parentFolderResponse.OverallStatus);
                    }

                    if (
                        !Object.prototype.hasOwnProperty.call(parentFolderResponse, 'Results') &&
                        parentFolderResponse.Results.length > 0
                    ) {
                        throw new Error('No Results Found for Root Folder');
                    }

                    const parentFolderObject = {
                        id: parentFolderResponse.Results[0].ID,
                        name: rootContextFolder,
                        parentId: parentFolderResponse.Results[0].ParentFolder.ID,
                        folderPath: rootContextFolder,
                    };

                    await updateManifest(folder.context.context, { folders: [parentFolderObject] });

                    parentId = parentFolderResponse.Results[0].ID;
                }

                debug('Create Folder Request', 'info', {
                    contentType: folder.context.contentType,
                    name: folderName,
                    parentId,
                });

                // Create folder via SFMC API
                createFolder = await sdk.sfmc.folder.createFolder({
                    contentType: folder.context.contentType,
                    name: folderName,
                    parentId,
                });

                debug('Create Folder Response', 'info', createFolder);

                if (
                    !createFolder ||
                    (typeof createFolder === 'string' && createFolder.includes('Please select a different Name.'))
                ) {
                    const existingFolder: any = await addExistingFolderToManifest(sdk, {
                        context: folder.context,
                        folder: folderName,
                        checkPath,
                        parentId,
                    });

                    parentId = existingFolder && existingFolder.id;
                } else if (createFolder.StatusCode === 'Error') {
                    throw new Error(createFolder.StatusMessage);
                } else {
                    // Wait for response from folder creation and add object to manifestFolder array
                    // Folder permissions my not allow child folders, so when exception is thrown create will retry
                    // do/while will check until retry is done and folder is created
                    do {
                        const newFolderId =
                            (createFolder && createFolder.Results && createFolder.Results[0].NewID) || null;

                        if (newFolderId) {
                            displayLine(`${folderName} has been created; CategoryId: ${newFolderId}`, 'success');

                            const createdFolderObject = {
                                id: newFolderId,
                                name: folderName,
                                parentId,
                                folderPath: checkPath,
                            };

                            await updateManifest(folder.context.context, { folders: [createdFolderObject] });

                            parentId = createFolder && createFolder.Results && createFolder.Results[0].NewID;
                            createdFoldersOutput.push(createdFolderObject);
                            createdFolderCount++;
                        }

                        updatedFolder++;
                    } while (typeof createFolder !== 'undefined' && updatedFolder === 0);
                }
            } else {
                parentId = manifestFolders[folderIndex].id;
            }
        }

        createdFolderCount > 0 && displayLine(`>> ${createdFolderCount} folders created`);
        return createdFoldersOutput;
    } catch (err: any) {
        console.log(err);
    }
};

/**
 *
 * @param sdk
 * @param request
 * @returns
 */
const addExistingFolderToManifest = async (
    sdk: BLDR_Client,
    request: {
        context: {
            contentType: string;
            context: string;
        };
        folder: string;
        checkPath: string;
        parentId: number;
    }
) => {
    const existingFolder = await sdk.sfmc.folder.search({
        contentType: request.context.contentType,
        searchKey: 'Name',
        searchTerm: request.folder,
        parentId: request.parentId,
    });

    if (
        existingFolder.OverallStatus === 'OK' &&
        Object.prototype.hasOwnProperty.call(existingFolder, 'Results') &&
        existingFolder.Results.length
    ) {
        const results = existingFolder.Results;
        const folderObject = results.find((folderResult: { Name: string }) => folderResult.Name === request.folder);

        const folderOutput = {
            id: folderObject.ID,
            name: request.folder,
            parentId: folderObject.ParentFolder.ID,
            folderPath: request.checkPath,
        };

        folderObject &&
            (await updateManifest(request.context.context, {
                folders: [folderOutput],
            }));

        return folderOutput;
    }
};

export { addNewFolders };
