"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDirEmpty = exports.getFilePathDetails = exports.sfmc_context = exports.uniqueArrayByKey = exports.assignObject = exports.guid = exports.isWindows = exports.splitArrayIntoChunks = exports.flattenJSONObject = void 0;
const { sfmc_context_mapping } = require('@basetime/bldr-sfmc-sdk/dist/sfmc/utils/sfmcContextMapping');
const { v4: uuidv4 } = require('uuid');
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const isWindows = () => process.platform.startsWith('win');
exports.isWindows = isWindows;
/**
 *
 * @returns GUID
 */
const guid = () => uuidv4();
exports.guid = guid;
/**
 *
 * @param obj
 * @returns
 */
const assignObject = (obj) => Object.assign({}, obj);
exports.assignObject = assignObject;
/**
 *
 * @param array
 * @param key
 * @returns
 */
const uniqueArrayByKey = (array, key) => [...new Map(array.map((item) => [item[key], item])).values()];
exports.uniqueArrayByKey = uniqueArrayByKey;
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
const sfmc_context = (systemFilePath) => sfmc_context_mapping.filter((context) => new RegExp(context.name).test(systemFilePath));
exports.sfmc_context = sfmc_context;
/**
 *
 * @param systemFilePath
 * @returns
 */
const getFilePathDetails = (systemFilePath) => {
    const contextDetails = sfmc_context(systemFilePath);
    const parsedFilePath = path_1.default.parse(systemFilePath);
    const parsedOutput = Object.assign(Object.assign({}, parsedFilePath), { formattedDir: isWindows() ? parsedFilePath.dir.replace(new RegExp(/\\/, 'g'), '/') : parsedFilePath.dir, projectDir: (contextDetails &&
            contextDetails[0] &&
            (isWindows()
                ? parsedFilePath.dir
                    .substring(parsedFilePath.dir.indexOf(contextDetails[0].name))
                    .replace(new RegExp(/\\/, 'g'), '/')
                : parsedFilePath.dir.substring(parsedFilePath.dir.indexOf(contextDetails[0].name)))) ||
            null, dirName: parsedFilePath.dir.split('/').pop(), context: contextDetails[0] || null });
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
exports.getFilePathDetails = getFilePathDetails;
function isDirEmpty(dirname) {
    return fs_1.default.promises.readdir(dirname).then((files) => {
        return files.length === 0;
    });
}
exports.isDirEmpty = isDirEmpty;
function splitArrayIntoChunks(arr, chunkSize) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
}
exports.splitArrayIntoChunks = splitArrayIntoChunks;
function flattenJSONObject(obj) {
    const flatten = (data, prefix = '') => Object.keys(data).reduce((acc, key) => {
        const pre = prefix.length ? `${prefix}.` : '';
        if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
            Object.assign(acc, flatten(data[key], pre + key));
        }
        else {
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
exports.flattenJSONObject = flattenJSONObject;
