import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PcsService } from './pcs.service';
import { CreatePcDto } from './dto/create-pc.dto';
import { UpdatePcDto } from './dto/update-pc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pcs')
@UseGuards(JwtAuthGuard)
export class PcsController {
  constructor(private readonly pcsService: PcsService) {}

  @Post()
  create(@Body() createPcDto: CreatePcDto) {
    return this.pcsService.create(createPcDto);
  }

  @Get()
  findAll() {
    return this.pcsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pcsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePcDto: UpdatePcDto,
  ) {
    return this.pcsService.update(id, updatePcDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pcsService.remove(id);
  }
}




