import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ErpModule } from './erp.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'data'),
      serveRoot: '/data',
    }),
    ErpModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
