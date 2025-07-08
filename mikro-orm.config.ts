import { defineConfig } from "@mikro-orm/postgresql";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import "dotenv/config";

export default defineConfig({
  dbName: "postgres",
  // folder-based discovery setup, using common filename suffix
  entities: ["dist/**/entities/*.js"],
  entitiesTs: ["src/**/entities/*.ts"],
  // we will use the ts-morph reflection, an alternative to the default reflect-metadata provider
  // check the documentation for their differences: https://mikro-orm.io/docs/metadata-providers
  metadataProvider: TsMorphMetadataProvider,
  // enable debug mode to log SQL queries and discovery information
  debug: false,

  clientUrl: process.env.DATABASE_URL,
});
