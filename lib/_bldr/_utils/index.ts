const { sfmc_context_mapping } = require('@basetime/bldr-sfmc-sdk/dist/sfmc/utils/sfmcContextMapping');
const { v4: uuidv4 } = require('uuid');
import fs from 'fs';
import path from 'path';

const isWindows = () => process.platform.startsWith('win');

/**
 *
 * @returns GUID
 */
const guid = () => uuidv4();
/**
 *
 * @param obj
 * @returns
 */
const assignObject = (obj: any) => Object.assign({}, obj);
/**
 *
 * @param array
 * @param key
 * @returns
 */
const uniqueArrayByKey = (array: any[], key: string) => [...new Map(array.map((item) => [item[key], item])).values()];
/**
 *
 * @param systemFilePath
 * @returns
 *
 * ```
 *  {
 *    name: string;
 *    context: string;
 *    contentType: string;
 *  }
 * ```
 *
 */
const sfmc_context = (systemFilePath: string) =>
    sfmc_context_mapping.filter((context: { name: string }) => new RegExp(context.name).test(systemFilePath));
/**
 *
 * @param systemFilePath
 * @returns
 */
const getFilePathDetails = (systemFilePath: string) => {
    const contextDetails = sfmc_context(systemFilePath);
    const parsedFilePath = path.parse(systemFilePath);
    const parsedOutput = {
        ...parsedFilePath,
        formattedDir: isWindows() ? parsedFilePath.dir.replace(new RegExp(/\\/, 'g'), '/') : parsedFilePath.dir,
        projectDir:
            (contextDetails &&
                contextDetails[0] &&
                (isWindows()
                    ? parsedFilePath.dir
                          .substring(parsedFilePath.dir.indexOf(contextDetails[0].name))
                          .replace(new RegExp(/\\/, 'g'), '/')
                    : parsedFilePath.dir.substring(parsedFilePath.dir.indexOf(contextDetails[0].name)))) ||
            null,
        dirName: parsedFilePath.dir.split('/').pop(),
        context: contextDetails[0] || null,
    };
    return parsedOutput;

    // const os = process.platform;
    // const win = os.startsWith('win');
    // const systemFilePathArray: string[] = !win ? systemFilePath.split('/') : systemFilePath.split('\\');

    // let fileName = systemFilePathArray && systemFilePathArray.pop();
    // const fileExtension = fileName && fileName.substring(fileName.indexOf('.') + 1);
    // fileName = fileName && fileName.substring(0, fileName.indexOf('.'));
    // const folderName = systemFilePathArray && systemFilePathArray.slice(-1).pop();
    // const context =
    //     (contextDetails &&
    //         contextDetails.length &&
    //         contextDetails.length > 1 &&
    //         contextDetails
    //             .map((context: { name: string }) => systemFilePathArray.includes(context.name) && context)
    //             .filter(Boolean)) ||
    //     contextDetails;

    // const projectPath = context && context.length && systemFilePath.substring(systemFilePath.indexOf(context[0].name));
    // const projectPathArray = !win ? projectPath.split('/') : projectPath.split('\\');
    // projectPathArray.pop();
    // const folderPath = !win ? projectPathArray.join('/') : projectPathArray.join('\\');

    // return {
    //     fileName,
    //     fileExtension,
    //     folderPath,
    //     folderName,
    //     context: context[0],
    // };
};

function isDirEmpty(dirname: string) {
    return fs.promises.readdir(dirname).then((files) => {
        return files.length === 0;
    });
}

function splitArrayIntoChunks(arr: any[], chunkSize: number) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
}

function flattenJSONObject(obj: any) {
    const flatten = (data: any, prefix = '') =>
        Object.keys(data).reduce((acc: any, key: any) => {
            const pre = prefix.length ? `${prefix}.` : ('' as any);
            if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
                Object.assign(acc, flatten(data[key], pre + key));
            } else {
                let value = data[key];

                if (typeof value === undefined || value === null) {
                    value = '';
                }

                acc[pre + key] = value.toString();
            }
            return acc;
        }, {});

    return flatten(obj);
}

export {
    flattenJSONObject,
    splitArrayIntoChunks,
    isWindows,
    guid,
    assignObject,
    uniqueArrayByKey,
    sfmc_context,
    getFilePathDetails,
    isDirEmpty,
};
