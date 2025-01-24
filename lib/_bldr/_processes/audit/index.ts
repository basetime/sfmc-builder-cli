import { initiateBldrSDK } from '../../../_bldr_sdk';
import { Argv } from '../../../_types/Argv';
import { displayArrayOfStrings, displayLine, displayObject } from '../../../_utils/display';
import { State } from '../state';
import { BLDR_Client } from '@basetime/bldr-sfmc-sdk/lib/cli/types/bldr_client';
import { flattenJSONObject, splitArrayIntoChunks } from '../../_utils';
import { createDirectory, createFile } from '../../../_utils/fileSystem';
import json2md from 'json2md';
import { json2csv } from 'json-2-csv';
import { json } from 'stream/consumers';
import sfmc_context_map from '@basetime/bldr-sfmc-sdk/dist/sfmc/utils/sfmcContextMapping';
import pMap from 'p-map';
import { getProperties } from 'sfmc-soap-object-reference';

import fs from 'fs';
import path from 'path';

const { getState, allowTracking, debug } = new State();
const rawResponsesBasePath = './audit/raw_api_responses';

/**
 * Handles all Configuration commands
 * @property {object} coreConfiguration
 * @property {object} stateConfiguration
 */
export class Audit {
    constructor() {}
    /**
     * Initiate the setting of a Configuration
     * Prompts user input
     * Tests/Gathers all child business unit Names and MIDs
     * Saves configuration to config file
     * Sets configuration to state management file
     * @param argv
     *
     */
    initiateAudit = async (argv: Argv) => {
        try {
            const sdk = await initiateBldrSDK();
            createDirectory(`${rawResponsesBasePath}`);

            const deAudit = await this.auditJSON();
            // await this.auditDataExtensions(sdk);
            // await this.auditAutomations(sdk);
            // await this.auditBulkSoap(sdk);
            // await this.auditBulkRest(sdk);

            console.log({ deAudit });
        } catch (err: any) {
            err.message && displayLine(err.message, 'error');
            return err;
        }
    };

    private auditJSON = async () => {
        const auditKeys = ['ObjectID', 'CustomerKey', 'ID', 'objectId', 'customerKey', 'id'];
        const dataRaw = fs.readFileSync(`./audit/raw_api_responses/json/automations.json`);
        const data = JSON.parse(dataRaw.toString());
        return data.map((item: any) => {
            const keys = Object.keys(item);
            const objectAuditKeys = keys.map((key) => (auditKeys.includes(key) && item[key]) || null).filter(Boolean);
            return objectAuditKeys;
        });
    };

    private writeLocalFiles = async (data: any, fileName: string) => {
        createFile(`${rawResponsesBasePath}/csv/${fileName}.csv`, json2csv(data));
        createFile(`${rawResponsesBasePath}/json/${fileName}.json`, data);
    };

    private auditBulkRest = async (sdk: BLDR_Client) => {
        const requestParams = [
            'interaction/v1/interactions',
            'asset/v1/content/assets',
            'interaction/v1/eventDefinitions',
            'contacts/v1/attributeSetDefinitions',
        ];

        for (const r in requestParams) {
            const param = requestParams[r];
            const paramId = param.split('/')[param.split('/').length - 1].toLowerCase();
            displayLine(`Fetching ${param}...`, 'progress');
            const request = await sdk.sfmc.client.rest.getBulk(param);
            // request.object = param;

            if (request && request.items) {
                this.writeLocalFiles(request.items, paramId);
            }
        }
    };

    private auditBulkSoap = async (sdk: BLDR_Client) => {
        const requestParams = [
            'EmailSendDefinition',
            'ExtractDefinition',
            'FileTrigger',
            'FilterDefinition',
            'ImportDefinition',
            'QueryDefinition',
            'TriggeredSendDefinition',
        ];
        for (const r in requestParams) {
            const param = requestParams[r];
            let properties = getProperties(param);

            if (param === 'EmailSendDefinition') {
                properties = properties.filter(
                    (p: string) => !p.includes('DeliveryProfile') && !p.includes('SendWindowCloses')
                );
            }

            displayLine(`Fetching ${param}...`, 'progress');
            const request = await sdk.sfmc.client.soap.retrieveBulk(param, properties, {
                filter: {
                    leftOperand: 'Name',
                    operator: 'isNotNull',
                    rightOperand: '',
                },
            });

            request.object = param;

            if (request && request.Results) {
                this.writeLocalFiles(request.Results, param.toLowerCase());
            }
        }
    };

