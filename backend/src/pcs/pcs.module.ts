import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PcsService } from './pcs.service';
import { PcsController } from './pcs.controller';
import { PC } from './entities/pc.entity';
import { EventsModule } from '../common/gateways/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PC]),
    forwardRef(() => EventsModule),
  ],
  controllers: [PcsController],
  providers: [PcsService],
  exports: [PcsService],
})
export class PcsModule {}




