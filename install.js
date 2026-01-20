#!/usr/bin/env node

/**
 * TELEGRAFO - Instalador Universal (Node.js)
 * Funciona em Linux, macOS e Windows
 *
 * Uso: node install.js
 */

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function print(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function printStep(msg) {
  print(`[✓] ${msg}`, 'green');
}

function printWarning(msg) {
  print(`[!] ${msg}`, 'yellow');
}

function printError(msg) {
  print(`[✗] ${msg}`, 'red');
}

function question(prompt, defaultValue = '') {
  return new Promise((resolve) => {
    const displayPrompt = defaultValue ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;
    rl.question(displayPrompt, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

function questionHidden(prompt, defaultValue = '') {
  return new Promise((resolve) => {
    const displayPrompt = defaultValue ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;
    process.stdout.write(displayPrompt);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    stdin.on('data', function handler(char) {
      char = char.toString();

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.removeListener('data', handler);
          console.log();
          resolve(password || defaultValue);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007F':
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(displayPrompt + '*'.repeat(password.length));
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

function runCommand(command, args, options = {}) {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? `${command}.cmd` : command;

  try {
    const result = spawnSync(cmd, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      shell: false,
      ...options
    });

    if (result.error) {
      // Try without .cmd extension on Windows
      if (isWin && result.error.code === 'ENOENT') {
        const retryResult = spawnSync(command, args, {
          stdio: options.silent ? 'pipe' : 'inherit',
          encoding: 'utf8',
          shell: true,
          ...options
        });
        if (retryResult.error && !options.ignoreError) {
          throw retryResult.error;
        }
        return retryResult.stdout;
      }
      if (!options.ignoreError) {
        throw result.error;
      }
    }

    if (result.status !== 0 && !options.ignoreError) {
      throw new Error(`Command failed with exit code ${result.status}`);
    }

    return result.stdout;
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return null;
  }
}

function commandExists(cmd) {
  const isWin = process.platform === 'win32';
  const checkCmd = isWin ? 'where' : 'which';

  try {
    const result = spawnSync(checkCmd, [cmd], { encoding: 'utf8', shell: true });
    return result.status === 0;
  } catch {
    return false;
  }
}

function generateRandomString(length = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  const scriptDir = __dirname;
  process.chdir(scriptDir);

  print('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  print('║                    TELEGRAFO - INSTALAÇÃO                      ║', 'cyan');
  print('║              Sistema de Disparo WhatsApp                       ║', 'cyan');
  print('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');

  print('Verificando requisitos do sistema...\n', 'blue');

  // Verificar Node.js
  const nodeVersion = process.version;
  printStep(`Node.js encontrado: ${nodeVersion}`);

  // Verificar npm
  if (commandExists('npm')) {
    const npmVersion = runCommand('npm', ['-v'], { silent: true });
    printStep(`npm encontrado: ${npmVersion ? npmVersion.trim() : 'versão desconhecida'}`);
  } else {
    printError('npm não encontrado!');
    process.exit(1);
  }

  // Verificar PostgreSQL
  if (commandExists('psql')) {
    printStep('PostgreSQL client encontrado');
  } else {
    printWarning('PostgreSQL client não encontrado. Certifique-se de ter um banco disponível.');
  }

  console.log();

  // Criar diretório de logs
  const logsDir = path.join(scriptDir, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  printStep('Diretório de logs criado');

  // Configurar variáveis de ambiente
  const envPath = path.join(scriptDir, '.env');

  if (!fs.existsSync(envPath)) {
    print('\nConfigurando variáveis de ambiente...\n', 'blue');

    // Gerar secrets
    const JWT_SECRET = generateRandomString(64);
    const ADMIN_API_KEY = `sk_${generateRandomString(32)}`;
    const API_KEY = `sk_${generateRandomString(32)}`;
    const WEBHOOK_SECRET = generateRandomString(32);

    // Solicitar informações
    print('=== Configuração do Banco de Dados PostgreSQL ===', 'yellow');
    const DB_HOST = await question('Host do banco', 'localhost');
    const DB_PORT = await question('Porta do banco', '5432');
    const DB_NAME = await question('Nome do banco', 'telegrafo');
    const DB_USER = await question('Usuário do banco', 'postgres');
    const DB_PASS = await questionHidden('Senha do banco', '');

    print('\n=== Configuração do Administrador ===', 'yellow');
    const ADMIN_USER = await question('Usuário admin', 'admin');
    const ADMIN_PASS = await questionHidden('Senha admin', 'admin123');

    const APP_PORT = await question('\nPorta da aplicação', '3000');

    // Criar arquivo .env
    const envContent = `# =============================================================================
# TELEGRAFO - Configuração Gerada Automaticamente
# =============================================================================

# Database (PostgreSQL)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Security
JWT_SECRET="${JWT_SECRET}"
JWT_ISSUER="telegrafo"
JWT_AUDIENCE="telegrafo-api"
ADMIN_API_KEY="${ADMIN_API_KEY}"
API_KEY="${API_KEY}"
WEBHOOK_SECRET="${WEBHOOK_SECRET}"
CONFIG_PASSWORD="${ADMIN_PASS}"

# Admin Credentials
ADMIN_USERNAME="${ADMIN_USER}"
ADMIN_PASSWORD="${ADMIN_PASS}"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:${APP_PORT}"
NODE_ENV="production"
PORT=${APP_PORT}
LOG_LEVEL="info"

# Rate Limiting
RATE_LIMIT_PER_MINUTE="120"
MAX_MESSAGES_PER_MINUTE="30"
MAX_MESSAGES_PER_HOUR="500"
MAX_MESSAGES_PER_DAY="2000"
MESSAGE_DELAY_MS="2000"

# =============================================================================
# CONFIGURAÇÕES OPCIONAIS (configure conforme necessário)
# =============================================================================

# Redis (opcional)
# REDIS_URL="redis://localhost:6379"

# Evolution API (WhatsApp via Baileys)
# EVOLUTION_API_URL=""
# EVOLUTION_API_KEY=""
# EVOLUTION_INSTANCE_NAME=""

# Twilio
# TWILIO_ACCOUNT_SID=""
# TWILIO_AUTH_TOKEN=""
# TWILIO_WHATSAPP_NUMBER=""

# WhatsApp Business Cloud API (Meta)
# WHATSAPP_BUSINESS_PHONE_ID=""
# WHATSAPP_BUSINESS_TOKEN=""

# Cloudinary
# CLOUDINARY_CLOUD_NAME=""
# CLOUDINARY_API_KEY=""
# CLOUDINARY_API_SECRET=""
`;

    fs.writeFileSync(envPath, envContent);
    printStep('Arquivo .env criado');

    // Copiar para .env.local
    fs.copyFileSync(envPath, path.join(scriptDir, '.env.local'));
  } else {
    printStep('Arquivo .env já existe');
  }

  print('\nInstalando dependências...\n', 'blue');
  runCommand('npm', ['install']);
  printStep('Dependências instaladas');

  print('\nConfigurando banco de dados...\n', 'blue');
  printWarning('Certifique-se de que o PostgreSQL está rodando');

  try {
    runCommand('npx', ['prisma', 'generate']);
    runCommand('npx', ['prisma', 'db', 'push']);
    printStep('Banco de dados configurado');
  } catch (error) {
    printError('Erro ao configurar banco de dados!');
    print('Verifique se o PostgreSQL está rodando e as credenciais estão corretas.', 'yellow');
    rl.close();
    process.exit(1);
  }

  print('\nFazendo build da aplicação...\n', 'blue');
  runCommand('npm', ['run', 'build']);
  printStep('Build concluído');

  // Criar ecosystem.config.js
  const ecosystemContent = `module.exports = {
  apps: [
    {
      name: 'telegrafo',
      script: 'npm',
      args: 'start',
      cwd: '${scriptDir.replace(/\\/g, '/')}',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}
`;

  fs.writeFileSync(path.join(scriptDir, 'ecosystem.config.js'), ecosystemContent);
  printStep('Arquivo PM2 configurado');

  // Instalar PM2
  if (!commandExists('pm2')) {
    print('\nInstalando PM2...\n', 'blue');
    runCommand('npm', ['install', '-g', 'pm2']);
    printStep('PM2 instalado');
  } else {
    printStep('PM2 já está instalado');
  }

  print('\n════════════════════════════════════════════════════════════════', 'green');
  print('                    INSTALAÇÃO CONCLUÍDA!                        ', 'green');
  print('════════════════════════════════════════════════════════════════\n', 'green');

  console.log('Para iniciar a aplicação:\n');
  print('  Modo desenvolvimento:', 'yellow');
  console.log('    npm run dev\n');
  print('  Modo produção (PM2):', 'yellow');
  console.log('    pm2 start ecosystem.config.js');
  console.log('    pm2 save\n');
  print('  Modo produção (simples):', 'yellow');
  console.log('    npm start\n');

  const startNow = await question('Deseja iniciar a aplicação agora? (S/n)', 'S');

  if (startNow.toLowerCase() === 's' || startNow === '') {
    print('\nIniciando aplicação...\n', 'blue');
    runCommand('pm2', ['start', 'ecosystem.config.js']);
    runCommand('pm2', ['save']);

    print('\nAplicação iniciada!', 'green');

    // Ler a porta do .env
    const envContent = fs.readFileSync(envPath, 'utf8');
    const portMatch = envContent.match(/PORT=(\d+)/);
    const port = portMatch ? portMatch[1] : '3000';

    print(`Acesse: http://localhost:${port}\n`, 'yellow');
    runCommand('pm2', ['status']);
  }

  rl.close();
}

main().catch((error) => {
  printError(`Erro: ${error.message}`);
  rl.close();
  process.exit(1);
});
