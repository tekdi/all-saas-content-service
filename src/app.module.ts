import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { content, contentSchema } from 'src/schemas/content.schema';
import { collection, collectionDbSchema } from './schemas/collection.schema';
import { contentService } from 'src/services/content.service';
import { contentController } from 'src/controllers/content.controller';
import { ConfigModule } from '@nestjs/config';
import { CollectionController } from './controllers/collection.controller';
import { CollectionService } from './services/collection.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URL),
    MongooseModule.forFeature([
      { name: content.name, schema: contentSchema },
      { name: collection.name, schema: collectionDbSchema },
    ]),
  ],
  controllers: [AppController, contentController, CollectionController],
  providers: [AppService, contentService, CollectionService],
})
export class AppModule {}
