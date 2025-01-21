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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addNewFolders = void 0;
const _1 = require(".");
const bldrFileSystem_1 = require("../../_utils/bldrFileSystem");
const manifestJSON_1 = require("../../_utils/bldrFileSystem/manifestJSON");
const display_1 = require("../../_utils/display");
const state_1 = require("../_processes/state");
const { debug } = new state_1.State();
/**
 * Method to create new folders in SFMC when the do not exist
 *
 * @param {object} categoryDetails various folder/asset values from the full file path
 * @param {string} dirPath project root folder
 */
const addNewFolders = (sdk, folder) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let createdFolderCount = 0;
        // Split path into array to check each individually
        const stashItemFolderArray = folder.path.split('/');
        // Grab root folder from path
        const rootContextFolder = stashItemFolderArray.shift();
        // Get .local.manifest.json file
        let manifestJSON = yield (0, bldrFileSystem_1.readManifest)();
        const manifestAssetCategories = manifestJSON[folder.context.context]['assets'].map((manifestAsset) => manifestAsset && manifestAsset.category);
        let manifestFolderCategories = manifestJSON[folder.context.context]['folders'].map((manifestFolder) => manifestFolder);
        let manifestFolders = yield (0, _1.uniqueArrayByKey)([...manifestAssetCategories, ...manifestFolderCategories], 'folderPath');
        const createdFoldersOutput = [];
        let checkPath = rootContextFolder;
        let parentId;
        let createFolder;
        // Iterate through all folder names to see where folders need to be created
        for (const stashItemFolder in stashItemFolderArray) {
            const folderName = stashItemFolderArray[stashItemFolder];
            let updatedFolder = 0;
            // Compile path to check against
            checkPath = `${checkPath}${'/'}${folderName}`;
            manifestJSON = yield (0, bldrFileSystem_1.readManifest)();
            manifestFolderCategories = manifestJSON[folder.context.context]['folders'].map((manifestFolder) => manifestFolder);
            manifestFolders = yield (0, _1.uniqueArrayByKey)([...manifestAssetCategories, ...manifestFolderCategories], 'folderPath');
            // Check if folder path exists in .local.manifest.json
            const folderIndex = manifestFolders.findIndex((manifestFolder) => checkPath && manifestFolder.folderPath === checkPath);
            // If folder does not exist
            if (folderIndex === -1) {
                if (typeof parentId === 'undefined') {
                    const parentFolderResponse = yield sdk.sfmc.folder.search({
                        contentType: folder.context.contentType,
                        searchKey: 'Name',
                        searchTerm: folder.context.name,
                    });
                    debug('Search for Parent Folder', 'info', parentFolderResponse);
                    if (parentFolderResponse.OverallStatus !== 'OK') {
                        throw new Error(parentFolderResponse.OverallStatus);
                    }
                    if (!Object.prototype.hasOwnProperty.call(parentFolderResponse, 'Results') &&
                        parentFolderResponse.Results.length > 0) {
                        throw new Error('No Results Found for Root Folder');
                    }
                    const parentFolderObject = {
                        id: parentFolderResponse.Results[0].ID,
                        name: rootContextFolder,
                        parentId: parentFolderResponse.Results[0].ParentFolder.ID,
                        folderPath: rootContextFolder,
                    };
                    yield (0, manifestJSON_1.updateManifest)(folder.context.context, { folders: [parentFolderObject] });
                    parentId = parentFolderResponse.Results[0].ID;
                }
                debug('Create Folder Request', 'info', {
                    contentType: folder.context.contentType,
                    name: folderName,
                    parentId,
                });
                // Create folder via SFMC API
                createFolder = yield sdk.sfmc.folder.createFolder({
                    contentType: folder.context.contentType,
                    name: folderName,
                    parentId,
                });
                debug('Create Folder Response', 'info', createFolder);
                if (!createFolder ||
                    (typeof createFolder === 'string' && createFolder.includes('Please select a different Name.'))) {
                    const existingFolder = yield addExistingFolderToManifest(sdk, {
                        context: folder.context,
                        folder: folderName,
                        checkPath,
                        parentId,
                    });
                    parentId = existingFolder && existingFolder.id;
                }
                else if (createFolder.StatusCode === 'Error') {
                    throw new Error(createFolder.StatusMessage);
                }
                else {
                    // Wait for response from folder creation and add object to manifestFolder array
                    // Folder permissions my not allow child folders, so when exception is thrown create will retry
                    // do/while will check until retry is done and folder is created
                    do {
                        const newFolderId = (createFolder && createFolder.Results && createFolder.Results[0].NewID) || null;
                        if (newFolderId) {
                            (0, display_1.displayLine)(`${folderName} has been created; CategoryId: ${newFolderId}`, 'success');
                            const createdFolderObject = {
                                id: newFolderId,
                                name: folderName,
                                parentId,
                                folderPath: checkPath,
                            };
                            yield (0, manifestJSON_1.updateManifest)(folder.context.context, { folders: [createdFolderObject] });
                            parentId = createFolder && createFolder.Results && createFolder.Results[0].NewID;
                            createdFoldersOutput.push(createdFolderObject);
                            createdFolderCount++;
                        }
                        updatedFolder++;
                    } while (typeof createFolder !== 'undefined' && updatedFolder === 0);
                }
            }
            else {
                parentId = manifestFolders[folderIndex].id;
            }
        }
        createdFolderCount > 0 && (0, display_1.displayLine)(`>> ${createdFolderCount} folders created`);
        return createdFoldersOutput;
    }
    catch (err) {
        console.log(err);
    }
});
exports.addNewFolders = addNewFolders;
/**
 *
 * @param sdk
 * @param request
 * @returns
 */
const addExistingFolderToManifest = (sdk, request) => __awaiter(void 0, void 0, void 0, function* () {
    const existingFolder = yield sdk.sfmc.folder.search({
        contentType: request.context.contentType,
        searchKey: 'Name',
        searchTerm: request.folder,
        parentId: request.parentId,
    });
    if (existingFolder.OverallStatus === 'OK' &&
        Object.prototype.hasOwnProperty.call(existingFolder, 'Results') &&
        existingFolder.Results.length) {
        const results = existingFolder.Results;
        const folderObject = results.find((folderResult) => folderResult.Name === request.folder);
        const folderOutput = {
            id: folderObject.ID,
            name: request.folder,
            parentId: folderObject.ParentFolder.ID,
            folderPath: request.checkPath,
        };
        folderObject &&
            (yield (0, manifestJSON_1.updateManifest)(request.context.context, {
                folders: [folderOutput],
            }));
        return folderOutput;
    }
});
