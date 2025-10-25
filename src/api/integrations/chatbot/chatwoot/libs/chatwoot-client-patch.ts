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
      if (config.headers) {
        // Replace api_access_token with api-access-token
        const token = config.headers['api_access_token'] || config.headers['api-access-token'];

        if (token) {
          delete config.headers['api_access_token'];
          config.headers['api-access-token'] = token as string;
          logger.verbose('Patched axios headers: api_access_token → api-access-token');
        }
      }

      return config;
    },
    (error) => {
      logger.error('Error in axios request interceptor: ' + error);
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
export function createPatchedChatwootClient(config: ChatwootAPIConfig): any {
  try {
    // Dynamic import to avoid TypeScript issues with module resolution
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const ChatwootClient = require('@figuro/chatwoot-sdk').default;

    const client = new ChatwootClient({ config }) as ChatwootClientWithAxios;

    // Intercept axios instance if available
    const axiosInstance = client.axios;

    if (axiosInstance?.interceptors) {
      // Add request interceptor to transform headers
      axiosInstance.interceptors.request.use(
        (axiosConfig: InternalAxiosRequestConfig) => {
          // Replace api_access_token with api-access-token
          if (axiosConfig.headers) {
            const token = axiosConfig.headers['api_access_token'] || axiosConfig.headers['api-access-token'];

            if (token) {
              delete axiosConfig.headers['api_access_token'];
              axiosConfig.headers['api-access-token'] = token as string;
              logger.verbose('Patched Chatwoot SDK headers: api_access_token → api-access-token');
            }
          }

          return axiosConfig;
        },
        (error) => {
          logger.error('Error in Chatwoot request interceptor: ' + error);
          return Promise.reject(error);
        },
      );

      logger.verbose('Chatwoot client patched successfully');
    } else {
      logger.warn('Chatwoot client axios instance not available for patching');
    }

    return client;
  } catch (error) {
    logger.error('Error creating patched Chatwoot client: ' + error);
    throw error;
  }
}
