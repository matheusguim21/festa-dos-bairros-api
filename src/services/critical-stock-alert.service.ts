import { EvolutionApiService } from "@/services/evolution-api.service";
import { FestaConfigService } from "@/services/festa-config.service";
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";

type ProductSnapshot = {
  id: number;
  name: string;
  quantity: number;
  criticalStock: number;
  stall?: { name: string } | null;
};

@Injectable()
export class CriticalStockAlertService {
  private readonly logger = new Logger(CriticalStockAlertService.name);

  constructor(
    private readonly festaConfigService: FestaConfigService,
    private readonly evolutionApiService: EvolutionApiService,
  ) {}

  /** Fire-and-forget — não bloqueia a operação de estoque. */
  evaluateAfterStockChange(
    product: ProductSnapshot,
    oldQty: number,
    newQty: number,
  ): void {
    void this.evaluate(product, oldQty, newQty).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Erro ao avaliar alerta de estoque: ${message}`);
    });
  }

  async evaluate(
    product: ProductSnapshot,
    oldQty: number,
    newQty: number,
  ): Promise<void> {
    const message = this.buildAlertMessage(product, oldQty, newQty);
    if (!message) return;

    const creds = await this.festaConfigService.getAlertCredentials();
    if (!creds.criticalStockAlertsEnabled) return;
    if (!creds.evolutionApiKey || !creds.evolutionInstanceName) return;
    if (creds.phones.length === 0) return;

    for (const phoneRow of creds.phones) {
      const result = await this.evolutionApiService.sendText({
        instanceName: creds.evolutionInstanceName,
        apiKey: creds.evolutionApiKey,
        number: phoneRow.phone,
        text: message,
      });
      if (!result.ok) {
        this.logger.warn(
          `Alerta não enviado para ${phoneRow.phone} (produto ${product.id})`,
        );
      }
    }
  }

  async sendTestMessage(phone: string, text: string): Promise<void> {
    this.logger.log(`Teste WhatsApp solicitado para número="${phone}"`);

    const creds = await this.festaConfigService.getAlertCredentials();
    if (!creds.evolutionApiKey || !creds.evolutionInstanceName) {
      this.logger.warn("Teste WhatsApp: API key ou instância não configurados");
      throw new BadRequestException(
        "Configure a API key e o nome da instância antes de testar",
      );
    }

    this.logger.log(
      `Teste WhatsApp: instância="${creds.evolutionInstanceName}" alertasAtivos=${creds.criticalStockAlertsEnabled}`,
    );

    const result = await this.evolutionApiService.sendText({
      instanceName: creds.evolutionInstanceName,
      apiKey: creds.evolutionApiKey,
      number: phone,
      text,
    });

    if (!result.ok) {
      const detail = result.responseBody
        ? `: ${result.responseBody}`
        : "";
      this.logger.error(
        `Teste WhatsApp falhou para ${phone}: ${result.error}${detail}`,
      );
      throw new BadGatewayException(
        `${result.error}${detail}`.slice(0, 500),
      );
    }

    this.logger.log(`Teste WhatsApp enviado com sucesso para ${phone}`);
  }

  private buildAlertMessage(
    product: ProductSnapshot,
    oldQty: number,
    newQty: number,
  ): string | null {
    const critical = product.criticalStock;
    const stallName = product.stall?.name ?? "Barraca";

    const isCritical =
      oldQty > critical && newQty <= critical && newQty > 0;
    const isOut = oldQty > 0 && newQty <= 0;

    if (isOut) {
      return `Estoque zerado: ${product.name} (${stallName})`;
    }
    if (isCritical) {
      return `Estoque crítico: ${product.name} (${stallName}) — restam ${newQty} un (limite: ${critical})`;
    }
    return null;
  }
}
