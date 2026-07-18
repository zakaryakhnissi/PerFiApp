import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { KbService } from '../kb/kb.service';
import { sendWithEtag } from '../kb/etag';

@Controller('v1')
export class CategoriesController {
  constructor(private readonly kb: KbService) {}

  @Get('spend-categories')
  list(@Req() req: Request, @Res() res: Response): void {
    sendWithEtag(this.kb, req, res, {
      kbVersion: this.kb.kbVersion,
      categories: this.kb.categories(),
    });
  }

  @Get('kb-version')
  version(): { kbVersion: number } {
    return { kbVersion: this.kb.kbVersion };
  }
}
