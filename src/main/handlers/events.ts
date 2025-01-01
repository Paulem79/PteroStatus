import { Client, ClientEvents } from "npm:discord.js@14.17.0";
import path from "node:path";
import fs from "node:fs";

export interface HandledEvent<Event extends keyof ClientEvents> {
  once?: boolean;
  listener: (...args: ClientEvents[Event]) => void;
  eventType: Event;
}

/**
 * Get the commands, register them
 * @param dir The directory
 * @param eventPath The path to the command directory (from the file where you use the function)
 * @param client (optional) if you want to register commands from the function
 * @param broadcast Broadcast commands registering
 * @returns The commands
 */
export async function getEvents(
  dir: string,
  eventPath: string,
  client: Client
) {
  const events: string[] = [];
  const foldersPath = path.join(dir, eventPath);
  const eventFilesIndividual = fs
    .readdirSync(foldersPath)
    .filter((file) => file.endsWith(".ts"));
  const eventFolders = getDirectories(foldersPath);

  for (const folder of eventFolders) {
    // Grab all the command files from the commands directory you created earlier
    const eventsPath = path.join(foldersPath, folder);
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".ts"));
    await Register(events, eventFiles, eventsPath, client);
  }

  await Register(events, eventFilesIndividual, foldersPath, client);

  let eventsLogger = "";

  events.forEach((file) => {
    eventsLogger += file.replace(".ts", "");
    if (events.indexOf(file) != events.length - 1) eventsLogger += ", ";
  });

  console.log(
    `%c(/) Registered ${events.length} events ! (${eventsLogger})`,
    "color: #22bb33"
  );

  return events;
}

/**
 * Register commands
 * @param events
 * @param commandFiles
 * @param foldersPath
 */
async function Register(
  events: string[],
  commandFiles: string[],
  foldersPath: string,
  client: Client
) {
  for (const file of commandFiles) {
    const filePath = path.join(foldersPath, file);
    const fileURL = `file:///${filePath}`;

    const module = await import(fileURL);
    const event = module.default as HandledEvent<keyof ClientEvents>;

    if (event.once) client.once(event.eventType, event.listener);
    else client.on(event.eventType, event.listener);

    events.push(file);
  }
}

/**
 * Get all directories
 * @param source The source directory
 * @returns Directories
 */
export function getDirectories(source: string) {
  return fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}
