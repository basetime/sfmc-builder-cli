import { SFMC_Data_Extension_Asset } from '@basetime/bldr-sfmc-sdk/lib/sfmc/types/objects/sfmc_data_extension_assets';
import flatten from 'flat';
import { Config } from '../../../_bldr/_processes/config';
import { State } from '../../../_bldr/_processes/state';
import { uniqueArrayByKey } from '../../../_bldr/_utils';
import { initiateBldrSDK } from '../../../_bldr_sdk';
import { Argv } from '../../../_types/Argv';
import { updateManifest } from '../../../_utils/bldrFileSystem/manifestJSON';
import { createEmailStudioEditableFiles } from '../../../_utils/bldrFileSystem/_context/dataExtension/CreateLocalFiles';
import { displayLine, displayObject } from '../../../_utils/display';
import { incrementMetric } from '../../../_utils/metrics';
const { getInstanceConfiguration } = new Config();
const { allowTracking, getState, debug } = new State();
/**
 * Flag routing for Config command
 *
 * @param {string} req
 * @param {object} argv
 * @param {object} store
 *
 */
const TriggeredSendSwitch = async (req: any, argv: Argv) => {
    try {
        const bldr = await initiateBldrSDK();
        //@ts-ignore //TODO figure out why contentBuilder is throwing TS error
        const { emailStudio } = bldr.cli;

        if (!bldr) {
            throw new Error('unable to load sdk');
        }

        // If authObject is not passed use the current set credentials to initiate SDK
        const currentState = await getState();
        const stateInstance = currentState.instance;
        const activeMID = currentState.activeMID;
        const stateConfiguration = await getInstanceConfiguration(stateInstance);

        switch (req) {
            case 'search':
                /**
                 * Search for Data Extension Folders
                 */
                if (typeof argv.f === 'string' && argv.f.includes(':')) {
                    const flag = argv.f.split(':')[1];
                    const shared = flag && flag === 'shared' ? true : false;
                    const searchTerm = argv._ && argv._[1];

                    const searchRequest = await emailStudio.searchFolders({
                        contentType: shared ? 'shared_dataextension' : 'dataextension',
                        searchKey: 'Name',
                        searchTerm: searchTerm,
                    });

                    displayLine(`${searchTerm} Search Results | ${searchRequest.length} Results`, 'info');
                    searchRequest &&
                        searchRequest.length &&
                        searchRequest.forEach((obj: any) => {
                            displayObject(flatten(obj));
                        });
                    allowTracking() && incrementMetric('req_searches_sharedDataExtension_folders');
                } else if ((typeof argv.f === 'string' && !argv.f.includes(':')) || typeof argv.f === 'number') {
                    const searchRequest = await emailStudio.searchFolders({
                        contentType: 'dataextension',
                        searchKey: 'Name',
                        searchTerm: argv.f,
                    });

                    displayLine(`${argv.f} Search Results | ${searchRequest.length} Results`, 'info');
                    searchRequest &&
                        searchRequest.length === 0 &&
                        displayLine(
                            `Search returned no results. If you're searching for a shared item update command to '-f:shared'`,
                            'info'
                        );
                    searchRequest &&
                        searchRequest.length &&
                        searchRequest.forEach((obj: any) => {
                            displayObject(flatten(obj));
                        });
                    allowTracking() && incrementMetric('req_searches_dataExtension_folders');
                }

                /**
                 * Search for Data Extension Assets
                 */
                if (typeof argv.a === 'string' && argv.a.includes(':')) {
                    const flag = argv.a.split(':')[1];
                    const shared = flag && flag === 'shared' ? true : false;
                    const searchTerm = argv._ && argv._[1];
                    const searchRequest = await emailStudio.searchDataExtensions({
                        searchKey: 'Name',
                        searchTerm: searchTerm,
                        shared,
                    });

                    displayLine(`${searchTerm} Search Results | ${searchRequest.length} Results`, 'info');
                    searchRequest &&
                        searchRequest.length === 0 &&
                        displayLine(
                            `Search returned no results. If you're searching for a shared item update command to '-a:shared'`,
                            'info'
                        );

                    searchRequest &&
                        searchRequest.length &&
                        searchRequest.forEach(
                            (
                                item: {
                                    Name: string;
                                    queryDefinitionId: string;
                                    CategoryID: number;
                                    ModifiedDate: string;
                                }[]
                            ) => displayObject(item)
                        );
                    allowTracking() && incrementMetric('req_searches_sharedDataExtension_assets');
                } else if (typeof argv.a === 'string' && !argv.a.includes(':')) {
                    const searchRequest = await emailStudio.searchDataExtensions({
                        searchKey: 'Name',
                        searchTerm: argv.a,
                    });

                    displayLine(`${argv.a} Search Results | ${searchRequest.length} Results`, 'info');
                    searchRequest &&
                        searchRequest.length &&
                        searchRequest.forEach((obj: any) => {
                            displayObject(flatten(obj));
                        });
                    allowTracking() && incrementMetric('req_searches_dataExtension_assets');
                }

                break;

            case 'clone':
                displayLine(`Starting Clone`, 'info');
                /**
                 * Clone Data Extension Folders
                 */
                if (typeof argv.f === 'string' && argv.f.includes(':')) {
                    const flag = argv.f.split(':')[1];
                    const shared = flag && flag === 'shared' ? true : false;
                    const searchTerm = argv._ && argv._[1];

                    const cloneRequest: {
                        assets: SFMC_Data_Extension_Asset[];
                        folders: {
                            ID: number;
                            Name: string;
                            ContentType: string;
                            ParentFolder: any;
                            FolderPath: string;
                        }[];
                    } = await emailStudio.gatherAssetsByCategoryId({
                        contentType: shared ? 'shared_dataextension' : 'dataextension',
                        categoryId: searchTerm,
                    });

                    debug('Clone Request', 'info', cloneRequest);

                    if (!cloneRequest.folders || !cloneRequest.assets) {
                        displayLine(
                            `Could not find ${searchTerm}. If it's a shared item, update your command with '-a:shared'`,
                            'info'
                        );
                        return;
                    }

                    const isolatedFoldersUnique =
                        (cloneRequest &&
                            cloneRequest.folders &&
                            cloneRequest.folders.length &&
                            uniqueArrayByKey(cloneRequest.folders, 'id')) ||
                        [];
                    cloneRequest &&
                        cloneRequest.assets &&
                        cloneRequest.assets.length &&
                        (await createEmailStudioEditableFiles(cloneRequest.assets));

                    cloneRequest.assets &&
                        isolatedFoldersUnique &&
                        (await updateManifest('sharedDataExtension', {
                            assets: cloneRequest.assets,
                            folders: isolatedFoldersUnique,
                        }));
                    allowTracking() && incrementMetric('req_clones_sharedDataExtension_folders');
                } else if ((typeof argv.f === 'string' && !argv.f.includes(':')) || typeof argv.f === 'number') {
                    const cloneRequest: {
                        assets: SFMC_Data_Extension_Asset[];
                        folders: {
                            ID: number;
                            Name: string;
                            ContentType: string;
                            ParentFolder: any;
                            FolderPath: string;
                        }[];
                    } = await emailStudio.gatherAssetsByCategoryId({
                        contentType: 'dataextension',
                        categoryId: argv.f,
                    });
                    debug('Clone Request', 'info', cloneRequest);

                    if (!cloneRequest.folders || !cloneRequest.assets) {
                        displayLine(
                            `Could not find ${argv.f}. If it's a shared item, update your command with '-f:shared'`,
                            'info'
                        );
                        return;
                    }
                    const isolatedFoldersUnique =
                        (cloneRequest &&
                            cloneRequest.folders &&
                            cloneRequest.folders.length &&
                            uniqueArrayByKey(cloneRequest.folders, 'id')) ||
                        [];
                    cloneRequest &&
                        cloneRequest.assets &&
                        cloneRequest.assets.length &&
                        (await createEmailStudioEditableFiles(cloneRequest.assets));

                    cloneRequest.assets &&
                        isolatedFoldersUnique &&
                        (await updateManifest('dataExtension', {
                            assets: cloneRequest.assets,
                            folders: isolatedFoldersUnique,
                        }));
                    allowTracking() && incrementMetric('req_clones_dataExtension_folders');
                }

                /**
                 * Search for Data Extension Assets
                 */
                if (typeof argv.a === 'string' && argv.a.includes(':')) {
                    const flag = argv.a.split(':')[1];
                    const shared = flag && flag === 'shared' ? true : false;
                    const completeResponse = false;
                    const customerKey = argv._ && argv._[1];

                    const cloneRequest: {
                        assets: SFMC_Data_Extension_Asset[];
                        folders: {
                            ID: number;
                            Name: string;
                            ContentType: string;
                            ParentFolder: any;
                            FolderPath: string;
                        }[];
                    } = await emailStudio.gatherAssetById(customerKey, completeResponse, shared);
                    debug('Clone Request', 'info', cloneRequest);

                    if (!cloneRequest.folders || !cloneRequest.assets) {
                        displayLine(
                            `Could not find ${customerKey}. If it's a shared item, update your command with '-a:shared'`,
                            'info'
                        );
                        return;
                    }

                    const isolatedFoldersUnique =
                        (cloneRequest &&
                            cloneRequest.folders &&
                            cloneRequest.folders.length &&
                            uniqueArrayByKey(cloneRequest.folders, 'id')) ||
                        [];
                    cloneRequest &&
                        cloneRequest.assets &&
                        cloneRequest.assets.length &&
                        (await createEmailStudioEditableFiles(cloneRequest.assets));

                    cloneRequest.assets &&
                        isolatedFoldersUnique &&
                        (await updateManifest('dataExtension', {
                            assets: cloneRequest.assets,
                            folders: isolatedFoldersUnique,
                        }));

                    allowTracking() && incrementMetric('req_clones_dataExtension_assets');
                } else if ((typeof argv.a === 'string' && !argv.a.includes(':')) || typeof argv.a === 'number') {
                    const cloneRequest: {
                        assets: SFMC_Data_Extension_Asset[];
                        folders: {
                            ID: number;
                            Name: string;
                            ContentType: string;
                            ParentFolder: any;
                            FolderPath: string;
                        }[];
                    } = await emailStudio.gatherAssetById(argv.a);

                    debug('Clone Request', 'info', cloneRequest);
                    if (!cloneRequest.folders || !cloneRequest.assets) {
                        displayLine(
                            `Could not find ${argv.a}. If it's a shared item, update your command with '-a:shared'`,
                            'info'
                        );
                        return;
                    }

                    const isolatedFoldersUnique =
                        (cloneRequest &&
                            cloneRequest.folders &&
                            cloneRequest.folders.length &&
                            uniqueArrayByKey(cloneRequest.folders, 'id')) ||
                        [];
                    cloneRequest &&
                        cloneRequest.assets &&
                        cloneRequest.assets.length &&
                        (await createEmailStudioEditableFiles(cloneRequest.assets));

                    cloneRequest.assets &&
                        isolatedFoldersUnique &&
                        (await updateManifest('dataExtension', {
                            assets: cloneRequest.assets,
                            folders: isolatedFoldersUnique,
                        }));

                    allowTracking() && incrementMetric('req_clones_dataExtension_assets');
                }
                break;
        }

        return;
    } catch (err) {
        console.log('err', err);
    }
};

export { TriggeredSendSwitch };
