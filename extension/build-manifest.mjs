import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_TARGETS = new Set(['development', 'production']);
const PLACEHOLDER_HOSTS = new Set(['api.example.com', 'app.example.com', 'example.com']);

function parseEnvFile(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((env, line) => {
      const separatorIndex = line.indexOf('=');

      if (separatorIndex === -1) {
        return env;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      env[key] = value;
      return env;
    }, {});
}

function requireEnv(env, name) {
  const value = env[name];

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required extension environment variable "${name}".`);
  }

  return value.trim();
}

function normalizeUrl(value, variableName) {
  try {
    return new URL(value).toString().replace(/\/+$/, '');
  } catch (_error) {
    throw new Error(`Invalid ${variableName} value "${value}". Expected an absolute URL.`);
  }
}

function validateConfiguredUrl(value, variableName, target) {
  const normalizedUrl = normalizeUrl(value, variableName);
  const hostname = new URL(normalizedUrl).hostname.toLowerCase();

  if (target === 'production' && PLACEHOLDER_HOSTS.has(hostname)) {
    throw new Error(
      `${variableName} is still using the placeholder host "${hostname}". Set a real production URL before building the production extension.`
    );
  }

  return normalizedUrl;
}

async function buildManifest(target) {
  if (!VALID_TARGETS.has(target)) {
    throw new Error(`Invalid extension target "${target}". Use "development" or "production".`);
  }

  const envPath = path.join(__dirname, `.env.${target}`);
  const manifestTemplatePath = path.join(__dirname, target === 'development' ? 'manifest.dev.json' : 'manifest.prod.json');
  const outputPath = path.join(__dirname, 'manifest.json');
  const configOutputPath = path.join(__dirname, 'config', 'config.js');

  const [envContent, manifestTemplateContent] = await Promise.all([
    fs.readFile(envPath, 'utf8'),
    fs.readFile(manifestTemplatePath, 'utf8'),
  ]);

  const env = parseEnvFile(envContent);
  const apiBaseUrl = validateConfiguredUrl(
    requireEnv(env, 'EXTENSION_API_BASE_URL'),
    'EXTENSION_API_BASE_URL',
    target
  );
  const webAppUrl = validateConfiguredUrl(
    requireEnv(env, 'EXTENSION_WEB_APP_URL'),
    'EXTENSION_WEB_APP_URL',
    target
  );
  const appName = requireEnv(env, 'EXTENSION_APP_NAME');
  const environment = requireEnv(env, 'EXTENSION_ENVIRONMENT');
  const apiHostPermission = `${new URL(apiBaseUrl).origin}/*`;
  const webAppMatch = `${new URL(webAppUrl).origin}/*`;

  const manifest = manifestTemplateContent
    .replaceAll('__APP_NAME__', appName)
    .replaceAll('__API_HOST_PERMISSION__', apiHostPermission)
    .replaceAll('__WEB_APP_MATCH__', webAppMatch);

  const configModule = `(function initializeExtensionConfig() {
  const config = Object.freeze({
    API_BASE_URL: ${JSON.stringify(apiBaseUrl)},
    WEB_APP_URL: ${JSON.stringify(webAppUrl)},
    ENVIRONMENT: ${JSON.stringify(environment)},
    APP_NAME: ${JSON.stringify(appName)}
  });

  globalThis.VocabAIExtensionConfig = config;
  globalThis.VocabAIExtension = globalThis.VocabAIExtension || {};
  globalThis.VocabAIExtension.config = config;
})();
`;

  await fs.mkdir(path.dirname(configOutputPath), { recursive: true });
  await fs.writeFile(outputPath, `${manifest.trim()}\n`, 'utf8');
  await fs.writeFile(configOutputPath, configModule, 'utf8');

  console.log(`Generated ${outputPath} and ${configOutputPath} for ${target}.`);
}

buildManifest(process.argv[2] || 'development').catch((error) => {
  console.error(error.message);
  process.exit(1);
});
