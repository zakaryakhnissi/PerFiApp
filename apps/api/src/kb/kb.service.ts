import { createHash } from 'node:crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Card, SpendCategoryId } from '@perfiapp/kb-schema';
import { SPEND_CATEGORY_IDS } from '@perfiapp/kb-schema';
import { KbData, loadKb } from './kb-source';

export interface CardFilters {
  noAnnualFee?: boolean;
  bonusCategory?: SpendCategoryId;
  q?: string;
}

@Injectable()
export class KbService implements OnModuleInit {
  private data!: KbData;

  async onModuleInit(): Promise<void> {
    this.data = await loadKb();
  }

  get kbVersion(): number {
    return this.data.kbVersion;
  }

  cards(filters: CardFilters = {}): Card[] {
    let result = this.data.cards;
    if (filters.noAnnualFee) {
      result = result.filter((c) => c.annualFee.amountCents === 0);
    }
    if (filters.bonusCategory) {
      const category = filters.bonusCategory;
      result = result.filter((c) => c.earnRates.byCategory[category] !== undefined);
    }
    if (filters.q !== undefined && filters.q.trim() !== '') {
      const q = filters.q.trim().toLowerCase();
      result = result.filter((c) =>
        [c.name.enCA, c.name.frCA, c.issuer.enCA, c.issuer.frCA]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    return result;
  }

  card(id: string): Card | undefined {
    return this.data.cards.find((c) => c.id === id);
  }

  programs(): KbData['programs'] {
    return this.data.programs;
  }

  categories(): KbData['categories'] {
    return this.data.categories;
  }

  static parseBonusCategory(value: string | undefined): SpendCategoryId | undefined {
    return (SPEND_CATEGORY_IDS as readonly string[]).includes(value ?? '')
      ? (value as SpendCategoryId)
      : undefined;
  }

  /** Strong ETag over the exact payload bytes. */
  etagFor(payload: unknown): string {
    return `"${createHash('sha1').update(JSON.stringify(payload)).digest('hex')}"`;
  }
}
