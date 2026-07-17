/* Arquivos privados do dossiê. Upload e extração acontecem dentro da VPS;
   o modelo recebe somente segmentos recuperados sob demanda. */
import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pool } from "./db.js";
import { documentProcessingPlan, validateDocumentMetadata } from "./document-intake.js";

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const ROOT = resolve(process.env.AGENT_DOCUMENT_ROOT || "/opt/radar/data/documents");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXT = Object.freeze({
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
});
const MIME_BY_EXTENSION = Object.freeze(Object.fromEntries(Object.entries(EXT).map(([mime, extension]) => [extension, mime])));

const sha256 = value => createHash("sha256").update(value).digest("hex");
const safeName = value => String(value || "documento").replace(/[\r\n]/g, " ").replace(/[\\/]/g, "-").trim().slice(0, 180) || "documento";
const cleanText = value => String(value || "").replace(/\0/g, "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();

async function organizationId() {
  const name = String(process.env.OS_ORG_NAME || "Corretor Inteligente").trim().slice(0, 100);
  return pool.query(
    `INSERT INTO organizations (name,slug,type) VALUES ($1,'default','corretor_autonomo')
     ON CONFLICT (slug) DO UPDATE SET updated_at=organizations.updated_at RETURNING id`, [name]).then(r => r.rows[0].id);
}

export function verifyFileSignature(mimeType, buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return false;
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType.includes("wordprocessingml")) return buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "text/plain") return !buffer.subarray(0, Math.min(buffer.length, 4096)).includes(0);
  return false;
}

export function segmentDocumentText(text, { page = null, section = null, maxChars = 3500 } = {}) {
  const value = cleanText(text);
  if (!value) return [];
  const paragraphs = value.split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
  const chunks = []; let current = "";
  const flush = () => { if (current) { chunks.push(current); current = ""; } };
  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      flush();
      for (let i = 0; i < paragraph.length; i += maxChars) chunks.push(paragraph.slice(i, i + maxChars));
    } else if (!current || current.length + paragraph.length + 2 <= maxChars) current += `${current ? "\n\n" : ""}${paragraph}`;
    else { flush(); current = paragraph; }
  }
  flush();
  return chunks.map(content => ({ pageStart: page, pageEnd: page, section, content, hash: sha256(content) }));
}

async function extract(buffer, mimeType) {
  if (mimeType === "text/plain") return { method: "plain-text", pageCount: null, segments: segmentDocumentText(buffer.toString("utf8")) };
  if (mimeType.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const out = await mammoth.extractRawText({ buffer });
    return { method: "docx-structured-text", pageCount: null, segments: segmentDocumentText(out.value), warnings: out.messages?.map(x => x.message).slice(0, 10) || [] };
  }
  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const out = await parser.getText();
      const segments = (out.pages || []).flatMap(p => segmentDocumentText(p.text, { page: p.num }));
      return { method: "pdf-text", pageCount: out.total || out.pages?.length || null, segments };
    } finally { await parser.destroy(); }
  }
  return { method: "ocr-pending", pageCount: null, segments: [], pending: true };
}

export async function addPropertyDocument(propertyId, { fileName, mimeType, buffer } = {}) {
  if (!UUID.test(String(propertyId))) return { ok: false, erro: "imóvel inválido" };
  if (!Buffer.isBuffer(buffer) || !buffer.length) return { ok: false, erro: "arquivo vazio" };
  if (buffer.length > MAX_DOCUMENT_BYTES) return { ok: false, erro: "O arquivo passa de 8 MB." };
  const name = safeName(fileName), claimedType = String(mimeType || "").split(";")[0].trim().toLowerCase();
  const nameExtension = name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  const type = EXT[claimedType] ? claimedType : MIME_BY_EXTENSION[nameExtension];
  const hash = sha256(buffer);
  const checked = validateDocumentMetadata({ fileName: name, mimeType: type, contentSha256: hash });
  if (!checked.ok) return { ok: false, erro: checked.error };
  if (!verifyFileSignature(type, buffer)) return { ok: false, erro: "O conteúdo do arquivo não corresponde ao tipo informado." };
  const plan = documentProcessingPlan(checked.value);
  const orgId = await organizationId();
  const property = await pool.query("SELECT id FROM inventory_properties WHERE id=$1 AND organization_id=$2", [propertyId, orgId]);
  if (!property.rowCount) return { ok: false, erro: "imóvel não encontrado" };
  const existing = await pool.query(
    `SELECT id,file_name,mime_type,byte_size,status,extraction_method,page_count,created_at,updated_at
     FROM agent_documents WHERE organization_id=$1 AND object_type='property' AND object_id=$2 AND content_sha256=$3`,
    [orgId, propertyId, hash]);
  if (existing.rowCount) return { ok: true, duplicated: true, document: existing.rows[0] };

  const extension = EXT[type], storageKey = `${orgId}/${hash}${extension}`;
  const directory = join(ROOT, String(orgId));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try { await writeFile(join(directory, `${hash}${extension}`), buffer, { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  const inserted = await pool.query(
    `INSERT INTO agent_documents
       (organization_id,object_type,object_id,file_name,mime_type,content_sha256,storage_key,byte_size,status,extraction_method,metadata)
     VALUES ($1,'property',$2,$3,$4,$5,$6,$7,'extracting',$8,$9) RETURNING id`,
    [orgId, propertyId, name, type, hash, storageKey, buffer.length, plan.value.extraction, JSON.stringify({ aiDuringIngestion: false })]);
  const id = inserted.rows[0].id;
  try {
    const out = await extract(buffer, type);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const s of out.segments) await client.query(
        `INSERT INTO agent_document_segments (document_id,page_start,page_end,section,content,content_sha256)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (document_id,content_sha256) DO NOTHING`,
        [id, s.pageStart, s.pageEnd, s.section, s.content, s.hash]);
      const status = out.pending ? "received" : out.segments.length ? "indexed" : "extracted";
      await client.query(
        `UPDATE agent_documents SET status=$1,extraction_method=$2,page_count=$3,metadata=metadata||$4::jsonb,updated_at=now() WHERE id=$5`,
        [status, out.method, out.pageCount, JSON.stringify({ warnings: out.warnings || [], segmentCount: out.segments.length, ocrPending: !!out.pending }), id]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  } catch (error) {
    await pool.query("UPDATE agent_documents SET status='error',error=$1,updated_at=now() WHERE id=$2", [String(error.message).slice(0, 500), id]);
  }
  const document = await pool.query(
    `SELECT id,file_name,mime_type,byte_size,status,extraction_method,page_count,created_at,updated_at
     FROM agent_documents WHERE id=$1`, [id]);
  return { ok: true, document: document.rows[0] };
}

export async function resolvePrivateDocument(documentId) {
  if (!UUID.test(String(documentId))) return null;
  const orgId = await organizationId();
  const q = await pool.query(
    "SELECT file_name,mime_type,storage_key,byte_size FROM agent_documents WHERE id=$1 AND organization_id=$2", [documentId, orgId]);
  if (!q.rowCount || !/^[0-9a-f-]{36}\/[a-f0-9]{64}\.(pdf|docx|txt|jpg|png|webp)$/.test(q.rows[0].storage_key || "")) return null;
  const path = resolve(ROOT, q.rows[0].storage_key);
  if (!path.startsWith(`${ROOT}/`)) return null;
  const info = await stat(path); // confirma existência e permissão antes dos headers
  return { ...q.rows[0], byte_size: Number(q.rows[0].byte_size || info.size), path, fileName: safeName(q.rows[0].file_name) };
}
