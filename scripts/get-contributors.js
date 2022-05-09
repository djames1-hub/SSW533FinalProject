import { Octokit } from '@octokit/core';
import commandLineArgs from 'command-line-args';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const getArguments = () => {
    const optionDefinitions = [
        { name: 'owner', alias: 'o', type: String },
        { name: 'repo', alias: 'r', type: String },
        { name: 'folderName', alias: 'f', type: String }
    ];

    return commandLineArgs(optionDefinitions); 
}

const request = async (request, { owner, repo }) => {
    const octokit = new Octokit({
        auth: process.env.GITHUBTOKEN
    });
    
    try {
        return await octokit.request(`GET /repos/{owner}/{repo}/stats/${request}`, {
            owner, repo
        });
    } catch (error) {
        throw error;
    }
};


    

(async () => {

    const { owner, repo, folderName } = getArguments();

    const requests = [
        'contributors',
    ];

    const responses = await Promise.all(requests.map(async req => await request(req, { owner, repo })));

    if (!Array.isArray(responses)) {
        console.log(responses);
    } else { 
        const __fileName = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__fileName);

        for (let i = 0; i < responses.length; i++) {
            console.log('Status', responses[i].status);
            fs.writeFile(path.join(__dirname, `/raw-data/${folderName}/${requests[i]}.json`), JSON.stringify(responses[i].data), (error) => {
                if (error) {
                    console.log(error);
                } else {
                    console.log(`${requests[i]}.json was created successfully!`);
                }
            });
        }
        
    }

})();
