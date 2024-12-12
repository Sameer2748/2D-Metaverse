# 2d metaverse Project

This repository is a **2d metaverse ** project that manages a monorepo structure with the following apps:

1. **frontend** - A web application for the user interface.
2. **http** - A backend server for handling HTTP requests.
3. **ws** - A WebSocket server for real-time communication.

Each application is located in the `apps` folder and can be run independently or together during development.

---

## Folder Structure

```
.
├── apps
│   ├── frontend      # React (or other) web frontend
│   ├── http          # HTTP server (e.g., Express or Fastify)
│   └── ws            # WebSocket server
├── package.json      # Turborepo configuration
├── turbo.json        # Turborepo tasks and pipeline settings
└── README.md         # Project documentation
```

---

## Prerequisites

Ensure you have the following installed:

- **Node.js** (v16 or later)
- **npm** (or your preferred package manager like Yarn)

---

## Installation

To set up the project locally:

1. Clone the repository:
   ```bash
   git clone [<repository-url>](https://github.com/Sameer2748/2D-Metaverse.git)
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## Development

Each app can be run individually or concurrently. Turborepo optimizes the workflow for working with multiple apps.

### Running Individual Apps

- **Frontend**:
  ```bash
  npm run dev --filter=frontend
  ```

- **HTTP Server**:
  ```bash
  npm run dev --filter=http
  ```

- **WebSocket Server**:
  ```bash
  npm run dev --filter=ws
  ```

### Running All Apps Together

To run all apps simultaneously:

```bash
npm run dev
```

This command uses Turborepo to execute the `dev` script in all apps concurrently.

---

## Scripts

Each app includes the following common scripts:

- **dev**: Starts the app in development mode.
- **build**: Builds the app for production (if applicable).
- **start**: Starts the app in production mode (if applicable).

---

## Adding a New App

1. Create a new folder in the `apps` directory.
2. Add a `package.json` and configure it for the new app.
3. Update the `turbo.json` file to include the new app in the pipeline.

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

## Contributing

Contributions are welcome! Please submit a pull request or create an issue for any feature requests or bug fixes.

---

## Notes

- Ensure all dependencies are installed at the root level to benefit from Turborepo's caching and optimization.
- For troubleshooting or questions, refer to the [Turborepo documentation](https://turbo.build/).

