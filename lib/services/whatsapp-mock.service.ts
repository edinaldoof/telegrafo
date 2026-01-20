/**
 * Serviço Mock do WhatsApp - Simula funcionalidades sem API externa
 * Todas as funcionalidades são simuladas localmente
 */

interface MockInstance {
  id: string
  instanceName: string
  displayName: string
  status: 'connected' | 'disconnected' | 'qr' | 'connecting'
  numero?: string
  qrcode?: string
  createdAt: Date
  connectedAt?: Date
}

interface MockMessage {
  id: string
  instanceId: string
  to: string
  message: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'error'
  sentAt: Date
}

class WhatsAppMockService {
  private instances: Map<string, MockInstance> = new Map()
  private messages: MockMessage[] = []
  private qrCodes: Map<string, string> = new Map()

  constructor() {
    // Inicializar com dados de exemplo se necessário
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mock_instances')
      if (saved) {
        const data = JSON.parse(saved)
        data.forEach((inst: MockInstance) => {
          this.instances.set(inst.instanceName, inst)
        })
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      const data = Array.from(this.instances.values())
      localStorage.setItem('mock_instances', JSON.stringify(data))
    }
  }

  private generateMockQRCode(): string {
    // Gera um QR Code fake em base64
    const canvas = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <rect x="10" y="10" width="30" height="30" fill="black"/>
      <rect x="50" y="10" width="30" height="30" fill="black"/>
      <rect x="120" y="10" width="30" height="30" fill="black"/>
      <rect x="160" y="10" width="30" height="30" fill="black"/>
      <rect x="10" y="50" width="30" height="30" fill="black"/>
      <rect x="90" y="50" width="30" height="30" fill="black"/>
      <rect x="160" y="50" width="30" height="30" fill="black"/>
      <rect x="10" y="90" width="30" height="30" fill="black"/>
      <rect x="50" y="90" width="30" height="30" fill="black"/>
      <rect x="120" y="90" width="30" height="30" fill="black"/>
      <rect x="160" y="90" width="30" height="30" fill="black"/>
      <rect x="10" y="120" width="30" height="30" fill="black"/>
      <rect x="90" y="120" width="30" height="30" fill="black"/>
      <rect x="160" y="120" width="30" height="30" fill="black"/>
      <rect x="10" y="160" width="30" height="30" fill="black"/>
      <rect x="50" y="160" width="30" height="30" fill="black"/>
      <rect x="120" y="160" width="30" height="30" fill="black"/>
      <rect x="160" y="160" width="30" height="30" fill="black"/>
      <text x="100" y="105" text-anchor="middle" font-size="14" fill="#16a34a">MOCK QR</text>
    </svg>`

    const base64 = `data:image/svg+xml;base64,${btoa(canvas)}`
    return base64
  }

  async createInstance(params: {
    instanceName: string
    displayName?: string
  }): Promise<MockInstance> {
    // Simula criação de instância
    await new Promise(resolve => setTimeout(resolve, 500))

    const instance: MockInstance = {
      id: Math.random().toString(36).substr(2, 9),
      instanceName: params.instanceName,
      displayName: params.displayName || params.instanceName,
      status: 'disconnected',
      createdAt: new Date()
    }

    this.instances.set(params.instanceName, instance)
    this.saveToStorage()

    return instance
  }

  async connectInstance(instanceName: string): Promise<{ qrcode: { base64: string } }> {
    // Simula geração de QR Code
    await new Promise(resolve => setTimeout(resolve, 1000))

    const instance = this.instances.get(instanceName)
    if (!instance) {
      throw new Error('Instância não encontrada')
    }

    const qrcode = this.generateMockQRCode()
    this.qrCodes.set(instanceName, qrcode)

    instance.status = 'qr'
    instance.qrcode = qrcode
    this.saveToStorage()

    // Simula conexão automática após 5 segundos
    setTimeout(() => {
      const inst = this.instances.get(instanceName)
      if (inst && inst.status === 'qr') {
        inst.status = 'connected'
        inst.numero = '5511' + Math.floor(Math.random() * 900000000 + 100000000)
        inst.connectedAt = new Date()
        this.saveToStorage()
      }
    }, 5000)

    return {
      qrcode: {
        base64: qrcode
      }
    }
  }

  async disconnectInstance(instanceName: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500))

    const instance = this.instances.get(instanceName)
    if (instance) {
      instance.status = 'disconnected'
      instance.numero = undefined
      instance.connectedAt = undefined
      this.saveToStorage()
    }
  }

  async deleteInstance(instanceName: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500))

    this.instances.delete(instanceName)
    this.qrCodes.delete(instanceName)
    this.saveToStorage()
  }

  async getInstances(): Promise<MockInstance[]> {
    await new Promise(resolve => setTimeout(resolve, 200))
    return Array.from(this.instances.values())
  }

  async getInstance(instanceName: string): Promise<MockInstance | null> {
    await new Promise(resolve => setTimeout(resolve, 200))
    return this.instances.get(instanceName) || null
  }

  async sendMessage(params: {
    instanceName: string
    to: string
    message: string
  }): Promise<MockMessage> {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const instance = this.instances.get(params.instanceName)
    if (!instance || instance.status !== 'connected') {
      throw new Error('Instância não conectada')
    }

    const message: MockMessage = {
      id: Math.random().toString(36).substr(2, 9),
      instanceId: params.instanceName,
      to: params.to,
      message: params.message,
      status: 'pending',
      sentAt: new Date()
    }

    this.messages.push(message)

    // Simula envio e entrega
    setTimeout(() => {
      message.status = 'sent'
    }, 1000)

    setTimeout(() => {
      message.status = 'delivered'
    }, 2000)

    setTimeout(() => {
      message.status = 'read'
    }, 3000)

    return message
  }

  async getMessages(instanceName?: string): Promise<MockMessage[]> {
    await new Promise(resolve => setTimeout(resolve, 200))

    if (instanceName) {
      return this.messages.filter(m => m.instanceId === instanceName)
    }
    return this.messages
  }

  getStats() {
    const instances = Array.from(this.instances.values())
    return {
      total: instances.length,
      conectadas: instances.filter(i => i.status === 'connected').length,
      desconectadas: instances.filter(i => i.status === 'disconnected').length,
      totalMensagens: this.messages.length
    }
  }
}

// Singleton
export const whatsappMock = new WhatsAppMockService()