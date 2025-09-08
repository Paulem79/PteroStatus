import mysql, {Connection} from "npm:mysql2";

export function getConnection(keepAlive = true) {
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
    enableKeepAlive: keepAlive,
    keepAliveInitialDelay: 0,
  });
}

export function tryConnection(connection: Connection, onSuccess?: () => void) {
  connection.connect((err) => {
    if (err) {
      console.error("Erreur de connexion à la base de données:", err);
    } else {
      console.log("Connecté à la base de données MySQL");
      if (onSuccess) onSuccess();
    }
  });
}

export function isConnectionOpen(connection: Connection) {
  // mysql2 expose .state, qui vaut 'disconnected' si la connexion est fermée
  // sinon, c'est 'connected' ou 'authenticated'
  // @ts-ignore
  return connection && connection.state === 'connected';
}

export function reconnect(connection: Connection, cb?: () => void) {
  // Ferme puis rouvre la connexion
  connection.destroy();
  const newConn = getConnection();
  tryConnection(newConn, cb);
  return newConn;
}
