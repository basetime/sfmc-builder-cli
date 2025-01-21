import { getRootPath, fileExists, appendFile } from '../fileSystem';
import { createFile } from '../fileSystem';
import fs from 'fs';
import path from 'path';
const fsPromises = require('fs').promises;

const resolvedRoot = path.resolve('./');
const normalizedRoot = path.normalize('./');
const normalizedENVPath = path.join(normalizedRoot, '.sfmc.env.json');
const normalizedTemplateENVPath = path.join(normalizedRoot, '.sfmc.env.json');
const normalizedGitIgnorePath = path.join(normalizedRoot, '.gitignore');
const normalizedManifestJSONPath = path.join(normalizedRoot, '.local.manifest.json');
const normalizedPackageManifestJSONPath = path.join(normalizedRoot, 'package.manifest.json');
/**
 * Reads .sfmc.config.json file
 *
 * @returns
 */
const readBldrSfmcEnv = async () => {
    const rootPath = (await getRootPath()) || path.normalize('./');
    // Get manifest JSON file
    const envPath = path.join(rootPath, '.sfmc.env.json');
    if (fileExists(envPath)) {
        const config = fs.readFileSync(envPath);
        return JSON.parse(config.toString());
    }
};

/**
 * Reads .sfmc.config.json file
 *
 * @returns
 */
const readBldrSfmcEnvTemplate = async () => {
    const rootPath = (await getRootPath()) || path.normalize('./');
    // Get manifest JSON file
    const envPath = path.join(rootPath, 'template.sfmc.env.json');
    if (fileExists(envPath)) {
        const config = fs.readFileSync(envPath);
        return JSON.parse(config.toString());
    }
};

const createEnv = async (config = null, template = true) => {
    const configTemplate = config || {
        client_id: '',
        client_secret: '',
        authentication_uri: '',
        parentMID: '',
    };

    const rootPath = (await getRootPath()) || path.normalize('./');
    // Get manifest JSON file
    const envPath = path.join(rootPath, '.sfmc.env.json');
    const templateEnvPath = path.join(rootPath, 'template.sfmc.env.json');

    await createFile(envPath, JSON.stringify(configTemplate, null, 2));

    if (template) {
        await createFile(templateEnvPath, JSON.stringify(configTemplate, null, 2));
    }

    if (fileExists(path.join(rootPath, '.gitignore'))) {
        await appendFile(path.join(rootPath, '.gitignore'), `\n#sfmc env \n.sfmc.env.json`);
    } else {
        await createFile(path.join(rootPath, '.gitignore'), `\n#sfmc env \n.sfmc.env.json`);
    }
};

const scrubBldrSfmcEnv = async (content: string) => {
    const rootPath = (await getRootPath()) || path.normalize('./');
    // Get manifest JSON file
    const envPath = path.join(rootPath, '.sfmc.env.json');

    if (fileExists(envPath)) {
        const config = await readBldrSfmcEnv();

        for (const c in config) {
            const key = c;
            const value = config[c];
            if (value !== '' && content.match(value)) {
                content = content.replace(value, `{{${key}}}`);
            }
        }
    }

    return content;
};

const replaceBldrSfmcEnv = async (content: string) => {
    const dirPath = await getRootPath();
    if (fileExists(`${dirPath}/.sfmc.env.json`)) {
        const config = await readBldrSfmcEnv();
        console.log({config})
        for (const c in config) {
            const key = c;
            const value = config[c];
            if (content.match(key)) {
                content = (value && value !== '' && content.replace(`{{${key}}}`, value)) || content;
            }
        }
    }

    return content;
};

/**
 * Reads .sfmc.config.json file
 *
 * @returns
 */
const readManifest = async () => {
    const rootPath = (await getRootPath()) || path.normalize('./');
    // Get manifest JSON file
    const manifestPath = path.join(rootPath, '.local.manifest.json');

    if (fileExists(manifestPath)) {
        const config = fs.readFileSync(manifestPath);
        return JSON.parse(config.toString());
    }
};
/**
 * Reads .sfmc.config.json file
 *
 * @returns
 */
const readPackageManifest = async () => {
    const rootPath = (await getRootPath()) || path.normalize('./');
    // Get manifest JSON file
    const packagePath = path.join(rootPath, 'package.manifest.json');

    if (fileExists(packagePath)) {
        const config = fs.readFileSync(packagePath);
        return JSON.parse(config.toString());
    }
};

const createAllDirectories = (folderPaths: { folderPath: string }[]) => {
    const directories = folderPaths.map(({ folderPath }) => path.normalize(folderPath));
    for (const f in directories) {
        const dir = directories[f];
        createDirectory(dir);
    }
};

const createDirectory = async (dir: string) => {
    try {
        await fsPromises.access(dir, fs.constants.F_OK);
    } catch (e) {
        await fsPromises.mkdir(dir, { recursive: true });
    }
};

export {
    readBldrSfmcEnv,
    readBldrSfmcEnvTemplate,
    replaceBldrSfmcEnv,
    scrubBldrSfmcEnv,
    createEnv,
    readManifest,
    readPackageManifest,
    createAllDirectories,
    createDirectory,
    resolvedRoot,
    normalizedRoot,
    normalizedENVPath,
    normalizedTemplateENVPath,
    normalizedGitIgnorePath,
    normalizedManifestJSONPath,
    normalizedPackageManifestJSONPath,
};
