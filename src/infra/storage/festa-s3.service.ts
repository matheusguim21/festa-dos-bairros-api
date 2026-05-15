/// <reference types="bun-types" />
import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "bun";
import type { Env } from "@/infra/env";

@Injectable()
export class FestaS3Service {
  private readonly client: S3Client | null;
  private readonly logger = new Logger(FestaS3Service.name);
  constructor(private readonly config: ConfigService<Env, true>) {
    const accessKeyId = this.config.get("AWS_ACCESS_KEY_ID", { infer: true });
    const secretAccessKey = this.config.get("AWS_SECRET_ACCESS_KEY", {
      infer: true,
    });
    const region = this.config.get("AWS_REGION", { infer: true });
    const bucket = this.config.get("AWS_S3_FESTA_BUCKET", { infer: true });
    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      this.client = null;
      return;
    }
    this.client = new S3Client({
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
    });
  }

  assertConfigured() {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "Upload S3 não configurado: defina AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION e AWS_S3_FESTA_BUCKET",
      );
    }
  }

  async uploadPublicObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    this.assertConfigured();
    await this.client!.file(key).write(body, { type: contentType });
  }

  getPublicUrl(key: string): string {
    this.assertConfigured();
    const base = this.config.get("AWS_S3_FESTA_PUBLIC_BASE_URL", {
      infer: true,
    });
    if (base?.trim()) {
      return `${base.replace(/\/$/, "")}/${key}`;
    }
    const bucket = this.config.get("AWS_S3_FESTA_BUCKET", { infer: true })!;
    const region = this.config.get("AWS_REGION", { infer: true })!;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * Reverte URL pública (CloudFront ou host virtual S3) para chave no bucket festa,
   * apenas para `festa-site/sponsors/...` (evita apagar URLs externas).
   */
  extractSponsorLogoKeyFromPublicUrl(url: string | null | undefined): string | null {
    if (!url?.trim()) return null;
    const u = url.trim();
    const publicBase = this.config
      .get("AWS_S3_FESTA_PUBLIC_BASE_URL", { infer: true })
      ?.trim()
      .replace(/\/$/, "");
    if (publicBase && u.startsWith(`${publicBase}/`)) {
      const key = u.slice(publicBase.length + 1);
      return key.startsWith("festa-site/sponsors/") ? key : null;
    }
    const bucket = this.config.get("AWS_S3_FESTA_BUCKET", { infer: true });
    const region = this.config.get("AWS_REGION", { infer: true });
    if (!bucket || !region) return null;
    const s3Prefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
    if (u.startsWith(s3Prefix)) {
      const key = u.slice(s3Prefix.length).split("?")[0] ?? "";
      return key.startsWith("festa-site/sponsors/") ? key : null;
    }
    return null;
  }

  /** Apaga objeto no bucket festa; ignora se S3 não estiver configurado ou falhar. */
  async tryDeletePublicObject(key: string): Promise<void> {
    if (!this.client || !key.startsWith("festa-site/")) return;
    try {
      await this.client.file(key).delete();
    } catch (e) {
      this.logger.warn(`Não foi possível apagar objeto S3: ${key}`, e);
    }
  }
}
