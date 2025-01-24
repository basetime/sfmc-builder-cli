const { v4: uuidv4 } = require('uuid');
const contextMap = require('./contextMap');
const getFiles = require('node-recursive-directory');

const LocalFile = require('./Blueprint/LocalFile');
const localFiles = new LocalFile();

module.exports.assignObject = (obj) => Object.assign({}, obj);
module.exports.uniqueArray = (arr, key) => arr.filter((v, i, a) => a.findIndex((v2) => v2[key] === v[key]) === i);

module.exports.getParentFolderFromArray = (folders, parentId) => folders.filter((folder) => folder.id === parentId);



module.exports.splitDateFromISO = (dateStr) => dateStr.substring(0, dateStr.indexOf('T'));

module.exports.guid = () => uuidv4();

module.exports.filePathDetails = async (filePath) => {
    const ctx = await this.ctx(filePath);
    const folderArr = filePath.split('/');
    const fileName = folderArr.pop();
    const folderName = folderArr.slice(-1).pop();
    const folderPath = folderArr.join('/');

    let projectPath = filePath.substring(filePath.indexOf(ctx.root));
    projectPath = projectPath.split('/');
    projectPath.pop();
    projectPath = projectPath.join('/');

    // filename.html
    // rootFolder/Subdirectory/assetFolder
    // assetFolder
    // rootFolder/Subdirectory/assetFolder/filename.html
    return {
        fileName,
        folderPath,
        folderName,
        projectPath,
        context: ctx,
    };
};

module.exports.getAllFiles = async () => {
    // Get the root directory for the project being worked on
    const dirPath = await localFiles._getRootPath(contextMap);

    // Get the current working directory that the [add] command was triggered
    const cwdPath = process.cwd();

    // Identify the context for request
    const contexts = contextMap.map((ctx) => localFiles._fileExists(`./${ctx.root}`) && ctx.root).filter(Boolean);

    // Store all complete file paths for files in CWD and subdirectories
    let ctxFiles = new Array();

    // if dir is root folder
    if (dirPath === './') {
        // iterate all contexts and add files
        for (const c in contexts) {
            ctxFiles.push(...(await getFiles(`./${contexts[c]}`)));
        }
    } else {
        // get files from current working directory and subdirectories
        ctxFiles.push(...(await getFiles(`${cwdPath}`)));
    }

    return ctxFiles;
};

module.exports.ctx = (filePath) => {
    const ctxFilter = contextMap.map((ctx) => filePath.includes(`/${ctx.root}/`) && ctx);
    return ctxFilter.filter(Boolean)[0];
};

/**
 *
 * @param {string} status
 * @returns
 */
module.exports.automationStatus = (status) => {
    let statusText;

    switch (status) {
        case -1:
            statusText = 'Error';
            break;
        case 0:
            statusText = 'BuildingError';
            break;
        case 1:
            statusText = 'Building';
            break;
        case 2:
            statusText = 'Ready';
            break;
        case 3:
            statusText = 'Running';
            break;
        case 4:
            statusText = 'Paused';
            break;
        case 5:
            statusText = 'Stopped';
            break;
        case 6:
            statusText = 'Scheduled';
            break;
        case 7:
            statusText = 'Awaiting';
            break;
        case 8:
            statusText = 'InactiveTrigger';
            break;
    }

    return statusText;
};

/**
 * Method to format API response from SFMC into minimum required POST/PUT JSON objects
 * Updates Category object with full folder paths
 * Gathers additional data for Image assets
 *
 * @param {object} results from API Request
 * @param {object} folderPaths category object
 * @returns {object} Array of formatted asset payloads
 */
module.exports.formatContentBuilderDataForFile = async (bldr, results, folderPaths) => {
    if (!Array.isArray(results)) {
        results = [results];
    }

    const formatted = new Array();

    for (const r in results) {
        const asset = results[r];

        // Generate new bldrId for asset
        const bldrId = this.guid();

        const searchPath = folderPaths.find(({ id }) => id === asset.category.id);

        const folderPath = searchPath ? searchPath.folderPath : '';

        // Create JSON structure for new asset post
        let post = {};
        post.id = asset.id;
        post.bldrId = bldrId;
        post.name = asset.name;
        post.assetType = asset.assetType;
        post.category = asset.category;
        post.category.folderPath = folderPath;

        if (asset.content) {
            post.content = asset.content;
        }
        if (asset.meta) {
            post.meta = asset.meta;
        }
        if (asset.slots) {
            post.slots = asset.slots;
        }
        if (asset.views) {
            post.views = asset.views;
        }

        if (asset.assetType.displayName === 'Image') {
            post.name = asset.name.indexOf('.') === -1 ? asset.name : asset.name.substring(0, asset.name.indexOf('.'));
            post.publishedURL = asset.fileProperties.publishedURL;
            post.file = await bldr.asset.getImageFile(asset.id);
        }

        formatted.push(post);
    }

    return formatted;
};

