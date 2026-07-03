import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { KbService } from './kb/kb.service';
import { KbErrorFilter } from './kb/error.filter';
import { CardsController } from './cards/cards.controller';
import { ProgramsController } from './programs/programs.controller';
import { CategoriesController } from './categories/categories.controller';

@Module({
  controllers: [CardsController, ProgramsController, CategoriesController],
  providers: [KbService, { provide: APP_FILTER, useClass: KbErrorFilter }],
})
export class AppModule {}
