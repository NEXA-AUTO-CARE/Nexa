import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { FLEXIBLE_PHONE_REGEX } from '@nexa/shared';

export class CreateCorporateFleetEnquiryDto {
  @ApiProperty({ example: 'Acme Logistics Ltd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  fleetSize: number;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contactPerson: string;

  @ApiProperty({ example: 'fleet@acme.co.uk' })
  @IsEmail()
  @MaxLength(255)
  businessEmail: string;

  @ApiProperty({ example: '+44 1224 000000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(FLEXIBLE_PHONE_REGEX, {
    message: 'Please provide a valid business phone number',
  })
  businessPhone: string;
}
