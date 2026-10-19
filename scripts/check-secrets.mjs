// Deliberately reports paths and object IDs only, never matched credential values.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});
const patterns=[['OpenAI credential',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/],['GitHub credential',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],['AWS access key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['populated environment key',/^[ \t]*OPENAI_API_KEY[ \t]*=[ \t]*["']?[^\s"']{12,}/m]];
let findings=0,blobs=0;
function scan(text,label){for(const [name,pattern] of patterns)if(pattern.test(text)){console.error(`${name} detected in ${label}; value redacted.`);findings++;}}
const files=git('ls-files','-z').split('\0').filter(Boolean);
for(const file of files){
 if(/(^|\/)\.env(?:\..*)?$/.test(file)&&!file.endsWith('.env.example')){console.error(`Private environment file is tracked: ${file}`);findings++;}
 scan(readFileSync(file,'utf8'),file);
}
for(const row of git('rev-list','--objects','--all').trim().split('\n')){
 const [sha,...path]=row.split(' ');if(git('cat-file','-t',sha).trim()!=='blob')continue;
 blobs++;scan(git('cat-file','-p',sha),`Git object ${sha} (${path.join(' ')})`);
}
console.log(`Checked ${files.length} tracked working files and ${blobs} reachable local Git blobs. ${findings} potential secrets.`);
if(findings)process.exitCode=1;
