import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class OptionalFloatPipe implements PipeTransform<string | undefined, number | undefined> {
  transform(value: string | undefined): number | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }
    
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      throw new BadRequestException(`Validation failed (numeric string is expected, got "${value}")`);
    }
    
    return parsed;
  }
}