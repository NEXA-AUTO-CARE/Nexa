import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostcodesService {
  private readonly logger = new Logger(PostcodesService.name);
  private readonly apiKey: string | null;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get<string>('app.idealPostcodesApiKey') || null;
  }

  async lookup(postcode: string) {
    if (!postcode) {
      throw new HttpException('Postcode is required', HttpStatus.BAD_REQUEST);
    }

    const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();
    const isTestPostcode = cleanPostcode === 'ID11QD';

    let url = `https://api.ideal-postcodes.co.uk/v1/postcodes/${cleanPostcode}`;

    if (!isTestPostcode) {
      if (!this.apiKey) {
        this.logger.warn(
          'Ideal Postcodes API key is not configured, but lookup requested for a non-test postcode.',
        );
        throw new HttpException(
          'Postcode lookup service is not configured for non-test postcodes.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      url += `?api_key=${this.apiKey}`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (response.status === 200 && data.code === 2000) {
        return data.result || []; // array of address objects
      }

      // Handle specific Ideal Postcodes error codes
      if (data.code === 4040) {
        throw new HttpException(
          "We couldn't find that postcode. Please check and try again.",
          HttpStatus.NOT_FOUND,
        );
      }

      if (data.code === 4020) {
        this.logger.error(`Ideal Postcodes API key invalid: ${data.message}`);
        throw new HttpException(
          'Failed to validate address. Service configuration issue.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (data.code === 5000) {
        throw new HttpException(
          'Something went wrong. Please try again shortly.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        data.message || 'Error looking up postcode.',
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error fetching postcode lookup: ${error.message}`);
      throw new HttpException(
        'Failed to lookup postcode due to network or service error.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
