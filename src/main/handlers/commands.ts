import {
  AnySelectMenuInteraction,
  ApplicationCommandDataResolvable,
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  ModalSubmitInteraction,
  SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from "../../deps.ts";
import path from "node:path";
import fs from "node:fs";

export class Command {
  data!: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  interaction?: ChatInputCommandInteraction<"cached">;
  execute!: (
    interaction: ChatInputCommandInteraction<"cached">,
  ) => Promise<void> | void;
  autocomplete?: (
    interaction: AutocompleteInteraction<"cached">,
  ) => Promise<void> | void;
  selectmenu?: (
    interaction: AnySelectMenuInteraction<"cached">,
  ) => Promise<void> | void;
  modal?: (
    interaction: ModalSubmitInteraction<"cached">,
  ) => Promise<void> | void;
  button?: (interaction: ButtonInteraction<"cached">) => Promise<void> | void;
  attributes?: Attributes;

  constructor(options?: {
    data: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
    execute: (
      interaction: ChatInputCommandInteraction<"cached">,
    ) => Promise<void> | void;
    autocomplete?: (
      interaction: AutocompleteInteraction<"cached">,
    ) => Promise<void> | void;
    selectmenu?: (
      interaction: AnySelectMenuInteraction<"cached">,
    ) => Promise<void> | void;
    modal?: (
      interaction: ModalSubmitInteraction<"cached">,
    ) => Promise<void> | void;
    button?: (interaction: ButtonInteraction<"cached">) => Promise<void> | void;
    attributes?: Attributes;
  }) {
    if (!options) return;
    this.data = options.data;
    this.execute = options.execute;
    this.autocomplete = options.autocomplete;
    this.selectmenu = options.selectmenu;
    this.modal = options.modal;
    this.button = options.button;
    this.attributes = options.attributes;
  }
}

export interface Attributes {
  cooldown?: number;
}

/**
 * Get the commands, register them
 * @param dir The directory
 * @param commandPath The path to the command directory (from the file where you use the function)
 * @param client used to register commands from the function
 * @returns The commands
 */
export async function getCommands(
  dir: string,
  commandPath: string,
  client: Client<true>,
) {
  const cmd: Command[] = [];
  const foldersPath = path.join(dir, commandPath);
  const commandFilesIndividual = fs
    .readdirSync(foldersPath)
    .filter((file) => file.endsWith(".ts"));
  const commandFolders = getDirectories(foldersPath);

  for (const folder of commandFolders) {
    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".ts"));
    await Register(cmd, commandFiles, commandsPath);
  }

  await Register(cmd, commandFilesIndividual, foldersPath);

  let commandsLogger = "";

  for (const c of cmd) {
    commandsLogger += c.data.name;
    if (cmd.indexOf(c) != cmd.length - 1) commandsLogger += ", ";
  }

  console.log(
    `%c(/) Registering ${cmd.length} commands... (${commandsLogger})`,
    "color: #ff9900",
  );

  await client.application.commands.set(
    cmd.map((c) => c.data.toJSON()) as ApplicationCommandDataResolvable[],
  );

  console.log(
    `%c(/) Registered ${client.application.commands.cache.size} commands !`,
    "color: #22bb33",
  );

  return cmd;
}

/**
 * Register commands
 * @param cmd
 * @param commandFiles
 * @param foldersPath
 */
async function Register(
  cmd: Command[],
  commandFiles: string[],
  foldersPath: string,
) {
  for (const file of commandFiles) {
    const filePath = path.join(foldersPath, file);
    const fileURL = `file:///${filePath}`;
    const module = await import(fileURL);
    const command = module.default as Command | undefined;
    if (command && command.data) {
      cmd.push(command);
    }
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
