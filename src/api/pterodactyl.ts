interface HttpException {
    errors: Array<{
        code: string;
        status: string;
        detail: string;
    }>;
}

enum NodeType {
    List = "list",
    Node = "node",
}

interface Nodes extends HttpException {
    object: NodeType;
    data: [
        {
            object: NodeType;
            attributes: {
                id: number;
                uuid: string;
                public: boolean;
                name: string;
                description: string | null;
                // PTERODACTYL ONLY
                location_id: number | null;
                // END PTERODACTYL ONLY
                fqdn: string;
                scheme: "https" | "http";
                behind_proxy: boolean;
                maintenance_mode: boolean;
                memory: number;
                memory_overallocate: number;
                disk: number;
                disk_overallocate: number;
                upload_size: number;
                daemon_listen: number;
                daemon_sftp: number;
                daemon_base: string;
                created_at: string;
                updated_at: string;
                // PELICAN ONLY
                tags: [] | null;
                cpu: number | null;
                cpu_overallocate: number | null;
                daemon_sftp_alias: string | null;
                allocated_resources: {
                    memory: number;
                    disk: number;
                    cpu: number;
                } | null;
                // END PELICAN ONLY
            };
        }
    ];
    meta: {
        pagination: {
            total: number;
            count: number;
            per_page: number;
            current_page: number;
            total_pages: number;
            links: Record<string | number | symbol, never>;
        };
    };
}

interface ServerResponse extends HttpException {
    object: "server";
    attributes: {
        server_owner: boolean;
        identifier: string;
        internal_id: number;
        uuid: string;
        name: string;
        node: string;
        is_node_under_maintenance: boolean;
        sftp_details: {
            ip: string;
            // PELICAN ONLY
            alias: string | null;
            // END PELICAN ONLY
            port: number;
        };
        description: string;
        limits: {
            memory: number;
            swap: number;
            disk: number;
            io: number;
            cpu: number;
            threads: number | null;
            oom_disabled: boolean;
        };
        invocation: string;
        docker_image: string;
        egg_features: string[] | null;
        feature_limits: {
            databases: number;
            allocations: number;
            backups: number;
        };
        status: string | null;
        is_suspended: boolean;
        is_installing: boolean;
        is_transferring: boolean;
        relationships: {
            allocations: {
                object: "list";
                data: any[];
            };
            variables: {
                object: "list";
                data: any[];
            };
        };
    };
    meta: {
        is_server_owner: boolean;
        user_permissions: string[];
    };
}

export async function getNodes(
    hostname: string,
    user_apikey: string
): Promise<Nodes | undefined> {
    try {
        const response = await fetch(`${hostname}/api/application/nodes`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${user_apikey}`,
            },
            credentials: "include",
        });
        const data = (await response.json()) as Nodes;

        if (data?.errors) return undefined;

        return data;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}


export async function getServer(
    hostname: string,
    user_apikey: string,
    server_id: string
): Promise<ServerResponse | undefined> {
    try {
        const response = await fetch(`${hostname}/api/client/servers/${server_id}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${user_apikey}`,
            },
            credentials: "include",
        });
        const data = (await response.json()) as ServerResponse;

        if (data?.errors) return undefined;

        return data;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}
