import { AppError } from '../errors/app-error';

import type { IGateway } from './gateway.interface';
import { MidtransAdapter } from './midtrans.adapter';

export type GatewayAdapterType = 'midtrans' | 'stripe' | 'xendit';

export class GatewayAdapterFactory {
  static create(type: string): IGateway {
    switch (type) {
      case 'midtrans':
        return new MidtransAdapter();
      default:
        throw new AppError(`Unsupported gateway adapter: ${type}`, 'UNSUPPORTED_ADAPTER', 400);
    }
  }
}
