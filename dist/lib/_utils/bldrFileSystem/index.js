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
exports.normalizedPackageManifestJSONPath = exports.normalizedManifestJSONPath = exports.normalizedGitIgnorePath = exports.normalizedTemplateENVPath = exports.normalizedENVPath = exports.normalizedRoot = exports.resolvedRoot = exports.createDirectory = exports.createAllDirectories = exports.readPackageManifest = exports.readManifest = exports.createEnv = exports.scrubBldrSfmcEnv = exports.replaceBldrSfmcEnv = exports.readBldrSfmcEnvTemplate = exports.readBldrSfmcEnv = void 0;
const fileSystem_1 = require("../fileSystem");
const fileSystem_2 = require("../fileSystem");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fsPromises = require('fs').promises;
const resolvedRoot = path_1.default.resolve('./');
exports.resolvedRoot = resolvedRoot;
const normalizedRoot = path_1.default.normalize('./');
exports.normalizedRoot = normalizedRoot;
const normalizedENVPath = path_1.default.join(normalizedRoot, '.sfmc.env.json');
exports.normalizedENVPath = normalizedENVPath;
const normalizedTemplateENVPath = path_1.default.join(normalizedRoot, '.sfmc.env.json');
exports.normalizedTemplateENVPath = normalizedTemplateENVPath;
const normalizedGitIgnorePath = path_1.default.join(normalizedRoot, '.gitignore');
exports.normalizedGitIgnorePath = normalizedGitIgnorePath;
const normalizedManifestJSONPath = path_1.default.join(normalizedRoot, '.local.manifest.json');
exports.normalizedManifestJSONPath = normalizedManifestJSONPath;
const normalizedPackageManifestJSONPath = path_1.default.join(normalizedRoot, 'package.manifest.json');
exports.normalizedPackageManifestJSONPath = normalizedPackageManifestJSONPath;
/**
 * Reads .sfmc.config.json file
 *
 * @returns
 */
const readBldrSfmcEnv = () => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = (yield (0, fileSystem_1.getRootPath)()) || path_1.default.normalize('./');
    // Get manifest JSON file
    const envPath = path_1.default.join(rootPath, '.sfmc.env.json');
    if ((0, fileSystem_1.fileExists)(envPath)) {
        const config = fs_1.default.readFileSync(envPath);
        return JSON.parse(config.toString());
    }
});
exports.readBldrSfmcEnv = readBldrSfmcEnv;
/**
 * Reads .sfmc.config.json file
 *
 * @returns
 */
const readBldrSfmcEnvTemplate = () => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = (yield (0, fileSystem_1.getRootPath)()) || path_1.default.normalize('./');
    // Get manifest JSON file
    const envPath = path_1.default.join(rootPath, 'template.sfmc.env.json');
    if ((0, fileSystem_1.fileExists)(envPath)) {
        const config = fs_1.default.readFileSync(envPath);
        return JSON.parse(config.toString());
    }
});
exports.readBldrSfmcEnvTemplate = readBldrSfmcEnvTemplate;
const createEnv = (config = null, template = true) => __awaiter(void 0, void 0, void 0, function* () {
    const configTemplate = config || {
        client_id: '',
        client_secret: '',
        authentication_uri: '',
        parentMID: '',
    };
    const rootPath = (yield (0, fileSystem_1.getRootPath)()) || path_1.default.normalize('./');
    // Get manifest JSON file
    const envPath = path_1.default.join(rootPath, '.sfmc.env.json');
    const templateEnvPath = path_1.default.join(rootPath, 'template.sfmc.env.json');
    yield (0, fileSystem_2.createFile)(envPath, JSON.stringify(configTemplate, null, 2));
    if (template) {
        yield (0, fileSystem_2.createFile)(templateEnvPath, JSON.stringify(configTemplate, null, 2));
    }
    if ((0, fileSystem_1.fileExists)(path_1.default.join(rootPath, '.gitignore'))) {
        yield (0, fileSystem_1.appendFile)(path_1.default.join(rootPath, '.gitignore'), `\n#sfmc env \n.sfmc.env.json`);
    }
    else {
        yield (0, fileSystem_2.createFile)(path_1.default.join(rootPath, '.gitignore'), `\n#sfmc env \n.sfmc.env.json`);
    }
});
exports.createEnv = createEnv;
const scrubBldrSfmcEnv = (content) => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = (yield (0, fileSystem_1.getRootPath)()) || path_1.default.normalize('./');
    // Get manifest JSON file
    const envPath = path_1.default.join(rootPath, '.sfmc.env.json');
    if ((0, fileSystem_1.fileExists)(envPath)) {
        const config = yield readBldrSfmcEnv();
        for (const c in config) {
            const key = c;
            const value = config[c];
            if (value !== '' && content.match(value)) {
                content = content.replace(value, `{{${key}}}`);
            }
        }
    }
    return content;
});
exports.scrubBldrSfmcEnv = scrubBldrSfmcEnv;
const replaceBldrSfmcEnv = (content) => __awaiter(void 0, void 0, void 0, function* () {
    const dirPath = yield (0, fileSystem_1.getRootPath)();
    if ((0, fileSystem_1.fileExists)(`${dirPath}/.sfmc.env.json`)) {
        const config = yield readBldrSfmcEnv();
        console.log({ config });
        for (const c in config) {
            const key = c;
            const value = config[c];
            if (content.match(key)) {
                content = (value && value !== '' && content.replace(`{{${key}}}`, value)) || content;
            }
        }
    }
    return content;
});
exports.replaceBldrSfmcEnv = replaceBldrSfmcEnv;
/**
 * Reads .sfmc.config.json file
 *
 * @returns
 */
const readManifest = () => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = (yield (0, fileSystem_1.getRootPath)()) || path_1.default.normalize('./');
    // Get manifest JSON file
    const manifestPath = path_1.default.join(rootPath, '.local.manifest.json');
    if ((0, fileSystem_1.fileExists)(manifestPath)) {
        const config = fs_1.default.readFileSync(manifestPath);
        return JSON.parse(config.toString());
    }
});
exports.readManifest = readManifest;
/**
 * Reads .sfmc.config.json file
 *
 * @returns
 */
const readPackageManifest = () => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = (yield (0, fileSystem_1.getRootPath)()) || path_1.default.normalize('./');
    // Get manifest JSON file
    const packagePath = path_1.default.join(rootPath, 'package.manifest.json');
    if ((0, fileSystem_1.fileExists)(packagePath)) {
        const config = fs_1.default.readFileSync(packagePath);
        return JSON.parse(config.toString());
    }
});
exports.readPackageManifest = readPackageManifest;
const createAllDirectories = (folderPaths) => {
    const directories = folderPaths.map(({ folderPath }) => path_1.default.normalize(folderPath));
    for (const f in directories) {
        const dir = directories[f];
        createDirectory(dir);
    }
};
exports.createAllDirectories = createAllDirectories;
const createDirectory = (dir) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield fsPromises.access(dir, fs_1.default.constants.F_OK);
    }
    catch (e) {
        yield fsPromises.mkdir(dir, { recursive: true });
    }
});
exports.createDirectory = createDirectory;
