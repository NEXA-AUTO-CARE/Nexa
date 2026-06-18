import { Module } from '@nestjs/common';
import { PostcodesController } from './postcodes.controller';
import { PostcodesService } from './postcodes.service';

@Module({
  providers: [PostcodesService],
  controllers: [PostcodesController],
  exports: [PostcodesService],
})
export class PostcodesModule {}
