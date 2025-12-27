# Writetainer-Lib

A Portainer API accessibility library for Node.js, written in TypeScript. This library provides a convenient wrapper around the Portainer API, allowing you to easily interact with your Portainer instance to manage environments, stacks, and containers.

## Features

- **Authentication**: Easy authentication using Portainer API tokens
- **Environment Management**: Fetch and manage Portainer environments (endpoints)
- **Stack Management**: Create, retrieve, start, stop, update, and delete stacks
- **Container Management**: Full container lifecycle management (start, stop, restart, remove, etc.)
- **Factory Pattern**: High-level factory methods for easy stack and container creation
- **TypeScript Support**: Fully typed interfaces for better development experience
- **Logging**: Built-in logging with debug package integration

## Installation

```bash
npm install writetainer-lib
```

## Prerequisites

Create a `.env` file in your project root with the following variables:

```env
PORTAINER_URL=https://your-portainer-instance.com
PORTAINER_API_KEY=your-api-token-here
```

## Quick Start

### Basic Usage

```typescript
import { PortainerApi, PortainerFactory, logInfo } from 'writetainer-lib';

// Get the singleton instance of PortainerApi
const api = PortainerApi.getInstance();

// Check connection status
const isConnected = await api.getStatus();
logInfo('Connected:', isConnected);

// Get all stacks
const stacks = await api.getStacks();
logInfo('Stacks:', stacks);

// Get all containers
const containers = await api.getContainers(true);
logInfo('Containers:', containers);
```

### Creating Stacks with Factory

```typescript
import { PortainerFactory } from 'writetainer-lib';

const factory = PortainerFactory.getInstance();

const stackConfig = {
    Name: "my-app-stack",
    ComposeFile: `
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    restart: unless-stopped
    `,
    Env: [
        { name: "ENVIRONMENT", value: "production" }
    ]
};

// Create the stack
const stack = await factory.createStack(stackConfig);
```

### Container Management

```typescript
import { PortainerApi } from 'writetainer-lib';

const api = PortainerApi.getInstance();

// Start a container
await api.handleContainer({
    action: 'start',
    containerId: 'container-id-here',
    environmentId: 1
});

// Stop a container
await api.handleContainer({
    action: 'stop',
    containerId: 'container-id-here'
});

// Remove a container with options
await api.handleContainer({
    action: 'remove',
    containerId: 'container-id-here',
    options: {
        force: true,
        removeVolumes: true
    }
});

// Restart a container with custom timeout
await api.handleContainer({
    action: 'restart',
    containerId: 'container-id-here',
    options: {
        timeout: 30000 // 30 seconds
    }
});
```

### Stack Operations

```typescript
import { PortainerApi } from 'writetainer-lib';

const api = PortainerApi.getInstance();

// Start a stack
await api.startStack(stackId, environmentId);

// Stop a stack
await api.stopStack(stackId, environmentId);

// Update a stack with new compose content
await api.updateStack(stackId, newComposeContent, environmentId, true);

// Redeploy a stack (stop, pull, start)
await api.redeployStack(stackId, environmentId);

// Delete a stack
await api.deleteStack(stackId, environmentId);
```

### Environment Management

```typescript
import { PortainerApi, getFirstEnvironmentId } from 'writetainer-lib';

const api = PortainerApi.getInstance();

// Get all environments
const environments = await api.getEnvironments();

// Get details of a specific environment
const envDetails = await api.getEnvironmentDetails(environmentId);

// Get first environment ID
const firstEnvId = await getFirstEnvironmentId();
```

### Resource Fetching

```typescript
import { PortainerApi } from 'writetainer-lib';

const api = PortainerApi.getInstance();

// Get all containers (including stopped ones)
const allContainers = await api.getContainers(true);

// Get running containers only
const runningContainers = await api.getContainers(false);

// Get container details
const containerDetails = await api.getContainerDetails('container-id');

// Get container stats
const stats = await api.getContainerStats('container-id');

// Get images
const images = await api.getImages(environmentId);
```

### Utility Functions

```typescript
import { 
    getStackByName, 
    getStackById,
    getContainerByDetails,
    verifyStackCreation,
    verifyContainerCreation 
} from 'writetainer-lib';

// Find a stack by name
const stack = await getStackByName('my-stack-name');

// Find a stack by ID
const stack = await getStackById(123, environmentId);

// Find container by image or label
const container = await getContainerByDetails({
    image: 'nginx:latest'
});

// Verify stack creation
const isVerified = await verifyStackCreation('my-stack', 5000, 3);

// Verify container creation
const isRunning = await verifyContainerCreation('my-container', 5000);
```

## API Reference

### Main Classes

#### `PortainerApi`
Singleton class that provides access to all Portainer API operations.

**Methods:**
- `getInstance(environmentId?: number | null)` - Get singleton instance
- `getEnvironments()` - Fetch all environments
- `getEnvironmentDetails(environmentId)` - Get environment details
- `getStacks()` - Get all stacks
- `getContainers(includeAll, environmentId?)` - Get containers
- `getContainerDetails(identifier, environmentId?)` - Get container details
- `getContainerStats(identifier, environmentId?)` - Get container stats
- `getImages(environmentId?)` - Get images
- `getStatus(environmentId?)` - Get system status
- `handleContainer(controls)` - Execute container actions
- `startStack(stackId, environmentId?)` - Start a stack
- `stopStack(stackId, environmentId?)` - Stop a stack
- `updateStack(stackId, composeContent, environmentId?, pullImage?)` - Update a stack
- `redeployStack(stackId, environmentId?)` - Redeploy a stack
- `deleteStack(stackId, environmentId?)` - Delete a stack
- `cleanupExistingContainer(containerName, environmentId?)` - Cleanup a container
- `ensureEnvId()` - Ensure environment ID is set

#### `PortainerFactory`
Singleton factory class for creating resources with validation.

**Methods:**
- `getInstance(environmentId?: number | null)` - Get singleton instance
- `createStack(stackData, maxRetryCount?, timeoutMs?)` - Create a new stack
- `createContainer(containerData, maxRetryCount?, timeoutMs?)` - Create a new container

#### `PortainerAuth`
Singleton class for authentication management.

**Properties:**
- `axiosInstance` - Configured axios instance
- `isValidated` - Authentication validation status
- `PortainerUrl` - Portainer URL

**Methods:**
- `getInstance()` - Get singleton instance

### Type Definitions

```typescript
interface PortainerEnvironment {
    Id: number;
    Name: string;
}

interface PortainerStack {
    Id: number;
    Name: string;
    EndpointId: number;
}

interface PortainerContainer {
    Id: string;
    Names: string[];
    Image: string;
    Labels: { [key: string]: string };
    State: string;
    Status: string;
    // ... additional properties
}

interface PortainerImage {
    Id: string;
    RepoTags: string[];
    Created: number;
    Size: number;
}

interface PortainerStackContent {
    Name: string;
    ComposeFile: string | any;
    Env?: Array<{ name: string; value: string }>;
    FromAppTemplate?: boolean;
}
```

## Logging

The library uses the `debug` package for logging. To enable logs:

```bash
# Enable all logs
DEBUG=portainer-api:* node your-app.js

# Enable only info logs
DEBUG=portainer-api:info node your-app.js

# Enable error and warning logs
DEBUG=portainer-api:error,portainer-api:warn node your-app.js
```

You can also use the built-in logging functions:

```typescript
import { logInfo, logWarn, logError } from 'writetainer-lib';

logInfo('This is an info message');
logWarn('This is a warning');
logError('This is an error', errorObject);
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
