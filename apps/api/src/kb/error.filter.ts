import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import type { BilingualText } from '@perfiapp/kb-schema';

/**
 * Error envelope per contracts/knowledgebase-api.md:
 * { "error": { "code": UPPER_SNAKE, "message": { enCA, frCA } } }
 * Messages are bilingual because they can surface in-app (Principle I).
 */
const MESSAGES: Record<string, BilingualText> = {
  CARD_NOT_FOUND: {
    enCA: 'This card is not in the knowledgebase.',
    frCA: 'Cette carte ne figure pas dans la base de connaissances.',
  },
  INTERNAL_ERROR: {
    enCA: 'Something went wrong. Please try again.',
    frCA: 'Une erreur est survenue. Veuillez réessayer.',
  },
};

@Catch(HttpException)
export class KbErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const raw = exception.message;
    const code = raw in MESSAGES ? raw : 'INTERNAL_ERROR';
    res.status(exception.getStatus()).json({
      error: { code, message: MESSAGES[code] },
    });
  }
}
