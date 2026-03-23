import { createChromaClient } from '../utils/chromadb.js';

// ── 配置常量 ────────────────────────────────────────
const BATCH_SIZE = 100;           // 每批文档数
const MAX_CONCURRENCY = 3;        // 最大并发批次数
const MAX_RETRIES = 3;            // 最大重试次数
const INITIAL_RETRY_DELAY = 1000; // 初始重试延迟 (ms)
const REQUEST_TIMEOUT = 30000;    // 单次请求超时 (ms)

// ── 批量 Embedding ──────────────────────────────────

async function getBatchEmbeddings(
  texts: string[],
  apiKey: string,
  baseUrl?: string
): Promise<number[][]> {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 未配置，无法生成 Embedding');
  }

  const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/embeddings';

  // 截断每条文本到 8000 字符
  const truncated = texts.map(t => t.slice(0, 8000));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncated,
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const err = new Error(`Rate limited${retryAfter ? `, retry after ${retryAfter}s` : ''}`);
      (err as any).retryable = true;
      (err as any).retryAfter = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
      throw err;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Embedding API error: ${response.status} ${response.statusText} - ${body}`);
    }

    const json = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };

    // API 返回按 index 排序，确保顺序正确
    return json.data
      .sort((a, b) => a.index - b.index)
      .map(d => d.embedding);
  } finally {
    clearTimeout(timeout);
  }
}

// ── 指数退避重试 ────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      const retryable = (err as any).retryable !== false;

      if (!retryable || attempt === MAX_RETRIES) {
        throw err;
      }

      const retryAfter = (err as any).retryAfter;
      const delay = retryAfter || INITIAL_RETRY_DELAY * Math.pow(2, attempt);
      console.warn(`[vectorStore] ${label} 失败 (attempt ${attempt + 1}/${MAX_RETRIES + 1})，${delay}ms 后重试: ${(err as Error).message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// ── 分批处理 ────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── 公开接口 ────────────────────────────────────────

export async function initialize(): Promise<void> {
  const client = createChromaClient();
  await client.listCollections();
}

export async function addDocuments(
  collectionName: string,
  texts: string[],
  ids: string[],
  metadatas?: Record<string, unknown>[]
): Promise<void> {
  if (texts.length === 0) return;

  const client = createChromaClient();
  const collection = await client.getOrCreateCollection({ name: collectionName });

  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseUrl = process.env.OPENAI_BASE_URL;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 未配置');
  }

  console.log(`[vectorStore] 向量化 ${texts.length} 篇文档，分 ${Math.ceil(texts.length / BATCH_SIZE)} 批处理...`);

  // 创建索引数组用于分批
  const indices = texts.map((_, i) => i);
  const batches = chunk(indices, BATCH_SIZE);

  let processed = 0;

  for (let bi = 0; bi < batches.length; bi += MAX_CONCURRENCY) {
    const concurrentBatches = batches.slice(bi, bi + MAX_CONCURRENCY);

    await Promise.all(
      concurrentBatches.map(async (batchIndices, j) => {
        const batchTexts = batchIndices.map(i => texts[i]);
        const batchIds = batchIndices.map(i => ids[i]);
        const batchMetas = metadatas
          ? batchIndices.map(i => metadatas[i])
          : batchTexts.map(() => ({}));

        // 带重试的批量 Embedding
        const embeddings = await withRetry(
          () => getBatchEmbeddings(batchTexts, apiKey, baseUrl),
          `batch ${bi + j + 1}/${batches.length}`
        );

        // 写入 ChromaDB
        await collection.add({
          ids: batchIds,
          embeddings,
          documents: batchTexts,
          metadatas: batchMetas,
        });

        processed += batchIndices.length;
        console.log(`[vectorStore] 已处理 ${processed}/${texts.length}`);
      })
    );
  }

  console.log(`[vectorStore] 向量化完成，共 ${texts.length} 篇文档`);
}

export async function query(
  collectionName: string,
  queryText: string,
  topK = 5
): Promise<Array<{ id: string; document: string; distance: number; metadata: Record<string, unknown> }>> {
  const client = createChromaClient();
  const collection = await client.getCollection({ name: collectionName });

  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseUrl = process.env.OPENAI_BASE_URL;

  const [queryEmbedding] = await withRetry(
    () => getBatchEmbeddings([queryText], apiKey, baseUrl),
    'query embedding'
  );

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });

  const resIds = (results.ids?.[0] ?? []) as string[];
  const docs = (results.documents?.[0] ?? []) as string[];
  const distances = (results.distances?.[0] ?? []) as number[];
  const metas = (results.metadatas?.[0] ?? []) as Record<string, unknown>[];

  return resIds.map((id, i) => ({
    id,
    document: docs[i] ?? '',
    distance: distances[i] ?? 0,
    metadata: metas[i] ?? {},
  }));
}

export async function deleteCollection(collectionName: string): Promise<void> {
  const client = createChromaClient();
  await client.deleteCollection({ name: collectionName });
}
