#!/usr/bin/env node

/**
 * MCP Filesystem Server pour VidGenie
 * Permet l'accès sécurisé aux fichiers du projet
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Configuration sécurisée
const ALLOWED_PATHS = [
  '/Users/alyx19/Desktop/ccc/vidgenie-app/src',
  '/Users/alyx19/Desktop/ccc/vidgenie-app/public',
  '/Users/alyx19/Desktop/ccc/vidgenie-app/scripts',
  '/Users/alyx19/Desktop/ccc/vidgenie-app/prisma',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

class VidGenieFilesystemServer {
  constructor() {
    this.server = new Server(
      {
        name: 'vidgenie-filesystem-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  isPathAllowed(filePath) {
    const resolvedPath = path.resolve(filePath);
    return ALLOWED_PATHS.some(allowedPath => 
      resolvedPath.startsWith(path.resolve(allowedPath))
    );
  }

  setupHandlers() {
    // Lister les outils disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'read_file',
            description: 'Lire le contenu d\'un fichier du projet VidGenie',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Chemin vers le fichier à lire',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'write_file',
            description: 'Écrire du contenu dans un fichier',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Chemin vers le fichier à écrire',
                },
                content: {
                  type: 'string',
                  description: 'Contenu à écrire',
                },
              },
              required: ['path', 'content'],
            },
          },
          {
            name: 'list_directory',
            description: 'Lister les fichiers d\'un répertoire',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Chemin vers le répertoire',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'create_directory',
            description: 'Créer un répertoire',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Chemin vers le répertoire à créer',
                },
              },
              required: ['path'],
            },
          },
        ],
      };
    });

    // Exécuter les outils
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_file':
            return await this.readFile(args.path);
          case 'write_file':
            return await this.writeFile(args.path, args.content);
          case 'list_directory':
            return await this.listDirectory(args.path);
          case 'create_directory':
            return await this.createDirectory(args.path);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Outil inconnu: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Erreur lors de l'exécution de ${name}: ${error.message}`
        );
      }
    });
  }

  async readFile(filePath) {
    if (!this.isPathAllowed(filePath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Accès refusé au chemin: ${filePath}`
      );
    }

    try {
      const stats = await fs.stat(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Fichier trop volumineux: ${stats.size} bytes`
        );
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return {
        content: [
          {
            type: 'text',
            text: `Contenu de ${filePath}:\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Impossible de lire le fichier: ${error.message}`
      );
    }
  }

  async writeFile(filePath, content) {
    if (!this.isPathAllowed(filePath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Accès refusé au chemin: ${filePath}`
      );
    }

    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return {
        content: [
          {
            type: 'text',
            text: `Fichier écrit avec succès: ${filePath}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Impossible d'écrire le fichier: ${error.message}`
      );
    }
  }

  async listDirectory(dirPath) {
    if (!this.isPathAllowed(dirPath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Accès refusé au chemin: ${dirPath}`
      );
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const fileList = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Contenu de ${dirPath}:\n${JSON.stringify(fileList, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Impossible de lister le répertoire: ${error.message}`
      );
    }
  }

  async createDirectory(dirPath) {
    if (!this.isPathAllowed(dirPath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Accès refusé au chemin: ${dirPath}`
      );
    }

    try {
      await fs.mkdir(dirPath, { recursive: true });
      return {
        content: [
          {
            type: 'text',
            text: `Répertoire créé avec succès: ${dirPath}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Impossible de créer le répertoire: ${error.message}`
      );
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('VidGenie Filesystem MCP Server démarré');
  }
}

// Démarrer le serveur
const server = new VidGenieFilesystemServer();
server.start().catch((error) => {
  console.error('Erreur lors du démarrage du serveur:', error);
  process.exit(1);
});