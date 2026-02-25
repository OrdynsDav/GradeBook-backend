import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Альтернативный способ загрузки: JSON с файлом в base64.
 * Использовать, если multipart/form-data не доходит (прокси, окружение).
 */
export class ImportScheduleBodyDto {
  @ApiPropertyOptional({
    description:
      'Содержимое .xlsx в base64 (альтернатива полю "file" в multipart)',
  })
  @IsOptional()
  @IsString()
  fileBase64?: string;
}
