import { NextResponse } from 'next/server'

const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Telegrafo API',
    version: '1.0.0',
    description: 'Sistema avançado de comunicação e gerenciamento de mensagens WhatsApp',
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      description: 'Servidor de desenvolvimento',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
    schemas: {
      Contato: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          numeroWhatsapp: { type: 'string' },
          nomeContato: { type: 'string', nullable: true },
          grupoId: { type: 'integer', nullable: true },
          ativo: { type: 'boolean' },
        },
      },
      Mensagem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          tipo: { type: 'string', enum: ['texto', 'imagem', 'video', 'documento', 'audio'] },
          conteudo: { type: 'string', nullable: true },
          status: { type: 'string' },
          totalEnviados: { type: 'integer' },
          totalErros: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string', nullable: true },
          details: { type: 'object', nullable: true },
        },
      },
    },
  },
  paths: {
    '/api/contatos': {
      get: {
        summary: 'Listar contatos',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'grupoId',
            in: 'query',
            schema: { type: 'integer' },
          },
          {
            name: 'ativo',
            in: 'query',
            schema: { type: 'boolean' },
          },
          {
            name: 'busca',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de contatos',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Contato' },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Adicionar contato',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['numeroWhatsapp'],
                properties: {
                  numeroWhatsapp: { type: 'string' },
                  nomeContato: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Contato criado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    contato: { $ref: '#/components/schemas/Contato' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/mensagens/enviar': {
      post: {
        summary: 'Enviar mensagem',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tipo'],
                properties: {
                  tipo: {
                    type: 'string',
                    enum: ['texto', 'imagem', 'video', 'documento', 'audio'],
                  },
                  conteudo: { type: 'string' },
                  grupoIds: {
                    type: 'array',
                    items: { type: 'integer' },
                  },
                  enviarParaTodos: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Mensagem sendo enviada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    mensagem: { $ref: '#/components/schemas/Mensagem' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(openapiSpec)
}

