/* Preparação de documentos sem IA: validação, deduplicação e recuperação lexical.
   OCR/extrato acontece uma vez; o Kimi recebe apenas segmentos relevantes e citáveis. */

const MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const SHA256 = /^[a-f0-9]{64}$/;

export function validateDocumentMetadata(input = {}) {
  const fileName = String(input.fileName || "").trim().slice(0, 180);
  const mimeType = String(input.mimeType || "").trim().toLowerCase();
  const contentSha256 = String(input.contentSha256 || "").trim().toLowerCase();
  if (!fileName) return { ok: false, error: "nome do arquivo ausente" };
  if (!MIME.has(mimeType)) return { ok: false, error: "tipo de arquivo não suportado" };
  if (!SHA256.test(contentSha256)) return { ok: false, error: "hash SHA-256 inválido" };
  return { ok: true, value: { fileName, mimeType, contentSha256 } };
}

export function documentProcessingPlan(metadata = {}) {
  const checked = validateDocumentMetadata(metadata);
  if (!checked.ok) return checked;
  const { mimeType } = checked.value;
  const extraction = mimeType === "application/pdf" ? "pdf-text-then-ocr-missing-pages"
    : mimeType.includes("wordprocessingml") ? "docx-structured-text"
      : mimeType.startsWith("image/") ? "ocr-image" : "plain-text";
  return { ok: true, value: {
    ...checked.value,
    extraction,
    steps: ["deduplicate-by-hash", extraction, "segment-with-page-source", "index-locally", "analyze-on-demand"],
    aiDuringIngestion: false,
  } };
}

const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const termsOf = query => [...new Set(normalize(query).match(/[a-z0-9]{3,}/g) || [])];

export function selectRelevantDocumentSegments(segments = [], query = "", maxChars = 12_000) {
  const terms = termsOf(query);
  const scored = (segments || []).map((segment, index) => {
    const content = String(segment.content || "").trim();
    const haystack = normalize(`${segment.section || ""} ${content}`);
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
    return { ...segment, content, score, index };
  }).filter(segment => segment.content && (terms.length === 0 || segment.score > 0))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = [];
  let used = 0;
  for (const segment of scored) {
    if (selected.length && used + segment.content.length > maxChars) continue;
    selected.push(segment);
    used += segment.content.length;
    if (used >= maxChars) break;
  }
  return selected.map(({ index, score, ...segment }) => ({ ...segment, relevance: score }));
}