/**
 *
 * @param {string} activityType
 * @returns
 */
module.exports.identifyAutomationStudioActivityObjectTypeId = (activityType) => {
    let out;

    switch (activityType) {
        case 'queries':
            out = {
                objectTypeId: 300,
                api: 'queries',
                name: 'queryactivity',
                objectIdKey: 'queryDefinitionId',
                folder: 'Automation Studio/Query',
            };
            break;
        case 'scripts':
            out = {
                objectTypeId: 423,
                api: 'scripts',
                name: 'ssjsactivity',
                objectIdKey: 'ssjsActivityId',
                folder: 'Automation Studio/Scripts',
            };
            break;
        case 'imports':
            out = {
                objectTypeId: 43,
                api: 'imports',
                name: 'importactivity',
                objectIdKey: 'importDefinitionId',
                folder: 'Automation Studio/File Imports',
            };
            break;
        case 'filetransfers':
            out = {
                objectTypeId: 53,
                api: 'filetransfers',
                name: 'transferactivity',
                objectIdKey: 'id',
                folder: 'Automation Studio/File Transfers',
            };
            break;
        case 'filters':
            out = {
                objectTypeId: 303,
                api: 'filters',
                name: 'filteractivity',
                objectIdKey: 'filterActivityId',
                folder: 'Automation Studio/Filters',
            };
            break;

        case 'dataextracts':
            out = {
                objectTypeId: 73,
                api: 'dataextracts',
                name: 'dataextractactivity',
                objectIdKey: 'dataExtractDefinitionId',
                folder: 'Automation Studio/Extracts',
            };
            break;
        case 'EmailSendDefinition':
            out = {
                objectTypeId: 42,
                api: 'EmailSendDefinition',
                name: 'userinitiatedsend',
                objectIdKey: 'ObjectID',
                folder: 'Automation Studio/User-Initiated',
            };
            break;
        default:
    }

    return out;
};

/**
 *
 * @param {number} objectTypeId
 * @returns
 */
module.exports.identifyAutomationStudioActivityType = (objectTypeId) => {
    let out;

    switch (objectTypeId) {
        case 300:
            out = {
                api: 'queries',
                name: 'queryactivity',
                objectIdKey: 'queryDefinitionId',
                folder: 'Automation Studio/Query',
            };
            break;
        case 423:
            out = {
                api: 'scripts',
                name: 'ssjsactivity',
                objectIdKey: 'ssjsActivityId',
                folder: 'Automation Studio/Scripts',
            };
            break;
        case 43:
            out = {
                api: 'imports',
                name: 'importactivity',
                objectIdKey: 'importDefinitionId',
                folder: 'Automation Studio/File Imports',
            };
            break;
        case 53:
            out = {
                api: 'filetransfers',
                name: 'transferactivity',
                objectIdKey: 'id',
                folder: 'Automation Studio/File Transfers',
            };
            break;
        case 303:
            out = {
                api: 'filters',
                name: 'filteractivity',
                objectIdKey: 'filterActivityId',
                folder: 'Automation Studio/Filters',
            };
            break;

        case 73:
            out = {
                api: 'dataextracts',
                name: 'dataextractactivity',
                objectIdKey: 'dataExtractDefinitionId',
                folder: 'Automation Studio/Extracts',
            };
            break;
        case 42:
            out = {
                api: 'EmailSendDefinition',
                name: 'userinitiatedsend',
                objectIdKey: 'ObjectID',
                folder: 'Automation Studio/User-Initiated',
            };
            break;
        default:
    }

    return out;
};

module.exports.createAPIConfig = async (config, template = true) => {
    const configTemplate = config || {
        client_id: '',
        client_secret: '',
        authentication_uri: '',
        parentMID: '',
    };

    const dirPath = await localFiles._getRootPath(contextMap);
    localFiles.createFile(`${dirPath}/.sfmc.config.json`, JSON.stringify(configTemplate, null, 2));

    if (template) {
        localFiles.createFile(`${dirPath}/template.sfmc.config.json`, JSON.stringify(configTemplate, null, 2));
    }

    localFiles.append(`${dirPath}/.gitignore`, `\n#sfmc config \n.sfmc.config.json`);
};

module.exports.scrubConfig = async (content) => {
    const dirPath = await localFiles._getRootPath(contextMap);
    if (localFiles._fileExists(`${dirPath}/.sfmc.config.json`)) {
        const config = await localFiles._getSFMCConfig(dirPath);

        for (const c in config) {
            const key = c;
            const value = config[c];

            if (content.match(value)) {
                content = content.replace(value, `{{${key}}}`);
            }
        }
    }

    return content;
};

