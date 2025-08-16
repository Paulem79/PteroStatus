import {connection} from "../main.ts";
import {decryptFromStorage, encryptForStorage} from "../crypto.ts";

// Helper générique pour exécuter une requête avec Promesse
function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
        // @ts-ignore: mysql2 typings non fournis sous Deno, on ignore la signature
        connection.query(sql, params, (err: unknown, results: T) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

export async function ensureTables() {
    await query(`CREATE TABLE IF NOT EXISTS pings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(32) NULL,
        name VARCHAR(64) NOT NULL,
        base_url VARCHAR(255) NOT NULL,
        app_key TEXT NOT NULL,
        client_key TEXT NOT NULL,
        channel_id VARCHAR(32) NULL,
        message_id VARCHAR(32) NULL,
        nodes_filter TEXT NULL,
        servers_filter TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_guild_name (guild_id, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
}

export interface PingRow {
    id: number;
    name: string;
    base_url: string;
    app_key: string; // toujours en clair dans l'objet retourné (déchiffré si chiffré en base)
    client_key: string; // idem
    channel_id: string | null;
    message_id: string | null;
    nodes_filter: string | null;
    servers_filter: string | null;
    created_at: Date;
    guild_id: string | null; // ajout
}

async function decryptRow(row: PingRow): Promise<PingRow> {
    // Déchiffre et migre si nécessaire app_key
    const app = await decryptFromStorage(row.app_key);
    if(app.reencrypted) {
        // met à jour silencieusement la base (migration en arrière-plan)
        query(`UPDATE pings SET app_key = ? WHERE id = ?`, [app.reencrypted, row.id]).catch(()=>{});
    }
    // Déchiffre et migre client_key
    const cli = await decryptFromStorage(row.client_key);
    if(cli.reencrypted) {
        query(`UPDATE pings SET client_key = ? WHERE id = ?`, [cli.reencrypted, row.id]).catch(()=>{});
    }
    row.app_key = app.plain ?? "";
    row.client_key = cli.plain ?? "";
    return row;
}

export async function createPing(name: string, baseUrl: string, appKey: string, clientKey: string, guildId: string): Promise<boolean> {
    try {
        const encApp = await encryptForStorage(appKey);
        const encClient = await encryptForStorage(clientKey);
        await query(`INSERT INTO pings (name, base_url, app_key, client_key, guild_id) VALUES (?,?,?,?,?)`, [name, baseUrl, encApp, encClient, guildId]);
        return true;
    } catch (e: unknown) {
        if ((e as { code?: string })?.code === 'ER_DUP_ENTRY') return false;
        throw e;
    }
}

export async function getPing(name: string, guildId?: string): Promise<PingRow | undefined> {
    let rows: PingRow[];
    if (guildId) {
        rows = await query(`SELECT * FROM pings WHERE name = ? AND guild_id = ? LIMIT 1`, [name, guildId]) as PingRow[];
    } else {
        rows = await query(`SELECT * FROM pings WHERE name = ? LIMIT 1`, [name]) as PingRow[];
    }
    const row = rows[0];
    if(!row) return undefined;
    return await decryptRow(row);
}

export async function setPingChannel(name: string, channelId: string, guildId?: string): Promise<boolean> {
    const ping = await getPing(name, guildId);
    if (!ping) return false;
    await query(`UPDATE pings SET channel_id = ? WHERE id = ?`, [channelId, ping.id]);
    return true;
}

export async function setPingMessageId(name: string, messageId: string, guildId?: string) {
    const ping = await getPing(name, guildId);
    if(!ping) return false;
    await query(`UPDATE pings SET message_id = ? WHERE id = ?`, [messageId, ping.id]);
    return true;
}

export async function updatePingNodesFilter(name: string, nodeIds: number[], guildId?: string) {
    const ping = await getPing(name, guildId); if(!ping) return false;
    await query(`UPDATE pings SET nodes_filter = ? WHERE id = ?`, [JSON.stringify(nodeIds), ping.id]);
    return true;
}

export async function updatePingServersFilter(name: string, serverIds: string[], guildId?: string) {
    const ping = await getPing(name, guildId); if(!ping) return false;
    await query(`UPDATE pings SET servers_filter = ? WHERE id = ?`, [JSON.stringify(serverIds), ping.id]);
    return true;
}

export async function listPings(guildId?: string): Promise<PingRow[]> {
    let rows: PingRow[];
    if (guildId) {
        rows = await query(`SELECT * FROM pings WHERE guild_id = ? ORDER BY created_at DESC`, [guildId]) as PingRow[];
    } else {
        rows = await query(`SELECT * FROM pings ORDER BY created_at DESC`) as PingRow[];
    }
    return await Promise.all(rows.map(r=>decryptRow(r)));
}

export async function getAllPings(): Promise<PingRow[]> {
    const rows = await query(`SELECT * FROM pings`) as PingRow[]; // @ts-ignore: Typings mysql2 absents sous Deno pour ce wrapper
    return await Promise.all(rows.map(r=>decryptRow(r)));
}

export async function deletePing(name: string, guildId?: string): Promise<boolean> {
    const ping = await getPing(name, guildId);
    if(!ping) return false;
    await query(`DELETE FROM pings WHERE id = ?`, [ping.id]);
    return true;
}

export async function updatePingCredentials(name: string, guildId: string | undefined, appKey?: string, clientKey?: string): Promise<boolean> {
    const ping = await getPing(name, guildId);
    if(!ping) return false;
    const fields: string[] = [];
    const params: unknown[] = [];
    if(appKey){ fields.push("app_key = ?"); params.push(await encryptForStorage(appKey)); }
    if(clientKey){ fields.push("client_key = ?"); params.push(await encryptForStorage(clientKey)); }
    if(fields.length === 0) return true; // rien à faire
    params.push(ping.id);
    await query(`UPDATE pings SET ${fields.join(", ")} WHERE id = ?`, params);
    return true;
}

export async function getPingById(id: number): Promise<PingRow | undefined> {
    const rows = await query(`SELECT * FROM pings WHERE id = ? LIMIT 1`, [id]) as PingRow[];
    const row = rows[0];

    if(!row) return undefined;

    return await decryptRow(row);
}

export async function updatePingName(id: number, name: string): Promise<boolean> {
    const ping = await getPingById(id);

    if(!ping) return false;

    await query(`UPDATE pings SET name = ? WHERE id = ?`, [name, id]);
    return true;
}
