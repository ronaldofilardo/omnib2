# Documentação do Projeto Omni Saúde

## Índice da Documentação

### 📋 APIs e Integrações

- **[API de Recebimento de Laudos](./API_DOCUMENTACAO.md)** - Documentação completa para laboratórios integrarem com o sistema
  - Endpoints disponíveis
  - Parâmetros de entrada e validações
  - Códigos de resposta e tratamento de erros
  - Exemplos práticos de uso
  - Configuração de ambiente de desenvolvimento

### 🏥 Funcionalidades do Sistema

- **[Central de Notificações](./CENTRAL_NOTIFICACOES_LAUDOS.md)** - Sistema de notificações para laudos médicos
  - Histórico de implementação
  - Modelos de dados (Notification, Report)
  - Fluxo de processamento de laudos

### 🎨 Interface e Componentes

- **[Componentes UI](./UI_COMPONENTS.md)** - Documentação dos componentes da interface
  - Modais e formulários
  - Componentes de visualização
  - Padrões de design utilizados

### 📝 Histórico e Changelog

- **[Histórico do Projeto](./HISTORICO.md)** - Evolução e mudanças do sistema
  - Versões e releases
  - Mudanças significativas
  - Migrações de banco de dados

## Links Rápidos

### Para Desenvolvedores

- [Setup do ambiente local](../README.md#setup)
- [Executando testes](../README.md#testes)
- [Estrutura do projeto](../README.md#estrutura)

### Para Laboratórios

- [Guia rápido de integração](./API_DOCUMENTACAO.md#exemplos-de-uso)
- [Ambiente de testes](./API_DOCUMENTACAO.md#ambiente-de-desenvolvimento)
- [CPFs para teste](./API_DOCUMENTACAO.md#testes-com-cpfs-fictícios)

### Para Administradores

- [Configuração de produção](./API_DOCUMENTACAO.md#segurança-e-boas-práticas)
- [Monitoramento e logs](./API_DOCUMENTACAO.md#monitoramento-e-logs)
- [Roadmap de melhorias](./API_DOCUMENTACAO.md#roadmap--melhorias-futuras)

## Estrutura de Arquivos da Documentação

```
docs/
├── README.md                    # Este arquivo - índice da documentação
├── API_DOCUMENTACAO.md          # Documentação completa da API de laudos
├── CENTRAL_NOTIFICACOES_LAUDOS.md  # Sistema de notificações
├── UI_COMPONENTS.md             # Componentes da interface
└── HISTORICO.md                 # Changelog do projeto
```

## Suporte

Para dúvidas sobre a documentação ou necessidade de esclarecimentos adicionais:

- **Issues no GitHub**: [omnimvp/issues](https://github.com/ronaldofilardo/omnimvp/issues)
- **E-mail de suporte**: suporte-api@omni.com.br

---

**Última atualização**: 17 de novembro de 2025  
**Versão do projeto**: 1.0 (Proof of Concept)
