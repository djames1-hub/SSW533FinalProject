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
        { name: 'fileName', alias: 'f', type: String }
    ];

    return commandLineArgs(optionDefinitions); 
}

const getContributors = async ({ owner, repo }) => {
    const octokit = new Octokit({
        auth: process.env.GITHUBTOKEN
    });
    
    try {
        return await octokit.request('GET /repos/{owner}/{repo}/contributors', {
            owner, repo
        });
    } catch (error) {
        return { error };
    }
};


    

(async () => {

    const { owner, repo, fileName } = getArguments();

    const { data, error } = await getContributors({ owner, repo });

    if (error) {
        console.log(error);
    } else { 
        const __fileName = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__fileName);
        fs.writeFile(path.join(__dirname, `/raw-data/${fileName}.json`), JSON.stringify(data), (error) => {
            if (error) {
                console.log(error);
            } else {
                console.log(`${fileName}.json was created successfully!`);
            }
        });
    }
})();