module.exports.replaceConfig = async (content) => {
    const dirPath = await localFiles._getRootPath(contextMap);
    if (localFiles._fileExists(`${dirPath}/.sfmc.config.json`)) {
        const config = await localFiles._getSFMCConfig(dirPath);

        for (const c in config) {
            const key = c;
            const value = config[c];

            if (content.match(key)) {
                content = content.replace(`{{${key}}}`, value);
            }
        }
    }

    return content;
};

module.exports.deployCheckConfig = async () => {
    let preventDeployment = false;

    const dirPath = await localFiles._getRootPath(contextMap);
    if (localFiles._fileExists(`${dirPath}/.sfmc.config.json`)) {
        const config = await localFiles._getSFMCConfig(dirPath);
        for (const c in config) {
            const key = c;
            const value = config[c];

            if (value === '') {
                console.log(`Please configure ${key} in .sfmc.config.json`);
                preventDeployment = true;
            }
        }
    }

    return preventDeployment;
};

module.exports.updateAssetContent = (asset, content) => {
    const assetType = asset.assetType.name;
    switch (assetType) {
        case 'webpage':
        case 'htmlemail':
            asset.views.html.content = content;
            break;
        case 'codesnippetblock':
        case 'htmlblock':
        case 'jscoderesource':
            asset.content = content;
            break;
        case 'textonlyemail':
            asset.views.text.content = content;
            break;
        case 'queryactivity':
            asset.queryText = content;
            break;
        case 'ssjsactivity':
            asset.script = content;
            break;
        default:
            content = null;
    }

    return asset;
};

module.exports.getAssetContent = (asset) => {
    const assetType = (asset && asset.assetType && asset.assetType.name) || 'null';
    let content;

    switch (assetType) {
        case 'webpage':
        case 'htmlemail':
            content = asset.views.html.content;
            break;
        case 'codesnippetblock':
        case 'htmlblock':
        case 'jscoderesource':
            content = asset.content;
            break;
        case 'textonlyemail':
            content = asset.views.text.content;
            break;
        case 'queryactivity':
            content = asset.queryText;
            break;
        case 'ssjsactivity':
            content = asset.script;
            break;
        default:
            content = JSON.stringify(asset);
    }

    return content;
};

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function lowercaseFirstLetter(string) {
    return string.charAt(0).toLowerCase() + string.slice(1);
}

module.exports.capitalizeKeys = (obj) => {
    let objectOut = obj;

    var key, upKey;
    for (key in objectOut) {
        if (Object.prototype.hasOwnProperty.call(objectOut, key)) {
            upKey = capitalizeFirstLetter(key);
            if (upKey !== key) {
                objectOut[upKey] = objectOut[key];
                delete objectOut[key];
            }
            // recurse
            if (typeof objectOut[upKey] === 'object') {
                this.capitalizeKeys(objectOut[upKey]);
            }
        }
    }

    return objectOut;
};

module.exports.lowercaseKeys = (obj) => {
    let objectOut = obj;

    var key, keyDown;
    for (key in objectOut) {
        if (Object.prototype.hasOwnProperty.call(objectOut, key)) {
            keyDown = lowercaseFirstLetter(key);
            if (keyDown !== key) {
                objectOut[keyDown] = objectOut[key];
                delete objectOut[key];
            }
            // recurse
            if (typeof objectOut[keyDown] === 'object') {
                this.lowercaseKeys(objectOut[keyDown]);
            }
        }
    }

    return objectOut;
};

/**
 * Automation Studio Object Reference
 *

    Salesforce Send
    "objectTypeId": 771

    Fire Event
    "objectTypeId": 749

    Guided Send
    "objectTypeId": 42

    Wait Activity
    "objectTypeId": 467

    Verification Activity
    "objectTypeId": 1000

    Refresh Group
    "objectTypeId": 45

    Data Factory Utility
    "objectTypeId": 425

    Send SMS
    "objectTypeId": 725

    Import Mobile Contacts
    "objectTypeId": 726

    Refresh Mobile Filtered List
    "objectTypeId": 724

    Send GroupConnect
    "objectTypeId": 783

    Report Definition
    "objectTypeId": 84

    Send Push
    "objectTypeId": 736



    //DONE//
    ---Query Activity---
    "objectTypeId": 300

    ---Script Activity---
    "objectTypeId": 423

    ---Import File---
    "objectTypeId": 43

    ---File Transfer---
    "objectTypeId": 53

    ---Filter Activity---
    "objectTypeId": 303

    ---Data Extract---
    "objectTypeId": 73
 */
