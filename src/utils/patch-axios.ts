import { Logger } from '@config/logger.config';

const logger = new Logger('AxiosPatch');

/**
 * CRITICAL: This module MUST be imported BEFORE any other module that uses axios
 * It patches axios globally to fix the Chatwoot header issue
 *
 * The Chatwoot SDK hardcodes 'api_access_token' in headers (line 148 of request.js)
 * but Chatwoot's nginx reverse proxy only accepts 'api-access-token' (with hyphens)
 */

let patched = false;

export function patchAxiosGlobally() {
  if (patched) {
    logger.log('[AXIOS PATCH] Already patched, skipping');
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const axiosModule = require('axios');
    const axios = axiosModule.default || axiosModule;

    logger.log('[AXIOS PATCH] Patching axios module...');

    // Store the original request method
    const originalRequest = axios.request;

    // Override axios.request globally
    axios.request = function (config: any) {
      if (config?.headers && config.headers['api_access_token']) {
        logger.log('[AXIOS PATCH] 🔍 Transforming api_access_token → api-access-token');
        logger.log(`[AXIOS PATCH] URL: ${config.url}`);

        const token = config.headers['api_access_token'];
        delete config.headers['api_access_token'];
        config.headers['api-access-token'] = token;
      }

      return originalRequest.call(this, config);
    };

    // Also patch the Axios class prototype
    if (axios.Axios && axios.Axios.prototype) {
      const originalPrototypeRequest = axios.Axios.prototype.request;

      axios.Axios.prototype.request = function (config: any) {
        if (config?.headers && config.headers['api_access_token']) {
          logger.log('[AXIOS PATCH] 🔍 Prototype: Transforming api_access_token → api-access-token');

          const token = config.headers['api_access_token'];
          delete config.headers['api_access_token'];
          config.headers['api-access-token'] = token;
        }

        return originalPrototypeRequest.call(this, config);
      };
    }

    patched = true;
    logger.log('[AXIOS PATCH] ✅ Axios globally patched successfully');
  } catch (error) {
    logger.error(`[AXIOS PATCH] ❌ Failed to patch axios: ${error}`);
  }
}

// Auto-execute on module load
patchAxiosGlobally();
