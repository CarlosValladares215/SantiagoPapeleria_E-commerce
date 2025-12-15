import { Module } from '@nestjs/common';
import { ErpModule } from './erp.module';

@Module({
  imports: [ErpModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
