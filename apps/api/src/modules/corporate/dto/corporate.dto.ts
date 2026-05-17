import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

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
  businessPhone: string;
}
