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

export async function getNodes(
  hostname: string,
  apikey: string
): Promise<Nodes | undefined> {
  try {
    const response = await fetch(`${hostname}/api/application/nodes`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apikey}`,
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
