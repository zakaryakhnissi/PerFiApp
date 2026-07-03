import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { KbService } from '../kb/kb.service';
import { sendWithEtag } from '../kb/etag';

@Controller('v1/reward-programs')
export class ProgramsController {
  constructor(private readonly kb: KbService) {}

  @Get()
  list(@Req() req: Request, @Res() res: Response): void {
    sendWithEtag(this.kb, req, res, {
      kbVersion: this.kb.kbVersion,
      programs: this.kb.programs(),
    });
  }
}
