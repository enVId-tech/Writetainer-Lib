# Writetainer-Lib

A Portainer API accessibility library for Node.js, written in TypeScript. This library provides a convenient wrapper around the Portainer API, allowing you to easily interact with your Portainer instance to manage environments, stacks, and containers.

## Features

- **Authentication**: Easy authentication using Portainer API tokens.
- **Environment Management**: Fetch details about your Portainer environments (endpoints).
- **Stack Management**: Retrieve information about your stacks.
- **Container Management**: List containers within an environment (proxies the Docker API).
- **TypeScript Support**: Fully typed interfaces for better development experience.

## Installation

```bash
npm install writetainer-lib
```

## Usage

### Initialization

First, import the `PortainerApiClient` and initialize it with your Portainer URL and API Token.

```typescript
import { PortainerApiClient } from 'writetainer-lib';

const portainerUrl = 'https://your-portainer-instance.com';
const apiToken = 'your-api-token';

const client = new PortainerApiClient(portainerUrl, apiToken);
```

You can also specify a default environment ID during initialization:

```typescript
const client = new PortainerApiClient(portainerUrl, apiToken, 1);
```

If no environment ID is provided, the client will attempt to fetch the first available environment ID automatically.

### Examples

#### Get All Environments

```typescript
const environments = await client.getEnvironments();
console.log(environments);
```

#### Get Stacks

```typescript
const stacks = await client.getStacks();
console.log(stacks);
```

#### Get Containers

Fetch all containers (running and stopped) for the default environment.

```typescript
const containers = await client.getContainers(true);
console.log(containers);
```

#### Test Connection

```typescript
const isConnected = await client.testConnection();
if (isConnected) {
    console.log('Connected to Portainer!');
}
```

## API Reference

### `PortainerApiClient`

#### Constructor
`new PortainerApiClient(portainerUrl: string, apiToken: string, environmentId?: number | null)`

#### Methods

- `getEnvironments(): Promise<PortainerEnvironment[]>`
  - Fetches a list of all Portainer environments.

- `getEnvironment(environmentId: number): Promise<PortainerEnvironment>`
  - Fetches details of a specific environment.

- `getStacks(): Promise<PortainerStack[]>`
  - Fetches a list of all stacks.

- `getContainers(includeAll: boolean): Promise<PortainerContainer[] | undefined>`
  - Fetches a list of containers for the current environment.
  - `includeAll`: Set to `true` to include stopped containers.

- `testConnection(): Promise<boolean>`
  - Tests the connection to the Portainer API.

- `DefaultEnvironmentId` (Getter/Setter)
  - Get or set the default environment ID used for container operations.

## License

MIT
