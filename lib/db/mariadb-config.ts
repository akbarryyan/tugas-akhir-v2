type MariadbConfig = {
  allowPublicKeyRetrieval: boolean;
  database: string;
  host: string;
  password: string;
  port: number;
  user: string;
};

export function getMariadbConfigFromUrl(databaseUrl: string): MariadbConfig {
  const parsedUrl = new URL(databaseUrl);

  if (!parsedUrl.hostname || !parsedUrl.pathname) {
    throw new Error("DATABASE_URL is not a valid MySQL connection string.");
  }

  const database = parsedUrl.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return {
    allowPublicKeyRetrieval: true,
    database,
    host: parsedUrl.hostname,
    password: decodeURIComponent(parsedUrl.password),
    port: parsedUrl.port ? Number(parsedUrl.port) : 3306,
    user: decodeURIComponent(parsedUrl.username),
  };
}
