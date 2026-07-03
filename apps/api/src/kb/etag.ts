import type { Request, Response } from 'express';
import type { KbService } from './kb.service';

/**
 * Contract: list endpoints support ETag / If-None-Match → 304. Sends the
 * payload (200) or ends with 304; never both.
 */
export function sendWithEtag(
  kb: KbService,
  req: Request,
  res: Response,
  payload: unknown,
): void {
  const etag = kb.etagFor(payload);
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }
  res.status(200).json(payload);
}
