import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { WorkflowService } from './workflow/workflow.service';
import { CartHandlerService } from './agents/cartHandler/cartHandler.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, WorkflowService, CartHandlerService],
})
export class AppModule {}
