import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

export interface UploadedFileInfo {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists(): Promise<void> {
    try {
      if (!(await exists(this.uploadDir))) {
        await mkdir(this.uploadDir, { recursive: true });
        this.logger.log(`Upload directory created: ${this.uploadDir}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error}`);
    }
  }

  validateFile(file: Express.Multer.File): void {
    // Проверка размера (макс 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException(`File size too large. Max size is ${maxSize / 1024 / 1024}MB`);
    }

    // Проверка типа файла
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }
  }

  generateFilename(originalname: string): string {
    const ext = path.extname(originalname);
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    return `${timestamp}-${uniqueId}${ext}`;
  }

  async saveFile(file: Express.Multer.File): Promise<UploadedFileInfo> {
    this.validateFile(file);

    const filename = this.generateFilename(file.originalname);
    const filePath = path.join(this.uploadDir, filename);
    const baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
    const uploadPath = this.configService.get<string>('UPLOAD_PATH', '/uploads');

    // Сохраняем файл
    await promisify(fs.writeFile)(filePath, file.buffer);

    return {
      filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: filePath,
      url: `${baseUrl}${uploadPath}/${filename}`,
    };
  }

  async saveMultipleFiles(files: Express.Multer.File[]): Promise<UploadedFileInfo[]> {
    const uploadPromises = files.map(file => this.saveFile(file));
    return Promise.all(uploadPromises);
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);
    
    if (await exists(filePath)) {
      await promisify(fs.unlink)(filePath);
    } else {
      this.logger.warn(`File not found: ${filePath}`);
    }
  }

  async deleteMultipleFiles(filenames: string[]): Promise<void> {
    const deletePromises = filenames.map(filename => this.deleteFile(filename));
    await Promise.all(deletePromises);
  }
}