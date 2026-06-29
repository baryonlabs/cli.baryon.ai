// Minimal MCP stdio server (newline-delimited JSON-RPC 2.0). Zero deps so the
// read-only data servers stay auditable. Implements just what pi-mcp-adapter
// needs: initialize, tools/list, tools/call, ping.
//
//   createServer({ name, version, tools: [{ name, description, inputSchema, handler }] })
//     handler(args) -> string | { text } | throws  (throw → tool error to the model)

const PROTOCOL_VERSION = "2025-06-18";

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function reply(id, result) {
  if (id === undefined || id === null) return; // notification → no reply
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id, code, message) {
  if (id === undefined || id === null) return;
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

export function createServer({ name, version = "0.1.0", tools = [] }) {
  const toolList = tools.map((t) => ({
    name: t.name,
    description: t.description || "",
    inputSchema: t.inputSchema || { type: "object", properties: {} },
  }));
  const byName = new Map(tools.map((t) => [t.name, t]));

  async function handle(msg) {
    const { id, method, params } = msg;
    switch (method) {
      case "initialize":
        return reply(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name, version },
        });

      case "notifications/initialized":
        return; // notification

      case "ping":
        return reply(id, {});

      case "tools/list":
        return reply(id, { tools: toolList });

      case "tools/call": {
        const tool = byName.get(params?.name);
        if (!tool) return replyError(id, -32602, `unknown tool: ${params?.name}`);
        try {
          const out = await tool.handler(params.arguments || {});
          const text = typeof out === "string" ? out : out?.text ?? JSON.stringify(out);
          return reply(id, { content: [{ type: "text", text }] });
        } catch (e) {
          // Tool-level error: report to the model, don't crash the server.
          return reply(id, {
            content: [{ type: "text", text: `ERROR: ${e?.message || String(e)}` }],
            isError: true,
          });
        }
      }

      default:
        return replyError(id, -32601, `method not found: ${method}`);
    }
  }

  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      Promise.resolve(handle(msg)).catch((e) => {
        replyError(msg?.id, -32603, e?.message || "internal error");
      });
    }
  });
  process.stdin.on("end", () => process.exit(0));
}
