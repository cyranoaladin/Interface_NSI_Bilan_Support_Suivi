import { NextResponse } from 'next/server';
import { SessionInfo } from './auth-utils';

/**
 * Standardized error response for API endpoints
 */
export function unauthorizedError(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { ok: false, error: message }, 
    { status: 401 }
  );
}

export function forbiddenError(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { ok: false, error: message }, 
    { status: 403 }
  );
}

export function notFoundError(message: string = 'Not found'): NextResponse {
  return NextResponse.json(
    { ok: false, error: message }, 
    { status: 404 }
  );
}

export function serverError(message: string = 'Server error'): NextResponse {
  return NextResponse.json(
    { ok: false, error: message }, 
    { status: 500 }
  );
}

/**
 * Standardized success response for API endpoints
 */
export function successResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status });
}

/**
 * Check if user has permission to access a resource based on email
 */
export function hasResourceAccess(session: SessionInfo, resourceEmail?: string | null, userGroups?: string[]): boolean {
  if (!session?.email) return false;
  
  // User can access their own resources
  if (resourceEmail && resourceEmail.toLowerCase() === session.email.toLowerCase()) {
    return true;
  }
  
  // For group-based access (teachers accessing student resources)
  if (session.role === 'TEACHER' && userGroups && userGroups.length > 0) {
    // Additional logic can be implemented here for group access
    // For now, return true to allow teacher to proceed with additional checks
    return true;
  }
  
  return false;
}

/**
 * Standardized PDF response headers
 */
export function getPdfHeaders(filename?: string): HeadersInit {
  const headers: HeadersInit = {
    'content-type': 'application/pdf',
    'cache-control': 'no-store',
  };
  
  if (filename) {
    headers['content-disposition'] = `inline; filename="${filename}"`;
  }
  
  return headers;
}

/**
 * Standardized PDF response
 */
export function pdfResponse(
  content: ReadableStream | Buffer,
  filename?: string,
  status: number = 200
): NextResponse {
  return new Response(content as any, {
    status,
    headers: getPdfHeaders(filename),
  });
}