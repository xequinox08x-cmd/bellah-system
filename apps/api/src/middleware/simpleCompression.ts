import type { NextFunction, Request, Response } from 'express';
import { gzip } from 'zlib';

const MIN_COMPRESS_BYTES = 1024;

export function simpleCompression(req: Request, res: Response, next: NextFunction) {
  const acceptsGzip = /\bgzip\b/i.test(req.header('accept-encoding') || '');
  if (!acceptsGzip) {
    next();
    return;
  }

  const originalSend = res.send.bind(res);

  res.send = ((body?: any) => {
    if (
      res.headersSent ||
      res.getHeader('Content-Encoding') ||
      res.statusCode === 204 ||
      res.statusCode === 304
    ) {
      return originalSend(body);
    }

    const buffer = Buffer.isBuffer(body)
      ? body
      : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));

    if (buffer.length < MIN_COMPRESS_BYTES) {
      return originalSend(body);
    }

    gzip(buffer, (error, compressed) => {
      if (error) {
        originalSend(body);
        return;
      }

      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', String(compressed.length));
      originalSend(compressed);
    });

    return res;
  }) as Response['send'];

  next();
}
