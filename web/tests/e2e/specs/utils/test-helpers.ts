import { Page, expect } from '@playwright/test'

export async function login(page: Page, email = 'test@example.com', password = 'password123') {
  await page.goto('/')
  // Preenche as credenciais na tela de login
  await page.getByPlaceholder('usuário@email.com').fill(email)
  await page.getByPlaceholder('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  // Espera o dashboard aparecer (sidebar com texto OmniSaúde)
  await expect(page.getByText('OmniSaúde')).toBeVisible()
}

export async function loginAsEmissor(page: Page) {
  await login(page, 'emissor@example.com', 'password123')
}

export async function loginAsReceptor(page: Page) {
  await login(page, 'receptor@example.com', 'password123')
}

export async function logout(page: Page) {
  // Clica no botão 'Sair' no sidebar
  await page.getByRole('button', { name: 'Sair' }).click()
  // Espera voltar para tela de login
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
}

export async function cleanupDatabase() {
  // Aqui você pode adicionar lógica para limpar o banco de dados entre os testes
  // usando o cliente Prisma ou chamadas de API específicas
}