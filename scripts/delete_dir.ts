import axios from 'npm:axios';

import { parseArgs } from "jsr:@std/cli/parse-args";

const flags = parseArgs(Deno.args, {
    string: ["root", "files"]
});

const root = flags.root;
const files = flags.files;

if (!root || !files) {
    console.error("Usage: delete_dir --root <root> --files <files>");
    Deno.exit(1);
}

console.log(`Deleting ${files} from ${root}`);

const serverId = Deno.env.get('PTE_PANEL_ID');
const hostname = Deno.env.get("HOSTNAME");
const userapikey = Deno.env.get('USER_APIKEY');

const deleteData = {
    root: root,
    files: files.split(',')
};
await axios.post(`${hostname}/api/client/servers/${serverId}/files/delete`, deleteData, {
    headers: {
        'Authorization': 'Bearer ' + userapikey,
        'Accept': 'Application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json'
    }
});

console.log('Files deleted successfully');