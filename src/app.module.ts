import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { WorkflowService } from './workflow/workflow.service';
import { CartHandlerService } from './agents/cartHandler/cartHandler.service';
import { ResearcherService } from './agents/researcher/researcher.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, WorkflowService, CartHandlerService, ResearcherService],
})
export class AppModule {}
