import mysql, {Connection} from "npm:mysql2@3.14.3";

export function getConnection() {
    return mysql.createConnection({
        host: Deno.env.get("DB_HOST"),
        user: Deno.env.get("DB_USER"),
        password: Deno.env.get("DB_PASSWORD"),
        database: Deno.env.get("DB_NAME"),
        port: parseInt(Deno.env.get("DB_PORT") ?? "3306"),
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
        idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
    });
}

export function tryConnection(connection: Connection, callback?: () => void) {
    let connected = false;
    connection.connect((err) => {
        if (err) {
            console.error("Erreur de connexion à la base de données:", err);
            connected = false;
        } else {
            console.log("Connecté à la base de données MySQL");
            if (callback) callback();
            connected = true;
        }
    });

    return connected;
}