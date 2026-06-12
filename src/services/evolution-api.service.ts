import type { Env } from "@/infra/env";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type EvolutionSendResult =
  | { ok: true }
  | { ok: false; error: string; statusCode?: number; responseBody?: string };

@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);

  constructor(private readonly configService: ConfigService<Env, true>) {}

  async sendText(params: {
    instanceName: string;
    apiKey: string;
    number: string;
    text: string;
  }): Promise<EvolutionSendResult> {
    const baseUrl = this.configService.get("EVOLUTION_API_BASE_URL", {
      infer: true,
    });
    if (!baseUrl) {
      this.logger.warn(
        "EVOLUTION_API_BASE_URL não configurada; mensagem não enviada",
      );
      return {
        ok: false,
        error:
          "EVOLUTION_API_BASE_URL não configurada no servidor (.env da API)",
      };
    }

    const url = `${baseUrl.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(params.instanceName)}`;

    this.logger.log(
      `Enviando WhatsApp instância="${params.instanceName}" número="${params.number}" url="${url}"`,
    );

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: params.apiKey,
        },
        body: JSON.stringify({
          number: params.number,
          text: params.text,
        }),
      });

      const body = await res.text();

      if (!res.ok) {
        this.logger.error(
          `Evolution API ${res.status} instância="${params.instanceName}" número="${params.number}": ${body.slice(0, 500)}`,
        );
        return {
          ok: false,
          error: `Evolution API respondeu ${res.status}`,
          statusCode: res.status,
          responseBody: body.slice(0, 500),
        };
      }

      this.logger.log(
        `WhatsApp enviado com sucesso para ${params.number} (HTTP ${res.status})`,
      );
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Falha de rede ao chamar Evolution API (${url}): ${message}`,
      );
      return { ok: false, error: `Falha de conexão: ${message}` };
    }
  }
}