    private auditAutomations = async (sdk: BLDR_Client) => {
        const RootResp = await sdk.sfmc.folder.search({
            contentType: 'automations',
            searchKey: 'Name',
            searchTerm: 'my automations',
        });

        const rootId = RootResp && RootResp.Results && RootResp.Results[0] && RootResp.Results[0].ID;
        const automationFolders = await sdk.sfmc.folder.getSubfoldersRecursive({
            contentType: 'automations',
            categoryId: rootId,
        });

        const folderIds = automationFolders.map((folder: { [key: string]: any }) => ({
            id: folder.ID,
            name: folder.Name,
        }));

        folderIds.push(rootId);

        const chunks = splitArrayIntoChunks(folderIds, 10);

        displayLine('Fetching Automations...', 'progress');
        displayLine(`Total Automation Folders: ${folderIds.length}`, 'info');

        const mapFn = async (folder: { id: number; name: string }) => {
            const subResponse = await sdk.cli.automationStudio.gatherAssetsByCategoryId({
                contentType: 'automations',
                categoryId: folder.id,
            });

            subResponse.assets &&
                subResponse.assets.length &&
                setTimeout(() => {
                    displayLine(
                        `Fetching Automation Response from ${folder.name}: ${subResponse.assets.length}...`,
                        'progress'
                    );
                }, 2000);

            return subResponse;
        };

        const requests = await Promise.all(
            chunks.map(async (chunk, i) => {
                displayLine(`Chunk array ${i}: ${chunk.length}`, 'info');

                const results = [];
                for (const folder of chunk) {
                    results.push(await mapFn(folder));
                }

                return results;
            })
        );

        const requestResponses = requests.flat().flatMap((request: any) => request.assets);
        const requestDefinitionResponses = requests
            .flat()
            .flatMap((request: any) => request.formattedAutomationDefinitions);
        const requestDependenciesResponses = requests
            .flat()
            .flatMap((request: any) => request.formattedAutomationDependencies);

        requestResponses && displayLine(`Total Automations: ${requestResponses.length}`, 'info');
        this.writeLocalFiles(requestResponses, 'automations');
        this.writeLocalFiles(requestDefinitionResponses, 'automation_definitions');
        this.writeLocalFiles(requestDependenciesResponses, 'automation_dependencies');

        createFile(`${rawResponsesBasePath}/automations-raw.json`, requests);
    };

    private auditDataExtensions = async (sdk: BLDR_Client) => {
        try {
            const RootResp = await sdk.sfmc.folder.search({
                contentType: 'dataextension',
                searchKey: 'CustomerKey',
                searchTerm: 'dataextension_default',
            });

            const rootId = RootResp && RootResp.Results && RootResp.Results[0] && RootResp.Results[0].ID;
            const deFolders = await sdk.sfmc.folder.getSubfoldersRecursive({
                contentType: 'dataextension',
                categoryId: rootId,
            });

            const folderIds = deFolders.map((folder: { [key: string]: any }) => ({ id: folder.ID, name: folder.Name }));
            folderIds.push(rootId);

            const chunks = splitArrayIntoChunks(folderIds, 10);

            displayLine('Fetching Data Extensions...', 'progress');
            displayLine(`Total Data Extension Folders: ${folderIds.length}`, 'info');

            const requests = await Promise.all(
                chunks.map(async (chunk) => {
                    const ids = chunk.map((folder) => folder.id);
                    const subRequest = await sdk.sfmc.emailStudio.getAssetsByFolderArray(ids);

                    return subRequest;
                })
            );

            const requestResponses = requests.map((request) => request.Results).flat();
            requestResponses && displayLine(`Total Data Extensions: ${requestResponses.length}`, 'info');
            this.writeLocalFiles(requestResponses, 'data_extensions');

            return requestResponses;
        } catch (err: any) {
            err.message && displayLine(err.message, 'error');
            return err;
        }
    };
}
