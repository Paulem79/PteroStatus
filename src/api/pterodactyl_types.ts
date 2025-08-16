interface HttpException {
  errors?: Array<{
    code: string;
    status: string;
    detail: string;
  }>;
}

enum NodeType {
  List = "list",
  Node = "node",
}

export interface Nodes extends HttpException {
  object: NodeType;
  data: [
    {
      object: NodeType;
      attributes: NodeAttributes
    },
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

export interface DetailedNodeAttributes {
    allocated_resources: {
        memory: number;
        disk: number;
        cpu: number;
    } | null;
    relationships: {
        allocations: { object: "list"; data: object[] };
        servers: { object: "list"; data: object[] };
    };
}

export interface NodeAttributes {
    id: number;
    uuid: string;
    public: boolean;
    name: string;
    description: string | null;
    location_id: number | null;
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
    daemon_connect: number;
    daemon_base: string;
    created_at: string;
    updated_at: string;
    tags: [] | null;
    cpu: number | null;
    cpu_overallocate: number | null;
    daemon_sftp_alias: string | null;
}

export interface SingleNodeAttributes extends NodeAttributes, DetailedNodeAttributes {
}

export interface SingleNode extends HttpException {
  object: NodeType.Node;
  attributes: SingleNodeAttributes
}

export interface ServerResponse extends HttpException {
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
        data: object[];
      };
      variables: {
        object: "list";
        data: object[];
      };
    };
  };
  meta: {
    is_server_owner: boolean;
    user_permissions: string[];
  };
}

export interface ServerResources extends HttpException {
  object: "stats";
  attributes: {
    current_state: "offline" | "stopping" | "running" | "starting";
    is_suspended: boolean;
    resources: {
      memory_bytes: number;
      cpu_absolute: number;
      disk_bytes: number;
      network_rx_bytes: number;
      network_tx_bytes: number;
      uptime: number;
    };
  };
}