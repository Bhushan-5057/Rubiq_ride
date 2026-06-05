import readline from "node:readline";
import { io } from "socket.io-client";

const DEFAULT_SOCKET_URL = "http://localhost:3000";

const now = () => new Date().toISOString();

export const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const safeJsonParse = (value, fallback = {}) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(`[${now()}] Invalid JSON: ${error.message}`);
    return fallback;
  }
};

export const logEvent = (direction, label, event, payload) => {
  const body = payload === undefined ? "" : ` ${JSON.stringify(payload, null, 2)}`;
  console.log(`[${now()}] [${label}] ${direction} ${event}${body}`);
};

export const emitWithLog = (socket, label, event, payload = {}, options = {}) => {
  logEvent("OUT ->", label, event, payload);

  if (options.ack) {
    socket.timeout(options.timeout || 3000).emit(event, payload, (error, response) => {
      if (error) {
        logEvent("ACK !!", label, event, { message: error.message });
        return;
      }
      logEvent("ACK <-", label, event, response);
    });
    return;
  }

  socket.emit(event, payload);
};

export const registerPersonalRoom = (socket, label, userId) => {
  if (!userId) {
    console.warn(`[${now()}] [${label}] USER_ID missing; skipping personal room registration.`);
    return;
  }

  emitWithLog(socket, label, "register", { userId }, { ack: true });
};

export const attachReconnectLogger = (socket, label) => {
  socket.io.on("reconnect_attempt", (attempt) => {
    console.log(`[${now()}] [${label}] reconnect_attempt #${attempt}`);
  });

  socket.io.on("reconnect", (attempt) => {
    console.log(`[${now()}] [${label}] reconnected after ${attempt} attempt(s)`);
  });

  socket.io.on("reconnect_error", (error) => {
    console.error(`[${now()}] [${label}] reconnect_error ${error.message}`);
  });

  socket.io.on("reconnect_failed", () => {
    console.error(`[${now()}] [${label}] reconnect_failed`);
  });
};

export const createSocketConnection = ({
  serverUrl = process.env.SOCKET_URL || DEFAULT_SOCKET_URL,
  token,
  userId,
  role,
  label,
  autoRegister = true,
} = {}) => {
  if (!token) {
    throw new Error(`${label || role || "socket"} token is required`);
  }

  const socket = io(serverUrl, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Number(process.env.RECONNECTION_ATTEMPTS || 10),
    reconnectionDelay: Number(process.env.RECONNECTION_DELAY_MS || 1000),
    timeout: Number(process.env.SOCKET_TIMEOUT_MS || 10000),
  });

  const clientLabel = label || `${role || "client"}:${userId || "unknown"}`;

  socket.on("connect", () => {
    console.log(`[${now()}] [${clientLabel}] connected socketId=${socket.id}`);
    if (autoRegister) registerPersonalRoom(socket, clientLabel, userId);
  });

  socket.on("connect_error", (error) => {
    console.error(`[${now()}] [${clientLabel}] connect_error ${error.message}`);
  });

  socket.on("disconnect", (reason) => {
    console.warn(`[${now()}] [${clientLabel}] disconnected reason=${reason}`);
  });

  socket.onAny((event, ...args) => {
    logEvent("IN  <-", clientLabel, event, args.length > 1 ? args : args[0]);
  });

  attachReconnectLogger(socket, clientLabel);

  return { socket, label: clientLabel, role, userId };
};

export const createClientsFromEnv = ({ role, tokenEnv, userIdEnv, defaultLabel }) => {
  const tokens = parseList(process.env[tokenEnv] || process.env.JWT_TOKENS || process.env.JWT_TOKEN);
  const userIds = parseList(process.env[userIdEnv] || process.env.USER_IDS || process.env.USER_ID);

  if (!tokens.length) {
    throw new Error(`Set ${tokenEnv}, JWT_TOKENS, or JWT_TOKEN before running this socket test.`);
  }

  return tokens.map((token, index) =>
    createSocketConnection({
      token,
      userId: userIds[index] || userIds[0],
      role,
      label: `${defaultLabel || role}-${index + 1}`,
    })
  );
};

export const startManualEventConsole = (clients, examples = []) => {
  console.log("\nManual emit console is ready.");
  console.log('Commands: emit <event> <json> | to <label> <event> <json> | all <event> <json> | list | help | exit');
  if (examples.length) {
    console.log("Examples:");
    examples.forEach((example) => console.log(`  ${example}`));
  }

  const initialEvent = process.env.EMIT_EVENT;
  if (initialEvent) {
    const payload = safeJsonParse(process.env.EMIT_PAYLOAD, {});
    clients.forEach((client) => emitWithLog(client.socket, client.label, initialEvent, payload, { ack: process.env.EMIT_ACK === "true" }));
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "socket> ",
  });

  rl.prompt();

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    if (trimmed === "exit" || trimmed === "quit") {
      clients.forEach((client) => client.socket.disconnect());
      rl.close();
      return;
    }

    if (trimmed === "help") {
      console.log('emit <event> <json> sends from the first client with ack logging.');
      console.log('to <label> <event> <json> sends from one named client.');
      console.log('all <event> <json> sends from every connected client.');
      rl.prompt();
      return;
    }

    if (trimmed === "list") {
      clients.forEach((client) => {
        console.log(`${client.label} role=${client.role} userId=${client.userId || "missing"} connected=${client.socket.connected}`);
      });
      rl.prompt();
      return;
    }

    const [command, first, second, ...rest] = trimmed.split(" ");

    if (command === "emit") {
      emitWithLog(clients[0].socket, clients[0].label, first, safeJsonParse([second, ...rest].join(" "), {}), { ack: true });
      rl.prompt();
      return;
    }

    if (command === "to") {
      const client = clients.find((item) => item.label === first);
      if (!client) {
        console.error(`Unknown client label: ${first}`);
        rl.prompt();
        return;
      }
      emitWithLog(client.socket, client.label, second, safeJsonParse(rest.join(" "), {}), { ack: true });
      rl.prompt();
      return;
    }

    if (command === "all") {
      const payload = safeJsonParse([second, ...rest].join(" "), {});
      clients.forEach((client) => emitWithLog(client.socket, client.label, first, payload, { ack: true }));
      rl.prompt();
      return;
    }

    console.error("Unknown command. Type help for usage.");
    rl.prompt();
  });
};
