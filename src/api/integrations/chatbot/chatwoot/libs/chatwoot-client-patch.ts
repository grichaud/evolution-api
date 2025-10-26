import { Logger } from '@config/logger.config';
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Import types from chatwoot-sdk
type ChatwootAPIConfig = {
  basePath: string;
  with_credentials?: boolean;
  credentials?: string;
  token?: string | any; // Allow Resolver<string> from Prisma
};

interface ChatwootClientWithAxios {
  axios?: AxiosInstance;
  [key: string]: any;
}

const logger = new Logger('ChatwootClientPatch');

/**
 * Create a global patched axios instance for Chatwoot
 * CRITICAL: This instance automatically converts all headers with underscores to hyphens
 * because Chatwoot only accepts 'api-access-token' (with hyphens)
 */
export const createPatchedAxiosInstance = (): AxiosInstance => {
  const patchedAxios = axios.create();

  // Add request interceptor to transform headers
  patchedAxios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      logger.log(`[DEBUG] Chatwoot HTTP Request to: ${config.url}`);
      logger.log(`[DEBUG] Method: ${config.method?.toUpperCase()}`);

      if (config.headers) {
        // Log ALL headers BEFORE transformation
        logger.log(`[DEBUG] Headers BEFORE patch: ${JSON.stringify(config.headers, null, 2)}`);

        // Replace api_access_token with api-access-token
        const token = config.headers['api_access_token'] || config.headers['api-access-token'];

        if (token) {
          delete config.headers['api_access_token'];
          config.headers['api-access-token'] = token as string;
          logger.log('[DEBUG] ✅ Transformed header: api_access_token → api-access-token');
        } else {
          logger.warn('[DEBUG] ⚠️  No api_access_token or api-access-token found in headers!');
        }

        // Log ALL headers AFTER transformation
        logger.log(`[DEBUG] Headers AFTER patch: ${JSON.stringify(config.headers, null, 2)}`);
      } else {
        logger.warn('[DEBUG] ⚠️  No headers object in request config!');
      }

      return config;
    },
    (error) => {
      logger.error('[DEBUG] ❌ Error in axios request interceptor: ' + error);
      return Promise.reject(error);
    },
  );

  // Add response interceptor to log responses
  patchedAxios.interceptors.response.use(
    (response) => {
      logger.log(`[DEBUG] ✅ Chatwoot Response from: ${response.config.url}`);
      logger.log(`[DEBUG] Status: ${response.status} ${response.statusText}`);
      logger.log(`[DEBUG] Response data: ${JSON.stringify(response.data).substring(0, 500)}`);
      return response;
    },
    (error) => {
      logger.error(`[DEBUG] ❌ Chatwoot Error Response from: ${error.config?.url}`);
      logger.error(`[DEBUG] Status: ${error.response?.status} ${error.response?.statusText}`);
      logger.error(`[DEBUG] Error data: ${JSON.stringify(error.response?.data)}`);
      logger.error(`[DEBUG] Full error: ${error.message}`);
      return Promise.reject(error);
    },
  );

  return patchedAxios;
};

// Export a singleton instance
export const patchedChatwootAxios = createPatchedAxiosInstance();

/**
 * Patch Chatwoot SDK to use correct header name
 * CRITICAL: Chatwoot only accepts 'api-access-token' (with hyphens)
 * but @figuro/chatwoot-sdk sends 'api_access_token' (with underscores)
 */
/**
 * Creates a Chatwoot client
 * NOTE: Axios is already globally patched in src/utils/patch-axios.ts
 * which is imported at the start of src/main.ts
 */
export function createPatchedChatwootClient(config: ChatwootAPIConfig): any {
  try {
    const patchedConfig = {
      ...config,
      token: config.token,
    };

    // The SDK will use the globally patched axios
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const ChatwootClient = require('@figuro/chatwoot-sdk').default;

    const client = new ChatwootClient({ config: patchedConfig }) as ChatwootClientWithAxios;

    logger.log('Chatwoot client created (using globally patched axios)');

    return client;
  } catch (error) {
    logger.error('Error creating patched Chatwoot client: ' + error);
    throw error;
  }
}
