import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, now, Mixed } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IsNumber, IsOptional, IsString } from 'class-validator';

@Schema({ collection: 'content' })
export class content {
  @Prop({ default: uuidv4, index:true })
  contentId: string;

  @Prop({ type: String, required: false, index:true})
  @IsOptional()
  @IsString()
  collectionId: string;

  @Prop({ type: String, required: true })
  @IsOptional()
  @IsString()
  name: string;

  @Prop({ type: String, required: true, index:true })
  @IsString()
  contentType: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  imagePath: string;

  @Prop({ required: true })
  contentSourceData: [Mixed];

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  flaggedBy: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  lastFlaggedOn: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  flagReasons: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  reviewer: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  reviewStatus: string;

  @Prop({ type: String, required: true })
  @IsString()
  status: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  publisher: string;

  @Prop({ type: String, required: true, index:true })
  @IsString()
  language: string;

  @Prop({ type: Number, required: false })
  @IsOptional()
  @IsNumber()
  contentIndex: number;

  @Prop({ required: true })
  tags: [string];

  @Prop({ default: now(), index:true })
  createdAt: Date;

  @Prop({ default: now() })
  updatedAt: Date;
}

export type contentDocument = content & Document;

export const contentSchema = SchemaFactory.createForClass(content);
