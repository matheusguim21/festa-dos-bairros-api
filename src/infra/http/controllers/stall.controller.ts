import { StallService } from "@/services/stall.service";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from "@nestjs/common";

@Controller("/stalls")
export class StallController {
  constructor(private readonly stallService: StallService) {}

  @Get()
  async findAll() {
    try {
      return await this.stallService.getAll();
    } catch (error) {
      return error;
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    try {
      return await this.stallService.getById(Number(id));
    } catch (error) {
      return error;
    }
  }

  @Post()
  async create(@Body() createStallDto: any) {
    try {
      return await this.stallService.create(createStallDto);
    } catch (error) {
      return error;
    }
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() updateStallDto: any) {
    try {
      return await this.stallService.update(Number(id), updateStallDto);
    } catch (error) {
      return error;
    }
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    try {
      return await this.stallService.delete(Number(id));
    } catch (error) {
      return error;
    }
  }
}
