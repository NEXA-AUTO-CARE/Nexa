import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PostcodesService } from './postcodes.service';

@ApiTags('postcodes')
@ApiBearerAuth('jwt')
@Controller('postcode-lookup')
export class PostcodesController {
  constructor(private readonly postcodesService: PostcodesService) {}

  @Get()
  @ApiOperation({ summary: 'Proxy: Lookup UK postcode address details' })
  @ApiOkResponse({ description: 'List of addresses for the given postcode' })
  async lookup(@Query('postcode') postcode: string) {
    return this.postcodesService.lookup(postcode);
  }
}
