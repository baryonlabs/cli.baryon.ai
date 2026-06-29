// Baryon Edge — Object storage READ-ONLY MCP server (MinIO / S3-compatible).
//
// Exposes ONLY read tools (s3_list / s3_stat / s3_get), scoped to one bucket and
// an optional prefix. No put/delete/copy tool exists, so the agent cannot write
// or exfiltrate to storage. Uses path-style addressing for MinIO compatibility.
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { createServer } from "./mcp-stdio.js";
import { keyInScope } from "./sql-guard.js";

const ENDPOINT = process.env.EDGE_S3_ENDPOINT || ""; // e.g. http://minio:9000
const BUCKET = process.env.EDGE_S3_BUCKET || "";
const PREFIX = process.env.EDGE_S3_PREFIX || "";
const REGION = process.env.EDGE_S3_REGION || "us-east-1";
const MAX_BYTES = Number(process.env.EDGE_S3_MAX_BYTES || "1048576"); // 1 MiB

if (!BUCKET) {
  process.stderr.write("minio-readonly: EDGE_S3_BUCKET not set\n");
  process.exit(2);
}

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT || undefined,
  forcePathStyle: true, // MinIO
  credentials: process.env.EDGE_S3_ACCESS_KEY
    ? {
        accessKeyId: process.env.EDGE_S3_ACCESS_KEY,
        secretAccessKey: process.env.EDGE_S3_SECRET_KEY || "",
      }
    : undefined,
});

async function streamToString(body, limit) {
  const chunks = [];
  let total = 0;
  for await (const chunk of body) {
    total += chunk.length;
    if (total > limit) throw new Error(`객체가 너무 큽니다(>${limit} bytes). 범위를 좁히세요.`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

createServer({
  name: "baryon-edge-objectstore",
  version: "0.1.0",
  tools: [
    {
      name: "s3_list",
      description: `List objects in bucket "${BUCKET}" under the allowed prefix. arg: prefix(optional).`,
      inputSchema: {
        type: "object",
        properties: { prefix: { type: "string" }, max: { type: "number" } },
      },
      handler: async ({ prefix = "", max = 200 }) => {
        const full = PREFIX + (prefix || "");
        if (!keyInScope(full, PREFIX)) throw new Error("허용된 prefix 밖입니다.");
        const out = await s3.send(
          new ListObjectsV2Command({ Bucket: BUCKET, Prefix: full, MaxKeys: Math.min(max, 1000) }),
        );
        const items = (out.Contents || []).map((o) => ({ key: o.Key, size: o.Size, modified: o.LastModified }));
        return JSON.stringify(items);
      },
    },
    {
      name: "s3_stat",
      description: "Object metadata (size, type, modified). arg: key.",
      inputSchema: { type: "object", properties: { key: { type: "string" } }, required: ["key"] },
      handler: async ({ key }) => {
        if (!keyInScope(key, PREFIX)) throw new Error("허용된 prefix 밖의 키입니다.");
        const h = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
        return JSON.stringify({ key, size: h.ContentLength, type: h.ContentType, modified: h.LastModified });
      },
    },
    {
      name: "s3_get",
      description: `Read an object's contents as text (≤${MAX_BYTES} bytes). arg: key.`,
      inputSchema: { type: "object", properties: { key: { type: "string" } }, required: ["key"] },
      handler: async ({ key }) => {
        if (!keyInScope(key, PREFIX)) throw new Error("허용된 prefix 밖의 키입니다.");
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        return await streamToString(obj.Body, MAX_BYTES);
      },
    },
  ],
});
