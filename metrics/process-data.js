import commandLineArgs from 'command-line-args';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const getArguments = () => {
    const optionDefinitions = [
        { name: 'owner', alias: 'o', type: String },
        { name: 'repo', alias: 'r', type: String },
    ];

    return commandLineArgs(optionDefinitions); 
}

const findContributorStartWeek = (weeks) => {
    return weeks.find(({ c }) => c !== 0);
}

const generateCommitHistory = ({ author: { login }, weeks }) => {
    const SECONDS_TO_MILLISECONDS = 1000;

    const startWeek = findContributorStartWeek(weeks);
    const startDate = new Date(startWeek.w * SECONDS_TO_MILLISECONDS);
    return {
        login,
        startDate,
        weeks: weeks.map(({ w, c }) => {
            return {
                date: new Date(w * SECONDS_TO_MILLISECONDS),
                commits: c
            }
        })
    }
}

const getNextYear = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    return new Date(year + 1, month, day);
}

const findMostRecentCommit = (date, repo) => {
    return new Promise((resolve, reject) => {
        const gitlog = spawn(`cd ../../../repos/${repo} && git log`,[`--until="${date.toUTCString()}"`, '--max-count=1'], { shell: true });
        let arr = [];
        gitlog.stdout.on('data', (data) => {
            arr.push(data.toString());
        });

        gitlog.stderr.on('data', (data) => {
            reject(data.toString());
        });

        gitlog.on('close', (code) => {
            resolve(arr.join());
        });

    });
    
}


(async () => {
    const { owner, repo } = getArguments();

    const __fileName = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__fileName);

    const filePath = path.join(__dirname, `/raw-data/${owner}-${repo}/contributors.json`);
    fs.readFile(filePath, async (err, data) => {
        if (err) {
            console.log(err);
        } else {
            const contributors = JSON.parse(data);

            const commitHistories = contributors.map(contributor => generateCommitHistory(contributor));

            const firstCommit = commitHistories.reduce((pre, cur) => {
                return Math.min(pre.startDate.getTime(), cur.startDate.getTime()) === pre.startDate.getTime() ? pre : cur;
            });

            const lastCommit = commitHistories.reduce((pre, cur) => {
                return Math.max(pre.startDate.getTime(), cur.startDate.getTime()) === pre.startDate.getTime() ? pre : cur;
            });


            console.log('First commit:', firstCommit.login, firstCommit.startDate);
            console.log('Last commit', lastCommit.login, lastCommit.startDate);

            console.log('Next date:', getNextYear(firstCommit.startDate));

            const MAX_INTERVAL_COMMITS = 10;
            let nextYear = null;
            let commits = [];
            let recentCommit = null;
            for (let i = 0; i < MAX_INTERVAL_COMMITS; i++) {
    
                nextYear = i === 0 ? getNextYear(firstCommit.startDate) : getNextYear(nextYear);
                recentCommit = await findMostRecentCommit(nextYear, repo)
                commits.push({ 
                    commitHash : /\b[0-9a-f]{5,40}\b/.exec(recentCommit)[0],
                    intervalDate: nextYear           
                });
            }

            console.log(commits);

            // {
            //     login,
            //     startDate,
            //     weeks: weeks.map(({ w, c }) => {
            //         return {
            //             date: new Date(w * SECONDS_TO_MILLISECONDS),
            //             commits: c
            //         }
            //     })
            // }

            const metrics = commits.map(({ intervalDate, commitHash }) => {
                let staffMetrics = commitHistories.map(({ login, startDate, weeks }) => {
                    const w = weeks.filter(({ date }) => date.getTime() <= intervalDate.getTime())
                    const totalCommits = w.reduce((pre, cur) => pre + cur.commits, 0);
                    const time = (intervalDate.getTime() - startDate.getTime()) / (3.154 * Math.pow(10, 10));
                    return { login, totalCommits, time }
                });

                staffMetrics = staffMetrics.filter(metric => metric.time > 0);
                return {
                    commitHash,
                    intervalDate,
                    staffMetrics,
                    numberOfContributors: staffMetrics.length
                    
                }
            });
            
            const processedDatafilePath = path.join(__dirname, `/processed-data/${owner}-${repo}/staff-metrics.json`);
            fs.mkdir(path.join(__dirname, `/processed-data/${owner}-${repo}`), (err) => {
                if (err) {
                    console.log(err);
                } else {
                    fs.writeFile(processedDatafilePath, JSON.stringify(metrics), (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(`staff-metrics.json was created successfully!`);
                        }
                    });
                }
            });
        }
    });
})();