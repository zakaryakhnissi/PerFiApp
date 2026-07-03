import { Controller, Get, NotFoundException, Param, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { KbService } from '../kb/kb.service';
import { sendWithEtag } from '../kb/etag';

@Controller('v1/cards')
export class CardsController {
  constructor(private readonly kb: KbService) {}

  @Get()
  list(
    @Req() req: Request,
    @Res() res: Response,
    @Query('noAnnualFee') noAnnualFee?: string,
    @Query('bonusCategory') bonusCategory?: string,
    @Query('q') q?: string,
  ): void {
    const category = KbService.parseBonusCategory(bonusCategory);
    const cards = this.kb.cards({
      noAnnualFee: noAnnualFee === 'true',
      ...(category !== undefined ? { bonusCategory: category } : {}),
      ...(q !== undefined ? { q } : {}),
    });
    sendWithEtag(this.kb, req, res, { kbVersion: this.kb.kbVersion, cards });
  }

  @Get(':id')
  byId(@Param('id') id: string): unknown {
    const card = this.kb.card(id);
    if (!card) {
      // Shaped into the bilingual error envelope by KbErrorFilter.
      throw new NotFoundException('CARD_NOT_FOUND');
    }
    return card;
  }
}
