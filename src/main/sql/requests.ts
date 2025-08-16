import {connection} from "../main.ts";

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
    app_key: string;
    client_key: string;
    channel_id: string | null;
    message_id: string | null;
    nodes_filter: string | null;
    servers_filter: string | null;
    created_at: Date;
    guild_id: string | null; // ajout
}

export async function createPing(name: string, baseUrl: string, appKey: string, clientKey: string, guildId: string): Promise<boolean> {
    try {
        await query(`INSERT INTO pings (name, base_url, app_key, client_key, guild_id) VALUES (?,?,?,?,?)`, [name, baseUrl, appKey, clientKey, guildId]);
        return true;
    } catch (e: unknown) {
        if ((e as { code?: string })?.code === 'ER_DUP_ENTRY') return false;
        throw e;
    }
}

export async function getPing(name: string, guildId?: string): Promise<PingRow | undefined> {
    if (guildId) {
        const rows = await query(`SELECT * FROM pings WHERE name = ? AND guild_id = ? LIMIT 1`, [name, guildId]) as PingRow[];
        return rows[0];
    }
    const rows = await query(`SELECT * FROM pings WHERE name = ? LIMIT 1`, [name]) as PingRow[];
    return rows[0];
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
    if (guildId) {
        return await query(`SELECT * FROM pings WHERE guild_id = ? ORDER BY created_at DESC`, [guildId]) as PingRow[];
    }
    return await query(`SELECT * FROM pings ORDER BY created_at DESC`) as PingRow[];
}

export async function getAllPings(): Promise<PingRow[]> {
    // @ts-ignore: Typings mysql2 absents sous Deno pour ce wrapper
    return await query(`SELECT * FROM pings`) as PingRow[];
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
    if(appKey){ fields.push("app_key = ?"); params.push(appKey); }
    if(clientKey){ fields.push("client_key = ?"); params.push(clientKey); }
    if(fields.length === 0) return true; // rien à faire
    params.push(ping.id);
    await query(`UPDATE pings SET ${fields.join(", ")} WHERE id = ?`, params);
    return true;
}
