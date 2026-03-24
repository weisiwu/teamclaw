import { NextRequest, NextResponse } from 'next/server';

/** Backend server URL — proxy to the Node.js backend on port 9700 */
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:9700';

/** CORS headers for cross-origin API access */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

/** Generate a short unique request ID */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Transform backend VersionSummary format to frontend VersionChangelog format.
 * Backend: { features[], fixes[], changes[], breaking[], changes_detail[] }
 * Frontend: { changes: ChangelogChange[] }
 */
function transformToFrontend(data: Record<string, unknown>): Record<string, unknown> {
  const changes_detail = data.changes_detail as
    | Array<{ type: string; description: string; files?: string[] }>
    | undefined;
  const changes =
    changes_detail && changes_detail.length > 0
      ? changes_detail
      : [
          ...((data.features as string[]) || []).map((d: string) => ({
            type: 'feature',
            description: d,
          })),
          ...((data.fixes as string[]) || []).map((d: string) => ({ type: 'fix', description: d })),
          ...((data.changes as string[]) || []).map((d: string) => ({
            type: 'improvement',
            description: d,
          })),
          ...((data.breaking as string[]) || []).map((d: string) => ({
            type: 'breaking',
            description: d,
          })),
        ];

  return {
    id: data.id,
    versionId: data.versionId,
    title: data.title || '',
    content: data.content || '',
    changes,
    generatedAt: data.generatedAt || data.generated_at || new Date().toISOString(),
    generatedBy: data.generatedBy || data.generated_by || 'system',
  };
}

/**
 * Proxy helper — forwards requests to the backend server and returns transformed response.
 */
async function proxyToBackend(
  req: NextRequest,
  backendPath: string,
  options: {
    method?: string;
    body?: BodyInit;
    transform?: (data: Record<string, unknown>) => Record<string, unknown>;
  } = {}
): Promise<NextResponse> {
  const url = `${BACKEND_URL}${backendPath}`;
  const requestId = generateRequestId();
  try {
    const headers: HeadersInit = {
      'Content-Type': req.headers.get('content-type') || 'application/json',
      'X-Request-ID': requestId,
    };
    const auth = req.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;

    const fetchOptions: RequestInit = {
      method: options.method || req.method,
      headers,
    };
    if (options.body !== undefined) {
      fetchOptions.body = options.body;
    } else if (req.method !== 'GET' && req.method !== 'HEAD') {
      const clone = req.clone();
      fetchOptions.body = await clone.text();
    }

    const resp = await fetch(url, fetchOptions);
    const data = (await resp.json()) as Record<string, unknown>;

    // Apply transformation if provided (mutate data.data in-place since data is const)
    if (options.transform && data.data) {
      const transformed = options.transform(data.data as Record<string, unknown>);
      (data as Record<string, unknown>).data = transformed;
    }

    return NextResponse.json(data, {
      status: resp.status,
      headers: {
        ...corsHeaders,
        'X-Request-ID': requestId,
      },
    });
  } catch (err) {
    console.error(`[changelog proxy] Failed to reach backend at ${url}:`, err);
    return NextResponse.json(
      { code: 503, message: 'Backend server unavailable', data: null },
      { status: 503, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/v1/versions/:id/changelog
 * Proxy to backend: GET /api/v1/versions/:id/summary
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.trim() === '') {
    return NextResponse.json(
      { code: 400, message: '版本 ID 不能为空', data: null },
      { status: 400, headers: corsHeaders }
    );
  }
  return proxyToBackend(req, `/api/v1/versions/${id}/summary`, {
    transform: transformToFrontend,
  });
}

/**
 * PUT /api/v1/versions/:id/changelog
 * Proxy to backend: PUT /api/v1/versions/:id/summary
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.trim() === '') {
    return NextResponse.json(
      { code: 400, message: '版本 ID 不能为空', data: null },
      { status: 400, headers: corsHeaders }
    );
  }
  const body = await req.json();
  // Transform frontend changelog format to backend summary format
  const backendBody: Record<string, unknown> = {};
  if (body.content !== undefined) backendBody.content = body.content;
  if (body.title !== undefined) backendBody.title = body.title;
  if (body.changes !== undefined) {
    // Reverse transform: frontend ChangelogChange[] → backend fields
    const changes = body.changes as Array<{ type: string; description: string }>;
    backendBody.features = changes.filter(c => c.type === 'feature').map(c => c.description);
    backendBody.fixes = changes.filter(c => c.type === 'fix').map(c => c.description);
    backendBody.changes = changes.filter(c => c.type === 'improvement').map(c => c.description);
    backendBody.breaking = changes.filter(c => c.type === 'breaking').map(c => c.description);
    backendBody.createdBy = 'manual';
  }
  return proxyToBackend(req, `/api/v1/versions/${id}/summary`, {
    method: 'PUT',
    body: JSON.stringify(backendBody),
    transform: transformToFrontend,
  });
}

/**
 * OPTIONS /api/v1/versions/:id/changelog
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
