import { test, expect } from '@playwright/test'
import { loginAsEmissor, logout, cleanupDatabase } from './utils/test-helpers'

test.describe('Fluxo de Usuário Emissor', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmissor(page)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test.beforeAll(async () => {
    await cleanupDatabase()
  })

  test('deve mostrar apenas abas específicas do emissor no sidebar', async ({ page }) => {
    // Verifica que as abas do emissor estão presentes
    await expect(page.getByText('Portal de envio')).toBeVisible()
    await expect(page.getByText('Relatório')).toBeVisible()
    await expect(page.getByText('Sair')).toBeVisible()

    // Verifica que as abas do receptor NÃO estão presentes
    await expect(page.getByText('Timeline')).not.toBeVisible()
    await expect(page.getByText('Profissionais')).not.toBeVisible()
    await expect(page.getByText('Repositório')).not.toBeVisible()
    await expect(page.getByText('Calendário')).not.toBeVisible()
    await expect(page.getByText('Notificações')).not.toBeVisible()
    await expect(page.getByText('Dados Pessoais')).not.toBeVisible()
  })

  test('deve navegar para Portal de envio e mostrar formulário', async ({ page }) => {
    // Clica na aba Portal de envio
    await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Portal de envio' }).click()

    // Verifica se navegou para a página correta
    await expect(page.getByText('Portal de Envio')).toBeVisible()
    await expect(page.getByText('Omni Saúde - Envio de Documentos para Exames')).toBeVisible()

    // Verifica elementos do formulário
    await expect(page.getByText('n. exame')).toBeVisible()
    await expect(page.getByText('medico solicitante')).toBeVisible()
    await expect(page.getByText('email')).toBeVisible()
    await expect(page.getByText('cpf')).toBeVisible()
    await expect(page.getByText('arquivo')).toBeVisible()
    await expect(page.getByText('data')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar Documento' })).toBeVisible()
  })

  test('deve navegar para Relatório e mostrar dashboard de laudos', async ({ page }) => {
    // Clica na aba Relatório
    await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Relatório' }).click()

    // Verifica se navegou para a página correta
    await expect(page.getByText('Dashboard de Laudos')).toBeVisible()
    await expect(page.getByText('Laudos')).toBeVisible()

    // Verifica cabeçalhos da tabela
    await expect(page.getByText('Protocolo')).toBeVisible()
    await expect(page.getByText('Arquivo')).toBeVisible()
    await expect(page.getByText('Destinatário')).toBeVisible()
    await expect(page.getByText('Data de Envio')).toBeVisible()
    await expect(page.getByText('Data de Recebimento')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()

    // Verifica que não há as colunas removidas
    await expect(page.getByText('Título')).not.toBeVisible()
    await expect(page.getByText('Emissor')).not.toBeVisible()
    await expect(page.getByText('Data de Visualização')).not.toBeVisible()
  })

  test('deve redirecionar emissor tentando acessar rotas do receptor', async ({ page }) => {
    // Tenta acessar diretamente uma rota do receptor
    await page.goto('/(receptor)/timeline')

    // Deve ser redirecionado para login (já que emissor não tem acesso)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })

  test('deve manter usuário emissor logado após reload', async ({ page }) => {
    // Verifica que está logado como emissor
    await expect(page.getByText('Portal de envio')).toBeVisible()

    // Reload da página
    await page.reload()

    // Deve continuar logado e manter as abas do emissor
    await expect(page.getByText('OmniSaúde')).toBeVisible()
    await expect(page.getByText('Portal de envio')).toBeVisible()
    await expect(page.getByText('Relatório')).toBeVisible()
  })
})