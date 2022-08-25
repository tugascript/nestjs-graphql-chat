import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

@Injectable()
export class EncryptionService {
  private readonly masterKey = this.configService.get<string>('MASTER_KEY');
  private readonly masterPassword =
    this.configService.get<string>('MASTER_PASSWORD');

  constructor(private readonly configService: ConfigService) {}

  public async generateChatKey(): Promise<string> {
    const key = (await promisify(scrypt)(
      this.masterPassword,
      'salt',
      32,
    )) as Buffer;
    return this.masterEncrypt(key.toString('base64'));
  }

  public masterEncrypt(text: string): string {
    return this.encrypt(text, this.masterKey);
  }

  public masterDecrypt(text: string): string {
    return this.decrypt(text, this.masterKey);
  }

  public encrypt(text: string, base64Key: string): string {
    const key = Buffer.from(base64Key, 'base64');
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-ctr', key, iv);
    return (
      Buffer.concat([cipher.update(text), cipher.final()]).toString('base64') +
      ':' +
      iv.toString('base64')
    );
  }

  public decrypt(text: string, base64Key: string): string {
    const [ciphertext, iv] = text.split(':');
    const key = Buffer.from(base64Key, 'base64');
    const decipher = createDecipheriv(
      'aes-256-ctr',
      key,
      Buffer.from(iv, 'base64'),
    );
    return Buffer.concat([
      decipher.update(ciphertext, 'base64'),
      decipher.final(),
    ]).toString();
  }
}
