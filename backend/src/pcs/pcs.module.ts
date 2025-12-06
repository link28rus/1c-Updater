import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PcsService } from './pcs.service';
import { PcsController } from './pcs.controller';
import { PC } from './entities/pc.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PC])],
  controllers: [PcsController],
  providers: [PcsService],
  exports: [PcsService],
})
export class PcsModule {}




